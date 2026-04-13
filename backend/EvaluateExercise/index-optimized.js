/**
 * EvaluateExercise - OPTIMIZED VERSION
 * Optimizaciones:
 * - ✅ Shared client
 * - ✅ Timeout
 * - ✅ Retry logic
 * - ✅ Structured logging
 * - ✅ Request ID tracking
 * - ✅ Dynamic maxTokens
 * - ✅ Input validation
 */

const { getClient, getDeployment } = require("../shared/openai-client");
const { jsonResponse, getRequestId, calculateMaxTokens, structuredLog, withTimeout, retryWithBackoff } = require("../shared/utils");

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

  const { exercise, studentAnswer, context: sessionContext, answerType } = req.body || {};

  if (!exercise || !studentAnswer) {
    jsonResponse(context, 400, { error: "Request must include 'exercise' and 'studentAnswer'." }, requestId);
    return;
  }

  structuredLog(context, "info", "Evaluating exercise", {
    exerciseLength: exercise.length,
    answerType: answerType || "text",
  }, requestId);

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

  // Calculate dynamic maxTokens
  const maxTokens = calculateMaxTokens(exercise + studentAnswer, 1500);

  try {
    const completion = await withTimeout(
      retryWithBackoff(
        () => client.getChatCompletions(deployment, messages, {
          temperature: 0.3,
          maxTokens,
        }),
        2, // max 2 retries
        1000 // 1s base delay
      ),
      REQUEST_TIMEOUT_MS,
      "Evaluation request timed out"
    );

    const content = completion.choices?.[0]?.message?.content?.trim();
    let parsed;
    try {
      parsed = content ? JSON.parse(content) : null;
    } catch {
      structuredLog(context, "warn", "Model returned non-JSON for exercise eval", {
        contentLength: content?.length,
      }, requestId);
      parsed = { grade: "partial", explanation: content || "No se pudo evaluar la respuesta." };
    }

    if (parsed && !parsed.grade) {
      parsed.grade = "partial";
    }
    if (parsed && !parsed.explanation) {
      parsed.explanation = "Sin explicación disponible.";
    }

    structuredLog(context, "info", "Evaluation complete", {
      grade: parsed.grade,
    }, requestId);

    jsonResponse(context, 200, parsed, requestId);
  } catch (error) {
    structuredLog(context, "error", "EvaluateExercise error", {
      error: error.message,
      code: error.code,
    }, requestId);
    
    jsonResponse(context, 500, { error: error.message || "Unknown error" }, requestId);
  }
};
