import { StateCreator } from 'zustand';
import { StudySession } from '@/lib/types';
import { normalizeSession } from '@/lib/session-utils';

export interface SessionsSlice {
  sessions: StudySession[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setSessions: (sessions: StudySession[]) => void;
  addSession: (session: StudySession) => void;
  updateSession: (id: string, updates: Partial<StudySession>) => void;
  deleteSession: (id: string) => void;
  getSessionById: (id: string) => StudySession | null;
  toggleStar: (id: string) => void;
  toggleStarred: (id: string) => void; // Alias for tests
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const createSessionsSlice: StateCreator<SessionsSlice> = (set, get) => ({
  sessions: [],
  isLoading: false,
  error: null,

  setSessions: (sessions) => set({ sessions: sessions.map(normalizeSession) }),

  addSession: (session) =>
    set((state) => ({
      sessions: [normalizeSession(session), ...state.sessions],
    })),

  updateSession: (id, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? normalizeSession({ ...s, ...updates }) : s
      ),
    })),

  deleteSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
    })),

  getSessionById: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    return session || null;
  },

  toggleStar: (id) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, starred: !s.starred } : s
      ),
    })),

  toggleStarred: (id) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, starred: !s.starred } : s
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
});
