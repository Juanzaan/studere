const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

const client = endpoint && apiKey ? new OpenAIClient(endpoint, new AzureKeyCredential(apiKey)) : null;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonRes(context, status, body) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body,
  };
}

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

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    jsonRes(context, 204, "");
    return;
  }

  if (!client) {
    jsonRes(context, 500, { error: "Azure OpenAI client is not configured." });
    return;
  }

  const { message, sessionContext, chatHistory } = req.body || {};

  if (!message || typeof message !== "string") {
    jsonRes(context, 400, { error: "Request must include a 'message' string." });
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

  try {
    const completion = await client.getChatCompletions(deployment, messages, {
      temperature: 0.4,
      maxTokens: 2000,
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "Lo siento, no pude generar una respuesta.";

    jsonRes(context, 200, { reply });
  } catch (error) {
    context.log.error("StudeChat error:", error.message);

    if (error?.code === "content_filter") {
      jsonRes(context, 200, {
        reply: "No pude responder esa pregunta por restricciones de contenido. Intentá reformularla de otra manera.",
      });
      return;
    }

    jsonRes(context, 500, { error: error.message || "Unknown error" });
  }
};
