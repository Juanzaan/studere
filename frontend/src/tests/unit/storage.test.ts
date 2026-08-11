import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSessions,
  saveSessions,
  upsertSession,
  deleteSession,
  getSessionById,
  patchSession,
} from '@/lib/storage';
import { StudySession } from '@/lib/types';

describe('storage.ts', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockSession: StudySession = {
    id: 'test-123',
    title: 'Test Session',
    course: 'Test Course',
    createdAt: new Date().toISOString(),
    summary: 'Test summary',
    keyConcepts: [],
    flashcards: [],
    quiz: [],
    transcript: [],
    starred: false,
    sourceFileName: 'test.mp3',
    sourceFileType: 'audio/mp3',
    sourceKind: 'audio',
    templateId: 'class-summary',
    bookmarks: [],
    comments: [],
    insights: [],
    actionItems: [],
    mindMap: { id: 'root', label: 'Test', children: [] },
    chatHistory: [],
    stats: {
      wordCount: 100,
      segmentCount: 5,
      estimatedDurationMinutes: 5,
    },
    studyMetrics: {
      completionRate: 0,
      quizAccuracy: 0,
      reviewCount: 0,
    },
  };

  describe('getSessions', () => {
    it('should return empty array when no sessions stored', () => {
      const sessions = getSessions();
      expect(sessions).toEqual([]);
    });

    it('should return stored sessions', () => {
      saveSessions([mockSession]);
      const sessions = getSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe('test-123');
    });

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem('studere.sessions.v1', 'invalid json');
      const sessions = getSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('saveSessions', () => {
    it('should save sessions to localStorage', () => {
      saveSessions([mockSession]);
      const stored = localStorage.getItem('studere.sessions.v1');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
    });

    it('should normalize sessions before saving', () => {
      const unnormalized = { ...mockSession, summary: ['old', 'format'] } as any;
      saveSessions([unnormalized]);
      const sessions = getSessions();
      expect(typeof sessions[0].summary).toBe('string');
    });
  });

  describe('upsertSession', () => {
    it('should add new session at the beginning', () => {
      upsertSession(mockSession);
      const sessions = getSessions();
      expect(sessions[0].id).toBe('test-123');
    });

    it('should update existing session', () => {
      upsertSession(mockSession);
      const updated = { ...mockSession, title: 'Updated Title' };
      upsertSession(updated);
      const sessions = getSessions();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].title).toBe('Updated Title');
    });
  });

  describe('deleteSession', () => {
    it('should remove session by id', () => {
      upsertSession(mockSession);
      deleteSession('test-123');
      const sessions = getSessions();
      expect(sessions).toHaveLength(0);
    });

    it('should not throw if session does not exist', () => {
      expect(() => deleteSession('nonexistent')).not.toThrow();
    });
  });

  describe('getSessionById', () => {
    it('should return session when found', () => {
      upsertSession(mockSession);
      const session = getSessionById('test-123');
      expect(session?.id).toBe('test-123');
    });

    it('should return null when not found', () => {
      const session = getSessionById('nonexistent');
      expect(session).toBeNull();
    });
  });

  describe('patchSession', () => {
    it('should update specific fields', () => {
      upsertSession(mockSession);
      const patched = patchSession('test-123', { starred: true, title: 'Patched' });
      expect(patched?.starred).toBe(true);
      expect(patched?.title).toBe('Patched');
    });

    it('should return null for nonexistent session', () => {
      const result = patchSession('nonexistent', { starred: true });
      expect(result).toBeNull();
    });

    it('should normalize after patching', () => {
      upsertSession(mockSession);
      patchSession('test-123', { summary: 'New summary' } as any);
      const session = getSessionById('test-123');
      expect(typeof session?.summary).toBe('string');
    });
  });

  describe('write path preserves raw data', () => {
    function sessionWithLongChat(): StudySession {
      return {
        ...mockSession,
        chatHistory: Array.from({ length: 150 }, (_, i) => ({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          createdAt: new Date().toISOString(),
        })),
      };
    }

    it('should not truncate chatHistory when patching unrelated fields', () => {
      upsertSession(sessionWithLongChat());

      patchSession('test-123', { starred: true });

      const raw = JSON.parse(localStorage.getItem('studere.sessions.v1')!) as StudySession[];
      expect(raw[0].chatHistory).toHaveLength(150);
      expect(raw[0].starred).toBe(true);
    });

    it('should cap chatHistory at 100 only on read', () => {
      upsertSession(sessionWithLongChat());

      patchSession('test-123', { starred: true });

      const normalized = getSessionById('test-123');
      expect(normalized?.chatHistory).toHaveLength(100);
    });

    it('should not re-normalize other sessions when upserting a new one', () => {
      const longChat = sessionWithLongChat();
      upsertSession(longChat);

      upsertSession({ ...mockSession, id: 'other-456' });

      const raw = JSON.parse(localStorage.getItem('studere.sessions.v1')!) as StudySession[];
      const original = raw.find((session) => session.id === 'test-123');
      expect(original?.chatHistory).toHaveLength(150);
    });
  });

  describe('SSR and browser compatibility', () => {
    it('should handle getSessions gracefully when localStorage not available', () => {
      const originalLocalStorage = global.localStorage;
      // @ts-ignore - Simulating SSR environment
      delete global.localStorage;
      
      const sessions = getSessions();
      expect(sessions).toEqual([]);
      
      global.localStorage = originalLocalStorage;
    });

    it('should handle saveSessions gracefully when localStorage not available', () => {
      const originalLocalStorage = global.localStorage;
      // @ts-ignore - Simulating SSR environment
      delete global.localStorage;
      
      // Should not throw
      expect(() => saveSessions([mockSession])).not.toThrow();
      
      global.localStorage = originalLocalStorage;
    });

    it('should handle large session data without errors', () => {
      const largeTranscript = Array.from({ length: 200 }, (_, i) => ({
        id: `seg-${i}`,
        text: 'Lorem ipsum dolor sit amet '.repeat(50),
        speaker: 'Speaker',
        timestamp: `${String(i).padStart(2, '0')}:00`,
      }));
      
      const largeSession = {
        ...mockSession,
        transcript: largeTranscript,
      };
      
      expect(() => saveSessions([largeSession])).not.toThrow();
      const retrieved = getSessions();
      expect(retrieved[0].transcript).toHaveLength(200);
    });
  });
});
