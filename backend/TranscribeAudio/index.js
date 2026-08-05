/**
 * TranscribeAudio - OPTIMIZED VERSION
 * Optimizaciones:
 * - ✅ Shared client
 * - ✅ Caching
 * - ✅ Timeout
 * - ✅ Retry logic
 * - ✅ Structured logging
 * - ✅ Request ID tracking
 */

const { getClient, getWhisperDeployment } = require("../shared/openai-client");
const cache = require("../shared/cache");
const { jsonResponse, getRequestId, structuredLog, withTimeout, retryWithBackoff, buildCacheKey, isValidBase64 } = require("../shared/utils");

const MAX_AUDIO_SIZE_MB = 25;
const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;
const REQUEST_TIMEOUT_MS = 300000; // 5 minutes for audio transcription (allows for longer files)

module.exports = async function (context, req) {
  const requestId = getRequestId(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    jsonResponse(context, 204, "", requestId);
    return;
  }

  structuredLog(context, "info", "TranscribeAudio triggered", {}, requestId);

  const client = getClient();
  const whisperDeployment = getWhisperDeployment();
  
  if (!client || !whisperDeployment) {
    jsonResponse(context, 500, {
      error: "Azure OpenAI Whisper is not configured. Set AZURE_OPENAI_WHISPER_DEPLOYMENT in app settings.",
    }, requestId);
    return;
  }

  // Expect JSON body with base64-encoded audio
  const audioBase64 = req.body?.audioBase64;
  const fileName = req.body?.fileName || "audio.webm";
  const language = req.body?.language || undefined; // let Whisper auto-detect if not specified

  if (typeof fileName !== "string" || fileName.length === 0 || fileName.length > MAX_FILE_NAME_LENGTH || /[\\/]/.test(fileName)) {
    jsonResponse(context, 400, { error: "fileName must be a plain file name (no paths), max 255 characters." }, requestId);
    return;
  }

  if (language !== undefined && (typeof language !== "string" || !/^[a-z]{2,3}(-[A-Z]{2})?$/.test(language))) {
    jsonResponse(context, 400, { error: "language must be a BCP-47 code like 'es' or 'en-US'." }, requestId);
    return;
  }

  if (!audioBase64 || typeof audioBase64 !== "string" || !isValidBase64(audioBase64)) {
    jsonResponse(context, 400, { error: "Request body must include 'audioBase64' (valid base64-encoded audio)." }, requestId);
    return;
  }

  // Decode base64 to buffer (whitespace-tolerant, like the validator)
  let audioBuffer;
  try {
    audioBuffer = Buffer.from(audioBase64.replace(/\s+/g, ''), "base64");
  } catch (err) {
    jsonResponse(context, 400, { error: "Invalid base64 encoding." }, requestId);
    return;
  }

  if (audioBuffer.length > MAX_AUDIO_SIZE_BYTES) {
    jsonResponse(context, 400, { error: `Audio file exceeds maximum size of ${MAX_AUDIO_SIZE_MB}MB.` }, requestId);
    return;
  }

  if (audioBuffer.length < 100) {
    jsonResponse(context, 400, { error: "Audio file is too small or empty." }, requestId);
    return;
  }

  // --- Check cache first (using SHA-256 hash of audio data) ---
  const cacheKey = buildCacheKey('transcription', audioBase64, language);
  const cached = cache.get("transcription", cacheKey);
  if (cached) {
    structuredLog(context, "info", "Cache hit - returning cached transcription", {}, requestId);
    jsonResponse(context, 200, { ...cached, cached: true }, requestId);
    return;
  }

  const audioSizeMB = (audioBuffer.length / 1024 / 1024).toFixed(2);
  const audioSizeKB = (audioBuffer.length / 1024).toFixed(2);
  
  structuredLog(context, "info", "Transcribing audio", { 
    fileName, 
    sizeMB: audioSizeMB,
    sizeKB: audioSizeKB,
    sizeBytes: audioBuffer.length 
  }, requestId);

  // Warn if approaching size limit
  if (audioBuffer.length > 20 * 1024 * 1024) {
    structuredLog(context, "warn", "Large audio file - approaching 25MB limit", { 
      sizeMB: audioSizeMB 
    }, requestId);
  }

  // Call Azure OpenAI Whisper with retry and timeout
  try {
    const options = {};
    if (language && language !== "auto") {
      options.language = language;
    }

    const result = await withTimeout(
      retryWithBackoff(
        () => client.getAudioTranscription(whisperDeployment, audioBuffer, options),
        2, // max 2 retries
        2000 // 2s base delay
      ),
      REQUEST_TIMEOUT_MS,
      "Whisper transcription timed out"
    );

    const response = {
      text: result.text || "",
      language: result.language || language || "unknown",
      duration: result.duration || null,
      cached: false,
    };

    // Cache the result
    cache.set("transcription", cacheKey, response);
    
    structuredLog(context, "info", "Transcription complete", {
      textLength: response.text.length,
      language: response.language,
    }, requestId);

    jsonResponse(context, 200, response, requestId);
  } catch (error) {
    structuredLog(context, "error", "Whisper transcription failed", {
      error: error.message,
      code: error.code,
    }, requestId);
    
    jsonResponse(context, 500, {
      error: "Transcription failed.",
      code: error.code || "unknown",
    }, requestId);
  }
};
