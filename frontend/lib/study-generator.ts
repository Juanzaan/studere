import { SessionDraftInput, StudySession } from "@/lib/types";
import { createActionItems, createInsights, createMindMap, createWelcomeChat } from "@/lib/session-utils";

const stopWords = new Set([
  "de",
  "la",
  "el",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "y",
  "o",
  "que",
  "en",
  "con",
  "para",
  "por",
  "del",
  "al",
  "se",
  "es",
  "como",
  "más",
  "mas",
  "muy",
  "esta",
  "este",
  "estos",
  "estas",
  "desde",
  "sobre",
  "entre",
  "también",
  "donde",
  "porque",
  "cuando",
  "hacia",
  "cada",
  "durante",
  "antes",
  "después",
  "their",
  "with",
  "from",
  "into",
  "about"
]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFallbackTranscript(title: string, course: string, fileName?: string) {
  return [
    `En esta sesión de ${course || "estudio general"} se presentó el tema central ${title}, conectándolo con los objetivos de la materia y con situaciones prácticas que el estudiante debe reconocer en clase y en evaluación.`,
    `Se repasaron definiciones, relaciones entre conceptos y posibles errores frecuentes al interpretar el material, con énfasis en entender por qué cada idea importa y cuándo conviene aplicarla.`,
    `La discusión retomó ejemplos, comparaciones y una secuencia de razonamiento útil para estudiar después. También se marcaron puntos que conviene revisar antes del próximo examen o trabajo práctico.`,
    `El archivo ${fileName || "subido por el usuario"} quedó asociado a una sesión que sirve como base para generar resumen, conceptos clave, preguntas de práctica y tarjetas de memoria reutilizables.`
  ].join(" ");
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function formatTimestamp(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function buildTranscript(text: string) {
  const sentences = splitSentences(text);
  const speakers = ["Profesor", "Clase", "Profesor", "Clase"];

  return sentences.map((sentence, index) => ({
    id: `seg-${index + 1}`,
    speaker: speakers[index % speakers.length],
    timestamp: formatTimestamp(index * 68),
    text: sentence
  }));
}

function generateSummary(sentences: string[]): string {
  return sentences.slice(0, 4).map((sentence) => {
    if (sentence.length <= 160) {
      return sentence;
    }
    return `${sentence.slice(0, 157).trim()}...`;
  }).join("\n\n");
}

function extractConcepts(sentences: string[]) {
  const frequency = new Map<string, number>();

  for (const sentence of sentences) {
    const words = sentence
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z0-9]{4,}/g);

    if (!words) {
      continue;
    }

    for (const word of words) {
      if (stopWords.has(word)) {
        continue;
      }

      frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }
  }

  const ranked = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([term], index) => ({
      term: term.charAt(0).toUpperCase() + term.slice(1),
      description: sentences[index % sentences.length] || `Concepto relevante dentro de la sesión sobre ${term}.`
    }));

  return ranked.length > 0
    ? ranked
    : [
        {
          term: "Repaso",
          description: "La sesión contiene material útil para consolidar conceptos clave y preparar evaluación."
        }
      ];
}

export function generateFlashcards(
  concepts: ReturnType<typeof extractConcepts>,
  sentences: string[] = [],
  excludeQuestions?: Set<string>,
  sentenceOffset = 0,
) {
  const cards: Array<{ question: string; answer: string }> = [];
  const excluded = excludeQuestions ?? new Set<string>();

  // From concepts: definition + importance + application
  const conceptTemplates = [
    (c: { term: string; description: string }) => ({
      question: `¿Qué significa ${c.term.toLowerCase()} en esta sesión?`,
      answer: c.description,
    }),
    (c: { term: string; description: string }) => ({
      question: `¿Por qué es importante ${c.term.toLowerCase()}?`,
      answer: `Es un concepto clave porque: ${c.description}`,
    }),
    (c: { term: string; description: string }) => ({
      question: `¿Cómo aplicarías ${c.term.toLowerCase()} en un caso práctico?`,
      answer: `Se aplica entendiendo que: ${c.description}`,
    }),
  ];

  for (const concept of concepts) {
    for (const tpl of conceptTemplates) {
      const card = tpl(concept);
      if (!excluded.has(card.question)) cards.push(card);
    }
  }

  // From transcript sentences: comprehension questions
  const usedSentences = new Set<number>();
  const templateQ = [
    (s: string) => ({ question: `Explica con tus palabras: "${s.length > 80 ? s.slice(0, 77) + "..." : s}"`, answer: s }),
    (s: string) => ({ question: `¿Qué quiere decir este fragmento? "${s.length > 80 ? s.slice(0, 77) + "..." : s}"`, answer: s }),
    (s: string) => ({ question: `Completa el concepto: "${s.slice(0, Math.floor(s.length * 0.4))}..."`, answer: s }),
    (s: string) => ({ question: `Relaciona este punto con el tema central: "${s.length > 80 ? s.slice(0, 77) + "..." : s}"`, answer: s }),
    (s: string) => ({ question: `¿Qué consecuencia tiene lo siguiente? "${s.length > 80 ? s.slice(0, 77) + "..." : s}"`, answer: s }),
  ];

  const startIdx = sentenceOffset % Math.max(sentences.length, 1);
  for (let j = 0; j < sentences.length && cards.length < 18; j++) {
    const i = (startIdx + j) % sentences.length;
    const sentence = sentences[i];
    if (sentence.length < 30 || usedSentences.has(i)) continue;
    usedSentences.add(i);
    const template = templateQ[(i + sentenceOffset) % templateQ.length];
    const card = template(sentence);
    if (!excluded.has(card.question)) cards.push(card);
  }

  return cards.slice(0, 18);
}

function generateQuiz(summary: string, concepts: ReturnType<typeof extractConcepts>, sentences: string[] = []) {
  const items: Array<{ question: string; options: string[]; correct: number; explanation: string }> = [];

  // Main idea question
  const summaryParas = summary.split(/\n\n+/).filter(Boolean);
  if (summaryParas[0]) {
    items.push({
      question: "¿Cuál fue la idea principal de la clase o sesión?",
      options: [
        summaryParas[0].slice(0, 120),
        "No se discutió ningún tema central",
        "Solo se hicieron preguntas sin respuesta",
        "El tema fue exclusivamente administrativo",
      ],
      correct: 0,
      explanation: summaryParas[0],
    });
  }

  // Concept-based questions
  for (const concept of concepts.slice(0, 4)) {
    items.push({
      question: `¿Qué describe mejor el concepto de ${concept.term.toLowerCase()}?`,
      options: [
        concept.description.slice(0, 120),
        "Un tema no relacionado con la sesión",
        "Una técnica obsoleta sin uso actual",
        "Un concepto exclusivo de otra materia",
      ],
      correct: 0,
      explanation: concept.description,
    });
  }

  // Comprehension from transcript sentences
  for (let i = 0; i < sentences.length && items.length < 12; i++) {
    if (sentences[i].length < 35) continue;
    items.push({
      question: `¿Qué se explicó en este fragmento? "${sentences[i].length > 90 ? sentences[i].slice(0, 87) + "..." : sentences[i]}"`,
      options: [
        sentences[i].slice(0, 120),
        "Nada relevante para el tema",
        "Una opinión personal sin fundamento",
        "Un error del profesor",
      ],
      correct: 0,
      explanation: sentences[i],
    });
  }

  return items.slice(0, 12);
}

export function createStudySession(input: SessionDraftInput): StudySession {
  const baseText = input.notes?.trim() || buildFallbackTranscript(input.title, input.course, input.fileName);
  const transcript = buildTranscript(baseText);
  const sentences = transcript.map((item) => item.text);
  const summary = generateSummary(sentences);
  const keyConcepts = extractConcepts(sentences);
  const flashcards = generateFlashcards(keyConcepts, sentences);
  const quiz = generateQuiz(summary, keyConcepts, sentences);
  const wordCount = baseText.split(/\s+/).filter(Boolean).length;
  const estimatedDurationMinutes = Math.max(5, Math.round(wordCount / 110));
  const kind = input.fileType?.startsWith("video") ? "video" : input.fileType?.startsWith("audio") ? "audio" : "text";

  const id = `${slugify(input.title || "sesion")}-${Date.now()}`;
  const baseSession = {
    id,
    title: input.title,
    course: input.course,
    createdAt: new Date().toISOString(),
    starred: false,
    sourceFileName: input.fileName || "Sin archivo",
    sourceFileType: input.fileType || "text/plain",
    sourceKind: kind,
    templateId: input.templateId || "class-summary",
    sourceUrl: input.sourceUrl,
    transcript,
    summary,
    keyConcepts,
    flashcards,
    quiz,
    stats: {
      wordCount,
      segmentCount: transcript.length,
      estimatedDurationMinutes
    },
    studyMetrics: {
      completionRate: 33,
      quizAccuracy: 0,
      reviewCount: 0
    }
  } satisfies Pick<
    StudySession,
    | "id"
    | "title"
    | "course"
    | "createdAt"
    | "starred"
    | "sourceFileName"
    | "sourceFileType"
    | "sourceKind"
    | "templateId"
    | "sourceUrl"
    | "transcript"
    | "summary"
    | "keyConcepts"
    | "flashcards"
    | "quiz"
    | "stats"
    | "studyMetrics"
  >;

  return {
    ...baseSession,
    actionItems: createActionItems(baseSession),
    mindMap: createMindMap(baseSession),
    bookmarks: [],
    comments: [],
    insights: createInsights(baseSession),
    chatHistory: createWelcomeChat(baseSession)
  };
}
