import { useEffect } from 'react';
import { useStore } from '@/src/store';
import { getSessions, saveSessions, SESSIONS_UPDATED_EVENT } from '@/lib/storage';

/**
 * Custom hook to sync Zustand store with localStorage
 * Handles bidirectional sync and cross-tab updates
 */
export function useSessionStorage() {
  const { sessions, setSessions } = useStore();

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = getSessions();
    if (stored.length > 0) {
      setSessions(stored);
    }
  }, [setSessions]);

  // Sync store changes to localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      saveSessions(sessions);
    }
  }, [sessions]);

  // Listen for cross-tab updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      const updated = getSessions();
      setSessions(updated);
    };

    window.addEventListener(SESSIONS_UPDATED_EVENT, handleStorageUpdate);
    
    return () => {
      window.removeEventListener(SESSIONS_UPDATED_EVENT, handleStorageUpdate);
    };
  }, [setSessions]);

  return {
    sessions,
    isLoaded: sessions.length > 0,
  };
}
