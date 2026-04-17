/**
 * UploadAudioChunk - Server-Side Chunking
 * Recibe chunks de audio del frontend y los almacena temporalmente
 * para procesamiento posterior sin saturar memoria del browser.
 */

const fs = require('fs').promises;
const path = require('path');
const { jsonResponse, getRequestId, structuredLog } = require("../shared/utils");

const MAX_CHUNK_SIZE_MB = 10;
const MAX_CHUNK_SIZE_BYTES = MAX_CHUNK_SIZE_MB * 1024 * 1024;
const MAX_FILE_SIZE_MB = 500; // Máximo 500MB total
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora

// Temporal storage (local filesystem para desarrollo)
// TODO: Migrar a Azure Blob Storage para producción
const TEMP_DIR = path.join(process.cwd(), '.temp', 'audio-chunks');

// In-memory session tracking (TODO: usar Redis/Cosmos para producción)
const sessions = new Map();

/**
 * Ensure temp directory exists
 */
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

/**
 * Get or create session
 */
function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      id: sessionId,
      chunks: new Map(),
      totalChunks: 0,
      fileName: '',
      createdAt: Date.now(),
      complete: false
    });
  }
  return sessions.get(sessionId);
}

/**
 * Clean old sessions (1 hour timeout)
 */
function cleanOldSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TIMEOUT_MS) {
      sessions.delete(sessionId);
      // También limpiar archivos del filesystem
      cleanSessionFiles(sessionId).catch(err => 
        console.error(`Failed to clean session ${sessionId}:`, err)
      );
    }
  }
}

/**
 * Clean session files from filesystem
 */
async function cleanSessionFiles(sessionId) {
  const sessionDir = path.join(TEMP_DIR, sessionId);
  try {
    await fs.rm(sessionDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors (directory might not exist)
  }
}

module.exports = async function (context, req) {
  const requestId = getRequestId(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    jsonResponse(context, 204, "", requestId);
    return;
  }

  structuredLog(context, "info", "UploadAudioChunk triggered", {}, requestId);

  // Cleanup old sessions periodically
  cleanOldSessions();

  // Validate request body
  const { sessionId, chunkIndex, totalChunks, chunkData, fileName } = req.body || {};

  if (!sessionId || typeof sessionId !== 'string') {
    jsonResponse(context, 400, { error: "sessionId is required" }, requestId);
    return;
  }

  if (typeof chunkIndex !== 'number' || chunkIndex < 0) {
    jsonResponse(context, 400, { error: "chunkIndex must be a non-negative number" }, requestId);
    return;
  }

  if (typeof totalChunks !== 'number' || totalChunks <= 0) {
    jsonResponse(context, 400, { error: "totalChunks must be a positive number" }, requestId);
    return;
  }

  if (!chunkData || typeof chunkData !== 'string') {
    jsonResponse(context, 400, { error: "chunkData (base64) is required" }, requestId);
    return;
  }

  // Decode chunk
  let chunkBuffer;
  try {
    chunkBuffer = Buffer.from(chunkData, 'base64');
  } catch (err) {
    jsonResponse(context, 400, { error: "Invalid base64 encoding" }, requestId);
    return;
  }

  // Validate chunk size
  if (chunkBuffer.length > MAX_CHUNK_SIZE_BYTES) {
    jsonResponse(context, 400, { 
      error: `Chunk exceeds maximum size of ${MAX_CHUNK_SIZE_MB}MB` 
    }, requestId);
    return;
  }

  // Validate total file size estimate
  const estimatedTotalSize = chunkBuffer.length * totalChunks;
  if (estimatedTotalSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
    jsonResponse(context, 400, { 
      error: `Total file size would exceed maximum of ${MAX_FILE_SIZE_MB}MB` 
    }, requestId);
    return;
  }

  try {
    // Ensure temp directory exists
    await ensureTempDir();

    // Get or create session
    const session = getSession(sessionId);
    
    // Update session metadata
    if (session.totalChunks === 0) {
      session.totalChunks = totalChunks;
      session.fileName = fileName || 'audio';
    }

    // Validate consistency
    if (session.totalChunks !== totalChunks) {
      jsonResponse(context, 400, { 
        error: `totalChunks mismatch: expected ${session.totalChunks}, got ${totalChunks}` 
      }, requestId);
      return;
    }

    // Create session directory
    const sessionDir = path.join(TEMP_DIR, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    // Write chunk to file
    const chunkPath = path.join(sessionDir, `chunk_${String(chunkIndex).padStart(5, '0')}.bin`);
    await fs.writeFile(chunkPath, chunkBuffer);

    // Mark chunk as received
    session.chunks.set(chunkIndex, {
      path: chunkPath,
      size: chunkBuffer.length,
      receivedAt: Date.now()
    });

    const uploadedChunks = Array.from(session.chunks.keys()).sort((a, b) => a - b);
    const pendingChunks = [];
    for (let i = 0; i < totalChunks; i++) {
      if (!session.chunks.has(i)) {
        pendingChunks.push(i);
      }
    }

    session.complete = pendingChunks.length === 0;

    structuredLog(context, "info", "Chunk received", {
      sessionId,
      chunkIndex,
      chunkSize: chunkBuffer.length,
      uploaded: uploadedChunks.length,
      pending: pendingChunks.length,
      complete: session.complete
    }, requestId);

    jsonResponse(context, 200, {
      sessionId,
      uploaded: uploadedChunks,
      pending: pendingChunks.slice(0, 10), // Only return first 10 pending
      totalPending: pendingChunks.length,
      complete: session.complete
    }, requestId);

  } catch (error) {
    structuredLog(context, "error", "Failed to upload chunk", {
      error: error.message,
      sessionId,
      chunkIndex
    }, requestId);

    jsonResponse(context, 500, {
      error: "Failed to upload chunk",
      details: error.message
    }, requestId);
  }
};
