import { describe, it, expect } from 'vitest';
import {
  createActionItems,
  createMindMap,
  createBookmarkFromSegment,
  createComment,
  createInsights,
  normalizeSession,
} from '@/lib/session-utils';
import { StudySession, TranscriptSegment } from '@/lib/types';

describe('session-utils.ts', () => {
  const mockSession: StudySession = {
    id: 'test-session',
    title: 'Test Session Title',
    course: 'Test Course',
    createdAt: new Date().toISOString(),
    summary: '## Main Concept\n\nThis is the first paragraph.\n\nSecond paragraph here.',
    keyConcepts: [
      { term: 'Key Term 1', description: 'Description 1' },
      { term: 'Key Term 2', description: 'Description 2' },
    ],
    flashcards: [],
    quiz: [],
    transcript: [
      { id: 'seg-1', text: 'First segment', speaker: 'Speaker', timestamp: '00:00' },
      { id: 'seg-2', text: 'Second segment', speaker: 'Speaker', timestamp: '00:10' },
    ],
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
      segmentCount: 2,
      estimatedDurationMinutes: 5,
    },
    studyMetrics: {
      completionRate: 0,
      quizAccuracy: 0,
      reviewCount: 0,
    },
  };

  describe('createActionItems', () => {
    it('should create 3 action items from session', () => {
      const items = createActionItems(mockSession);
      expect(items).toHaveLength(3);
    });

    it('should create task from first concept', () => {
      const items = createActionItems(mockSession);
      expect(items[1].title).toContain('Key Term 1');
    });

    it('should create task from second concept', () => {
      const items = createActionItems(mockSession);
      expect(items[2].title).toContain('Key Term 2');
    });

    it('should handle session with no concepts', () => {
      const noConceptSession = { ...mockSession, keyConcepts: [] };
      const items = createActionItems(noConceptSession);
      expect(items).toHaveLength(3);
      expect(items[1].title).toContain('concepto más importante');
    });

    it('should include sourceSegmentId from transcript', () => {
      const items = createActionItems(mockSession);
      expect(items[0].sourceSegmentId).toBe('seg-1');
    });

    it('should all have pending status', () => {
      const items = createActionItems(mockSession);
      expect(items.every(item => item.status === 'pending')).toBe(true);
    });
  });

  describe('createMindMap', () => {
    it('should create root node with session title', () => {
      const mindMap = createMindMap(mockSession);
      expect(mindMap.label).toBe('Test Session Title');
      expect(mindMap.accent).toBe('violet');
    });

    it('should create summary branch', () => {
      const mindMap = createMindMap(mockSession);
      const summaryBranch = mindMap.children?.find(c => c.label === 'Resumen');
      expect(summaryBranch).toBeDefined();
      expect(summaryBranch?.accent).toBe('blue');
    });

    it('should create concepts branch', () => {
      const mindMap = createMindMap(mockSession);
      const conceptsBranch = mindMap.children?.find(c => c.label === 'Conceptos clave');
      expect(conceptsBranch).toBeDefined();
      expect(conceptsBranch?.children).toHaveLength(2);
    });

    it('should limit summary paragraphs to 3', () => {
      const longSummary = '## A\n\nPara 1.\n\nPara 2.\n\nPara 3.\n\nPara 4.\n\nPara 5.';
      const session = { ...mockSession, summary: longSummary };
      const mindMap = createMindMap(session);
      const summaryBranch = mindMap.children?.find(c => c.label === 'Resumen');
      expect(summaryBranch?.children?.length).toBe(3);
    });

    it('should limit concepts to 4', () => {
      const manyConcepts = Array.from({ length: 10 }, (_, i) => ({
        term: `Term ${i}`,
        description: `Description ${i}`,
      }));
      const session = { ...mockSession, keyConcepts: manyConcepts };
      const mindMap = createMindMap(session);
      const conceptsBranch = mindMap.children?.find(c => c.label === 'Conceptos clave');
      expect(conceptsBranch?.children?.length).toBe(4);
    });
  });

  describe('createBookmarkFromSegment', () => {
    it('should create bookmark with correct properties', () => {
      const bookmark = createBookmarkFromSegment('session-1', 'seg-123', 'My note');
      expect(bookmark.segmentId).toBe('seg-123');
      expect(bookmark.label).toBe('My note');
    });

    it('should generate stable id from inputs', () => {
      const b1 = createBookmarkFromSegment('session-1', 'seg-123', 'Note 1');
      const b2 = createBookmarkFromSegment('session-1', 'seg-123', 'Note 1');
      expect(b1.id).toBe(b2.id); // Same inputs = same ID
    });

    it('should generate different ids for different labels', () => {
      const b1 = createBookmarkFromSegment('session-1', 'seg-123', 'Note 1');
      const b2 = createBookmarkFromSegment('session-1', 'seg-123', 'Note 2');
      expect(b1.id).not.toBe(b2.id);
    });
  });

  describe('createComment', () => {
    it('should create comment with correct properties', () => {
      const comment = createComment('session-1', 'My comment text', 'seg-1');
      expect(comment.segmentId).toBe('seg-1');
      expect(comment.text).toBe('My comment text');
    });

    it('should allow comment without segment', () => {
      const comment = createComment('session-1', 'General comment');
      expect(comment.text).toBe('General comment');
      expect(comment.id).toBeTruthy();
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const comment = createComment('session-1', 'Test', 'seg-1');
      const after = Date.now();
      const commentTime = new Date(comment.createdAt).getTime();
      expect(commentTime).toBeGreaterThanOrEqual(before);
      expect(commentTime).toBeLessThanOrEqual(after);
    });
  });

  describe('createInsights', () => {
    it('should create coverage insight', () => {
      const insights = createInsights(mockSession);
      const coverageInsight = insights.find(i => i.id === 'coverage');
      expect(coverageInsight).toBeDefined();
      expect(coverageInsight?.value).toContain('bloques');
    });

    it('should create concept density insight', () => {
      const insights = createInsights(mockSession);
      const conceptInsight = insights.find(i => i.id === 'concept-density');
      expect(conceptInsight).toBeDefined();
      expect(conceptInsight?.value).toContain('clave');
    });

    it('should create quiz accuracy insight', () => {
      const insights = createInsights(mockSession);
      const quizInsight = insights.find(i => i.id === 'quiz-accuracy');
      expect(quizInsight).toBeDefined();
      expect(quizInsight?.tone).toBe('neutral'); // 0% accuracy
    });

    it('should create readiness insight', () => {
      const insights = createInsights(mockSession);
      const readinessInsight = insights.find(i => i.id === 'readiness');
      expect(readinessInsight).toBeDefined();
    });
  });

  describe('normalizeSession', () => {
    it('should convert old array summary format to string', () => {
      const oldFormatSession = {
        ...mockSession,
        summary: ['Paragraph 1', 'Paragraph 2', 'Paragraph 3'] as any,
      };
      const normalized = normalizeSession(oldFormatSession);
      expect(typeof normalized.summary).toBe('string');
      expect(normalized.summary).toBe('Paragraph 1\n\nParagraph 2\n\nParagraph 3');
    });

    it('should keep string summary as is', () => {
      const normalized = normalizeSession(mockSession);
      expect(normalized.summary).toBe(mockSession.summary);
    });

    it('should handle missing transcript with empty array', () => {
      const sessionWithoutTranscript = { ...mockSession, transcript: undefined as any };
      const normalized = normalizeSession(sessionWithoutTranscript);
      expect(normalized.transcript).toEqual([]);
    });

    it('should normalize transcript segments with missing fields', () => {
      const incompleteTranscript = [
        { text: 'Segment without id or speaker' } as any,
        { id: 'seg-2', text: 'Partial segment' } as any,
      ];
      const session = { ...mockSession, transcript: incompleteTranscript };
      const normalized = normalizeSession(session);
      
      expect(normalized.transcript[0].id).toBe('seg-1');
      expect(normalized.transcript[0].speaker).toBe('Profesor');
      expect(normalized.transcript[0].timestamp).toBe('00:00');
      expect(normalized.transcript[1].id).toBe('seg-2');
      expect(normalized.transcript[1].speaker).toBe('Clase');
    });

    it('should create default actionItems if missing', () => {
      const sessionWithoutActions = { ...mockSession, actionItems: [] };
      const normalized = normalizeSession(sessionWithoutActions);
      expect(normalized.actionItems).toHaveLength(3);
      expect(normalized.actionItems[0].status).toBe('pending');
    });

    it('should preserve existing actionItems', () => {
      const existingActions = [
        { id: 'task-1', title: 'Custom task', status: 'completed' as const, owner: 'Me', dueLabel: 'Today' },
      ];
      const session = { ...mockSession, actionItems: existingActions };
      const normalized = normalizeSession(session);
      expect(normalized.actionItems).toHaveLength(1);
      expect(normalized.actionItems[0].title).toBe('Custom task');
    });

    it('should create mindMap if missing', () => {
      const sessionWithoutMindMap = { ...mockSession, mindMap: undefined as any };
      const normalized = normalizeSession(sessionWithoutMindMap);
      expect(normalized.mindMap).toBeDefined();
      expect(normalized.mindMap.label).toBe(mockSession.title);
    });

    it('should create chatHistory if missing', () => {
      const sessionWithoutChat = { ...mockSession, chatHistory: [] };
      const normalized = normalizeSession(sessionWithoutChat);
      expect(normalized.chatHistory).toHaveLength(1);
      expect(normalized.chatHistory[0].role).toBe('assistant');
      expect(normalized.chatHistory[0].content).toContain('Soy Stude');
    });

    it('should calculate wordCount from transcript if missing', () => {
      const session = {
        ...mockSession,
        stats: undefined as any,
        transcript: [
          { id: 'seg-1', text: 'This has five words total', speaker: 'Test', timestamp: '00:00' },
        ],
      };
      const normalized = normalizeSession(session);
      expect(normalized.stats.wordCount).toBe(5);
      expect(normalized.stats.segmentCount).toBe(1);
    });

    it('should handle empty or null keyConcepts', () => {
      const session = { ...mockSession, keyConcepts: null as any };
      const normalized = normalizeSession(session);
      expect(normalized.keyConcepts).toEqual([]);
    });

    it('should set starred to false if undefined', () => {
      const session = { ...mockSession, starred: undefined as any };
      const normalized = normalizeSession(session);
      expect(normalized.starred).toBe(false);
    });

    it('should calculate completionRate from actionItems', () => {
      const session = {
        ...mockSession,
        studyMetrics: undefined as any,
        actionItems: [
          { id: '1', title: 'Task 1', status: 'completed' as const, owner: 'Me', dueLabel: 'Today' },
          { id: '2', title: 'Task 2', status: 'completed' as const, owner: 'Me', dueLabel: 'Today' },
          { id: '3', title: 'Task 3', status: 'pending' as const, owner: 'Me', dueLabel: 'Today' },
        ],
      };
      const normalized = normalizeSession(session);
      expect(normalized.studyMetrics.completionRate).toBe(67); // 2/3 ≈ 66.67, rounded
    });
  });
});
