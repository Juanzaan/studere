import { describe, it, expect } from 'vitest';
import { buildBrainReply } from '@/lib/session-utils';
import type { StudySession } from '@/lib/types';

describe('buildBrainReply - Brain chat responses', () => {
  const mockSession: StudySession = {
    id: 'test-session-1',
    title: 'Neurociencia Cognitiva',
    course: 'Psicología',
    createdAt: new Date().toISOString(),
    starred: false,
    sourceFileName: 'test.mp3',
    sourceFileType: 'audio/mp3',
    sourceKind: 'audio',
    templateId: 'class-summary',
    summary: 'La neuroplasticidad es la capacidad del cerebro de reorganizarse.\n\nLa memoria de trabajo es limitada y se puede mejorar con entrenamiento.\n\nLos neurotransmisores regulan la comunicación neuronal.',
    keyConcepts: [
      {
        term: 'Neuroplasticidad',
        description: 'Capacidad del cerebro para reorganizar sus conexiones neuronales en respuesta a la experiencia.',
      },
      {
        term: 'Memoria de trabajo',
        description: 'Sistema de almacenamiento temporal de información necesaria para tareas cognitivas complejas.',
      },
    ],
    flashcards: [
      {
        question: '¿Qué es la neuroplasticidad?',
        answer: 'Es la capacidad del cerebro para reorganizar sus conexiones neuronales en respuesta a la experiencia. Permite el aprendizaje y la adaptación.',
      },
      {
        question: '¿Dónde se localiza la memoria de trabajo?',
        answer: 'En la corteza prefrontal del cerebro.',
      },
    ],
    quiz: [
      {
        question: '¿Cuál es la función principal de la neuroplasticidad?',
        options: ['Almacenar recuerdos', 'Reorganizar conexiones neuronales', 'Regular emociones', 'Producir hormonas'],
        correct: 1,
        explanation: 'La neuroplasticidad permite que el cerebro se adapte reorganizando sus conexiones.',
      },
      {
        question: '¿Qué característica tiene la memoria de trabajo?',
        options: ['Es ilimitada', 'Es permanente', 'Es limitada', 'Es involuntaria'],
        correct: 2,
        explanation: 'La memoria de trabajo tiene capacidad limitada y almacena información temporalmente.',
      },
    ],
    transcript: [
      { id: 'seg-1', text: 'La neuroplasticidad permite al cerebro adaptarse constantemente', speaker: 'Profesor', timestamp: '00:05' },
      { id: 'seg-2', text: 'La memoria de trabajo es crucial para el razonamiento', speaker: 'Profesor', timestamp: '02:30' },
    ],
    bookmarks: [],
    comments: [],
    insights: [],
    actionItems: [
      {
        id: 'task-1',
        title: 'Repasar concepto de neuroplasticidad',
        owner: 'Estudiante',
        status: 'pending',
        dueLabel: 'Hoy',
      },
      {
        id: 'task-2',
        title: 'Completar quiz de memoria',
        owner: 'Estudiante',
        status: 'completed',
        dueLabel: 'Mañana',
      },
    ],
    mindMap: { id: 'root', label: 'Neurociencia' },
    chatHistory: [],
    stats: {
      wordCount: 250,
      segmentCount: 2,
      estimatedDurationMinutes: 15,
    },
    studyMetrics: {
      completionRate: 75,
      quizAccuracy: 85,
      reviewCount: 3,
    },
  };

  describe('Summary requests', () => {
    it('should return deep summary when asked for resumen', () => {
      const reply = buildBrainReply(mockSession, 'Dame un resumen');
      expect(reply).toContain('Resumen ejecutivo');
      expect(reply).toContain('Neurociencia Cognitiva');
      expect(reply).toContain('Puntos clave');
    });

    it('should return deep summary when asked for summary in English', () => {
      const reply = buildBrainReply(mockSession, 'Give me a summary');
      expect(reply).toContain('Resumen ejecutivo');
    });

    it('should return deep summary when asked for takeaways', () => {
      const reply = buildBrainReply(mockSession, 'What are the key takeaways?');
      expect(reply).toContain('Puntos clave');
    });

    it('should include key concepts in summary', () => {
      const reply = buildBrainReply(mockSession, 'resumen puntos clave');
      expect(reply).toContain('conceptos identificados');
      expect(reply).toContain('Neuroplasticidad');
    });

    it('should include pending tasks in summary', () => {
      const reply = buildBrainReply(mockSession, 'dame los puntos importantes');
      expect(reply).toContain('tareas pendientes');
      expect(reply).toContain('Repasar concepto');
    });
  });

  describe('Confusion and difficulty requests', () => {
    it('should explain confusing concepts when asked', () => {
      const reply = buildBrainReply(mockSession, '¿Qué conceptos son confusos?');
      expect(reply).toContain('Conceptos que pueden generar confusión');
      expect(reply).toContain('Neuroplasticidad');
    });

    it('should provide tips for understanding', () => {
      const reply = buildBrainReply(mockSession, 'Qué conceptos me confusan');
      expect(reply).toContain('Conceptos que pueden generar confusión');
      expect(reply).toContain('Tip');
    });

    it('should include quiz questions for self-assessment', () => {
      const reply = buildBrainReply(mockSession, 'Esto es confuso para mí');
      expect(reply).toContain('Autoevaluación rápida');
    });
  });

  describe('Exam preparation requests', () => {
    it('should provide exam prep plan when asked', () => {
      const reply = buildBrainReply(mockSession, 'Cómo preparo el examen?');
      expect(reply).toContain('Plan de preparación para examen');
      expect(reply).toContain('Fase 1');
      expect(reply).toContain('Fase 2');
      expect(reply).toContain('Fase 3');
    });

    it('should include comprehension phase', () => {
      const reply = buildBrainReply(mockSession, 'preparar parcial');
      expect(reply).toContain('Comprensión');
      expect(reply).toContain('Releer');
    });

    it('should include memorization phase', () => {
      const reply = buildBrainReply(mockSession, 'plan de estudio examen');
      expect(reply).toContain('Memorización activa');
      expect(reply).toContain('Flashcard');
    });

    it('should include practice phase', () => {
      const reply = buildBrainReply(mockSession, 'evaluar conocimiento');
      expect(reply).toContain('Práctica');
      expect(reply).toContain('Quiz');
    });

    it('should show current quiz performance', () => {
      const reply = buildBrainReply(mockSession, 'preparación examen');
      expect(reply).toContain('rendimiento actual');
      expect(reply).toContain('85%');
      expect(reply).toContain('Buen nivel');
    });
  });

  describe('Task and action requests', () => {
    it('should list tasks when asked', () => {
      const reply = buildBrainReply(mockSession, '¿Qué tareas tengo?');
      expect(reply).toContain('Tareas sugeridas');
      expect(reply).toContain('Repasar concepto');
    });

    it('should show completed and pending tasks', () => {
      const reply = buildBrainReply(mockSession, '¿Qué tareas debo hacer siguiente?');
      expect(reply).toContain('✅');
      expect(reply).toContain('⬜');
    });

    it('should suggest additional tasks', () => {
      const reply = buildBrainReply(mockSession, 'qué debo hacer next');
      expect(reply).toContain('Tareas adicionales que te sugiero');
      expect(reply).toContain('quiz completo');
    });
  });

  describe('Deep dive and Socratic requests', () => {
    it('should provide Socratic deep dive when asked', () => {
      const reply = buildBrainReply(mockSession, 'Profundiza en el tema');
      expect(reply).toContain('Deep dive');
      expect(reply).toContain('Neuroplasticidad');
    });

    it('should include thought-provoking questions', () => {
      const reply = buildBrainReply(mockSession, 'Explicame como tutor socrático');
      expect(reply).toContain('Preguntas para profundizar');
      expect(reply).toContain('¿Por qué');
    });

    it('should show connections between concepts', () => {
      const reply = buildBrainReply(mockSession, 'deep explanation');
      expect(reply).toContain('Conexión clave');
      expect(reply).toContain('Memoria de trabajo');
    });
  });

  describe('Concept listing requests', () => {
    it('should list key concepts when asked', () => {
      const reply = buildBrainReply(mockSession, '¿Cuáles son los conceptos clave?');
      expect(reply).toContain('Conceptos clave');
      expect(reply).toContain('Neuroplasticidad');
      expect(reply).toContain('Memoria de trabajo');
    });

    it('should include concept descriptions', () => {
      const reply = buildBrainReply(mockSession, 'temas principales');
      expect(reply).toContain('Capacidad del cerebro');
    });
  });

  describe('Quiz and practice requests', () => {
    it('should show quiz questions when asked', () => {
      const reply = buildBrainReply(mockSession, '¿Puedo ver las preguntas de práctica?');
      expect(reply).toContain('Preguntas de práctica');
      expect(reply).toContain('neuroplasticidad');
    });

    it('should include correct answers', () => {
      const reply = buildBrainReply(mockSession, 'quiz questions');
      expect(reply).toContain('Reorganizar conexiones neuronales');
    });
  });

  describe('Flashcard and review requests', () => {
    it('should show flashcards when asked', () => {
      const reply = buildBrainReply(mockSession, 'Muéstrame las flashcards');
      expect(reply).toContain('Flashcards para repasar');
    });

    it('should format flashcards with question and answer', () => {
      const reply = buildBrainReply(mockSession, 'repaso memorización');
      expect(reply).toContain('**P:**');
      expect(reply).toContain('**R:**');
      expect(reply).toContain('neuroplasticidad');
    });
  });

  describe('Transcript search', () => {
    it('should find relevant transcript segments', () => {
      const reply = buildBrainReply(mockSession, '¿Qué dijo sobre neuroplasticidad?');
      expect(reply).toContain('fragmento(s) relevante(s)');
      expect(reply).toContain('Profesor');
    });

    it('should show timestamp and speaker', () => {
      const reply = buildBrainReply(mockSession, 'razonamiento crucial importante');
      expect(reply).toContain('Profesor');
      expect(reply).toContain('[02:30]');
    });

    it('should provide tip for transcript usage', () => {
      const reply = buildBrainReply(mockSession, 'razonamiento');
      expect(reply).toContain('Tip');
      expect(reply).toContain('✨');
    });
  });

  describe('Default fallback', () => {
    it('should return deep summary for unrecognized queries', () => {
      const reply = buildBrainReply(mockSession, 'xyz random query');
      expect(reply).toContain('Resumen ejecutivo');
    });
  });

  describe('Cross-session connections', () => {
    const otherSession: StudySession = {
      ...mockSession,
      id: 'test-session-2',
      title: 'Psicología del Aprendizaje',
      keyConcepts: [
        {
          term: 'Neuroplasticidad',
          description: 'También vista en neurociencia',
        },
      ],
    };

    it('should find connections with other sessions', () => {
      const reply = buildBrainReply(mockSession, '¿Cómo se conecta con otras sesiones?', [mockSession, otherSession]);
      expect(reply).toContain('Conexiones con otras sesiones');
    });

    it('should list shared terms', () => {
      const reply = buildBrainReply(mockSession, 'relaciones con otras clases', [mockSession, otherSession]);
      expect(reply).toContain('comparte');
      expect(reply).toContain('Neuroplasticidad');
    });

    it('should handle no connections gracefully', () => {
      const unrelatedSession: StudySession = {
        ...mockSession,
        id: 'unrelated',
        keyConcepts: [{ term: 'Different', description: 'Unrelated' }],
      };
      const reply = buildBrainReply(mockSession, 'conexiones cross-session', [mockSession, unrelatedSession]);
      expect(reply).toContain('No encontré conceptos compartidos');
    });

    it('should require allSessions parameter for connections', () => {
      const reply = buildBrainReply(mockSession, 'conexiones con otras sesiones');
      expect(reply).toContain('necesito acceso a tu biblioteca completa');
    });
  });
});
