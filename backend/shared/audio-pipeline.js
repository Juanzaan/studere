/**
 * Audio processing pipeline
 * Handles concatenation, FFmpeg splitting, and Whisper transcription
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { structuredLog, withTimeout, retryWithBackoff } = require("./utils");
const { getClient, getWhisperDeployment } = require("./openai-client");
const { downloadChunk, listChunks, deleteSession } = require('./blob-storage');

// FFmpeg is downloaded from Azure Blob Storage on first use and cached in %TEMP%.
// This bypasses func CLI binary exclusions and Azure Files execution restrictions.
const os = require('os');
const isWin = process.platform === 'win32';
const FFMPEG_BINARY = isWin ? 'ffmpeg.exe' : 'ffmpeg';
const FFMPEG_TEMP_PATH = path.join(os.tmpdir(), FFMPEG_BINARY);

let _ffmpegReady = false;
let _ffmpegSetupPromise = null;

async function ensureFfmpeg() {
  if (_ffmpegReady) return;
  if (_ffmpegSetupPromise) return _ffmpegSetupPromise;

  _ffmpegSetupPromise = (async () => {
    // 1. Explicit env var (set in Azure App Settings)
    if (process.env.FFMPEG_PATH && fsSync.existsSync(process.env.FFMPEG_PATH)) {
      ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
      console.log('[FFmpeg] Using FFMPEG_PATH env:', process.env.FFMPEG_PATH);
      _ffmpegReady = true;
      return;
    }

    // 2. Already in %TEMP% from a previous invocation this process
    if (fsSync.existsSync(FFMPEG_TEMP_PATH)) {
      ffmpeg.setFfmpegPath(FFMPEG_TEMP_PATH);
      console.log('[FFmpeg] Using cached temp binary:', FFMPEG_TEMP_PATH);
      _ffmpegReady = true;
      return;
    }

    // 3. Download from Azure Blob Storage (most reliable on Azure Functions)
    try {
      const { BlobServiceClient } = require('@azure/storage-blob');
      const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
      const blobClient = BlobServiceClient.fromConnectionString(connStr)
        .getContainerClient('binaries')
        .getBlobClient(FFMPEG_BINARY);
      console.log('[FFmpeg] Downloading from Azure Blob Storage...');
      await blobClient.downloadToFile(FFMPEG_TEMP_PATH);
      if (!isWin) fsSync.chmodSync(FFMPEG_TEMP_PATH, 0o755);
      ffmpeg.setFfmpegPath(FFMPEG_TEMP_PATH);
      console.log('[FFmpeg] Downloaded and configured:', FFMPEG_TEMP_PATH);
      _ffmpegReady = true;
      return;
    } catch (blobErr) {
      console.warn('[FFmpeg] Blob download failed:', blobErr.message);
    }

    // 4. Last resort: try local node_modules path
    const localPath = path.resolve(__dirname, '..', 'node_modules', '@ffmpeg-installer', `${os.platform()}-${os.arch()}`, FFMPEG_BINARY);
    if (fsSync.existsSync(localPath)) {
      try {
        fsSync.copyFileSync(localPath, FFMPEG_TEMP_PATH);
        if (!isWin) fsSync.chmodSync(FFMPEG_TEMP_PATH, 0o755);
        ffmpeg.setFfmpegPath(FFMPEG_TEMP_PATH);
        console.log('[FFmpeg] Copied from local node_modules:', FFMPEG_TEMP_PATH);
        _ffmpegReady = true;
        return;
      } catch (_) {
        ffmpeg.setFfmpegPath(localPath);
        _ffmpegReady = true;
        return;
      }
    }

    throw new Error('FFmpeg binary could not be configured. Check Azure Blob Storage or FFMPEG_PATH setting.');
  })();

  return _ffmpegSetupPromise;
}

const SEGMENT_DURATION_SECONDS = 240; // 4 minutos por segmento
const MAX_SEGMENT_SIZE_MB = 24; // Límite de Whisper

/**
 * Concatenate all chunks into a single buffer
 */
async function concatenateChunks(sessionId, totalChunks) {
  const buffers = [];

  for (let i = 0; i < totalChunks; i++) {
    const chunkBuffer = await downloadChunk(sessionId, i);
    buffers.push(chunkBuffer);
  }

  return Buffer.concat(buffers);
}

/**
 * Split audio buffer into segments using FFmpeg
 */
async function splitAudioWithFFmpeg(audioBuffer, outputDir) {
  // Ensure FFmpeg binary is available and configured
  await ensureFfmpeg();

  // Write buffer to temp file for FFmpeg
  const inputPath = path.join(outputDir, 'input_audio.bin');
  await fs.writeFile(inputPath, audioBuffer);
  return new Promise((resolve, reject) => {
    const segments = [];
    let segmentIndex = 0;

    ffmpeg(inputPath)
      .outputOptions([
        '-f', 'segment',
        '-segment_time', String(SEGMENT_DURATION_SECONDS),
        '-c', 'copy', // Copy codec (no re-encoding, faster)
        '-reset_timestamps', '1'
      ])
      .output(path.join(outputDir, 'segment_%03d.mp3'))
      .on('start', (cmd) => {
        // FFmpeg started
      })
      .on('progress', (progress) => {
        // FFmpeg processing
      })
      .on('end', async () => {
        try {
          // List generated segments
          const files = await fs.readdir(outputDir);
          const segmentFiles = files
            .filter(f => f.startsWith('segment_') && f.endsWith('.mp3'))
            .sort();

          for (const file of segmentFiles) {
            const filePath = path.join(outputDir, file);
            const stats = await fs.stat(filePath);
            segments.push({
              path: filePath,
              index: segments.length,
              size: stats.size
            });
          }

          resolve(segments);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (err) => {
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .run();
  });
}

/**
 * Transcribe a single audio segment
 */
async function transcribeSegment(segmentPath, language, context) {
  const client = getClient();
  const whisperDeployment = getWhisperDeployment();

  if (!client || !whisperDeployment) {
    throw new Error('Whisper not configured');
  }

  const audioBuffer = await fs.readFile(segmentPath);
  const sizeMB = (audioBuffer.length / 1024 / 1024).toFixed(2);

  if (audioBuffer.length > MAX_SEGMENT_SIZE_MB * 1024 * 1024) {
    throw new Error(`Segment exceeds ${MAX_SEGMENT_SIZE_MB}MB: ${sizeMB}MB`);
  }

  const options = {};
  if (language && language !== 'auto') {
    options.language = language;
  }

  const result = await withTimeout(
    retryWithBackoff(
      () => client.getAudioTranscription(whisperDeployment, audioBuffer, options),
      2,
      2000
    ),
    300000, // 5 min timeout
    'Whisper transcription timed out'
  );

  return {
    text: result.text || '',
    language: result.language || language || 'unknown'
  };
}

/**
 * Process complete audio file
 */
async function processAudio(sessionId, language, context, requestId) {
  const tempDir = path.join('/tmp', sessionId);

  try {
    structuredLog(context, "info", "Starting audio processing", { sessionId }, requestId);

    // 1. List chunks from blob storage
    const chunks = await listChunks(sessionId);
    const totalChunks = chunks.length;

    if (totalChunks === 0) {
      throw new Error('No chunks found for session');
    }

    structuredLog(context, "info", "Concatenating chunks", { totalChunks }, requestId);

    // 2. Download and concatenate chunks
    const fullAudioBuffer = await concatenateChunks(sessionId, totalChunks);
    const totalSizeMB = (fullAudioBuffer.length / 1024 / 1024).toFixed(2);

    structuredLog(context, "info", "Audio concatenated", { totalSizeMB }, requestId);

    // 3. Create temp directory for FFmpeg processing
    await fs.mkdir(tempDir, { recursive: true });
    const segmentsDir = path.join(tempDir, 'segments');
    await fs.mkdir(segmentsDir, { recursive: true });

    structuredLog(context, "info", "Splitting audio with FFmpeg", {}, requestId);

    // 4. Split with FFmpeg
    const segments = await splitAudioWithFFmpeg(fullAudioBuffer, segmentsDir);

  structuredLog(context, "info", "Audio split complete", { 
    segments: segments.length 
  }, requestId);

  // 6. Transcribe segments in parallel (batches of 5)
  const PARALLEL_BATCH_SIZE = 5;
  const transcriptions = new Array(segments.length);
  
  structuredLog(context, "info", "Starting parallel transcription", {
    totalSegments: segments.length,
    batchSize: PARALLEL_BATCH_SIZE
  }, requestId);

  for (let i = 0; i < segments.length; i += PARALLEL_BATCH_SIZE) {
    const batch = segments.slice(i, Math.min(i + PARALLEL_BATCH_SIZE, segments.length));
    
    structuredLog(context, "info", "Processing batch", {
      batchStart: i,
      batchSize: batch.length,
      progress: `${i}/${segments.length}`
    }, requestId);

    // Transcribe batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (segment) => {
        structuredLog(context, "info", "Transcribing segment", {
          index: segment.index,
          sizeMB: (segment.size / 1024 / 1024).toFixed(2)
        }, requestId);

        const result = await transcribeSegment(segment.path, language, context);
        
        structuredLog(context, "info", "Segment transcribed", {
          index: segment.index,
          textLength: result.text.length
        }, requestId);

        return { index: segment.index, text: result.text };
      })
    );

    // Store results in correct order
    batchResults.forEach(result => {
      transcriptions[result.index] = result.text;
    });
  }

    // 7. Reconstruct full text
    const fullText = transcriptions.join(' ');

    structuredLog(context, "info", "Processing complete", {
      segments: segments.length,
      totalLength: fullText.length
    }, requestId);

    return {
      sessionId,
      text: fullText,
      language: language || 'unknown',
      segments: segments.length,
      totalSizeMB: parseFloat(totalSizeMB)
    };
  } finally {
    // 8. Cleanup blob storage
    try {
      await deleteSession(sessionId);
    } catch (cleanupError) {
      structuredLog(context, "warn", "Blob cleanup failed", { error: cleanupError.message }, requestId);
    }

    // 9. Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      structuredLog(context, "warn", "Temp dir cleanup failed", { error: cleanupError.message }, requestId);
    }
  }
}

module.exports = {
  concatenateChunks,
  splitAudioWithFFmpeg,
  transcribeSegment,
  processAudio,
};
