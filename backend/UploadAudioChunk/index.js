/**
 * UploadAudioChunk - Server-Side Chunking
 * Recibe chunks de audio del frontend y los almacena en Azure Blob Storage
 */

const { jsonResponse, getRequestId, structuredLog, isValidSessionId, isValidBase64 } = require("../shared/utils");
const { saveChunk, getSessionMeta, saveSessionMeta, listChunks } = require('../shared/blob-storage');

const MAX_CHUNK_SIZE_MB = 10;
const MAX_CHUNK_SIZE_BYTES = MAX_CHUNK_SIZE_MB * 1024 * 1024;
const MAX_FILE_SIZE_MB = 500;
const MAX_FILE_NAME_LENGTH = 255;

module.exports = async function (context, req) {
  const requestId = getRequestId(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    jsonResponse(context, 204, "", requestId);
    return;
  }

  structuredLog(context, "info", "UploadAudioChunk triggered", {}, requestId);

  // Validate request body
  const { sessionId, chunkIndex, totalChunks, chunkData, fileName } = req.body || {};

  if (!isValidSessionId(sessionId)) {
    jsonResponse(context, 400, {
      error: "sessionId is required and must be a valid identifier (letters, numbers, dash, underscore; max 64 chars)."
    }, requestId);
    return;
  }

  if (typeof chunkIndex !== 'number' || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
    jsonResponse(context, 400, { error: "chunkIndex must be a non-negative integer" }, requestId);
    return;
  }

  if (typeof totalChunks !== 'number' || !Number.isInteger(totalChunks) || totalChunks <= 0) {
    jsonResponse(context, 400, { error: "totalChunks must be a positive integer" }, requestId);
    return;
  }

  if (chunkIndex >= totalChunks) {
    jsonResponse(context, 400, { error: "chunkIndex must be less than totalChunks" }, requestId);
    return;
  }

  if (typeof chunkData !== 'string' || !isValidBase64(chunkData)) {
    jsonResponse(context, 400, { error: "chunkData must be a valid base64 string" }, requestId);
    return;
  }

  if (fileName !== undefined && (typeof fileName !== 'string' || fileName.length === 0 || fileName.length > MAX_FILE_NAME_LENGTH)) {
    jsonResponse(context, 400, { error: `fileName must be a non-empty string of at most ${MAX_FILE_NAME_LENGTH} characters` }, requestId);
    return;
  }

  const chunkBuffer = Buffer.from(chunkData.replace(/\s+/g, ''), 'base64');

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
    // Get or create session metadata
    let meta = await getSessionMeta(sessionId);

    if (!meta) {
      meta = {
        id: sessionId,
        totalChunks,
        fileName: fileName || 'audio',
        createdAt: Date.now(),
        complete: false
      };
    }

    // Validate consistency
    if (meta.totalChunks !== totalChunks) {
      jsonResponse(context, 400, {
        error: `totalChunks mismatch: expected ${meta.totalChunks}, got ${totalChunks}`
      }, requestId);
      return;
    }

    // Save chunk to blob storage (idempotent — retries overwrite safely)
    await saveChunk(sessionId, chunkIndex, chunkBuffer);

    // List uploaded chunks and compute coverage by index
    const chunks = await listChunks(sessionId);
    const uploadedIndices = chunks.map(name => {
      const match = name.match(/chunk_(\d+)\.bin$/);
      return match ? parseInt(match[1], 10) : -1;
    }).filter(i => i >= 0).sort((a, b) => a - b);

    const pendingIndices = [];
    for (let i = 0; i < totalChunks; i++) {
      if (!uploadedIndices.includes(i)) {
        pendingIndices.push(i);
      }
    }

    meta.complete = pendingIndices.length === 0;

    // Save updated metadata
    await saveSessionMeta(sessionId, meta);

    structuredLog(context, "info", "Chunk received", {
      sessionId,
      chunkIndex,
      chunkSize: chunkBuffer.length,
      uploaded: uploadedIndices.length,
      pending: pendingIndices.length,
      complete: meta.complete
    }, requestId);

    jsonResponse(context, 200, {
      sessionId,
      uploaded: uploadedIndices,
      pending: pendingIndices.slice(0, 10),
      totalPending: pendingIndices.length,
      complete: meta.complete
    }, requestId);

  } catch (error) {
    structuredLog(context, "error", "Failed to upload chunk", {
      error: error.message,
      sessionId,
      chunkIndex
    }, requestId);

    jsonResponse(context, 500, {
      error: "Failed to upload chunk"
    }, requestId);
  }
};