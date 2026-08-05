import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { transcribeAudio, fileToBase64, generateStudySession, evaluateExercise, sendStudeChat } from '@/lib/api';

const BACKEND_URL = 'http://localhost:7071';

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

    it('should call onProgress during transcription for small files', async () => {
      const onProgress = vi.fn();
      const mockFile = new File(['small'], 'test.mp3', { type: 'audio/mp3' });
      
      await transcribeAudio(mockFile, undefined, onProgress);
      
      // Should have called at least the initial progress message
      expect(onProgress).toHaveBeenCalled();
      const messages = onProgress.mock.calls.map((c: string[]) => c[0]);
      expect(messages.some((m: string) => m.includes('Preparando'))).toBe(true);
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
      await expect(transcribeAudio(mockFile)).rejects.toThrow('Error desconocido del servidor');
    });

    it('should route to server-side when file > 10MB (using injected mock)', async () => {
      const mockServerSide = vi.fn().mockResolvedValue({
        text: 'Server-side transcription result',
        language: 'en',
        duration: 600,
      });

      // File > 10MB triggers the server-side routing branch
      const largeFile = new File(
        [new ArrayBuffer(15 * 1024 * 1024)],
        'large-audio.mp3',
        { type: 'audio/mp3' },
      );

      const result = await transcribeAudio(largeFile, 'es', undefined, {
        transcribeAudioServerSide: mockServerSide,
      });

      expect(mockServerSide).toHaveBeenCalledOnce();
      // Reference-equality checks (deep equality on a 15MB File hangs in vitest + happy-dom)
      const callArgs = mockServerSide.mock.calls[0];
      expect(callArgs[0]).toBe(largeFile);
      expect(callArgs[1]).toBe('es');
      expect(callArgs[2]).toBeUndefined();
      expect(result.text).toBe('Server-side transcription result');
      expect(result.language).toBe('en');
      expect(result.duration).toBe(600);
    });

    it('should route to server-side when file exceeds 30-min estimate (using injected mock)', async () => {
      const mockServerSide = vi.fn().mockResolvedValue({
        text: 'Long audio result',
        language: 'en',
        duration: 2000,
      });

      // File > 30MB (MAX_CLIENT_SIDE_DURATION_ESTIMATE_MIN * MB_PER_MINUTE_ESTIMATE * 1024*1024)
      const longFile = new File(
        [new ArrayBuffer(35 * 1024 * 1024)],
        'long-audio.mp3',
        { type: 'audio/mp3' },
      );

      const result = await transcribeAudio(longFile, 'en', undefined, {
        transcribeAudioServerSide: mockServerSide,
      });

      expect(mockServerSide).toHaveBeenCalledOnce();
      expect(result.text).toBe('Long audio result');
    });

    it('should use injected fileToBase64 for large files (>=1MB, simulating Web Worker path)', async () => {
      const mockBase64 = vi.fn().mockResolvedValue('bW9jay1iYXNlNjQ='); // 'mock-base64' encoded

      // File >= 1MB (triggers the Web Worker branch in fileToBase64 when not mocked)
      const medFile = new File(
        [new ArrayBuffer(2 * 1024 * 1024)],
        'medium-audio.mp3',
        { type: 'audio/mp3' },
      );

      const result = await transcribeAudio(medFile, 'es', undefined, {
        fileToBase64: mockBase64,
      });

      expect(mockBase64).toHaveBeenCalledOnce();
      expect(mockBase64.mock.calls[0][0]).toBe(medFile);
      expect(result.text).toBe('Transcribed text from audio');
      // The mock base64 was sent; the server responded normally
    });

    it('should propagate fileToBase64 errors from injected mock', async () => {
      const mockBase64 = vi.fn().mockRejectedValue(new Error('Base64 encoding failed'));

      const medFile = new File(
        [new ArrayBuffer(2 * 1024 * 1024)],
        'error-audio.mp3',
        { type: 'audio/mp3' },
      );

      await expect(
        transcribeAudio(medFile, 'es', undefined, { fileToBase64: mockBase64 }),
      ).rejects.toThrow('Base64 encoding failed');
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

      await expect(generateStudySession({ transcript: 'Test' })).rejects.toThrow();
    });

    it('should handle string output (unparseable response)', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/generate-study-session`, () => {
          return HttpResponse.json({ output: 'This is a string instead of object' });
        })
      );

      await expect(generateStudySession({ transcript: 'Test' })).rejects.toThrow('unparseable response');
    });

    it('should handle missing output field (undefined)', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/generate-study-session`, () => {
          return HttpResponse.json({});
        })
      );

      await expect(generateStudySession({ transcript: 'Test' })).rejects.toThrow('unparseable response');
    });

    it('should handle non-JSON response from server', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/generate-study-session`, () => {
          return new HttpResponse('<html>Error</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
        })
      );

      await expect(generateStudySession({ transcript: 'Test' })).rejects.toThrow('Invalid response from server');
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
        .rejects.toThrow();
    });

    it('should use default grade "partial" when missing', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/evaluate-exercise`, () => {
          return HttpResponse.json({ explanation: 'Some feedback' });
        })
      );

      const result = await evaluateExercise({ exercise: 'Test', studentAnswer: 'Answer' });
      expect(result.grade).toBe('partial');
      expect(result.explanation).toBe('Some feedback');
    });

    it('should use default explanation when missing', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/evaluate-exercise`, () => {
          return HttpResponse.json({ grade: 'correct' });
        })
      );

      const result = await evaluateExercise({ exercise: 'Test', studentAnswer: 'Answer' });
      expect(result.grade).toBe('correct');
      expect(result.explanation).toBe('Sin explicación disponible.');
    });

    it('should include receivedAt timestamp in response', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/evaluate-exercise`, () => {
          return HttpResponse.json({ grade: 'incorrect', explanation: 'Wrong' });
        })
      );

      const result = await evaluateExercise({ exercise: 'Test', studentAnswer: 'Wrong' });
      expect(result.receivedAt).toBeDefined();
      expect(typeof result.receivedAt).toBe('string');
    });

    it('should handle non-JSON response', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/evaluate-exercise`, () => {
          return new HttpResponse('Not JSON', { status: 200, headers: { 'Content-Type': 'text/plain' } });
        })
      );

      await expect(evaluateExercise({ exercise: 'Test', studentAnswer: 'Answer' })).rejects.toThrow(
        'Invalid response from server'
      );
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
        .rejects.toThrow();
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

    it('should handle non-JSON response from server', async () => {
      server.use(
        http.post(`${BACKEND_URL}/api/stude-chat`, () => {
          return new HttpResponse('Not JSON', { status: 200, headers: { 'Content-Type': 'text/plain' } });
        })
      );

      await expect(sendStudeChat({ message: 'Test' })).rejects.toThrow(
        'Invalid response from server'
      );
    });
  });
});

