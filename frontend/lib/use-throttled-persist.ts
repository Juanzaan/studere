/**
 * Throttled persistence hook — debounces session writes to localStorage.
 *
 * Accumulates rapid state changes and writes the latest snapshot after
 * `delay` ms of inactivity. Flushes pending writes on unmount to avoid
 * data loss.
 *
 * @param sessionId - ID of the session to persist
 * @param delay - Throttle delay in ms (default: 500)
 * @returns A function to call with the latest session state
 *
 * @example
 * ```tsx
 * const persist = useThrottledPersist(session.id, 300);
 * persist(currentSession); // will flush after 300ms of inactivity
 * ```
 */

import { useRef, useCallback, useEffect } from "react";
import { StudySession } from "@/lib/types";
import { patchSession } from "@/lib/storage";

export function useThrottledPersist(sessionId: string, delay = 500) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSessionRef = useRef<StudySession | null>(null);

  const persist = useCallback((session: StudySession) => {
    // Guardar el estado más reciente
    pendingSessionRef.current = session;

    // Cancelar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Programar guardado throttled
    timeoutRef.current = setTimeout(() => {
      if (pendingSessionRef.current) {
        patchSession(sessionId, pendingSessionRef.current);
        pendingSessionRef.current = null;
      }
    }, delay);
  }, [sessionId, delay]);

  // Flush pendiente al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (pendingSessionRef.current) {
        patchSession(sessionId, pendingSessionRef.current);
      }
    };
  }, [sessionId]);

  return persist;
}
