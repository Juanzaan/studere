import { StudySession } from "@/lib/types";

export function sessionToMarkdown(session: StudySession) {
  const summary = session.summary || "(Sin resumen)";
  const concepts = session.keyConcepts
    .map((item) => `- **${item.term}**: ${item.description}`)
    .join("\n");
  const flashcards = session.flashcards
    .map((item, index) => `${index + 1}. ${item.question}\n   - ${item.answer}`)
    .join("\n");
  const quiz = session.quiz
    .map((item, index) => `${index + 1}. ${item.question}\n   - Respuesta: ${item.options?.[item.correct] || ""} ${item.explanation ? `— ${item.explanation}` : ""}`)
    .join("\n");
  const transcript = session.transcript
    .map((item) => `- [${item.timestamp}] ${item.speaker}: ${item.text}`)
    .join("\n");

  return `# ${session.title}\n\n## Materia\n${session.course || "Sin materia"}\n\n## Resumen\n${summary}\n\n## Conceptos clave\n${concepts}\n\n## Flashcards\n${flashcards}\n\n## Quiz\n${quiz}\n\n## Transcripción\n${transcript}\n`;
}

export function flashcardsToCsv(session: StudySession) {
  const lines = ["question,answer"];

  for (const item of session.flashcards) {
    const question = item.question.replaceAll('"', '""');
    const answer = item.answer.replaceAll('"', '""');
    lines.push(`"${question}","${answer}"`);
  }

  return lines.join("\n");
}

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
