import { StudySession, TranscriptSegment, Concept, Flashcard, QuizItem, ActionItem } from "@/lib/types";
import { createActionItems, createMindMap, createInsights, createWelcomeChat } from "@/lib/session-utils";

function normalizeTranscriptSegment(segment: TranscriptSegment, index: number): TranscriptSegment {
  return {
    id: segment.id || `seg-${index + 1}`,
    speaker: segment.speaker || (index % 2 === 0 ? "Profesor" : "Clase"),
    timestamp: segment.timestamp || `${String(index).padStart(2, "0")}:00`,
    text: segment.text || "",
  };
}

function isSentenceFragment(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  const lastChar = trimmed.slice(-1);
  const incompleteEnders = [",", ":", ";", "—", "-", "("];
  return incompleteEnders.includes(lastChar);
}

function wordOverlap(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter((w) => setB.has(w));
  return intersection.length / Math.max(setA.size, setB.size);
}

function filterConcepts(concepts: Concept[]): Concept[] {
  const filtered: Concept[] = [];
  const seenTerms = new Set<string>();
  for (const c of concepts) {
    const term = (c.term || "").trim();
    const description = (c.description || "").trim();
    const termWords = term.split(/\s+/).filter(Boolean);

    if (termWords.length < 2) {
      console.warn(`[Normalizer] Rejected concept: term too short (< 2 words): "${term}"`);
      continue;
    }
    if (description.split(/\s+/).filter(Boolean).length < 15) {
      console.warn(`[Normalizer] Rejected concept: description too short (< 15 words): "${term}"`);
      continue;
    }
    if (isSentenceFragment(description)) {
      console.warn(`[Normalizer] Rejected concept: description appears to be a fragment: "${term}"`);
      continue;
    }
    const lowerTerm = term.toLowerCase();
    if (seenTerms.has(lowerTerm)) {
      console.warn(`[Normalizer] Rejected concept: duplicate term: "${term}"`);
      continue;
    }
    seenTerms.add(lowerTerm);
    filtered.push({ term, description });
  }
  return filtered;
}

function dedupeFlashcards(cards: Flashcard[]): Flashcard[] {
  const deduped: Flashcard[] = [];
  for (const f of cards) {
    const question = (f.question || "").trim();
    const answer = (f.answer || "").trim();
    const isDuplicate = deduped.some((d) => wordOverlap(d.question, question) > 0.7);
    if (isDuplicate) {
      console.warn(`[Normalizer] Rejected flashcard: duplicate front (>70% overlap): "${question.slice(0, 60)}..."`);
      continue;
    }
    deduped.push({
      question,
      answer,
      confidence: ["easy", "good", "hard", "again"].includes(f.confidence || "") ? f.confidence : undefined,
    });
  }
  return deduped;
}

function validateQuiz(questions: QuizItem[]): QuizItem[] {
  const validated: QuizItem[] = [];
  for (const q of questions) {
    const question = (q.question || "").trim();
    const options = Array.isArray(q.options) ? q.options : [];
    const correct = typeof q.correct === "number" ? q.correct : 0;
    const explanation = (q.explanation || "").trim();

    if (options.length < 3) {
      console.warn(`[Normalizer] Rejected quiz question: fewer than 3 options: "${question.slice(0, 60)}..."`);
      continue;
    }
    if (correct < 0 || correct >= options.length) {
      console.warn(`[Normalizer] Rejected quiz question: correct index out of bounds (${correct}/${options.length}): "${question.slice(0, 60)}..."`);
      continue;
    }
    if (explanation.split(/\s+/).filter(Boolean).length < 20) {
      console.warn(`[Normalizer] Rejected quiz question: explanation too short (< 20 words): "${question.slice(0, 60)}..."`);
      continue;
    }
    validated.push({ question, options, correct, explanation });
  }
  return validated;
}

function validateTasks(items: ActionItem[]): ActionItem[] {
  const valid: ActionItem[] = [];
  for (const item of items) {
    const title = (item.title || "").trim();
    if (title.length === 0) {
      console.warn(`[Normalizer] Rejected action item: empty title`);
      continue;
    }
    if (title.split(/\s+/).filter(Boolean).length < 5) {
      console.warn(`[Normalizer] Rejected action item: title too short (< 5 words): "${title}"`);
      continue;
    }
    valid.push(item);
  }
  return valid;
}

export function normalizeSession(raw: StudySession): StudySession {
  const transcript = (raw.transcript || []).map(normalizeTranscriptSegment);
  // Backward compat: old sessions stored summary as string[], new ones as string
  const summary: string = Array.isArray((raw as any).summary)
    ? (raw as any).summary.join("\n\n")
    : (typeof raw.summary === "string" ? raw.summary : "");

  // Summary quality warning
  if (summary.length < 200 || !summary.includes("\n")) {
    console.warn(`[Normalizer] Summary quality warning: length=${summary.length}, hasNewlines=${summary.includes("\n")}`);
  }

  const keyConcepts = filterConcepts(Array.isArray(raw.keyConcepts) ? raw.keyConcepts : []);
  const flashcards = dedupeFlashcards(Array.isArray(raw.flashcards) ? raw.flashcards : []);
  const quiz = validateQuiz(Array.isArray(raw.quiz) ? raw.quiz : []);
  const studyMetrics = {
    completionRate: raw.studyMetrics?.completionRate ?? Math.min(100, Math.max(0, Math.round(((raw.actionItems?.filter((item) => item.status === "completed").length || 0) / Math.max(raw.actionItems?.length || 3, 1)) * 100))),
    quizAccuracy: raw.studyMetrics?.quizAccuracy ?? 0,
    reviewCount: raw.studyMetrics?.reviewCount ?? 0,
    lastReviewedAt: raw.studyMetrics?.lastReviewedAt,
  };

  const baseSession: StudySession = {
    ...raw,
    starred: raw.starred ?? false,
    templateId: raw.templateId ?? "class-summary",
    transcript,
    summary,
    keyConcepts,
    flashcards,
    quiz,
    actionItems: validateTasks(raw.actionItems?.length ? raw.actionItems : createActionItems({
      id: raw.id,
      summary,
      keyConcepts,
      quiz,
      transcript,
    })),
    mindMap: raw.mindMap ?? createMindMap({
      id: raw.id,
      title: raw.title,
      summary,
      keyConcepts,
      quiz,
    }),
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
    comments: Array.isArray(raw.comments) ? raw.comments : [],
    chatHistory: raw.chatHistory?.length ? raw.chatHistory : createWelcomeChat({
      id: raw.id,
      title: raw.title,
      course: raw.course,
      summary,
    }),
    stats: {
      wordCount: raw.stats?.wordCount ?? transcript.reduce((sum, item) => sum + item.text.split(/\s+/).filter(Boolean).length, 0),
      segmentCount: raw.stats?.segmentCount ?? transcript.length,
      estimatedDurationMinutes: raw.stats?.estimatedDurationMinutes ?? Math.max(5, Math.round((raw.stats?.wordCount ?? 0) / 110)),
    },
    studyMetrics,
    insights: raw.insights?.length ? raw.insights : createInsights({
      keyConcepts,
      stats: {
        wordCount: raw.stats?.wordCount ?? transcript.reduce((sum, item) => sum + item.text.split(/\s+/).filter(Boolean).length, 0),
        segmentCount: raw.stats?.segmentCount ?? transcript.length,
        estimatedDurationMinutes: raw.stats?.estimatedDurationMinutes ?? Math.max(5, Math.round((raw.stats?.wordCount ?? 0) / 110)),
      },
      studyMetrics,
      quiz,
      summary,
    }),
  };

  return baseSession;
}
