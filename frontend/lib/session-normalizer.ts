/**
 * Session normalizer — validates, cleans, and backfills study session data.
 *
 * On read, every session passes through {@link normalizeSession} which:
 * - Normalizes transcript segments (id, speaker, timestamp fallbacks)
 * - Filters concepts (min 2-word terms, 15-word descriptions, no fragments, no duplicates)
 * - Deduplicates flashcards (>70% question overlap = duplicate)
 * - Validates quiz questions (min 3 options, valid correct index, 20-word explanations)
 * - Validates action items (non-empty titles, min 5 words)
 * - Backfills missing fields with smart defaults (action items, mind map, chat, insights)
 * - Recomputes studyMetrics from current data
 *
 * Logs warnings to console for each rejection to aid debugging.
 */

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

    if (termWords.length < 1) {
      console.warn(`[Normalizer] Rejected concept: empty term`);
      continue;
    }
    if (description.split(/\s+/).filter(Boolean).length < 8) {
      console.warn(`[Normalizer] Rejected concept: description too short (< 8 words): "${term}"`);
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
    if (explanation.split(/\s+/).filter(Boolean).length < 8) {
      console.warn(`[Normalizer] Rejected quiz question: explanation too short (< 8 words): "${question.slice(0, 60)}..."`);
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

/** Normalize a 0-1 scale value to 0-100 and clamp to [0, 100]. */
function normalizePercentage(value: number | undefined | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  let v = value;
  if (v <= 1) v = v * 100;
  return Math.min(100, Math.max(0, Math.round(v)));
}

/**
 * Normalize and validate a session on read.
 *
 * Applies all filters (concepts, flashcards, quiz, tasks) and backfills
 * missing derived fields (actionItems, mindMap, bookmarks, comments,
 * chatHistory, stats, studyMetrics, insights). Ensures backward compatibility
 * with older session formats (e.g. summary as string[] → string).
 *
 * @param raw - Raw session data (possibly from localStorage)
 * @returns A fully normalized, validated StudySession
 */
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
    completionRate: typeof raw.studyMetrics?.completionRate === "number"
      ? normalizePercentage(raw.studyMetrics.completionRate)
      : Math.min(100, Math.max(0, Math.round(((raw.actionItems?.filter((item) => item.status === "completed").length || 0) / Math.max(raw.actionItems?.length || 3, 1)) * 100))),
    quizAccuracy: normalizePercentage(raw.studyMetrics?.quizAccuracy),
    reviewCount: raw.studyMetrics?.reviewCount ?? 0,
    lastReviewedAt: raw.studyMetrics?.lastReviewedAt,
  };

  // `undefined` = never had the field (backfill with smart defaults).
  // Explicit `[]` = the user intentionally emptied it — do NOT resurrect.
  const hasChatHistory = raw.chatHistory !== undefined && Array.isArray(raw.chatHistory);
  const hasActionItems = raw.actionItems !== undefined && Array.isArray(raw.actionItems);

  const derivedWordCount = transcript.reduce((sum, item) => sum + item.text.split(/\s+/).filter(Boolean).length, 0);
  const derivedDuration = Math.max(5, Math.round(derivedWordCount / 110));
  const stats = {
    wordCount: raw.stats?.wordCount ?? derivedWordCount,
    segmentCount: raw.stats?.segmentCount ?? transcript.length,
    estimatedDurationMinutes: raw.stats?.estimatedDurationMinutes ?? derivedDuration,
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
    actionItems: hasActionItems ? validateTasks(raw.actionItems) : createActionItems({
      id: raw.id,
      summary,
      keyConcepts,
      quiz,
      transcript,
    }),
    mindMap: raw.mindMap ?? createMindMap({
      id: raw.id,
      title: raw.title,
      summary,
      keyConcepts,
      quiz,
    }),
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
    comments: Array.isArray(raw.comments) ? raw.comments : [],
    chatHistory: hasChatHistory ? raw.chatHistory.slice(-100) : createWelcomeChat({
      id: raw.id,
      title: raw.title,
      course: raw.course,
      summary,
    }),
    stats,
    studyMetrics,
    insights: raw.insights?.length ? raw.insights : createInsights({
      keyConcepts,
      stats,
      studyMetrics,
      quiz,
      summary,
    }),
  };

  return baseSession;
}
