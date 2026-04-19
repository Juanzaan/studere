import type { StudySession } from '@/lib/types';

/**
 * Create a test session with all fields populated
 */
export function createTestSession(overrides?: Partial<StudySession>): StudySession {
  const baseSession: StudySession = {
    id: overrides?.id || 'test-session-fixture',
    title: 'Neurociencia Cognitiva - Test Session',
    course: 'Psicología',
    createdAt: new Date().toISOString(),
    starred: false,
    sourceFileName: 'test-audio.mp3',
    sourceFileType: 'audio/mp3',
    sourceKind: 'audio',
    templateId: 'class-summary',
    
    summary: `# Resumen de la Clase

La neuroplasticidad es la capacidad del cerebro para reorganizarse formando nuevas conexiones neuronales a lo largo de la vida. Este proceso es fundamental para el aprendizaje y la recuperación de lesiones cerebrales.

## Puntos Clave
- Las sinapsis son las conexiones entre neuronas
- El aprendizaje activo mejora la retención
- La práctica deliberada fortalece las conexiones neuronales`,

    keyConcepts: [
      { 
        term: 'Neuroplasticidad', 
        description: 'Capacidad del cerebro para adaptarse y reorganizarse formando nuevas conexiones neuronales.' 
      },
      { 
        term: 'Sinapsis', 
        description: 'Conexión funcional entre dos neuronas que permite la transmisión de señales.' 
      },
      { 
        term: 'Aprendizaje Activo', 
        description: 'Método de estudio que involucra participación activa en lugar de recepción pasiva de información.' 
      },
    ],

    flashcards: [
      {
        question: '¿Qué es la neuroplasticidad?',
        answer: 'Es la capacidad del cerebro para adaptarse y reorganizarse formando nuevas conexiones neuronales a lo largo de la vida.',
      },
      {
        question: '¿Cuál es la función de la sinapsis?',
        answer: 'La sinapsis es la conexión funcional entre dos neuronas que permite la transmisión de señales químicas y eléctricas.',
      },
      {
        question: '¿Por qué es importante el aprendizaje activo?',
        answer: 'El aprendizaje activo mejora la retención de información porque involucra participación activa en lugar de recepción pasiva.',
      },
    ],

    quiz: [
      {
        question: '¿Cuál es la función principal de la sinapsis?',
        options: [
          'Conectar neuronas para transmitir señales',
          'Producir energía para el cerebro',
          'Almacenar recuerdos a largo plazo',
          'Regular la temperatura cerebral',
        ],
        correct: 0,
        explanation: 'La sinapsis conecta neuronas para transmitir señales químicas y eléctricas, permitiendo la comunicación neuronal.',
      },
      {
        question: '¿Qué caracteriza al aprendizaje activo?',
        options: [
          'Escuchar pasivamente las clases',
          'Participación activa en el proceso de aprendizaje',
          'Memorizar sin comprender',
          'Estudiar solo antes de los exámenes',
        ],
        correct: 1,
        explanation: 'El aprendizaje activo se caracteriza por la participación activa del estudiante en el proceso de aprendizaje.',
      },
      {
        question: '¿Qué permite la neuroplasticidad?',
        options: [
          'Mantener el cerebro sin cambios',
          'Reorganizar conexiones neuronales',
          'Eliminar neuronas viejas',
          'Reducir el tamaño del cerebro',
        ],
        correct: 1,
        explanation: 'La neuroplasticidad permite al cerebro reorganizarse formando nuevas conexiones neuronales a lo largo de la vida.',
      },
    ],

    transcript: [
      { 
        id: 'seg-1', 
        text: 'Hoy vamos a hablar sobre neuroplasticidad, que es la capacidad del cerebro para adaptarse.', 
        speaker: 'Profesor', 
        timestamp: '00:00' 
      },
      { 
        id: 'seg-2', 
        text: 'Las sinapsis son las conexiones entre neuronas que permiten la comunicación neuronal.', 
        speaker: 'Profesor', 
        timestamp: '00:15' 
      },
      { 
        id: 'seg-3', 
        text: 'El aprendizaje activo es fundamental para mejorar la retención de información.', 
        speaker: 'Profesor', 
        timestamp: '00:30' 
      },
    ],

    bookmarks: [],
    comments: [],
    insights: [
      {
        id: 'insight-1',
        label: 'Punto Clave',
        value: 'Neuroplasticidad',
        description: 'La neuroplasticidad es fundamental para el aprendizaje continuo',
        tone: 'good' as const,
      },
    ],

    actionItems: [
      {
        id: 'task-1',
        title: 'Explicar con tus propias palabras qué es la neuroplasticidad',
        owner: 'student',
        status: 'pending' as const,
        dueLabel: 'Próxima clase',
        exercisePrompt: 'Escribe un párrafo explicando qué es la neuroplasticidad y por qué es importante para el aprendizaje.',
      },
      {
        id: 'task-2',
        title: 'Investigar ejemplos de neuroplasticidad en la vida cotidiana',
        owner: 'student',
        status: 'pending' as const,
        dueLabel: 'Esta semana',
      },
    ],

    mindMap: {
      id: 'root',
      label: 'Neurociencia Cognitiva',
      children: [
        {
          id: 'node-1',
          label: 'Neuroplasticidad',
          children: [
            { id: 'node-1-1', label: 'Adaptación cerebral' },
            { id: 'node-1-2', label: 'Nuevas conexiones' },
          ],
        },
        {
          id: 'node-2',
          label: 'Sinapsis',
          children: [
            { id: 'node-2-1', label: 'Transmisión de señales' },
          ],
        },
      ],
    },

    chatHistory: [],

    stats: {
      wordCount: 250,
      segmentCount: 3,
      estimatedDurationMinutes: 15,
    },

    studyMetrics: {
      completionRate: 0,
      quizAccuracy: 0,
      reviewCount: 0,
    },

    ...overrides,
  };

  return baseSession;
}

/**
 * Mock response for transcription API
 */
export const mockTranscriptResponse = {
  text: 'Hoy vamos a hablar sobre neuroplasticidad, que es la capacidad del cerebro para adaptarse. Las sinapsis son las conexiones entre neuronas que permiten la comunicación neuronal. El aprendizaje activo es fundamental para mejorar la retención de información.',
  language: 'es',
  duration: null,
  cached: false,
};

/**
 * Mock response for study session generation API
 */
export const mockGenerationResponse = {
  output: {
    summary: `# Resumen de la Clase\n\nLa neuroplasticidad es la capacidad del cerebro para reorganizarse formando nuevas conexiones neuronales.`,
    keyConcepts: [
      { term: 'Neuroplasticidad', description: 'Capacidad del cerebro para adaptarse.' },
      { term: 'Sinapsis', description: 'Conexión entre neuronas.' },
    ],
    flashcards: [
      { question: '¿Qué es la neuroplasticidad?', answer: 'Capacidad de adaptación del cerebro.' },
      { question: '¿Qué es una sinapsis?', answer: 'Conexión entre neuronas.' },
    ],
    quiz: [
      {
        question: '¿Cuál es la función de la sinapsis?',
        options: ['Conectar neuronas', 'Producir energía', 'Almacenar recuerdos', 'Regular temperatura'],
        correct: 0,
        explanation: 'La sinapsis conecta neuronas para transmitir señales.',
      },
    ],
    mindMap: {
      id: 'root',
      label: 'Neurociencia',
      children: [
        { id: 'node-1', label: 'Neuroplasticidad' },
        { id: 'node-2', label: 'Sinapsis' },
      ],
    },
    actionItems: [
      { 
        id: 'task-1', 
        title: 'Explicar neuroplasticidad', 
        owner: 'student',
        status: 'pending' as const,
        dueLabel: 'Próxima clase',
        exercisePrompt: 'Explica qué es la neuroplasticidad'
      },
    ],
    insights: [
      { 
        id: 'insight-1',
        label: 'Punto Clave',
        value: 'Neuroplasticidad',
        description: 'La neuroplasticidad es fundamental',
        tone: 'good' as const
      },
    ],
  },
  cached: false,
};
