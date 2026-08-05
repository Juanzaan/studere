/**
 * ProcessAudio - Server-Side Audio Processing Handler
 * Orchestrates the audio processing pipeline
 */

const { jsonResponse, getRequestId, structuredLog, isValidSessionId } = require("../shared/utils");
const { authenticate } = require("../shared/auth");
const { processAudio } = require("../shared/audio-pipeline");

module.exports = async function (context, req) {
  const requestId = getRequestId(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    jsonResponse(context, 204, "", requestId);
    return;
  }

  const auth = await authenticate(req);
  if (!auth.ok) {
    jsonResponse(context, auth.status, { error: auth.error }, requestId);
    return;
  }

  structuredLog(context, "info", "ProcessAudio triggered", {}, requestId);

  const { sessionId, language } = req.body || {};

  if (!isValidSessionId(sessionId)) {
    jsonResponse(context, 400, {
      error: "sessionId is required and must be a valid identifier (letters, numbers, dash, underscore; max 64 chars)."
    }, requestId);
    return;
  }

  if (language !== undefined && typeof language !== "string") {
    jsonResponse(context, 400, { error: "language must be a string." }, requestId);
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

    jsonResponse(context, error.statusCode || 500, {
      error: error.statusCode ? error.message : "Audio processing failed"
    }, requestId);
  }
};