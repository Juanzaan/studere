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

const SYSTEM_PROMPT = `You are Stude, an educational tutor inside the Studere platform. A student has completed an exercise from their study session and submitted their answer for evaluation.

Your job:
1. Evaluate whether the student's answer is correct, partially correct, or incorrect.
2. Explain what was right, what was wrong, and why.
3. Provide the correct solution with a clear explanation.
4. Be encouraging but honest — help them learn from mistakes.

Detect the language of the exercise/context and respond in that same language.

Respond with valid JSON only — no markdown fences, no extra text. Use this schema:
{
  "grade": "correct | partial | incorrect",
  "explanation": "markdown string with detailed feedback (use **bold**, bullet points, $math$ for formulas, \`code\` for programming)"
}`;

module.exports = async function (context, req) {
  if (req.method === "OPTIONS") {
    jsonRes(context, 204, "");
    return;
  }

  if (!client) {
    jsonRes(context, 500, { error: "Azure OpenAI client is not configured." });
    return;
  }

  const { exercise, studentAnswer, context: sessionContext, answerType } = req.body || {};

  if (!exercise || !studentAnswer) {
    jsonRes(context, 400, { error: "Request must include 'exercise' and 'studentAnswer'." });
    return;
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Build user message — for images, include as vision content
  if (answerType === "image") {
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `Exercise: ${exercise}\n\nSession context: ${sessionContext || "N/A"}\n\nThe student submitted a photo of their handwritten answer (shown below). Evaluate it.`,
        },
        {
          type: "image_url",
          imageUrl: { url: studentAnswer },
        },
      ],
    });
  } else {
    messages.push({
      role: "user",
      content: `Exercise: ${exercise}\n\nSession context: ${sessionContext || "N/A"}\n\nStudent's answer:\n${studentAnswer}\n\nEvaluate the answer.`,
    });
  }

  try {
    const completion = await client.getChatCompletions(deployment, messages, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    let parsed;
    try {
      parsed = content ? JSON.parse(content) : null;
    } catch {
      context.log.warn("Model returned non-JSON for exercise eval:", content);
      parsed = { grade: "partial", explanation: content || "No se pudo evaluar la respuesta." };
    }

    if (parsed && !parsed.grade) {
      parsed.grade = "partial";
    }
    if (parsed && !parsed.explanation) {
      parsed.explanation = "Sin explicación disponible.";
    }

    jsonRes(context, 200, parsed);
  } catch (error) {
    context.log.error("EvaluateExercise error:", error.message);
    jsonRes(context, 500, { error: error.message || "Unknown error" });
  }
};
