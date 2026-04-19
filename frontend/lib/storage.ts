import { StudySession } from "@/lib/types";
import { normalizeSession } from "@/lib/session-utils";
import { canUseStorage, safeSetItem } from "@/lib/local-storage-guard";

const STORAGE_KEY = "studere.sessions.v1";
export const SESSIONS_UPDATED_EVENT = "studere:sessions-updated";

function emitSessionsUpdated() {
  if (!canUseStorage()) {
    return;
  }

  window.dispatchEvent(new Event(SESSIONS_UPDATED_EVENT));
}

export function getSessions(): StudySession[] {
  if (!canUseStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

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

export function saveSessions(sessions: StudySession[]) {
  if (!canUseStorage()) {
    return;
  }

  const success = safeSetItem(STORAGE_KEY, JSON.stringify(sessions.map((session) => normalizeSession(session))));
  if (!success) {
    console.warn('[Storage] Session data could not be saved — storage full');
    return;
  }
  emitSessionsUpdated();
}

export function upsertSession(session: StudySession) {
  const sessions = getSessions();
  const index = sessions.findIndex((item) => item.id === session.id);
  const normalized = normalizeSession(session);

  if (index >= 0) {
    sessions[index] = normalized;
  } else {
    sessions.unshift(normalized);
  }

  saveSessions(sessions);
}

export function deleteSession(id: string) {
  const sessions = getSessions().filter((session) => session.id !== id);
  saveSessions(sessions);
}

export function getSessionById(id: string) {
  return getSessions().find((session) => session.id === id) ?? null;
}

export function patchSession(id: string, patch: Partial<StudySession>) {
  const session = getSessionById(id);

  if (!session) {
    return null;
  }

  const nextSession = normalizeSession({
    ...session,
    ...patch,
  });

  upsertSession(nextSession);
  return nextSession;
}
