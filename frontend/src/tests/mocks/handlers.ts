import { http, HttpResponse } from 'msw';

const BACKEND_URL = 'http://localhost:7080';

export const handlers = [
  // Transcribe audio
  http.post(`${BACKEND_URL}/api/transcribe-audio`, async () => {
    return HttpResponse.json({
      text: 'Mock transcription text for testing',
      language: 'es',
      duration: 120,
    });
  }),

  // Generate study session
  http.post(`${BACKEND_URL}/api/generate-study-session`, async () => {
    return HttpResponse.json({
      output: {
        summary: '## Mock Summary\n\nThis is a test summary with **markdown**.',
        keyConcepts: [
          { term: 'Test Concept', definition: 'A concept for testing' },
        ],
        flashcards: [
          { question: 'Test question?', answer: 'Test answer', difficulty: 'easy' },
        ],
        quiz: [
          {
            question: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            correct: 1,
            explanation: 'Basic math',
          },
        ],
        mindMap: {
          id: 'root',
          label: 'Test Session',
          children: [],
        },
        actionItems: [],
        insights: [],
        detectedAssets: [],
      },
    });
  }),

  // Evaluate exercise
  http.post(`${BACKEND_URL}/api/evaluate-exercise`, async () => {
    return HttpResponse.json({
      grade: 'correct',
      explanation: 'Mock evaluation feedback',
    });
  }),

  // Stude chat
  http.post(`${BACKEND_URL}/api/stude-chat`, async () => {
    return HttpResponse.json({
      reply: 'Mock AI response for testing',
    });
  }),
];
