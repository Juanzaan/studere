import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { transcribeAudio, generateStudySession, evaluateExercise, sendStudeChat } from '@/lib/api';

const BACKEND_URL = 'http://localhost:7080';

const server = setupServer(
  http.post(`${BACKEND_URL}/api/transcribe-audio`, () => {
    return HttpResponse.json({
      text: 'Transcribed text from audio',
      language: 'es',
      duration: 300,
    });
  }),

  http.post(`${BACKEND_URL}/api/generate-study-session`, () => {
    return HttpResponse.json({
      output: {
        summary: '## Test Summary\n\nMarkdown content here.',
        keyConcepts: [{ term: 'Concept', definition: 'Definition' }],
        flashcards: [{ question: 'Q?', answer: 'A', difficulty: 'medium' }],
        quiz: [{ question: 'Q', options: ['A', 'B'], correct: 0, explanation: 'Exp' }],
        mindMap: { id: 'root', label: 'Test', children: [] },
        actionItems: [],
        insights: [],
        detectedAssets: [],
      },
    });
  }),

  http.post(`${BACKEND_URL}/api/evaluate-exercise`, () => {
    return HttpResponse.json({
      grade: 'correct',
      explanation: 'Well done!',
    });
  }),

  http.post(`${BACKEND_URL}/api/stude-chat`, () => {
    return HttpResponse.json({
      reply: 'AI response here',
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('api.ts', () => {
  describe('transcribeAudio', () => {
    it('should transcribe audio file successfully', async () => {
      const mockFile = new File(['audio data'], 'test.mp3', { type: 'audio/mp3' });
      const result = await transcribeAudio(mockFile);
      
      expect(result.text).toBe('Transcribed text from audio');
      expect(result.language).toBe('es');
      expect(result.duration).toBe(300);
    });

    it('should handle API errors gracefully', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/transcribe-audio`, () => {
          return HttpResponse.json({ error: 'Transcription failed' }, { status: 500 });
        })
      );

      const mockFile = new File(['data'], 'test.mp3', { type: 'audio/mp3' });
      await expect(transcribeAudio(mockFile)).rejects.toThrow();
    });

    it('should handle transcription error without error field in response', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/transcribe-audio`, () => {
          return new HttpResponse(null, { status: 503 });
        })
      );

      const mockFile = new File(['data'], 'test.mp3', { type: 'audio/mp3' });
      await expect(transcribeAudio(mockFile)).rejects.toThrow('Transcription failed (503)');
    });
  });

  describe('generateStudySession', () => {
    it('should generate study session from transcript', async () => {
      const result = await generateStudySession({
        transcript: 'Test transcript content',
        language: 'es',
      });

      expect(result.summary).toContain('Test Summary');
      expect(result.keyConcepts).toHaveLength(1);
      expect(result.flashcards).toHaveLength(1);
      expect(result.quiz).toHaveLength(1);
    });

    it('should handle array summary format (backward compat)', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/generate-study-session`, () => {
          return HttpResponse.json({
            output: { summary: ['Para 1', 'Para 2'], keyConcepts: [], flashcards: [], quiz: [] },
          });
        })
      );

      const result = await generateStudySession({ transcript: 'Test' });
      expect(typeof result.summary).toBe('string');
      expect(result.summary).toContain('Para 1');
    });

    it('should handle missing fields gracefully', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/generate-study-session`, () => {
          return HttpResponse.json({ output: {} });
        })
      );

      const result = await generateStudySession({ transcript: 'Test' });
      expect(result.summary).toBe('');
      expect(result.keyConcepts).toEqual([]);
    });

    it('should handle API error with error field', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/generate-study-session`, () => {
          return HttpResponse.json({ error: 'AI service unavailable' }, { status: 503 });
        })
      );

      await expect(generateStudySession({ transcript: 'Test' })).rejects.toThrow('AI service unavailable');
    });

    it('should handle API error without error field', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/generate-study-session`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(generateStudySession({ transcript: 'Test' })).rejects.toThrow('Backend returned 500');
    });

    it('should handle string output (unparseable response)', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/generate-study-session`, () => {
          return HttpResponse.json({ output: 'This is a string instead of object' });
        })
      );

      await expect(generateStudySession({ transcript: 'Test' })).rejects.toThrow('unparseable response');
    });
  });

  describe('evaluateExercise', () => {
    it('should evaluate student answer', async () => {
      const result = await evaluateExercise({
        exercise: 'What is 2+2?',
        studentAnswer: '4',
      });

      expect(result.grade).toBe('correct');
      expect(result.explanation).toBe('Well done!');
    });

    it('should include timestamp', async () => {
      const result = await evaluateExercise({
        exercise: 'Test',
        studentAnswer: 'Answer',
      });

      expect(result.receivedAt).toBeDefined();
      const timestamp = new Date(result.receivedAt).getTime();
      expect(timestamp).toBeGreaterThan(Date.now() - 1000);
    });

    it('should handle evaluation error with error field', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/evaluate-exercise`, () => {
          return HttpResponse.json({ error: 'Evaluation service down' }, { status: 500 });
        })
      );

      await expect(evaluateExercise({ exercise: 'Test', studentAnswer: 'Answer' }))
        .rejects.toThrow('Evaluation service down');
    });

    it('should handle evaluation error without error field', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/evaluate-exercise`, () => {
          return new HttpResponse(null, { status: 503 });
        })
      );

      await expect(evaluateExercise({ exercise: 'Test', studentAnswer: 'Answer' }))
        .rejects.toThrow('Evaluation failed (503)');
    });
  });

  describe('sendStudeChat', () => {
    it('should send chat message and receive reply', async () => {
      const result = await sendStudeChat({
        message: 'Hello AI',
      });

      expect(result).toBe('AI response here');
    });

    it('should include session context', async () => {
      const result = await sendStudeChat({
        message: 'Explain this',
        sessionContext: {
          title: 'Test Session',
          course: 'Math',
          summary: 'Summary here',
        },
      });

      expect(result).toBeTruthy();
    });

    it('should handle chat history', async () => {
      const result = await sendStudeChat({
        message: 'Follow up',
        chatHistory: [
          { role: 'user', content: 'First message' },
          { role: 'assistant', content: 'First reply' },
        ],
      });

      expect(result).toBeTruthy();
    });

    it('should handle chat error with error field', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/stude-chat`, () => {
          return HttpResponse.json({ error: 'Chat service unavailable' }, { status: 503 });
        })
      );

      await expect(sendStudeChat({ message: 'Test' }))
        .rejects.toThrow('Chat service unavailable');
    });

    it('should handle chat error without error field', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/stude-chat`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(sendStudeChat({ message: 'Test' }))
        .rejects.toThrow('Chat failed (500)');
    });

    it('should provide default reply if missing', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/stude-chat`, () => {
          return HttpResponse.json({});
        })
      );

      const result = await sendStudeChat({ message: 'Test' });
      expect(result).toBe('No pude generar una respuesta.');
    });
  });
});

