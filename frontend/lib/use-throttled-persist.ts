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
