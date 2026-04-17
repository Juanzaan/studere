/**
 * ProcessAudio - Server-Side Audio Processing
 * Concatena chunks, divide con FFmpeg, transcribe y reconstruye el texto.
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { jsonResponse, getRequestId, structuredLog, withTimeout, retryWithBackoff } = require("../shared/utils");
const { getClient, getWhisperDeployment } = require("../shared/openai-client");

// Configure FFmpeg path
try {
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  ffmpeg.setFfmpegPath(ffmpegPath);
} catch (error) {
  console.warn('FFmpeg installer not available, using system FFmpeg');
}

const TEMP_DIR = path.join(process.cwd(), '.temp', 'audio-chunks');
const SEGMENT_DURATION_SECONDS = 240; // 4 minutos por segmento
const MAX_SEGMENT_SIZE_MB = 24; // Límite de Whisper

/**
 * Concatenate all chunks into a single file
 */
async function concatenateChunks(sessionDir, totalChunks) {
  const outputPath = path.join(sessionDir, 'full_audio.bin');
  const writeStream = fsSync.createWriteStream(outputPath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(sessionDir, `chunk_${String(i).padStart(5, '0')}.bin`);
    const chunkData = await fs.readFile(chunkPath);
    writeStream.write(chunkData);
  }

  writeStream.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(outputPath));
    writeStream.on('error', reject);
  });
}

/**
 * Split audio file into segments using FFmpeg
 */
async function splitAudioWithFFmpeg(inputPath, outputDir) {
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
        console.log('FFmpeg command:', cmd);
      })
      .on('progress', (progress) => {
        console.log('FFmpeg progress:', progress);
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
  const sessionDir = path.join(TEMP_DIR, sessionId);

  // 1. Verify session directory exists
  try {
    await fs.access(sessionDir);
  } catch (error) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  structuredLog(context, "info", "Starting audio processing", { sessionId }, requestId);

  // 2. Read session metadata
  const files = await fs.readdir(sessionDir);
  const chunkFiles = files.filter(f => f.startsWith('chunk_') && f.endsWith('.bin'));
  const totalChunks = chunkFiles.length;

  if (totalChunks === 0) {
    throw new Error('No chunks found for session');
  }

  structuredLog(context, "info", "Concatenating chunks", { totalChunks }, requestId);

  // 3. Concatenate chunks
  const fullAudioPath = await concatenateChunks(sessionDir, totalChunks);
  const fullAudioStats = await fs.stat(fullAudioPath);
  const totalSizeMB = (fullAudioStats.size / 1024 / 1024).toFixed(2);

  structuredLog(context, "info", "Audio concatenated", { 
    totalSizeMB,
    path: fullAudioPath 
  }, requestId);

  // 4. Create segments directory
  const segmentsDir = path.join(sessionDir, 'segments');
  await fs.mkdir(segmentsDir, { recursive: true });

  structuredLog(context, "info", "Splitting audio with FFmpeg", {}, requestId);

  // 5. Split with FFmpeg
  const segments = await splitAudioWithFFmpeg(fullAudioPath, segmentsDir);

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

  // 8. Cleanup (optional - keep for debugging)
  // await fs.rm(sessionDir, { recursive: true, force: true });

  return {
    sessionId,
    text: fullText,
    language: language || 'unknown',
    segments: segments.length,
    totalSizeMB: parseFloat(totalSizeMB)
  };
}

module.exports = async function (context, req) {
  const requestId = getRequestId(req);
  
  // Set CORS headers
  context.res = context.res || {};
  context.res.headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID'
  };
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    context.res.status = 204;
    context.res.body = '';
    return;
  }

  structuredLog(context, "info", "ProcessAudio triggered", {}, requestId);

  const { sessionId, language } = req.body || {};

  if (!sessionId || typeof sessionId !== 'string') {
    jsonResponse(context, 400, { error: "sessionId is required" }, requestId);
    return;
  }

  try {
    const result = await processAudio(sessionId, language, context, requestId);
    jsonResponse(context, 200, result, requestId);
  } catch (error) {
    structuredLog(context, "error", "Audio processing failed", {
      error: error.message,
      sessionId
    }, requestId);

    jsonResponse(context, 500, {
      error: error.message || "Audio processing failed"
    }, requestId);
  }
};
