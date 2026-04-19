/**
 * StudeChat - OPTIMIZED VERSION
 * Optimizaciones:
 * - ✅ Shared client
 * - ✅ Caching de respuestas comunes
 * - ✅ Timeout
 * - ✅ Retry logic
 * - ✅ Structured logging
 * - ✅ Request ID tracking
 * - ✅ Dynamic maxTokens
 */

const { getClient, getDeployment } = require("../shared/openai-client");
const cache = require("../shared/cache");
const { jsonResponse, getRequestId, calculateMaxTokens, structuredLog, withTimeout, retryWithBackoff, buildCacheKey } = require("../shared/utils");

const SYSTEM_PROMPT = `You are Stude, the AI study tutor inside the Studere platform. You help university and high-school students review, understand, and master the material from their study sessions.

You have access to the student's session context (summary, key concepts, transcript snippets). Use this context to give accurate, helpful answers grounded in what was actually covered in class.

Guidelines:
1. Detect the language of the conversation and respond in that same language.
2. Be concise but thorough — aim for helpful, educational responses.
3. Use markdown formatting: **bold** for key terms, bullet points for lists, $..$ for math (KaTeX), \`code\` for programming.
4. Be encouraging and supportive. If the student is confused, break things down step by step.
5. If asked about something not in the session context, say so honestly but still try to help.
6. For exam prep questions, focus on likely exam topics and common mistakes.
7. Keep responses under 500 words unless the student asks for more detail.`;

const MAX_CONTEXT_LENGTH = 8000;
const MAX_HISTORY = 20;
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds

module.exports = async function (context, req) {
  const requestId = getRequestId(req);
  
  if (req.method === "OPTIONS") {
    jsonResponse(context, 204, "", requestId);
    return;
  }

  const client = getClient();
  const deployment = getDeployment();
  
  if (!client) {
    jsonResponse(context, 500, { error: "Azure OpenAI client is not configured." }, requestId);
    return;
  }

  const { message, sessionContext, chatHistory } = req.body || {};

  if (!message || typeof message !== "string") {
    jsonResponse(context, 400, { error: "Request must include a 'message' string." }, requestId);
    return;
  }

  // --- Check cache for common questions ---
  const cacheKey = buildCacheKey('chat', message.toLowerCase().trim(), sessionContext?.title);
  const cached = cache.get("chat", cacheKey);
  if (cached) {
    structuredLog(context, "info", "Cache hit - returning cached chat response", {}, requestId);
    jsonResponse(context, 200, { reply: cached, cached: true }, requestId);
    return;
  }

  // Build context string from session data
  const ctxParts = [];
  if (sessionContext?.title) ctxParts.push(`Session: "${sessionContext.title}"`);
  if (sessionContext?.course) ctxParts.push(`Course: ${sessionContext.course}`);
  if (sessionContext?.summary) {
    const summary = sessionContext.summary.length > 3000
      ? sessionContext.summary.slice(0, 3000) + "..."
      : sessionContext.summary;
    ctxParts.push(`Summary:\n${summary}`);
  }
  if (sessionContext?.concepts && sessionContext.concepts.length > 0) {
    const conceptsStr = sessionContext.concepts
      .slice(0, 10)
      .map((c) => `- ${c.term}: ${c.description}`)
      .join("\n");
    ctxParts.push(`Key Concepts:\n${conceptsStr}`);
  }
  if (sessionContext?.transcriptSnippet) {
    const snippet = sessionContext.transcriptSnippet.length > 2000
      ? sessionContext.transcriptSnippet.slice(0, 2000) + "..."
      : sessionContext.transcriptSnippet;
    ctxParts.push(`Transcript excerpt:\n${snippet}`);
  }

  let contextBlock = ctxParts.join("\n\n");
  if (contextBlock.length > MAX_CONTEXT_LENGTH) {
    contextBlock = contextBlock.slice(0, MAX_CONTEXT_LENGTH) + "...";
  }

  const systemWithContext = contextBlock
    ? `${SYSTEM_PROMPT}\n\n--- SESSION CONTEXT ---\n${contextBlock}\n--- END CONTEXT ---`
    : SYSTEM_PROMPT;

  // Build messages array
  const messages = [{ role: "system", content: systemWithContext }];

  // Add recent chat history (limit to avoid token overflow)
  if (Array.isArray(chatHistory)) {
    const recent = chatHistory.slice(-MAX_HISTORY);
    for (const msg of recent) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  // Add current user message
  messages.push({ role: "user", content: message });

  // Calculate dynamic maxTokens
  const maxTokens = calculateMaxTokens(message, 1500);

  structuredLog(context, "info", "Processing chat message", {
    messageLength: message.length,
    historyLength: chatHistory?.length || 0,
    maxTokens,
  }, requestId);

  try {
    const completion = await withTimeout(
      retryWithBackoff(
        () => client.getChatCompletions(deployment, messages, {
          temperature: 0.4,
          maxTokens,
        }),
        2, // max 2 retries
        1000 // 1s base delay
      ),
      REQUEST_TIMEOUT_MS,
      "Chat request timed out"
    );

    const reply = completion.choices?.[0]?.message?.content?.trim() || "Lo siento, no pude generar una respuesta.";

    // Cache common responses
    cache.set("chat", cacheKey, reply);

    structuredLog(context, "info", "Chat response generated", {
      replyLength: reply.length,
    }, requestId);

    jsonResponse(context, 200, { reply, cached: false }, requestId);
  } catch (error) {
    structuredLog(context, "error", "StudeChat error", {
      error: error.message,
      code: error.code,
    }, requestId);

    if (error?.code === "content_filter") {
      jsonResponse(context, 200, {
        reply: "No pude responder esa pregunta por restricciones de contenido. Intentá reformularla de otra manera.",
      }, requestId);
      return;
    }

    jsonResponse(context, 500, { error: error.message || "Unknown error" }, requestId);
  }
};
