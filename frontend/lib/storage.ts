/**
 * localStorage persistence layer for study sessions.
 *
 * All reads run through {@link normalizeSession} for validation.
 * All writes are guarded by {@link canUseStorage} and {@link safeSetItem}
 * to handle quota errors gracefully.
 *
 * Dispatches {@link SESSIONS_UPDATED_EVENT} on every successful write so
 * other components (dashboard, library) can reactively update.
 */

import { StudySession } from "@/lib/types";
import { normalizeSession } from "@/lib/session-utils";
import { canUseStorage, safeGetItem, safeSetItem } from "@/lib/local-storage-guard";

/** localStorage key under which all sessions are stored. */
export const STORAGE_KEY = "studere.sessions.v1";

/**
 * Custom event dispatched on `window` whenever sessions data is modified.
 * Listeners can re-read sessions to stay in sync.
 */
export const SESSIONS_UPDATED_EVENT = "studere:sessions-updated";

/** Dispatch SESSIONS_UPDATED_EVENT if localStorage is available. */
function emitSessionsUpdated() {
  if (!canUseStorage()) {
    return;
  }

  window.dispatchEvent(new Event(SESSIONS_UPDATED_EVENT));
}

/**
 * Retrieve all stored sessions, normalized.
 * Returns empty array if storage is unavailable, data is corrupt, or no sessions exist.
 */
export function getSessions(): StudySession[] {
  if (!canUseStorage()) {
    return [];
  }

  const raw = safeGetItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StudySession[];
    return Array.isArray(parsed) ? parsed.map((session) => normalizeSession(session)) : [];
  } catch {
    return [];
  }
}

/**
 * Replace all stored sessions with a new array.
 * Values are persisted AS PROVIDED — normalization happens on READ only
 * (see {@link getSessions}). This is intentional: normalizing on write
 * silently strips data (duplicate flashcards, cleared chat histories,
 * emptied action items) and would resurrect content the user deleted.
 *
 * @returns True if the write succeeded, false if it was skipped (no storage
 *          available) or failed (e.g. quota exceeded).
 */
export function saveSessions(sessions: StudySession[]): boolean {
  if (!canUseStorage()) {
    return false;
  }

  const success = safeSetItem(STORAGE_KEY, JSON.stringify(sessions));
  if (!success) {
    console.warn('[Storage] Session data could not be saved — storage full');
    return false;
  }
  emitSessionsUpdated();
  return true;
}

/**
 * Insert or update a single session.
 * If a session with the same ID exists, it is replaced.
 * Otherwise, the new session is prepended (most recent first).
 * The session is persisted as provided (normalization happens on read).
 *
 * @returns True if the write succeeded, false if storage was unavailable
 *          or the quota was exceeded (caller should surface the failure).
 */
export function upsertSession(session: StudySession): boolean {
  const sessions = getSessions();
  const index = sessions.findIndex((item) => item.id === session.id);

  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }

  return saveSessions(sessions);
}

/**
 * Delete a session by its ID.
 */
export function deleteSession(id: string) {
  const sessions = getSessions().filter((session) => session.id !== id);
  saveSessions(sessions);
}

/**
 * Retrieve a single session by ID, or null if not found.
 */
export function getSessionById(id: string) {
  return getSessions().find((session) => session.id === id) ?? null;
}

/**
 * Apply a partial update to an existing session.
 * Merges the patch into the existing session and saves it as provided
 * (normalization happens on read).
 *
 * @param id - Session ID to patch
 * @param patch - Partial StudySession fields to merge
 * @returns The merged session, or null if not found
 */
export function patchSession(id: string, patch: Partial<StudySession>) {
  const session = getSessionById(id);

  if (!session) {
    return null;
  }

  const nextSession = {
    ...session,
    ...patch,
  };

  upsertSession(nextSession);
  return nextSession;
}
