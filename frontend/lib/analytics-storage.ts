/**
 * Analytics persistence layer — stores quiz and flashcard attempt history.
 *
 * Separate from session storage to allow independent read/write patterns.
 * Dispatches {@link ANALYTICS_UPDATED_EVENT} on writes for reactive UI updates.
 */

import { QuizAttempt, FlashcardAttempt } from "@/lib/types";
import { canUseStorage, safeSetItem } from "@/lib/local-storage-guard";

const QUIZ_KEY = "studere.quiz-attempts.v1";
const FLASHCARD_KEY = "studere.flashcard-attempts.v1";

/** Custom event dispatched on successful analytics write. */
export const ANALYTICS_UPDATED_EVENT = "studere:analytics-updated";

function emitAnalyticsUpdated() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(ANALYTICS_UPDATED_EVENT));
}

/**
 * Retrieve all stored quiz attempts.
 * Returns empty array if storage is unavailable or data is corrupt.
 */
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

/** Append a quiz attempt to the history. */
export function saveQuizAttempt(attempt: QuizAttempt) {
  if (!canUseStorage()) return;
  const attempts = getQuizAttempts();
  attempts.push(attempt);
  const success = safeSetItem(QUIZ_KEY, JSON.stringify(attempts));
  if (success) {
    emitAnalyticsUpdated();
  }
}

/**
 * Retrieve all stored flashcard attempts.
 * Returns empty array if storage is unavailable or data is corrupt.
 */
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

/** Append a flashcard attempt to the history. */
export function saveFlashcardAttempt(attempt: FlashcardAttempt) {
  if (!canUseStorage()) return;
  const attempts = getFlashcardAttempts();
  attempts.push(attempt);
  const success = safeSetItem(FLASHCARD_KEY, JSON.stringify(attempts));
  if (success) {
    emitAnalyticsUpdated();
  }
}
