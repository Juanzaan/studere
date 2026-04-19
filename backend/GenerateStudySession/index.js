/**
 * GenerateStudySession - OPTIMIZED VERSION
 * Optimizaciones implementadas:
 * - ✅ Shared OpenAI client (singleton)
 * - ✅ Caching de respuestas
 * - ✅ Dynamic maxTokens
 * - ✅ Timeout protection
 * - ✅ Retry logic con exponential backoff
 * - ✅ Structured logging
 * - ✅ Request ID tracking
 * - ✅ CORS configurable
 */

const { getClient, getDeployment, isConfigured } = require("../shared/openai-client");
const cache = require("../shared/cache");
const { jsonResponse, getRequestId, calculateMaxTokens, structuredLog, withTimeout, retryWithBackoff, buildCacheKey } = require("../shared/utils");
const { OUTPUT_SCHEMA, SYSTEM_PROMPT, FALLBACK_SYSTEM, normalizeOutput } = require("../shared/study-session-config");

const MAX_TRANSCRIPT_LENGTH = 200000; // Increased for long audio files (2+ hours)
const REQUEST_TIMEOUT_MS = 90000; // 90 seconds

// ---------------------------------------------------------------------------
// Helper: call Azure OpenAI with a given system prompt
// ---------------------------------------------------------------------------
async function callModel(systemPrompt, userPrompt, maxTokens) {
  const client = getClient();
  const deployment = getDeployment();
  
  return client.getChatCompletions(deployment, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ], {
    temperature: 0.2,
    maxTokens,
  });
}

// ---------------------------------------------------------------------------
// Azure Function handler - OPTIMIZED
// ---------------------------------------------------------------------------
module.exports = async function (context, req) {
  const requestId = getRequestId(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    jsonResponse(context, 204, "", requestId);
    return;
  }

  structuredLog(context, "info", "GenerateStudySession triggered", {
    deployment: getDeployment(),
  }, requestId);

  if (!isConfigured()) {
    structuredLog(context, "error", "Azure OpenAI not configured", {}, requestId);
    jsonResponse(context, 500, { error: "Azure OpenAI client is not configured." }, requestId);
    return;
  }

  const transcript = req.body?.transcript;
  if (!transcript || typeof transcript !== "string") {
    jsonResponse(context, 400, { error: "Request body must include a 'transcript' string." }, requestId);
    return;
  }

  if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
    jsonResponse(context, 400, { error: `Transcript exceeds maximum length of ${MAX_TRANSCRIPT_LENGTH} characters.` }, requestId);
    return;
  }

  const language = req.body?.language || "auto";
  const extras = req.body?.extras || {};
  const existingItems = req.body?.existingItems || null;
  const generateMore = Boolean(req.body?.generateMore);

  // --- Check cache first ---
  const cacheKey = buildCacheKey('generation', transcript, language, generateMore, extras.target);
  const cached = cache.get("generation", cacheKey);
  if (cached) {
    structuredLog(context, "info", "Cache hit - returning cached response", {}, requestId);
    jsonResponse(context, 200, { output: cached, cached: true }, requestId);
    return;
  }

  // --- Build user prompt ---
  const userPrompt = [
    "Create the study package for the following class transcript.",
    generateMore ? `Focus on generating more items for the "${extras.target || "flashcards"}" section only.` : "",
    existingItems ? `Avoid duplicating these existing items: ${JSON.stringify(existingItems)}` : "",
    language !== "auto" ? `Preferred language: ${language}.` : "",
    req.body?.summaryFocus ? `Summary emphasis: ${req.body.summaryFocus}` : "",
    "",
    "Transcript:",
    transcript,
  ].filter(Boolean).join("\n");

  // --- Calculate dynamic maxTokens ---
  const maxTokens = calculateMaxTokens(transcript, 4000);
  structuredLog(context, "info", "Using dynamic maxTokens", { maxTokens, transcriptLength: transcript.length }, requestId);

  // --- Attempt 1: full prompt with retry logic ---
  let completion;
  try {
    completion = await withTimeout(
      retryWithBackoff(
        () => callModel(SYSTEM_PROMPT, userPrompt, maxTokens),
        2, // max 2 retries
        1000 // 1s base delay
      ),
      REQUEST_TIMEOUT_MS,
      "OpenAI request timed out"
    );
  } catch (error) {
    const filterResult = error?.innererror?.content_filter_result;
    structuredLog(context, "error", "Attempt 1 failed", {
      error: error.message,
      code: error.code,
      filterResult,
    }, requestId);

    if (error?.code === "content_filter") {
      // --- Attempt 2: fallback minimal prompt ---
      structuredLog(context, "warn", "Retrying with fallback prompt", {}, requestId);
      try {
        const fallbackUser = `Return the study package as JSON using this schema:\n${JSON.stringify(OUTPUT_SCHEMA, null, 2)}\n\nTranscript:\n${transcript}`;
        completion = await withTimeout(
          callModel(FALLBACK_SYSTEM, fallbackUser, maxTokens),
          REQUEST_TIMEOUT_MS,
          "OpenAI fallback request timed out"
        );
      } catch (retryError) {
        const retryFilter = retryError?.innererror?.content_filter_result;
        structuredLog(context, "error", "Attempt 2 failed", {
          error: retryError.message,
          filterResult: retryFilter,
        }, requestId);
        jsonResponse(context, 500, {
          error: retryError.message ?? "Content filter blocked both attempts.",
          filterDetail: retryFilter ?? null,
        }, requestId);
        return;
      }
    } else {
      jsonResponse(context, 500, { error: error.message ?? "Unknown error" }, requestId);
      return;
    }
  }

  // --- Parse JSON response ---
  const content = completion.choices?.[0]?.message?.content?.trim();
  let parsed;
  try {
    parsed = content ? JSON.parse(content) : null;
  } catch (err) {
    structuredLog(context, "warn", "Model returned non-JSON content", { contentLength: content?.length }, requestId);
  }

  if (!parsed) {
    jsonResponse(context, 500, {
      error: 'Failed to parse AI response'
    }, requestId);
    return;
  }

  const normalized = normalizeOutput(parsed);

  // --- Cache the successful response ---
  if (normalized) {
    cache.set("generation", cacheKey, normalized);
    structuredLog(context, "info", "Response cached successfully", {}, requestId);
  }

  jsonResponse(context, 200, {
    output: normalized,
    cached: false,
  }, requestId);
};
