import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeSession } from '@/lib/session-utils';
import { StudySession } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMinimalSession(overrides: Partial<StudySession> = {}): StudySession {
  return {
    id: 'test-1',
    title: 'Test Session',
    course: 'Test Course',
    createdAt: '2025-01-01T00:00:00Z',
    starred: false,
    sourceFileName: 'test.mp3',
    sourceFileType: 'audio/mp3',
    sourceKind: 'audio',
    templateId: 'class-summary',
    summary: '## Tema principal\n\nThis is a sufficiently long paragraph with many words that will pass all the validation checks in the normalizer code. It needs to be at least two hundred characters long to avoid the summary quality warning being triggered by length checks.',
    keyConcepts: [
      { term: 'Valid Concept A', description: 'This is a detailed description of the concept that contains more than fifteen words so it passes the filter concepts validation inside the normalizer.' },
      { term: 'Valid Concept B', description: 'Another detailed description of a concept that exceeds the minimum word count threshold and will be kept after filtering.' },
    ],
    flashcards: [
      { question: 'What is the first concept?', answer: 'The answer to the first question.' },
    ],
    quiz: [
      {
        question: 'What is the main topic?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: 0,
        explanation: 'This is a detailed explanation that contains well over twenty words so that it passes the quiz validation threshold in the normalizer code.',
      },
    ],
    transcript: [
      { id: 'seg-1', text: 'This is the first segment of the transcript.', speaker: 'Profesor', timestamp: '00:00' },
    ],
    bookmarks: [],
    comments: [],
    insights: [],
    actionItems: [
      { id: 'task-1', title: 'Review the validated concept with extra depth for full understanding', owner: 'Tú', status: 'pending', dueLabel: 'Hoy' },
    ],
    mindMap: { id: 'root', label: 'Test', children: [] },
    chatHistory: [],
    stats: { wordCount: 200, segmentCount: 1, estimatedDurationMinutes: 10 },
    studyMetrics: { completionRate: 0, quizAccuracy: 0, reviewCount: 0 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalizeTranscriptSegment
// ---------------------------------------------------------------------------

describe('normalizeSession — transcript normalization', () => {
  it('should generate sequential ids for segments missing id', () => {
    const session = makeMinimalSession({
      transcript: [
        { text: 'No id' } as any,
        { text: 'Also no id' } as any,
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.transcript[0].id).toBe('seg-1');
    expect(normalized.transcript[1].id).toBe('seg-2');
  });

  it('should assign alternating speakers when speaker is missing', () => {
    const session = makeMinimalSession({
      transcript: [
        { id: 's1', text: 'First' } as any,
        { id: 's2', text: 'Second' } as any,
        { id: 's3', text: 'Third' } as any,
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.transcript[0].speaker).toBe('Profesor'); // even index
    expect(normalized.transcript[1].speaker).toBe('Clase');    // odd index
    expect(normalized.transcript[2].speaker).toBe('Profesor'); // even index
  });

  it('should generate timestamp when missing', () => {
    const session = makeMinimalSession({
      transcript: [
        { id: 's1', text: 'First' } as any,
        { id: 's2', text: 'Second' } as any,
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.transcript[0].timestamp).toBe('00:00');
    expect(normalized.transcript[1].timestamp).toBe('01:00');
  });

  it('should set empty text to empty string', () => {
    const session = makeMinimalSession({
      transcript: [
        { id: 's1', speaker: 'Profesor', timestamp: '00:00' } as any,
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.transcript[0].text).toBe('');
  });

  it('should preserve existing transcript fields', () => {
    const session = makeMinimalSession({
      transcript: [
        { id: 'my-id', text: 'Custom text', speaker: 'Student', timestamp: '01:23' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.transcript[0].id).toBe('my-id');
    expect(normalized.transcript[0].text).toBe('Custom text');
    expect(normalized.transcript[0].speaker).toBe('Student');
    expect(normalized.transcript[0].timestamp).toBe('01:23');
  });
});

// ---------------------------------------------------------------------------
// filterConcepts
// ---------------------------------------------------------------------------

describe('normalizeSession — concept filtering', () => {
  it('should keep concepts with single-word terms', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      keyConcepts: [
        { term: 'Single', description: 'This is a description that has many words in it so it will pass the length check easily and be valid.' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.keyConcepts).toHaveLength(1);
    expect(normalized.keyConcepts[0].term).toBe('Single');
    warnSpy.mockRestore();
  });

  it('should reject concepts with empty terms', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      keyConcepts: [
        { term: '   ', description: 'This is a description that has many words in it so it will pass the length check easily and be valid.' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.keyConcepts).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('empty term'),
    );
    warnSpy.mockRestore();
  });

  it('should reject concepts with descriptions shorter than 15 words', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      keyConcepts: [
        { term: 'Short Desc', description: 'Too short.' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.keyConcepts).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('description too short'),
    );
    warnSpy.mockRestore();
  });

  it('should reject concepts with sentence fragment descriptions', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      keyConcepts: [
        {
          term: 'Fragment Concept',
          description: 'A description ending with a comma which makes it a fragment in the normalizer detection logic,',
        },
      ],
    });
    const normalized = normalizeSession(session);
    // The description ends with "," — isSentenceFragment returns true
    // But the description also has >= 15 words, so it passes the length check
    expect(normalized.keyConcepts).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('appears to be a fragment'),
    );
    warnSpy.mockRestore();
  });

  it('should reject duplicate concepts (case-insensitive)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      keyConcepts: [
        { term: 'Duplicate Concept', description: 'This is a detailed description that has more than fifteen words in it and is valid for the test case.' },
        { term: 'duplicate concept', description: 'This is another detailed description that also has more than fifteen words for validation in the normalizer.' },
        { term: 'Unique Concept', description: 'This is a third detailed description that passes all the filter checks normally in the test code.' },
      ],
    });
    const normalized = normalizeSession(session);
    // Should have 2 concepts (first dup and unique), not 3
    expect(normalized.keyConcepts).toHaveLength(2);
    expect(normalized.keyConcepts[0].term).toBe('Duplicate Concept');
    expect(normalized.keyConcepts[1].term).toBe('Unique Concept');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('duplicate term'),
    );
    warnSpy.mockRestore();
  });

  it('should keep valid concepts', () => {
    const session = makeMinimalSession({
      keyConcepts: [
        { term: 'Good Concept A', description: 'This is a valid description that has more than fifteen words so it will pass all the filters in the normalizer code correctly.' },
        { term: 'Good Concept B', description: 'Another complete description that also has enough words to pass every validation check inside the code.' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.keyConcepts).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// dedupeFlashcards
// ---------------------------------------------------------------------------

describe('normalizeSession — flashcard deduplication', () => {
  it('should remove duplicate flashcards with >70% word overlap', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      flashcards: [
        { question: 'What is the main concept discussed in this session?', answer: 'First answer' },
        { question: 'What is the main concept in this session?', answer: 'Duplicate' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.flashcards).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('duplicate front'),
    );
    warnSpy.mockRestore();
  });

  it('should keep non-duplicate flashcards', () => {
    const session = makeMinimalSession({
      flashcards: [
        { question: 'What is the definition of concept A?', answer: 'Answer A' },
        { question: 'How does concept B relate to the overall theory?', answer: 'Answer B' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.flashcards).toHaveLength(2);
  });

  it('should preserve valid confidence values', () => {
    const session = makeMinimalSession({
      flashcards: [
        { question: 'Test question?', answer: 'Test answer', confidence: 'easy' },
        { question: 'Second question?', answer: 'Second answer', confidence: 'hard' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.flashcards[0].confidence).toBe('easy');
    expect(normalized.flashcards[1].confidence).toBe('hard');
  });

  it('should set invalid confidence to undefined', () => {
    const session = makeMinimalSession({
      flashcards: [
        { question: 'Test question?', answer: 'Test answer', confidence: 'unknown' as any },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.flashcards[0].confidence).toBeUndefined();
  });

  it('should handle flashcards with empty questions', () => {
    const session = makeMinimalSession({
      flashcards: [
        { question: '', answer: 'Some answer' },
      ],
    });
    const normalized = normalizeSession(session);
    // Empty question is still valid — will be kept
    expect(normalized.flashcards).toHaveLength(1);
  });

  it('should handle empty flashcard array', () => {
    const session = makeMinimalSession({ flashcards: [] });
    const normalized = normalizeSession(session);
    expect(normalized.flashcards).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// validateQuiz
// ---------------------------------------------------------------------------

describe('normalizeSession — quiz validation', () => {
  it('should reject quiz questions with fewer than 3 options', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      quiz: [
        {
          question: 'Test question?',
          options: ['Only A', 'Only B'],
          correct: 0,
          explanation: 'This is a detailed explanation that contains well over twenty words so that it passes the quiz validation without any issues.',
        },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.quiz).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('fewer than 3 options'),
    );
    warnSpy.mockRestore();
  });

  it('should reject quiz with correct index out of bounds', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      quiz: [
        {
          question: 'Test question?',
          options: ['A', 'B', 'C'],
          correct: 5, // Out of bounds (0-2)
          explanation: 'This is a detailed explanation that contains well over twenty words so that it passes the quiz validation without any issues.',
        },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.quiz).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('index out of bounds'),
    );
    warnSpy.mockRestore();
  });

  it('should reject quiz with negative correct index', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      quiz: [
        {
          question: 'Test question?',
          options: ['A', 'B', 'C'],
          correct: -1, // Negative — out of bounds
          explanation: 'This is a detailed explanation that contains well over twenty words so that it passes the quiz validation without any issues.',
        },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.quiz).toHaveLength(0);
    warnSpy.mockRestore();
  });

  it('should reject quiz with explanation shorter than 20 words', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      quiz: [
        {
          question: 'Test question?',
          options: ['A', 'B', 'C', 'D'],
          correct: 0,
          explanation: 'Too short.',
        },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.quiz).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('explanation too short'),
    );
    warnSpy.mockRestore();
  });

  it('should keep valid quiz questions', () => {
    const session = makeMinimalSession();
    const normalized = normalizeSession(session);
    expect(normalized.quiz).toHaveLength(1);
    expect(normalized.quiz[0].question).toBe('What is the main topic?');
  });

  it('should handle empty quiz array', () => {
    const session = makeMinimalSession({ quiz: [] });
    const normalized = normalizeSession(session);
    expect(normalized.quiz).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// validateTasks
// ---------------------------------------------------------------------------

describe('normalizeSession — task validation', () => {
  it('should reject action items with empty title', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      actionItems: [
        { id: 'empty', title: '', owner: 'Tú', status: 'pending', dueLabel: 'Hoy' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.actionItems).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('empty title'),
    );
    warnSpy.mockRestore();
  });

  it('should reject action items with title shorter than 5 words', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({
      actionItems: [
        { id: 'short', title: 'Short title', owner: 'Tú', status: 'pending', dueLabel: 'Hoy' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.actionItems).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('title too short'),
    );
    warnSpy.mockRestore();
  });

  it('should keep valid action items', () => {
    const session = makeMinimalSession();
    const normalized = normalizeSession(session);
    expect(normalized.actionItems.length).toBeGreaterThanOrEqual(1);
    expect(normalized.actionItems[0].title).toContain('Review');
  });

  it('should create default action items when none provided', () => {
    const session = makeMinimalSession({ actionItems: undefined as any });
    const normalized = normalizeSession(session);
    expect(normalized.actionItems.length).toBeGreaterThanOrEqual(1);
  });

  it('should preserve an intentionally emptied actionItems array', () => {
    const session = makeMinimalSession({ actionItems: [] });
    const normalized = normalizeSession(session);
    expect(normalized.actionItems).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// normalizeSession — summary handling
// ---------------------------------------------------------------------------

describe('normalizeSession — summary normalization', () => {
  it('should convert old array-format summary to string', () => {
    const session = makeMinimalSession({
      summary: ['Para 1', 'Para 2', 'Para 3'] as any,
    });
    const normalized = normalizeSession(session);
    expect(typeof normalized.summary).toBe('string');
    expect(normalized.summary).toBe('Para 1\n\nPara 2\n\nPara 3');
  });

  it('should keep string summary unchanged', () => {
    const summary = '## Valid summary that is long enough to pass all checks and has newlines for the quality warning to be satisfied.';
    const session = makeMinimalSession({ summary });
    const normalized = normalizeSession(session);
    expect(normalized.summary).toBe(summary);
  });

  it('should handle undefined summary', () => {
    const session = makeMinimalSession({ summary: undefined as any });
    const normalized = normalizeSession(session);
    expect(normalized.summary).toBe('');
  });

  it('should handle null summary', () => {
    const session = makeMinimalSession({ summary: null as any });
    const normalized = normalizeSession(session);
    expect(normalized.summary).toBe('');
  });

  it('should emit summary quality warning for short summaries', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const session = makeMinimalSession({ summary: 'Short.' });
    normalizeSession(session);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Summary quality warning'),
    );
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// normalizeSession — field defaults and preservation
// ---------------------------------------------------------------------------

describe('normalizeSession — field defaults', () => {
  it('should set starred to false when undefined', () => {
    const session = makeMinimalSession({ starred: undefined as any });
    const normalized = normalizeSession(session);
    expect(normalized.starred).toBe(false);
  });

  it('should backfill createdAt when missing', () => {
    const session = makeMinimalSession({ createdAt: undefined as any });
    const normalized = normalizeSession(session);
    expect(Number.isNaN(new Date(normalized.createdAt).getTime())).toBe(false);
  });

  it('should backfill createdAt when invalid', () => {
    const session = makeMinimalSession({ createdAt: 'not-a-date' });
    const normalized = normalizeSession(session);
    expect(Number.isNaN(new Date(normalized.createdAt).getTime())).toBe(false);
  });

  it('should keep a valid createdAt unchanged', () => {
    const session = makeMinimalSession({ createdAt: '2024-03-01T10:00:00Z' });
    const normalized = normalizeSession(session);
    expect(normalized.createdAt).toBe('2024-03-01T10:00:00Z');
  });

  it('should preserve starred when true', () => {
    const session = makeMinimalSession({ starred: true });
    const normalized = normalizeSession(session);
    expect(normalized.starred).toBe(true);
  });

  it('should set templateId to class-summary when missing', () => {
    const session = makeMinimalSession({ templateId: undefined as any });
    const normalized = normalizeSession(session);
    expect(normalized.templateId).toBe('class-summary');
  });

  it('should create mindMap when missing', () => {
    const session = makeMinimalSession({ mindMap: undefined as any });
    const normalized = normalizeSession(session);
    expect(normalized.mindMap).toBeDefined();
    expect(normalized.mindMap.label).toBe('Test Session');
  });

  it('should preserve existing mindMap', () => {
    const mindMap = { id: 'custom-root', label: 'Custom Map', children: [] };
    const session = makeMinimalSession({ mindMap });
    const normalized = normalizeSession(session);
    expect(normalized.mindMap.label).toBe('Custom Map');
  });

  it('should create welcome chat message when chatHistory is empty', () => {
    const session = makeMinimalSession({ chatHistory: undefined as any });
    const normalized = normalizeSession(session);
    expect(normalized.chatHistory).toHaveLength(1);
    expect(normalized.chatHistory[0].role).toBe('assistant');
    expect(normalized.chatHistory[0].content).toContain('Soy Stude');
  });

  it('should preserve an intentionally emptied chatHistory array', () => {
    const session = makeMinimalSession({ chatHistory: [] });
    const normalized = normalizeSession(session);
    expect(normalized.chatHistory).toEqual([]);
  });

  it('should preserve existing chatHistory', () => {
    const session = makeMinimalSession({
      chatHistory: [
        { id: 'msg-1', role: 'user', content: 'Hello', createdAt: '2025-01-01T00:00:00Z' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.chatHistory).toHaveLength(1);
    expect(normalized.chatHistory[0].content).toBe('Hello');
  });

  it('should bookmarks default to empty array', () => {
    const session = makeMinimalSession({ bookmarks: undefined as any });
    const normalized = normalizeSession(session);
    expect(normalized.bookmarks).toEqual([]);
  });

  it('should comments default to empty array', () => {
    const session = makeMinimalSession({ comments: undefined as any });
    const normalized = normalizeSession(session);
    expect(normalized.comments).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// normalizeSession — stats calculation
// ---------------------------------------------------------------------------

describe('normalizeSession — stats', () => {
  it('should calculate wordCount from transcript when missing', () => {
    const session = makeMinimalSession({
      stats: undefined as any,
      transcript: [
        { id: 's1', text: 'This sentence has exactly seven words now', speaker: 'P', timestamp: '00:00' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.stats.wordCount).toBe(7);
    expect(normalized.stats.segmentCount).toBe(1);
  });

  it('should preserve existing stats', () => {
    const session = makeMinimalSession({
      stats: { wordCount: 999, segmentCount: 50, estimatedDurationMinutes: 30 },
    });
    const normalized = normalizeSession(session);
    expect(normalized.stats.wordCount).toBe(999);
    expect(normalized.stats.segmentCount).toBe(50);
    expect(normalized.stats.estimatedDurationMinutes).toBe(30);
  });

  it('should calculate estimatedDurationMinutes when missing', () => {
    const session = makeMinimalSession({
      stats: undefined as any,
      transcript: [],
    });
    const normalized = normalizeSession(session);
    // When wordCount is 0 and no transcript, estimatedDurationMinutes falls to Math.max(5, ...) = 5
    expect(normalized.stats.estimatedDurationMinutes).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// normalizeSession — studyMetrics calculation
// ---------------------------------------------------------------------------

describe('normalizeSession — study metrics', () => {
  it('should calculate completionRate from action items when missing', () => {
    const session = makeMinimalSession({
      studyMetrics: undefined as any,
      actionItems: [
        { id: 'a1', title: 'Task one completed with enough words to pass validation', owner: 'Tú', status: 'completed', dueLabel: 'Hoy' },
        { id: 'a2', title: 'Task two also completed with enough words to pass validation', owner: 'Tú', status: 'completed', dueLabel: 'Hoy' },
        { id: 'a3', title: 'Task three is still pending with enough words to be valid', owner: 'Tú', status: 'pending', dueLabel: 'Hoy' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.studyMetrics.completionRate).toBe(67);
  });

  it('should default quizAccuracy and reviewCount to 0 when missing', () => {
    const session = makeMinimalSession({
      studyMetrics: undefined as any,
    });
    const normalized = normalizeSession(session);
    expect(normalized.studyMetrics.quizAccuracy).toBe(0);
    expect(normalized.studyMetrics.reviewCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// normalizeSession — insights
// ---------------------------------------------------------------------------

describe('normalizeSession — insights', () => {
  it('should create default insights when missing', () => {
    const session = makeMinimalSession({ insights: [] });
    const normalized = normalizeSession(session);
    expect(normalized.insights.length).toBeGreaterThanOrEqual(1);
    expect(normalized.insights[0].id).toBeDefined();
  });

  it('should preserve existing insights', () => {
    const session = makeMinimalSession({
      insights: [
        { id: 'custom', label: 'Custom', value: 'Test', description: 'A custom insight', tone: 'good' },
      ],
    });
    const normalized = normalizeSession(session);
    expect(normalized.insights).toHaveLength(1);
    expect(normalized.insights[0].id).toBe('custom');
  });
});
