/**
 * Seed data generator — creates realistic mock study data for development/testing.
 *
 * Generates 8 study sessions across 4 courses over the last 7 days,
 * plus quiz attempts and flashcard review history.
 *
 * Usage (browser console):
 *   import { seedMockData } from "@/lib/seed-data";
 *   seedMockData();
 *
 * Or visit /dev/seed for a clickable button.
 */

import type { StudySession, QuizAttempt, FlashcardAttempt, MindMapNode, TranscriptSegment } from "@/lib/types";

const COURSES = ["Álgebra Lineal", "Programación Avanzada", "Base de Datos", "Redes"] as const;

const SESSION_TEMPLATES: { title: string; course: (typeof COURSES)[number]; templateId: "class-summary" | "exam-review" | "meeting-notes" }[] = [
  { title: "Vectores y espacios vectoriales", course: "Álgebra Lineal", templateId: "class-summary" },
  { title: "Transformaciones lineales", course: "Álgebra Lineal", templateId: "class-summary" },
  { title: "Autovalores y autovectores", course: "Álgebra Lineal", templateId: "exam-review" },
  { title: "POO en Java — herencia y polimorfismo", course: "Programación Avanzada", templateId: "class-summary" },
  { title: "Manejo de excepciones y streams", course: "Programación Avanzada", templateId: "class-summary" },
  { title: "Normalización de bases de datos", course: "Base de Datos", templateId: "class-summary" },
  { title: "SQL avanzado — joins y subqueries", course: "Base de Datos", templateId: "exam-review" },
  { title: "Modelo OSI y TCP/IP", course: "Redes", templateId: "class-summary" },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));
  return d.toISOString();
}

function generateTranscript(topic: string): TranscriptSegment[] {
  const speakers = ["Profesor", "Clase"];
  const lines = [
    `Hoy vamos a ver ${topic.toLowerCase()}. Este es un tema fundamental para la materia.`,
    `La definición formal establece que... es importante entender bien este concepto.`,
    `Vamos a ver un ejemplo práctico para entender mejor cómo se aplica.`,
    `Como mencioné antes, la clave está en comprender la relación entre los distintos elementos.`,
    `Otra forma de pensar esto es... lo que nos lleva a una conclusión interesante.`,
    `Hay varias propiedades importantes que debemos recordar para el examen.`,
    `En particular, quiero enfatizar que... esto suele ser una fuente común de errores.`,
    `Para cerrar, veamos cómo se relaciona este tema con lo que vimos la clase anterior.`,
    `¿Alguna pregunta sobre lo que hemos cubierto hasta ahora?`,
    `Recuerden practicar con los ejercicios de la guía para la próxima clase.`,
  ];
  return lines.map((text, i) => ({
    id: `seg-${i + 1}`,
    speaker: speakers[i % 2],
    timestamp: `${String(i).padStart(2, "0")}:00`,
    text,
  }));
}

function generateConcepts(topic: string): { term: string; description: string }[] {
  return [
    { term: topic, description: `Concepto central de la sesión que abarca los fundamentos teóricos y aplicaciones prácticas.` },
    { term: "Definición formal", description: `Enunciado matemático que establece las condiciones precisas del concepto estudiado.` },
    { term: "Propiedades fundamentales", description: `Conjunto de características que determinan el comportamiento del concepto en distintos escenarios.` },
    { term: "Aplicaciones prácticas", description: `Casos de uso real donde se aplica el conocimiento teórico adquirido en clase.` },
    { term: "Casos especiales", description: `Situaciones particulares donde el concepto se comporta de manera diferente a lo esperado.` },
    { term: "Relación con otros temas", description: `Conexiones conceptuales entre este tema y otros vistos anteriormente en el curso.` },
  ];
}

function generateFlashcards(topic: string) {
  return [
    { question: `¿Qué es ${topic.toLowerCase()}?`, answer: `${topic} es un concepto fundamental que se define como... Su importancia radica en que permite comprender fenómenos más complejos dentro de la disciplina.`, difficulty: "medium" as const },
    { question: `¿Cuáles son las propiedades principales de ${topic.toLowerCase()}?`, answer: `Las propiedades principales incluyen: conmutatividad, asociatividad y existencia de elemento neutro. Cada una tiene implicaciones importantes en la resolución de problemas.`, difficulty: "hard" as const },
    { question: `¿Cómo se diferencia ${topic.toLowerCase()} de otros conceptos similares?`, answer: `A diferencia de conceptos relacionados, ${topic.toLowerCase()} se caracteriza por... Esta distinción es crucial para elegir el enfoque correcto en cada problema.`, difficulty: "hard" as const },
    { question: `Mencioná una aplicación práctica de ${topic.toLowerCase()}`, answer: `Una aplicación común es en el análisis de sistemas complejos, donde ${topic.toLowerCase()} permite modelar y predecir comportamientos de manera eficiente.`, difficulty: "easy" as const },
    { question: `¿Qué errores son comunes al estudiar ${topic.toLowerCase()}?`, answer: `Los errores más frecuentes incluyen confundir las propiedades, aplicar incorrectamente las definiciones y omitir casos especiales. Es importante practicar con ejercicios variados.`, difficulty: "medium" as const },
  ];
}

function generateQuiz(topic: string) {
  return [
    {
      question: `¿Cuál es la definición correcta de ${topic.toLowerCase()}?`,
      options: [
        "Un concepto abstracto sin aplicaciones prácticas",
        `La base teórica que explica ${topic.toLowerCase()}`,
        "Un teorema matemático sin demostración",
        "Una regla empírica sin fundamento",
      ],
      correct: 1,
      explanation: `${topic} tiene una definición formal bien establecida que sirve como fundamento para comprender sus aplicaciones. Las otras opciones son incorrectas porque minimizan su importancia o precisión.`,
    },
    {
      question: `¿Qué propiedad es fundamental en ${topic.toLowerCase()}?`,
      options: ["La conmutatividad", "La transitividad", "La biyectividad", "Depende del contexto"],
      correct: 3,
      explanation: `La propiedad fundamental depende del contexto específico de aplicación. No hay una única propiedad que sea universalmente aplicable a todos los casos de ${topic.toLowerCase()}.`,
    },
    {
      question: `¿En qué se diferencia ${topic.toLowerCase()} de un concepto relacionado?`,
      options: [
        "Son exactamente lo mismo",
        `${topic} es más específico y tiene requisitos adicionales`,
        "No tienen relación alguna",
        "Uno es más difícil que el otro",
      ],
      correct: 1,
      explanation: `La diferencia clave es que ${topic.toLowerCase()} tiene requisitos y propiedades específicas que lo distinguen de conceptos similares pero no idénticos.`,
    },
    {
      question: `¿Cuál de las siguientes NO es una aplicación de ${topic.toLowerCase()}?`,
      options: [
        "Análisis de datos",
        "Resolución de problemas complejos",
        "Cocinar una receta",
        "Modelado matemático",
      ],
      correct: 2,
      explanation: `Si bien ${topic.toLowerCase()} tiene muchas aplicaciones en análisis y modelado, no está diseñado para aplicaciones culinarias. Esta opción busca confundir con aplicaciones cotidianas.`,
    },
  ];
}

function generateActionItems() {
  return [
    { id: `ai-${crypto.randomUUID()}`, title: "Resolver los ejercicios pares de la guía práctica", owner: "Yo", status: "pending" as const, dueLabel: "Próxima clase" },
    { id: `ai-${crypto.randomUUID()}`, title: "Repasar los conceptos clave antes del próximo examen", owner: "Yo", status: "pending" as const, dueLabel: "Esta semana" },
    { id: `ai-${crypto.randomUUID()}`, title: "Preparar preguntas para la consulta del jueves", owner: "Yo", status: "completed" as const, dueLabel: "Jueves" },
  ];
}

function generateMindMap(topic: string): MindMapNode {
  return {
    id: "root",
    label: topic,
    children: [
      {
        id: "branch-1",
        label: "Definición",
        accent: "blue" as const,
        children: [
          { id: "leaf-1a", label: "Concepto formal" },
          { id: "leaf-1b", label: "Notación" },
        ],
      },
      {
        id: "branch-2",
        label: "Propiedades",
        accent: "violet" as const,
        children: [
          { id: "leaf-2a", label: "Propiedad 1" },
          { id: "leaf-2b", label: "Propiedad 2" },
          { id: "leaf-2c", label: "Propiedad 3" },
        ],
      },
      {
        id: "branch-3",
        label: "Ejemplos",
        accent: "green" as const,
        children: [
          { id: "leaf-3a", label: "Ejemplo básico" },
          { id: "leaf-3b", label: "Ejemplo avanzado" },
        ],
      },
      {
        id: "branch-4",
        label: "Aplicaciones",
        accent: "amber" as const,
        children: [
          { id: "leaf-4a", label: "Problemas tipo" },
          { id: "leaf-4b", label: "Casos reales" },
        ],
      },
    ],
  };
}

function generateInsights() {
  return [
    { id: `ins-${crypto.randomUUID()}`, label: "Material completo", value: "Bien", description: "La sesión cubre todos los temas esperados con ejemplos prácticos.", tone: "good" as const },
    { id: `ins-${crypto.randomUUID()}`, label: "Participación", value: "Activa", description: "Se registraron preguntas y respuestas durante la clase.", tone: "neutral" as const },
  ];
}

/**
 * Seed localStorage with 8 realistic study sessions plus quiz/flashcard history.
 *
 * Call this from the browser console or the /dev/seed page.
 *
 * @example
 * ```ts
 * seedMockData(); // Adds data, dispatches update events
 * ```
 */
export function seedMockData(): void {
  const sessions: StudySession[] = SESSION_TEMPLATES.map((t, i) => {
    const createdAt = daysAgo(i);
    const wordCount = 600 + Math.floor(Math.random() * 900);
    return {
      id: `seed-session-${i + 1}`,
      title: t.title,
      course: t.course,
      createdAt,
      starred: i < 3,
      sourceFileName: `clase-${i + 1}.mp3`,
      sourceFileType: "audio/mpeg",
      sourceKind: "audio",
      templateId: t.templateId,
      transcript: generateTranscript(t.title),
      summary: `## Resumen de ${t.title}\n\nEn esta clase se abordaron los conceptos fundamentales relacionados con ${t.title.toLowerCase()}. El profesor explicó detalladamente las definiciones, propiedades y aplicaciones prácticas.\n\n### Puntos principales\n\n- Se presentó la definición formal del concepto\n- Se analizaron las propiedades fundamentales\n- Se resolvieron ejemplos prácticos\n- Se discutieron aplicaciones en contextos reales\n\n### Conclusión\n\n${t.title} es un tema fundamental que sienta las bases para conceptos más avanzados. Es importante practicar con los ejercicios de la guía para afianzar los conocimientos.`,
      keyConcepts: generateConcepts(t.title),
      flashcards: generateFlashcards(t.title) as any,
      quiz: generateQuiz(t.title),
      actionItems: generateActionItems(),
      mindMap: generateMindMap(t.title),
      bookmarks: [],
      comments: [],
      insights: generateInsights(),
      chatHistory: [
        { id: `chat-${i}-1`, role: "user", content: "¿Podés explicar el concepto principal de la clase?", createdAt: daysAgo(i - 0.1) },
        { id: `chat-${i}-2`, role: "assistant", content: `Claro. El concepto principal de "${t.title}" se refiere a... Es importante entender que...`, createdAt: daysAgo(i - 0.09) },
      ],
      stats: {
        wordCount,
        segmentCount: 10,
        estimatedDurationMinutes: 45 + Math.floor(Math.random() * 30),
      },
      studyMetrics: {
        completionRate: 0.6 + Math.random() * 0.4,
        quizAccuracy: 0.5 + Math.random() * 0.45,
        reviewCount: Math.floor(Math.random() * 5),
        lastReviewedAt: daysAgo(Math.floor(Math.random() * 3)),
      },
    };
  });

  const quizAttempts: QuizAttempt[] = [
    { sessionId: "seed-session-1", timestamp: daysAgo(1), correct: 3, total: 4 },
    { sessionId: "seed-session-1", timestamp: daysAgo(0), correct: 4, total: 4 },
    { sessionId: "seed-session-2", timestamp: daysAgo(2), correct: 2, total: 4 },
    { sessionId: "seed-session-2", timestamp: daysAgo(0), correct: 3, total: 4 },
    { sessionId: "seed-session-3", timestamp: daysAgo(3), correct: 3, total: 4 },
    { sessionId: "seed-session-3", timestamp: daysAgo(1), correct: 2, total: 4 },
    { sessionId: "seed-session-4", timestamp: daysAgo(4), correct: 4, total: 4 },
    { sessionId: "seed-session-5", timestamp: daysAgo(2), correct: 1, total: 4 },
    { sessionId: "seed-session-6", timestamp: daysAgo(1), correct: 3, total: 4 },
    { sessionId: "seed-session-7", timestamp: daysAgo(0), correct: 4, total: 4 },
  ];

  const flashcardAttempts: FlashcardAttempt[] = [
    { sessionId: "seed-session-1", timestamp: daysAgo(0), reviewed: 12 },
    { sessionId: "seed-session-1", timestamp: daysAgo(1), reviewed: 8 },
    { sessionId: "seed-session-2", timestamp: daysAgo(0), reviewed: 5 },
    { sessionId: "seed-session-2", timestamp: daysAgo(2), reviewed: 10 },
    { sessionId: "seed-session-3", timestamp: daysAgo(1), reviewed: 7 },
    { sessionId: "seed-session-3", timestamp: daysAgo(3), reviewed: 6 },
    { sessionId: "seed-session-4", timestamp: daysAgo(0), reviewed: 4 },
    { sessionId: "seed-session-5", timestamp: daysAgo(2), reviewed: 9 },
    { sessionId: "seed-session-6", timestamp: daysAgo(1), reviewed: 11 },
    { sessionId: "seed-session-7", timestamp: daysAgo(0), reviewed: 3 },
    { sessionId: "seed-session-8", timestamp: daysAgo(0), reviewed: 6 },
    { sessionId: "seed-session-8", timestamp: daysAgo(4), reviewed: 8 },
  ];

  // Write to localStorage
  try {
    window.localStorage.setItem("studere.sessions.v1", JSON.stringify(sessions));
    window.localStorage.setItem("studere.quiz-attempts.v1", JSON.stringify(quizAttempts));
    window.localStorage.setItem("studere.flashcard-attempts.v1", JSON.stringify(flashcardAttempts));

    // Dispatch update events so the UI reactively refreshes
    window.dispatchEvent(new Event("studere:sessions-updated"));
    window.dispatchEvent(new Event("studere:analytics-updated"));

    console.log(`✅ Seed data generado:
    • 8 sesiones de estudio (${COURSES.join(", ")}) en los últimos 7 días
    • 10 intentos de quiz
    • 12 repasos de flashcards
    • 3 sesiones destacadas (starred)

   📊 Visitá /analytics para ver las charts con datos reales.`);
  } catch (e) {
    console.error("❌ Error al generar seed data:", e);
  }
}
