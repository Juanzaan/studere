import { QuizAttempt, FlashcardAttempt } from "@/lib/types";

const QUIZ_KEY = "studere.quiz-attempts.v1";
const FLASHCARD_KEY = "studere.flashcard-attempts.v1";
export const ANALYTICS_UPDATED_EVENT = "studere:analytics-updated";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitAnalyticsUpdated() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(ANALYTICS_UPDATED_EVENT));
}

export function getQuizAttempts(): QuizAttempt[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(QUIZ_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QuizAttempt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuizAttempt(attempt: QuizAttempt) {
  if (!canUseStorage()) return;
  const attempts = getQuizAttempts();
  attempts.push(attempt);
  window.localStorage.setItem(QUIZ_KEY, JSON.stringify(attempts));
  emitAnalyticsUpdated();
}

export function getFlashcardAttempts(): FlashcardAttempt[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(FLASHCARD_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as FlashcardAttempt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFlashcardAttempt(attempt: FlashcardAttempt) {
  if (!canUseStorage()) return;
  const attempts = getFlashcardAttempts();
  attempts.push(attempt);
  window.localStorage.setItem(FLASHCARD_KEY, JSON.stringify(attempts));
  emitAnalyticsUpdated();
}
