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
const {
  OUTPUT_SCHEMA, SYSTEM_PROMPT, FALLBACK_SYSTEM, normalizeOutput,
  evaluateOutputQuality, ENRICH_SUMMARY_PROMPT,
  ENRICH_CONCEPTS_PROMPT, ENRICH_QUIZ_PROMPT,
} = require("../shared/study-session-config");

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
// Post-generation enrichment — targeted fixes for weak sections
// ---------------------------------------------------------------------------
async function enrichIfNeeded(context, output, transcript, client, requestId) {
  const quality = evaluateOutputQuality(output);

  if (quality.passed) {
    structuredLog(context, 'info', 'Quality check passed',
      { score: quality.score }, requestId);
    return output;
  }

  structuredLog(context, 'warn', 'Quality check failed — enriching',
    { issues: quality.issues, score: quality.score }, requestId);

  const transcriptExcerpt = (transcript || '').substring(0, 3000);
  const enriched = { ...output };

  // Fix summary if needed
  const summaryIssue = quality.issues.find(i =>
    i.type === 'summary_too_short' || i.type === 'summary_too_listy'
  );
  if (summaryIssue) {
    try {
      const summaryPrompt = ENRICH_SUMMARY_PROMPT
        .replace('{summary}', output.summary || '')
        .replace('{transcriptExcerpt}', transcriptExcerpt);

      const summaryCall = () => client.getChatCompletions(
        getDeployment(),
        [{ role: 'user', content: summaryPrompt }],
        { maxTokens: 2000, temperature: 0.4 }
      );

      const summaryResult = (typeof retryWithBackoff === 'function')
        ? await retryWithBackoff(summaryCall, 2, 1000)
        : await summaryCall();

      const improvedSummary = summaryResult.choices?.[0]?.message?.content;
      if (improvedSummary && improvedSummary.trim().length > 200) {
        enriched.summary = improvedSummary.trim();
        structuredLog(context, 'info', 'Summary enriched',
          {
            originalWords: (output.summary || '').split(/\s+/).filter(Boolean).length,
            newWords: improvedSummary.split(/\s+/).filter(Boolean).length
          },
          requestId
        );
      } else {
        structuredLog(context, 'warn', 'Summary enrichment returned weak content',
          { length: improvedSummary ? improvedSummary.length : 0 }, requestId);
      }
    } catch (err) {
      structuredLog(context, 'warn', 'Summary enrichment failed',
        { error: err?.message || String(err) }, requestId);
    }
  }

  // Fix concepts if needed
  const conceptsIssue = quality.issues.find(i => i.type === 'concepts_insufficient');
  if (conceptsIssue) {
    const existingCount = (output.keyConcepts || []).length;
    const needed = Math.max(0, 6 - existingCount);

    if (needed > 0) {
      try {
        const conceptsPrompt = ENRICH_CONCEPTS_PROMPT
          .replace('{existingConcepts}', JSON.stringify(output.keyConcepts || []))
          .replace('{summary}', (output.summary || '').substring(0, 1000))
          .replace('{needed}', needed.toString());

        const conceptsCall = () => client.getChatCompletions(
          getDeployment(),
          [{ role: 'user', content: conceptsPrompt }],
          { maxTokens: 800, temperature: 0.3 }
        );

        const conceptsResult = (typeof retryWithBackoff === 'function')
          ? await retryWithBackoff(conceptsCall, 2, 1000)
          : await conceptsCall();

        const raw = conceptsResult.choices?.[0]?.message?.content || '';
        const cleaned = raw.replace(/```json|```/g, '').trim();

        let additional = [];
        try {
          additional = JSON.parse(cleaned);
        } catch (parseErr) {
          structuredLog(context, 'warn', 'Concepts enrichment JSON parse failed',
            { error: parseErr?.message || String(parseErr), rawPreview: cleaned.substring(0, 500) },
            requestId
          );
          additional = [];
        }

        if (Array.isArray(additional) && additional.length > 0) {
          enriched.keyConcepts = [...(output.keyConcepts || []), ...additional];
          structuredLog(context, 'info', 'Concepts enriched',
            { added: additional.length }, requestId);
        }
      } catch (err) {
        structuredLog(context, 'warn', 'Concepts enrichment failed',
          { error: err?.message || String(err) }, requestId);
      }
    } else {
      structuredLog(context, 'info', 'Concepts enrichment skipped (needed=0)',
        { existingCount }, requestId);
    }
  }

  // Fix quiz explanations if needed
  const quizIssue = quality.issues.find(i => i.type === 'quiz_weak_explanations');
  if (quizIssue) {
    const weakQuestions = (output.quiz || [])
      .filter(q => !q.explanation || q.explanation.split(/\s+/).filter(Boolean).length < 20)
      .map(q => ({
        question: q.question,
        correct: q.correct,
        options: q.options,
        currentExplanation: q.explanation
      }));

    if (weakQuestions.length > 0) {
      try {
        const quizPrompt = ENRICH_QUIZ_PROMPT
          .replace('{weakQuestions}', JSON.stringify(weakQuestions));

        const quizCall = () => client.getChatCompletions(
          getDeployment(),
          [{ role: 'user', content: quizPrompt }],
          { maxTokens: 1000, temperature: 0.3 }
        );

        const quizResult = (typeof retryWithBackoff === 'function')
          ? await retryWithBackoff(quizCall, 2, 1000)
          : await quizCall();

        const raw = quizResult.choices?.[0]?.message?.content || '';
        const cleaned = raw.replace(/```json|```/g, '').trim();

        let improvements = [];
        try {
          improvements = JSON.parse(cleaned);
        } catch (parseErr) {
          structuredLog(context, 'warn', 'Quiz enrichment JSON parse failed',
            { error: parseErr?.message || String(parseErr), rawPreview: cleaned.substring(0, 500) },
            requestId
          );
          improvements = [];
        }

        if (Array.isArray(improvements) && improvements.length > 0) {
          enriched.quiz = (output.quiz || []).map(q => {
            const improved = improvements.find(i => i.question === q.question);
            return improved && improved.explanation
              ? { ...q, explanation: improved.explanation }
              : q;
          });

          structuredLog(context, 'info', 'Quiz explanations enriched',
            { improved: improvements.length }, requestId);
        }
      } catch (err) {
        structuredLog(context, 'warn', 'Quiz enrichment failed',
          { error: err?.message || String(err) }, requestId);
      }
    } else {
      structuredLog(context, 'info', 'Quiz enrichment skipped (no weak questions)',
        {}, requestId);
    }
  }

  // Optional: re-evaluate for logging only (no loops)
  const finalQuality = evaluateOutputQuality(enriched);
  structuredLog(context, 'info', 'Quality after enrichment',
    { passed: finalQuality.passed, score: finalQuality.score, issues: finalQuality.issues },
    requestId
  );

  return enriched;
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

  let finalOutput = normalizeOutput(parsed);
  finalOutput = await enrichIfNeeded(context, finalOutput, transcript, getClient(), requestId);

  // --- Cache the successful response ---
  if (finalOutput) {
    cache.set("generation", cacheKey, finalOutput);
    structuredLog(context, "info", "Response cached successfully", {}, requestId);
  }

  jsonResponse(context, 200, {
    output: finalOutput,
    cached: false,
  }, requestId);
};
