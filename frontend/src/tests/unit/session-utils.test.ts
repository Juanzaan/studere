import { describe, it, expect } from 'vitest';
import {
  createActionItems,
  createMindMap,
  createBookmarkFromSegment,
  createComment,
  createInsights,
  createWelcomeChat,
  normalizeSession,
} from '@/lib/session-utils';
import { StudySession } from '@/lib/types';

describe('session-utils.ts', () => {
  const mockSession: StudySession = {
    id: 'test-session',
    title: 'Test Session Title',
    course: 'Test Course',
    createdAt: new Date().toISOString(),
    summary: '## Main Concept\n\nThis is the first paragraph.\n\nSecond paragraph here.',
    keyConcepts: [
      { term: 'Key Term 1', description: 'Description 1 is a detailed explanation that covers multiple aspects of this important learning concept.' },
      { term: 'Key Term 2', description: 'Description 2 provides comprehensive insight into another essential topic that students must understand thoroughly.' },
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
      // No concepts = 1 repaso item (no concept tasks, no quiz)
      expect(items).toHaveLength(1);
      expect(items[0].title).toContain('Releer y resumir');
    });

    it('should include sourceSegmentId from transcript', () => {
      const items = createActionItems(mockSession);
      expect(items[0].sourceSegmentId).toBe('seg-1');
    });

    it('should all have pending status', () => {
      const items = createActionItems(mockSession);
      expect(items.every(item => item.status === 'pending')).toBe(true);
    });

    it('should create practice task when no second concept but quiz exists', () => {
      // One concept only + quiz → secondConcept is undefined, quiz branch triggers
      const session = {
        ...mockSession,
        keyConcepts: [{ term: 'Sole Concept', description: 'The only concept in this session for testing purposes here.' }],
        quiz: [
          {
            question: 'What is the main topic of this lecture?',
            options: ['A', 'B', 'C'],
            correct: 0,
            explanation: 'This is the correct answer because it covers the main topic.',
          },
        ],
      };
      const items = createActionItems(session);
      // 3 items: repaso + concept task + practice (no secondConcept, so quiz branch)
      expect(items).toHaveLength(3);
      expect(items[1].title).toContain('Sole Concept');
      expect(items[2].title).toContain('Resolver la pregunta de práctica');
    });

    it('should use fallback "la sesión" when summary has no paragraphs', () => {
      // Empty summary + no concepts/quiz to isolate the empty-summary branch
      const session = { ...mockSession, summary: '', keyConcepts: [], quiz: [] };
      const items = createActionItems(session);
      expect(items).toHaveLength(1); // repaso only
      expect(items[0].title).toContain('Releer el material');
      expect(items[0].exercisePrompt).toContain('Escribí un resumen');
    });

    it('should create only repaso item when no concepts, no quiz, no second concept', () => {
      const session = {
        ...mockSession,
        keyConcepts: [],
        quiz: [],
      };
      const items = createActionItems(session);
      expect(items).toHaveLength(1);
      expect(items[0].title).toContain('Releer');
    });

    it('should create concept + practice when 1 concept and quiz exists', () => {
      const session = {
        ...mockSession,
        keyConcepts: [{ term: 'Single Term', description: 'This concept description has enough words to pass all validation checks in the normalizer code.' }],
        quiz: [
          {
            question: 'Test question about the topic?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correct: 0,
            explanation: 'This is a detailed explanation that has enough words to pass the quiz validation checks.',
          },
        ],
      };
      const items = createActionItems(session);
      // repaso + concept task + practice task for quiz
      expect(items).toHaveLength(3);
      expect(items[1].title).toContain('Single Term');
      expect(items[2].title).toContain('práctica');
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

    it('should create practice branch from quiz questions', () => {
      const session = {
        ...mockSession,
        quiz: [
          { question: 'First question?', options: ['A', 'B', 'C'], correct: 0, explanation: 'Exp.' },
          { question: 'Second question?', options: ['A', 'B', 'C'], correct: 0, explanation: 'Exp.' },
        ],
      };
      const mindMap = createMindMap(session);
      const practiceBranch = mindMap.children?.find(c => c.label === 'Práctica');
      expect(practiceBranch).toBeDefined();
      expect(practiceBranch?.accent).toBe('amber');
      expect(practiceBranch?.children).toHaveLength(2);
    });

    it('should assign different accent colors to children', () => {
      const manyConcepts = Array.from({ length: 6 }, (_, i) => ({
        term: `Term ${i} Detailed`,
        description: `Description for term ${i} that is long enough to be valid.`,
      }));
      const session = { ...mockSession, keyConcepts: manyConcepts };
      const mindMap = createMindMap(session);
      const conceptsBranch = mindMap.children?.find(c => c.label === 'Conceptos clave');
      expect(conceptsBranch?.children).toHaveLength(4);
      // accent uses mapAccent(index + 1): 0+1=1→blue, 1+1=2→green, 2+1=3→amber, 3+1=4→violet
      const accents = conceptsBranch!.children!.map(c => c.accent);
      expect(accents[0]).toBe('blue');      // index 0: mapAccent(1)
      expect(accents[1]).toBe('green');     // index 1: mapAccent(2)
      expect(accents[2]).toBe('amber');     // index 2: mapAccent(3)
      expect(accents[3]).toBe('violet');    // index 3: mapAccent(4)
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

  describe('createWelcomeChat', () => {
    it('should include course in welcome message when course is provided', () => {
      const chat = createWelcomeChat(mockSession);
      expect(chat).toHaveLength(1);
      expect(chat[0].content).toContain('Test Course');
    });

    it('should include summary in welcome message', () => {
      const chat = createWelcomeChat(mockSession);
      expect(chat[0].content).toContain('Main Concept');
    });

    it('should handle missing course gracefully', () => {
      const session = { ...mockSession, course: '' };
      const chat = createWelcomeChat(session);
      expect(chat[0].content).not.toContain('de ');
    });

    it('should handle empty summary gracefully', () => {
      const session = { ...mockSession, summary: '' };
      const chat = createWelcomeChat(session);
      expect(chat[0].content).toContain('todavía no tiene un resumen');
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

    it('should use "good" tone when segmentCount >= 4', () => {
      const session = { ...mockSession, stats: { ...mockSession.stats, segmentCount: 4 } };
      const insights = createInsights(session);
      const coverage = insights.find(i => i.id === 'coverage');
      expect(coverage?.tone).toBe('good');
    });

    it('should use "good" tone when keyConcepts length >= 4', () => {
      const manyConcepts = Array.from({ length: 4 }, (_, i) => ({
        term: `Term ${i} Concept`,
        description: `This is a detailed description for term ${i} that has enough words to pass.`,
      }));
      const session = { ...mockSession, keyConcepts: manyConcepts };
      const insights = createInsights(session);
      const density = insights.find(i => i.id === 'concept-density');
      expect(density?.tone).toBe('good');
    });

    it('should use "good" tone when quizAccuracy >= 70', () => {
      const session = {
        ...mockSession,
        studyMetrics: { ...mockSession.studyMetrics, quizAccuracy: 70 },
      };
      const insights = createInsights(session);
      const quiz = insights.find(i => i.id === 'quiz-accuracy');
      expect(quiz?.tone).toBe('good');
    });

    it('should use "warning" tone when quizAccuracy is between 1 and 69', () => {
      const session = {
        ...mockSession,
        studyMetrics: { ...mockSession.studyMetrics, quizAccuracy: 50 },
      };
      const insights = createInsights(session);
      const quiz = insights.find(i => i.id === 'quiz-accuracy');
      expect(quiz?.tone).toBe('warning');
    });

    it('should use "good" tone when completionRate >= 60', () => {
      const session = {
        ...mockSession,
        studyMetrics: { ...mockSession.studyMetrics, completionRate: 60 },
      };
      const insights = createInsights(session);
      const readiness = insights.find(i => i.id === 'readiness');
      expect(readiness?.tone).toBe('good');
    });

    it('should use fallback description for readiness when summary is empty', () => {
      const session = { ...mockSession, summary: '' };
      const insights = createInsights(session);
      const readiness = insights.find(i => i.id === 'readiness');
      expect(readiness?.description).toBe('La sesión ya tiene materiales listos para repasar.');
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
      expect(normalized.actionItems.length).toBeGreaterThanOrEqual(1);
      expect(normalized.actionItems[0].status).toBe('pending');
    });

    it('should preserve existing actionItems', () => {
      const existingActions = [
        { id: 'task-1', title: 'Custom task with sufficient words here to pass validation', status: 'completed' as const, owner: 'Me', dueLabel: 'Today' },
      ];
      const session = { ...mockSession, actionItems: existingActions };
      const normalized = normalizeSession(session);
      expect(normalized.actionItems).toHaveLength(1);
      expect(normalized.actionItems[0].title).toBe('Custom task with sufficient words here to pass validation');
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
