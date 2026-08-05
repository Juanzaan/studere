/**
 * Shared Utilities
 * Helpers comunes para todos los endpoints
 */

const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// CORS Headers
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*", // Configurable
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Request-ID",
};

/**
 * Send JSON response with CORS headers
 * @param {object} context - Azure Function context
 * @param {number} status - HTTP status code
 * @param {object} body - Response body
 * @param {string} [requestId] - Optional request ID
 */
function jsonResponse(context, status, body, requestId) {
  const headers = {
    "Content-Type": "application/json",
    ...CORS_HEADERS,
  };
  
  if (requestId) {
    headers["X-Request-ID"] = requestId;
  }
  
  context.res = {
    status,
    headers,
    body,
  };
}

/**
 * Generate or extract request ID
 * @param {object} req - HTTP request
 * @returns {string} - Request ID
 */
function getRequestId(req) {
  return req.headers?.["x-request-id"] || uuidv4();
}

/**
 * Calculate dynamic maxTokens based on input length
 * @param {string} input - Input text
 * @param {number} baseTokens - Base tokens for output
 * @returns {number} - Calculated maxTokens
 */
function calculateMaxTokens(input, baseTokens = 2000) {
  const inputLength = input?.length || 0;
  
  // Heuristic: ~4 chars per token
  const estimatedInputTokens = Math.ceil(inputLength / 4);
  
  // Scale output tokens based on input size
  if (estimatedInputTokens < 500) {
    return Math.min(baseTokens, 2000); // Short input -> less output needed
  } else if (estimatedInputTokens < 2000) {
    return Math.min(baseTokens + 1000, 4000);
  } else if (estimatedInputTokens < 4000) {
    return Math.min(baseTokens + 3000, 6000);
  } else {
    return Math.min(baseTokens + 4000, 8000); // Very long input -> more output
  }
}

/**
 * Structured logging helper
 * @param {object} context - Azure Function context
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Log message
 * @param {object} [meta] - Additional metadata
 * @param {string} [requestId] - Request ID for correlation
 */
function structuredLog(context, level, message, meta = {}, requestId = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    requestId,
    ...meta,
  };
  
  const logString = JSON.stringify(logEntry);
  
  switch (level) {
    case "error":
      context.log.error(logString);
      break;
    case "warn":
      context.log.warn(logString);
      break;
    default:
      context.log(logString);
  }
}

/**
 * Timeout promise wrapper
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} [errorMessage] - Custom error message
 * @returns {Promise} - Promise that rejects on timeout
 */
function withTimeout(promise, timeoutMs, errorMessage = "Operation timed out") {
  // Attach a no-op catch so the losing promise can never become an
  // unhandledRejection (Node treats those as fatal).
  promise.catch(() => {});
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Exponential backoff retry
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} baseDelay - Base delay in ms (will be exponentially increased)
 * @returns {Promise} - Result of function or throws last error
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors (Azure OpenAI SDK surfaces HTTP status
      // via `statusCode` on RestError; other layers may use `status`)
      const status = error.statusCode ?? error.status ?? error.response?.status;
      if (error.code === "content_filter" || (typeof status === "number" && status < 500)) {
        throw error;
      }
      
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i); // Exponential backoff
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Build SHA-256 cache key from input parts.
 * Streams string parts into the hash directly so large payloads
 * (base64 audio, long transcripts) are never materialized as a
 * full JSON copy just to be hashed.
 * @param {...any} parts - Parts to hash
 * @returns {string} - SHA-256 hex hash
 */
function buildCacheKey(...parts) {
  const hash = crypto.createHash('sha256');
  for (const part of parts) {
    if (typeof part === 'string') {
      hash.update(part);
    } else {
      hash.update(JSON.stringify(part));
    }
  }
  return hash.digest('hex');
}

/**
 * Validate a session ID.
 * Only alphanumerics, dash and underscore, max 64 chars.
 * Prevents path traversal in filesystem paths and blob-name abuse.
 * @param {unknown} id - Value to validate
 * @returns {boolean} - True if valid
 */
function isValidSessionId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}

/**
 * Strict base64 validation (round-trip check).
 * `Buffer.from(str, 'base64')` never throws, so a simple try/catch
 * is not enough — invalid input must be rejected explicitly.
 * @param {unknown} value - Value to validate
 * @returns {boolean} - True if value is valid base64
 */
function isValidBase64(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  const compact = value.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return false;
  const decoded = Buffer.from(compact, 'base64');
  if (decoded.length === 0) return false;
  return decoded.toString('base64').replace(/=+$/, '') === compact.replace(/=+$/, '');
}

/**
 * Validate an image data URL (base64), optionally with a max decoded size.
 * Only local data URLs are allowed — remote URLs are rejected to prevent SSRF.
 * @param {unknown} value - Value to validate
 * @param {number} [maxBytes] - Maximum decoded size in bytes
 * @returns {boolean} - True if value is a valid image data URL
 */
function isDataUrlImage(value, maxBytes) {
  if (typeof value !== 'string') return false;
  const match = value.match(/^data:image\/(png|jpe?g|webp|gif|bmp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) return false;
  if (!isValidBase64(match[2])) return false;
  if (typeof maxBytes === 'number' && Buffer.from(match[2], 'base64').length > maxBytes) {
    return false;
  }
  return true;
}

module.exports = {
  jsonResponse,
  getRequestId,
  calculateMaxTokens,
  structuredLog,
  withTimeout,
  retryWithBackoff,
  buildCacheKey,
  CORS_HEADERS,
  isValidSessionId,
  isValidBase64,
  isDataUrlImage,
};
