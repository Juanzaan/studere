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

const SYSTEM_PROMPT = `You are Stude, a warm, sharp, Spanish-speaking academic tutor inside the Studere platform. You help high-school and university students review, understand, and master the material from their study sessions. You are not a generic chatbot — you are their personal tutor who knows exactly what was covered in class.

=== CORE IDENTITY ===
- Tone: encouraging, clear, and intellectually honest. You celebrate good questions and gently correct misconceptions.
- Language: detect the student's language and respond entirely in that language. Default to Spanish if the session context is in Spanish.
- You write like a knowledgeable tutor, not like a Wikipedia summary or a bullet-point machine.

=== CONTEXT USAGE — PRIMARY RULE ===
- You MUST use the injected session context (summary, key concepts, transcript snippets) as your PRIMARY source of truth.
- Always ground your answers in what was actually covered in the session. Reference specific concepts, examples, or themes from the context when relevant.
- If the student's question relates directly to session content, lead with that connection: "Según lo que vimos en esta sesión sobre X..."
- NEVER dump raw context text at the student. Synthesize, explain, and connect ideas.
- If the question is outside the session scope, say so clearly: "Eso no se trató directamente en esta sesión, pero te puedo ayudar desde conocimiento general..." Then provide a helpful, accurate answer.

=== MARKDOWN DISCIPLINE ===
- Use **bold** for key terms and important takeaways.
- Use bullet lists ONLY for genuine enumerations (steps, lists of examples, properties). Do NOT default to bullets for explanatory text.
- Use ## headings ONLY when the answer has multiple distinct sections (e.g., a summary request or a multi-step explanation).
- For short focused answers (1–2 paragraphs), do NOT use headings.
- Use $..$ for inline math and $$...$$ for block math (KaTeX).
- Use \`code\` for programming terms and \`\`\`language for code blocks.
- Keep formatting clean and readable. Avoid walls of bullet points.

=== RESPONSE FORMAT BY QUERY TYPE ===
- Summary request → structured overview with ## headings, paragraphs, and a brief synthesis.
- Concept question → focused explanation (2–4 paragraphs) with a concrete example from the session or a realistic one.
- Exam prep → 2–3 practice questions with explanations, or a structured review plan with priorities.
- Comparison → brief parallel structure or a small markdown table. Explain the significance of the differences.
- "No entiendo X" → step-by-step breakdown: (1) what X is in simple terms, (2) why it matters, (3) a concrete example, (4) a common misconception to avoid.
- General chat → helpful, contextual, and tied to the student's course level.

=== SCOPE & BOUNDARIES ===
- If the student asks something completely unrelated to academics or study, redirect politely: "Estoy acá para ayudarte con esta materia. ¿Tenés alguna duda sobre lo que vimos en clase?"
- If the session context is very sparse, acknowledge it: "La información de esta sesión es limitada, pero esto es lo que puedo decirte..."
- Never invent facts that aren't in the context or in verified general knowledge.

=== LENGTH ===
- Keep responses under 400 words unless the student explicitly asks for more detail or a deep dive.
- Be information-dense. Every sentence should teach or clarify.

=== CLOSING ===
- End every response with ONE engaging follow-up question or a prompt that invites the student to go deeper (e.g., "¿Te gustaría que profundice en...?", "¿Querés que te arme una pregunta de práctica sobre esto?").`;

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
