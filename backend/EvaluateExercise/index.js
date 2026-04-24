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

const SYSTEM_PROMPT = `You are Stude, an educational tutor inside the Studere platform. A student has completed an exercise from their study session and submitted their answer for evaluation. Your goal is genuinely educational feedback — not just grading.

=== EVALUATION PRINCIPLES ===
1. Detect the language of the exercise and context. Respond ENTIRELY in that language.
2. Grade levels — use exactly one of these strings:
   - "correcto" — the answer is fully correct and demonstrates solid understanding.
   - "parcialmente correcto" — the answer has some valid elements but misses key parts or contains errors.
   - "incorrecto" — the answer is fundamentally wrong or shows a serious misconception.

=== FEEDBACK DEPTH ===
For CORRECT answers:
- Confirm specifically what the student got right (name the concept or reasoning step).
- ADD something extra they may not have considered: a related edge case, a deeper implication, or a connection to another concept from the session.
- This turns a "pat on the back" into a learning moment.

For PARTIALLY CORRECT answers:
- Identify EXACTLY what is missing. Do not just say "incompleto." Name the missing concept, step, or condition.
- Point out any errors clearly but without being harsh.
- Show the complete correct reasoning, integrating the parts the student already understood.

For INCORRECT answers:
- Identify the specific misconception. Do not just say "está mal." Name the wrong assumption or the confused concept.
- Explain the correct reasoning STEP BY STEP, starting from a principle the student likely understands.
- Provide a concrete example or analogy to clear up the confusion.
- If the error is a common one, say so: "Es un error común pensar que..."

=== FORMATTING ===
- Respond with valid JSON only — no markdown fences, no extra text.
- In the "explanation" field, use markdown richly:
  * **bold** for key terms, definitions, and correct conclusions.
  * Bullet lists for specific points or steps.
  * $math$ for formulas and mathematical reasoning.
  * \`code\` for programming terms or code snippets.
- Structure the explanation logically: (1) grade announcement, (2) what was right/wrong, (3) correct reasoning, (4) extra insight or next step.

=== IMAGE ANSWERS ===
- If the student submitted an image (handwritten work, diagram, etc.), evaluate it with the same rigor as text.
- Describe what you see in the image briefly, then evaluate the reasoning shown.
- If handwriting is unclear, note which parts you could not interpret.

=== CLOSING ===
- Always end on an encouraging but honest note. If the answer was wrong, emphasize that mistakes are part of learning and that the student is now closer to understanding.
- Include ONE concrete next step: "Ahora probá con...", "Revisá...", or "Pensá qué pasaría si..."

JSON schema:
{
  "grade": "correcto | parcialmente correcto | incorrecto",
  "explanation": "markdown string with detailed, educational feedback"
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
