/**
 * Azure Blob Storage for Audio Chunks
 * Replaces in-memory Map and filesystem storage
 */

const { BlobServiceClient } = require('@azure/storage-blob');

const CONTAINER_NAME = 'audio-chunks';
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

let containerClient = null;

/**
 * Initialize blob storage
 */
async function initStorage() {
  if (!connectionString) {
    // Blob storage disabled - connection string not configured
    return;
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    await containerClient.createIfNotExists();
    // Blob storage initialized successfully
  } catch (error) {
    // Failed to initialize blob storage
    throw error;
  }
}

/**
 * Save audio chunk to blob storage
 */
async function saveChunk(sessionId, chunkIndex, buffer) {
  if (!containerClient) {
    throw new Error('Blob storage not initialized');
  }

  const blobName = `${sessionId}/chunk_${String(chunkIndex).padStart(5, '0')}.bin`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.upload(buffer, buffer.length);
}

/**
 * Get session metadata
 */
async function getSessionMeta(sessionId) {
  if (!containerClient) {
    throw new Error('Blob storage not initialized');
  }

  const blobName = `${sessionId}/meta.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    const downloadResponse = await blockBlobClient.download(0);
    const downloaded = await streamToBuffer(downloadResponse.readableStreamBody);
    try {
      return JSON.parse(downloaded.toString());
    } catch {
      // Corrupted session metadata - returning null
      return null;
    }
  } catch (error) {
    if (error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Save session metadata
 */
async function saveSessionMeta(sessionId, meta) {
  if (!containerClient) {
    throw new Error('Blob storage not initialized');
  }

  const blobName = `${sessionId}/meta.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const content = JSON.stringify(meta);
  
  await blockBlobClient.upload(content, content.length, { overwrite: true });
}

/**
 * List chunk blobs for a session
 */
async function listChunks(sessionId) {
  if (!containerClient) {
    throw new Error('Blob storage not initialized');
  }

  const prefix = `${sessionId}/chunk_`;
  const chunks = [];

  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    chunks.push(blob.name);
  }

  return chunks.sort();
}

/**
 * Download a specific chunk
 */
async function downloadChunk(sessionId, chunkIndex) {
  if (!containerClient) {
    throw new Error('Blob storage not initialized');
  }

  const blobName = `${sessionId}/chunk_${String(chunkIndex).padStart(5, '0')}.bin`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const downloadResponse = await blockBlobClient.download(0);
  return await streamToBuffer(downloadResponse.readableStreamBody);
}

/**
 * Delete all blobs for a session
 */
async function deleteSession(sessionId) {
  if (!containerClient) {
    throw new Error('Blob storage not initialized');
  }

  const prefix = `${sessionId}/`;
  let count = 0;

  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    await containerClient.deleteBlob(blob.name);
    count++;
  }
  // Deleted blobs for session cleanup
}

/**
 * Helper: Convert stream to buffer
 */
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

// Initialize on module load
initStorage().catch(err => {
  // Blob storage initialization failed - will retry on first use
});

module.exports = {
  initStorage,
  saveChunk,
  getSessionMeta,
  saveSessionMeta,
  listChunks,
  downloadChunk,
  deleteSession,
};
