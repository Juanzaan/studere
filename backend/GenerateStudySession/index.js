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
const { jsonResponse, getRequestId, calculateMaxTokens, structuredLog, withTimeout, retryWithBackoff } = require("../shared/utils");

// ---------------------------------------------------------------------------
// Output schema — kept as a JS constant so the prompt stays clean
// ---------------------------------------------------------------------------
const OUTPUT_SCHEMA = {
  summary: "string — ONE continuous markdown document (use ## headings, ### subheadings, **bold**, tables, $..$ for KaTeX math, ```lang for code blocks, > **Tip:** / > **Examen:** / > **Atención:** / > **Importante:** for callout blockquotes)",
  keyConcepts: [{ term: "string (may include $math$ or `code`)", definition: "string (max 2 sentences, may use markdown)" }],
  flashcards: [{ question: "string (may use markdown/KaTeX)", answer: "string (concise, may use markdown/KaTeX)", difficulty: "easy | medium | hard" }],
  quiz: [{ question: "string", options: ["A", "B", "C", "D"], correct: "0-3 index (integer)", explanation: "string" }],
  mindMap: { id: "string", label: "string", children: ["nested nodes, max depth 3"] },
  actionItems: [{ task: "string", status: "pending", priority: "low | medium | high", exercisePrompt: "string (optional — a concrete exercise or problem for the student to solve, related to this task)" }],
  insights: [{ type: "info | warning | success", message: "string" }],
  detectedAssets: [{ type: "graph | formula | table | diagram", description: "string", suggestedFormat: "string" }],
};

// ---------------------------------------------------------------------------
// System prompt — natural, educational tone to avoid content-filter triggers
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are Stude, the study assistant powering Studere — an educational platform that helps university and high-school students learn more effectively after class.

Your job:
A student will share a class transcript (or notes). You turn that raw material into a complete, well-structured study package so the student can review, practice, and retain the content.

Guidelines:
1. Detect the predominant language of the transcript and write your entire response in that same language.
2. Respond with valid JSON only — no markdown fences, no extra text outside the JSON object.
3. Stay faithful to the source material. If information is missing or unclear, note it honestly instead of inventing facts.
4. Keep an encouraging, clear, and professional academic tone.
5. Respect these limits per response: up to 15 key concepts, 20 flashcards, 10 quiz questions, 5 action items, 3 insights.

Your JSON response must follow this schema:
${JSON.stringify(OUTPUT_SCHEMA, null, 2)}

How to build each section:
- summary: Write ONE continuous markdown document (NOT an array). Use ## and ### headings to structure sections. Use **bold** for key terms. Use markdown tables (| col | col |) for comparisons. Use $..$ for inline math and $$...$$ for block math (KaTeX syntax). Use \`\`\`language for code blocks. Use callout blockquotes: > **Tip:** for study tips, > **Examen:** for exam-relevant info, > **Atención:** for warnings/common mistakes, > **Importante:** for critical concepts. Use ordered/unordered lists for enumerations. The summary should be comprehensive (500-1500 words).
- keyConcepts: 5-15 relevant terms with concise definitions. Use $math$ for formulas, \`code\` for programming terms, **bold** for emphasis.
- flashcards: at least 5; label difficulty (easy/medium/hard); no duplicates. Answers must be concise (1-3 sentences max). Use $math$ for formulas in questions and answers.
- quiz: at least 3 multiple-choice questions, 4 options each. The "correct" field must be an integer (0-3) indicating the index of the correct option. Include a brief explanation.
- mindMap: root node = main topic; up to 5 primary branches; max 3 levels deep.
- actionItems: 2-5 actionable tasks inferred from the transcript (homework, review suggestions, practice exercises). For at least 2 tasks, include an exercisePrompt: a concrete problem or question the student must solve (e.g. "Resolvé la integral $\\int_0^1 x^2 dx$" or "Escribí un programa en Python que ordene una lista" or "Explicá con tus palabras la diferencia entre X e Y"). Use markdown and KaTeX in exercisePrompt.
- insights: 1-3 observations about the quality or completeness of the material (info/warning/success).
- detectedAssets: list any graphs, formulas, tables, or diagrams mentioned; suggest a render format (e.g. "recharts-bar", "katex-formula", "reactflow-diagram").

Edge cases:
- Very short transcript (under 50 words): return only summary, 2 key concepts, and a warning insight; omit the rest.
- If the request includes generateMore=true, produce only the section named in extras.target.
- If existingItems is provided, avoid duplicating those items.`;

// ---------------------------------------------------------------------------
// Fallback prompt — minimal version used on retry after a filter rejection
// ---------------------------------------------------------------------------
const FALLBACK_SYSTEM = `You are Stude, an educational study assistant. A student shares class notes and you create a structured study package in JSON. Detect the language of the input and respond in that language. Output valid JSON only, following the schema provided.`;

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
// Normalize AI output to match frontend types
// ---------------------------------------------------------------------------
function normalizeOutput(data) {
  if (!data || typeof data !== "object") return data;

  // summary: keep as single string (frontend now expects string, not string[])
  if (Array.isArray(data.summary)) {
    data.summary = data.summary.join("\n\n");
  }
  if (typeof data.summary !== "string") {
    data.summary = "";
  }

  // keyConcepts: { definition } → { description }
  if (Array.isArray(data.keyConcepts)) {
    data.keyConcepts = data.keyConcepts.map((c) => ({
      term: c.term || "",
      description: c.definition || c.description || "",
    }));
  }

  // quiz: preserve options, correct index, and explanation for real multiple-choice UI
  if (Array.isArray(data.quiz)) {
    data.quiz = data.quiz.map((q) => {
      const hasOptions = Array.isArray(q.options) && q.options.length >= 2;
      return {
        question: q.question || "",
        options: hasOptions ? q.options : [],
        correct: typeof q.correct === "number" ? q.correct : 0,
        explanation: q.explanation || "",
      };
    });
  }

  // actionItems: { task, priority, exercisePrompt } → { id, title, owner, status, dueLabel, exercisePrompt }
  if (Array.isArray(data.actionItems)) {
    data.actionItems = data.actionItems.map((item, i) => {
      const normalized = {
        id: `ai-task-${i + 1}`,
        title: item.task || item.title || "",
        owner: "Stude AI",
        status: item.status || "pending",
        dueLabel: item.priority === "high" ? "Esta semana" : item.priority === "low" ? "Cuando puedas" : "Próxima clase",
      };
      if (item.exercisePrompt) normalized.exercisePrompt = item.exercisePrompt;
      return normalized;
    });
  }

  // insights: { type, message } → { id, label, value, description, tone }
  if (Array.isArray(data.insights)) {
    const toneMap = { info: "neutral", warning: "warning", success: "good" };
    const labelMap = { info: "Recomendación", warning: "Atención", success: "Bien hecho" };
    data.insights = data.insights.map((ins, i) => ({
      id: `ai-insight-${i + 1}`,
      label: labelMap[ins.type] || "Info",
      value: ins.type === "success" ? "✓" : ins.type === "warning" ? "!" : "i",
      description: ins.message || "",
      tone: toneMap[ins.type] || "neutral",
    }));
  }

  // mindMap: recursively normalize nodes (AI may return strings or missing id/label)
  if (data.mindMap) {
    let nodeCounter = 0;
    function normalizeMindMapNode(node) {
      if (typeof node === "string") {
        return { id: `ai-mm-${++nodeCounter}`, label: node };
      }
      if (!node || typeof node !== "object") return null;
      const normalized = {
        id: node.id || `ai-mm-${++nodeCounter}`,
        label: node.label || node.text || "",
      };
      if (node.accent) normalized.accent = node.accent;
      if (Array.isArray(node.children) && node.children.length > 0) {
        normalized.children = node.children.map(normalizeMindMapNode).filter(Boolean);
      }
      return normalized;
    }
    data.mindMap = normalizeMindMapNode(data.mindMap);
  }

  return data;
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
  const cacheKey = { transcript, language, generateMore, target: extras.target };
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

  const normalized = parsed ? normalizeOutput(parsed) : null;

  // --- Cache the successful response ---
  if (normalized) {
    cache.set("generation", cacheKey, normalized);
    structuredLog(context, "info", "Response cached successfully", {}, requestId);
  }

  jsonResponse(context, 200, {
    output: normalized ?? content,
    cached: false,
  }, requestId);
};
