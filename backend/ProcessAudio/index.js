/**
 * ProcessAudio - Server-Side Audio Processing Handler
 * Orchestrates the audio processing pipeline
 */

const { jsonResponse, getRequestId, structuredLog } = require("../shared/utils");
const { processAudio } = require("../shared/audio-pipeline");

module.exports = async function (context, req) {
  const requestId = getRequestId(req);
  
  structuredLog(context, "info", "ProcessAudio triggered", {}, requestId);
  
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
