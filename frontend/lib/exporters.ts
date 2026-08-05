/**
 * Export utilities — convert session content to Markdown and CSV formats.
 *
 * Provides:
 * - {@link sessionToMarkdown}: Full session export as Markdown (summary, concepts,
 *   flashcards, quiz, transcript)
 * - {@link flashcardsToCsv}: Flashcard deck export as CSV (question, answer)
 * - {@link triggerDownload}: Trigger a browser file download from string content
 */

import { StudySession } from "@/lib/types";

/**
 * Export a session's full content as a Markdown document.
 * Includes: title, course, summary, key concepts, flashcards, quiz, and transcript.
 */
export function sessionToMarkdown(session: StudySession) {
  // Escape characters that would break Markdown structure when content is
  // user/AI-generated (leading #, >, -, |, *, _, backticks, [ ] etc.)
  const esc = (s: string) =>
    s.replace(/([\\`*_\[\]#|])/g, "\\$1")
      .replace(/^(\s*)([>\-+])/gm, "$1\\$2")
      .replace(/\r?\n/g, "\n");
  const escLine = (s: string) => esc(s).replace(/\r?\n/g, "<br>");
  const summary = esc(session.summary || "(Sin resumen)");
  const concepts = session.keyConcepts
    .map((item) => `- **${escLine(item.term)}**: ${escLine(item.description)}`)
    .join("\n");
  const flashcards = session.flashcards
    .map((item, index) => `${index + 1}. ${escLine(item.question)}\n   - ${escLine(item.answer)}`)
    .join("\n");
  const quiz = session.quiz
    .map((item, index) => `${index + 1}. ${escLine(item.question)}\n   - Respuesta: ${escLine(item.options?.[item.correct] || "")} ${item.explanation ? `— ${escLine(item.explanation)}` : ""}`)
    .join("\n");
  const transcript = session.transcript
    .map((item) => `- [${item.timestamp}] ${item.speaker}: ${escLine(item.text)}`)
    .join("\n");

  return `# ${escLine(session.title)}\n\n## Materia\n${escLine(session.course || "Sin materia")}\n\n## Resumen\n${summary}\n\n## Conceptos clave\n${concepts}\n\n## Flashcards\n${flashcards}\n\n## Quiz\n${quiz}\n\n## Transcripción\n${transcript}\n`;
}

/** Export flashcards as a CSV string with question/answer columns. Handles CSV escaping. */
export function flashcardsToCsv(session: StudySession) {
  const lines = ["question,answer"];

  for (const item of session.flashcards) {
    const question = item.question.replaceAll('"', '""');
    const answer = item.answer.replaceAll('"', '""');
    lines.push(`"${question}","${answer}"`);
  }

  return lines.join("\n");
}

/**
 * Trigger a browser file download by creating a temporary blob URL.
 * Works around Safari private-mode issues with Blob URLs.
 */
export function triggerDownload(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  let url: string;
  try {
    url = URL.createObjectURL(blob);
  } catch {
    console.error('[Export] Failed to create object URL (Safari private mode?)');
    return;
  }
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
