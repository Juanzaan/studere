import {
  ActionItem,
  Bookmark,
  ChatMessage,
  MindMapNode,
  SessionComment,
  SessionInsight,
  StudySession,
  TranscriptSegment,
} from "@/lib/types";

function stableId(prefix: string, seed: string) {
  return `${prefix}-${seed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36) || prefix}`;
}

function firstSentence(value: string) {
  return value.split(/(?<=[.!?])\s+/)[0]?.trim() || value.trim();
}

function summaryParagraphs(summary: string): string[] {
  return summary.split(/\n\n+/).filter(Boolean);
}

function summarizeForChat(session: Pick<StudySession, "summary" | "title" | "course">) {
  if (!session.summary || session.summary.length === 0) {
    return `La sesión ${session.title} de ${session.course || "estudio general"} todavía no tiene un resumen generado.`;
  }

  return summaryParagraphs(session.summary).slice(0, 2).join(" ");
}

export function createActionItems(session: Pick<StudySession, "id" | "summary" | "keyConcepts" | "quiz" | "transcript">): ActionItem[] {
  const concept = session.keyConcepts[0];
  const secondConcept = session.keyConcepts[1];
  const firstSegment = session.transcript[0];

  return [
    {
      id: stableId("task", `${session.id}-repaso-general`),
      title: session.summary ? `Repasar la idea principal: ${firstSentence(summaryParagraphs(session.summary)[0] || "")}` : "Repasar la idea principal de la sesión",
      owner: "Tú",
      status: "pending",
      dueLabel: "Hoy",
      sourceSegmentId: firstSegment?.id,
    },
    {
      id: stableId("task", `${session.id}-concepto-clave`),
      title: concept ? `Dominar el concepto ${concept.term}` : "Dominar el concepto más importante de la sesión",
      owner: "Tú",
      status: "pending",
      dueLabel: "Antes del próximo repaso",
      sourceSegmentId: firstSegment?.id,
    },
    {
      id: stableId("task", `${session.id}-practica`),
      title: secondConcept ? `Resolver una pregunta práctica sobre ${secondConcept.term}` : "Resolver el mini quiz de la sesión",
      owner: "Tú",
      status: "pending",
      dueLabel: "Esta semana",
      sourceSegmentId: session.transcript[1]?.id,
    },
  ];
}

function mapAccent(index: number): MindMapNode["accent"] {
  if (index % 4 === 0) return "violet";
  if (index % 4 === 1) return "blue";
  if (index % 4 === 2) return "green";
  return "amber";
}

export function createMindMap(session: Pick<StudySession, "id" | "title" | "summary" | "keyConcepts" | "quiz">): MindMapNode {
  return {
    id: stableId("mindmap", session.id),
    label: session.title,
    accent: "violet",
    children: [
      {
        id: stableId("mindmap", `${session.id}-summary`),
        label: "Resumen",
        accent: "blue",
        children: summaryParagraphs(session.summary).slice(0, 3).map((item, index) => ({
          id: stableId("mindmap", `${session.id}-summary-${index}`),
          label: firstSentence(item),
          accent: mapAccent(index),
        })),
      },
      {
        id: stableId("mindmap", `${session.id}-concepts`),
        label: "Conceptos clave",
        accent: "green",
        children: session.keyConcepts.slice(0, 4).map((concept, index) => ({
          id: stableId("mindmap", `${session.id}-concept-${concept.term}-${index}`),
          label: concept.term,
          accent: mapAccent(index + 1),
          children: [
            {
              id: stableId("mindmap", `${session.id}-concept-desc-${concept.term}-${index}`),
              label: firstSentence(concept.description),
              accent: "blue",
            },
          ],
        })),
      },
      {
        id: stableId("mindmap", `${session.id}-practice`),
        label: "Práctica",
        accent: "amber",
        children: session.quiz.slice(0, 3).map((item, index) => ({
          id: stableId("mindmap", `${session.id}-quiz-${index}`),
          label: firstSentence(item.question),
          accent: mapAccent(index + 2),
        })),
      },
    ],
  };
}

export function createInsights(session: Pick<StudySession, "keyConcepts" | "stats" | "studyMetrics" | "quiz" | "summary">): SessionInsight[] {
  return [
    {
      id: "coverage",
      label: "Cobertura",
      value: `${session.stats.segmentCount} bloques`,
      description: "Cantidad de bloques detectados en el transcript para estudiar rápido.",
      tone: session.stats.segmentCount >= 4 ? "good" : "neutral",
    },
    {
      id: "concept-density",
      label: "Conceptos",
      value: `${session.keyConcepts.length} clave`,
      description: "Términos útiles para armar memoria activa y mapa mental.",
      tone: session.keyConcepts.length >= 4 ? "good" : "neutral",
    },
    {
      id: "quiz-accuracy",
      label: "Quiz accuracy",
      value: `${session.studyMetrics.quizAccuracy}%`,
      description: "Resultado acumulado de tus respuestas marcadas en el quiz.",
      tone: session.studyMetrics.quizAccuracy >= 70 ? "good" : session.studyMetrics.quizAccuracy > 0 ? "warning" : "neutral",
    },
    {
      id: "readiness",
      label: "Preparación",
      value: `${session.studyMetrics.completionRate}%`,
      description: session.summary ? firstSentence(summaryParagraphs(session.summary)[0] || "") : "La sesión ya tiene materiales listos para repasar.",
      tone: session.studyMetrics.completionRate >= 60 ? "good" : "neutral",
    },
  ];
}

export function createWelcomeChat(session: Pick<StudySession, "id" | "title" | "course" | "summary">): ChatMessage[] {
  return [
    {
      id: stableId("chat", `${session.id}-welcome`),
      role: "assistant",
      content: `Soy Stude. Ya revisé ${session.title} ${session.course ? `de ${session.course}` : ""}. ${summarizeForChat(session)}`,
      createdAt: new Date().toISOString(),
    },
  ];
}

function normalizeTranscriptSegment(segment: TranscriptSegment, index: number): TranscriptSegment {
  return {
    id: segment.id || `seg-${index + 1}`,
    speaker: segment.speaker || (index % 2 === 0 ? "Profesor" : "Clase"),
    timestamp: segment.timestamp || `${String(index).padStart(2, "0")}:00`,
    text: segment.text || "",
  };
}

export function normalizeSession(raw: StudySession): StudySession {
  const transcript = (raw.transcript || []).map(normalizeTranscriptSegment);
  // Backward compat: old sessions stored summary as string[], new ones as string
  const summary: string = Array.isArray((raw as any).summary)
    ? (raw as any).summary.join("\n\n")
    : (typeof raw.summary === "string" ? raw.summary : "");
  const keyConcepts = Array.isArray(raw.keyConcepts) ? raw.keyConcepts : [];
  const flashcards = Array.isArray(raw.flashcards) ? raw.flashcards : [];
  const quiz = Array.isArray(raw.quiz) ? raw.quiz : [];
  const studyMetrics = {
    completionRate: raw.studyMetrics?.completionRate ?? Math.min(100, Math.max(0, Math.round(((raw.actionItems?.filter((item) => item.status === "completed").length || 0) / Math.max(raw.actionItems?.length || 3, 1)) * 100))),
    quizAccuracy: raw.studyMetrics?.quizAccuracy ?? 0,
    reviewCount: raw.studyMetrics?.reviewCount ?? 0,
    lastReviewedAt: raw.studyMetrics?.lastReviewedAt,
  };

  const baseSession: StudySession = {
    ...raw,
    starred: raw.starred ?? false,
    templateId: raw.templateId ?? "class-summary",
    transcript,
    summary,
    keyConcepts,
    flashcards,
    quiz,
    actionItems: raw.actionItems?.length ? raw.actionItems : createActionItems({
      id: raw.id,
      summary,
      keyConcepts,
      quiz,
      transcript,
    }),
    mindMap: raw.mindMap ?? createMindMap({
      id: raw.id,
      title: raw.title,
      summary,
      keyConcepts,
      quiz,
    }),
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
    comments: Array.isArray(raw.comments) ? raw.comments : [],
    chatHistory: raw.chatHistory?.length ? raw.chatHistory : createWelcomeChat({
      id: raw.id,
      title: raw.title,
      course: raw.course,
      summary,
    }),
    stats: {
      wordCount: raw.stats?.wordCount ?? transcript.reduce((sum, item) => sum + item.text.split(/\s+/).filter(Boolean).length, 0),
      segmentCount: raw.stats?.segmentCount ?? transcript.length,
      estimatedDurationMinutes: raw.stats?.estimatedDurationMinutes ?? Math.max(5, Math.round((raw.stats?.wordCount ?? 0) / 110)),
    },
    studyMetrics,
    insights: raw.insights?.length ? raw.insights : createInsights({
      keyConcepts,
      stats: {
        wordCount: raw.stats?.wordCount ?? transcript.reduce((sum, item) => sum + item.text.split(/\s+/).filter(Boolean).length, 0),
        segmentCount: raw.stats?.segmentCount ?? transcript.length,
        estimatedDurationMinutes: raw.stats?.estimatedDurationMinutes ?? Math.max(5, Math.round((raw.stats?.wordCount ?? 0) / 110)),
      },
      studyMetrics,
      quiz,
      summary,
    }),
  };

  return baseSession;
}

function findRelevantTranscriptSegments(transcript: TranscriptSegment[], message: string) {
  const terms = message
    .toLowerCase()
    .split(/\s+/)
    .map((item) => item.replace(/[^a-z0-9áéíóúñ]/gi, ""))
    .filter((item) => item.length > 3);

  if (terms.length === 0) {
    return transcript.slice(0, 2);
  }

  return transcript
    .filter((segment) => terms.some((term) => segment.text.toLowerCase().includes(term) || segment.speaker.toLowerCase().includes(term)))
    .slice(0, 3);
}

export type BrainPromptTemplate = {
  id: string;
  label: string;
  prompt: string;
  icon: "sparkles" | "brain" | "clipboard" | "lightbulb" | "target" | "book";
};

export const BRAIN_PROMPT_TEMPLATES: BrainPromptTemplate[] = [
  { id: "summary", label: "Resumen clave", prompt: "Dame los puntos clave de esta sesión en formato ejecutivo, priorizando lo que necesito para un examen.", icon: "sparkles" },
  { id: "confusing", label: "Explicar dudas", prompt: "¿Cuáles son los conceptos más difíciles de esta sesión y cómo puedo entenderlos mejor?", icon: "lightbulb" },
  { id: "exam-prep", label: "Preparar examen", prompt: "Armame un plan de estudio para un examen basado en esta sesión: qué repasar primero, qué practicar y qué memorizar.", icon: "target" },
  { id: "action-items", label: "Tareas de estudio", prompt: "¿Qué tareas concretas debería completar antes de la próxima clase basándome en esta sesión?", icon: "clipboard" },
  { id: "connections", label: "Conexiones", prompt: "¿Cómo se conectan los temas de esta sesión con conceptos de mis otras sesiones de estudio?", icon: "brain" },
  { id: "deep-dive", label: "Profundizar", prompt: "Explicame en profundidad el tema principal de esta sesión como si fuera un tutor socrático.", icon: "book" },
];

function buildDeepSummary(session: StudySession): string {
  const parts: string[] = [];

  parts.push(`📋 **Resumen ejecutivo de "${session.title}"**`);
  parts.push("");

  if (session.summary && session.summary.length > 0) {
    parts.push("**Puntos clave:**");
    summaryParagraphs(session.summary).forEach((item, i) => {
      parts.push(`${i + 1}. ${item}`);
    });
    parts.push("");
  }

  if (session.keyConcepts.length > 0) {
    parts.push(`**${session.keyConcepts.length} conceptos identificados:**`);
    session.keyConcepts.forEach((c) => {
      parts.push(`• **${c.term}**: ${firstSentence(c.description)}`);
    });
    parts.push("");
  }

  const pendingTasks = session.actionItems.filter((t) => t.status === "pending");
  if (pendingTasks.length > 0) {
    parts.push(`**${pendingTasks.length} tareas pendientes:**`);
    pendingTasks.forEach((t) => {
      parts.push(`• ${t.title} (${t.dueLabel})`);
    });
  }

  return parts.join("\n");
}

function buildExamPrep(session: StudySession): string {
  const parts: string[] = [];
  parts.push(`🎯 **Plan de preparación para examen — ${session.title}**`);
  parts.push("");

  parts.push("**Fase 1 — Comprensión (hoy):**");
  summaryParagraphs(session.summary).slice(0, 2).forEach((s) => {
    parts.push(`• Releer y asegurar que entendés: ${firstSentence(s)}`);
  });
  parts.push("");

  parts.push("**Fase 2 — Memorización activa (mañana):**");
  session.flashcards.slice(0, 4).forEach((f) => {
    parts.push(`• Flashcard: ${firstSentence(f.question)}`);
  });
  parts.push("");

  parts.push("**Fase 3 — Práctica (antes del examen):**");
  session.quiz.slice(0, 3).forEach((q) => {
    parts.push(`• Quiz: ${firstSentence(q.question)}`);
  });
  parts.push("");

  const accuracy = session.studyMetrics.quizAccuracy;
  if (accuracy > 0) {
    parts.push(`**Tu rendimiento actual:** ${accuracy}% de aciertos en quiz.`);
    if (accuracy < 70) {
      parts.push("⚠️ Recomiendo repasar los conceptos marcados como incorrectos antes de evaluar.");
    } else {
      parts.push("✅ Buen nivel. Enfocate en los detalles y casos borde.");
    }
  } else {
    parts.push("📝 Todavía no completaste el quiz. Hacelo para medir tu nivel antes del examen.");
  }

  return parts.join("\n");
}

function buildConfusingParts(session: StudySession): string {
  const parts: string[] = [];
  parts.push(`💡 **Conceptos que pueden generar confusión — ${session.title}**`);
  parts.push("");

  session.keyConcepts.forEach((c, i) => {
    parts.push(`**${i + 1}. ${c.term}**`);
    parts.push(`Definición: ${c.description}`);
    parts.push(`Tip: Intentá explicar ${c.term.toLowerCase()} con tus propias palabras sin mirar la definición. Si no podés, necesitás repasar.`);
    parts.push("");
  });

  if (session.quiz.length > 0) {
    parts.push("**Autoevaluación rápida:** Intentá responder estas preguntas sin ver las respuestas:");
    session.quiz.slice(0, 3).forEach((q) => {
      parts.push(`• ${firstSentence(q.question)}`);
    });
  }

  return parts.join("\n");
}

function buildTaskSuggestions(session: StudySession): string {
  const parts: string[] = [];
  parts.push(`📌 **Tareas sugeridas — ${session.title}**`);
  parts.push("");

  session.actionItems.forEach((item) => {
    const status = item.status === "completed" ? "✅" : "⬜";
    parts.push(`${status} ${item.title} — ${item.dueLabel}`);
  });

  parts.push("");
  parts.push("**Tareas adicionales que te sugiero:**");
  parts.push(`• Hacer el quiz completo y anotar qué preguntas fallaste`);
  parts.push(`• Repasar las ${session.flashcards.length} flashcards antes de dormir (spacing effect)`);

  if (session.keyConcepts.length >= 3) {
    parts.push(`• Crear un mapa mental propio conectando ${session.keyConcepts.slice(0, 3).map((c) => c.term).join(", ")}`);
  }

  return parts.join("\n");
}

function buildSocraticDeepDive(session: StudySession): string {
  const mainTopic = session.keyConcepts[0]?.term || session.title;
  const parts: string[] = [];
  parts.push(`📖 **Deep dive — ${mainTopic}**`);
  parts.push("");

  parts.push(`Pensemos juntos sobre ${mainTopic.toLowerCase()}.`);
  parts.push("");

  const firstPara = summaryParagraphs(session.summary)[0];
  if (firstPara) {
    parts.push(`El punto de partida es: ${firstPara}`);
    parts.push("");
  }

  parts.push("**Preguntas para profundizar:**");
  parts.push(`1. ¿Por qué es importante ${mainTopic.toLowerCase()} en el contexto de ${session.course || "esta materia"}?`);
  parts.push(`2. ¿Qué pasaría si ${mainTopic.toLowerCase()} no existiera o funcionara de otra forma?`);
  parts.push(`3. ¿Podés dar un ejemplo real donde ${mainTopic.toLowerCase()} se aplique fuera del aula?`);
  parts.push("");

  if (session.keyConcepts.length >= 2) {
    parts.push(`**Conexión clave:** Pensá cómo ${session.keyConcepts[0].term} se relaciona con ${session.keyConcepts[1].term}. ¿Son complementarios, opuestos o uno depende del otro?`);
  }

  return parts.join("\n");
}

function buildCrossSessionContext(sessions: StudySession[], currentSession: StudySession): string {
  const otherSessions = sessions.filter((s) => s.id !== currentSession.id);
  if (otherSessions.length === 0) {
    return "Esta es tu única sesión por ahora. A medida que crees más sesiones, Stude podrá encontrar conexiones entre temas.";
  }

  const currentTerms = new Set(currentSession.keyConcepts.map((c) => c.term.toLowerCase()));
  const connections: Array<{ session: StudySession; sharedTerms: string[] }> = [];

  for (const other of otherSessions) {
    const shared = other.keyConcepts
      .filter((c) => currentTerms.has(c.term.toLowerCase()))
      .map((c) => c.term);

    if (shared.length > 0) {
      connections.push({ session: other, sharedTerms: shared });
    }
  }

  if (connections.length === 0) {
    const relatedByCourse = otherSessions.filter((s) => s.course && s.course.toLowerCase() === currentSession.course?.toLowerCase());
    if (relatedByCourse.length > 0) {
      return `🔗 No encontré conceptos compartidos, pero tenés ${relatedByCourse.length} sesión(es) más de ${currentSession.course}: ${relatedByCourse.slice(0, 3).map((s) => `"${s.title}"`).join(", ")}. Revisalas para encontrar conexiones temáticas.`;
    }
    return "🔗 Todavía no encontré conexiones directas con tus otras sesiones. A medida que estudies más temas relacionados, las conexiones van a aparecer automáticamente.";
  }

  const parts = [`🔗 **Conexiones con otras sesiones:**`, ""];
  connections.slice(0, 4).forEach((conn) => {
    parts.push(`• **"${conn.session.title}"** (${conn.session.course || "sin materia"}) comparte: ${conn.sharedTerms.join(", ")}`);
  });

  return parts.join("\n");
}

export function buildBrainReply(session: StudySession, message: string, allSessions?: StudySession[]) {
  const normalized = message.toLowerCase();

  if (normalized.includes("resumen") || normalized.includes("summary") || normalized.includes("takeaway") || normalized.includes("punto")) {
    return buildDeepSummary(session);
  }

  if (normalized.includes("confus") || normalized.includes("dificil") || normalized.includes("entend") || normalized.includes("explain")) {
    return buildConfusingParts(session);
  }

  if (normalized.includes("examen") || normalized.includes("exam") || normalized.includes("parcial") || normalized.includes("prepar") || normalized.includes("evalua")) {
    return buildExamPrep(session);
  }

  if (normalized.includes("tarea") || normalized.includes("task") || normalized.includes("accion") || normalized.includes("siguiente") || normalized.includes("next") || normalized.includes("step")) {
    return buildTaskSuggestions(session);
  }

  if (normalized.includes("conex") || normalized.includes("relacion") || normalized.includes("connect") || normalized.includes("otras sesion") || normalized.includes("cross")) {
    if (allSessions) {
      return buildCrossSessionContext(allSessions, session);
    }
    return "Para encontrar conexiones entre sesiones, necesito acceso a tu biblioteca completa. Creá más sesiones y volvé a preguntar.";
  }

  if (normalized.includes("profund") || normalized.includes("deep") || normalized.includes("socrat") || normalized.includes("tutor") || normalized.includes("explica")) {
    return buildSocraticDeepDive(session);
  }

  if (normalized.includes("concept") || normalized.includes("tema") || normalized.includes("clave") || normalized.includes("key")) {
    const parts = [`📚 **Conceptos clave de "${session.title}":**`, ""];
    session.keyConcepts.forEach((c) => {
      parts.push(`• **${c.term}**: ${c.description}`);
    });
    return parts.join("\n");
  }

  if (normalized.includes("quiz") || normalized.includes("pregunta") || normalized.includes("question") || normalized.includes("practice")) {
    const parts = [`📝 **Preguntas de práctica:**`, ""];
    session.quiz.forEach((q, i) => {
      parts.push(`${i + 1}. ${q.question}`);
      parts.push(`   → ${q.options?.[q.correct] || q.explanation || ""}`);
      parts.push("");
    });
    return parts.join("\n");
  }

  if (normalized.includes("flashcard") || normalized.includes("repaso") || normalized.includes("memor") || normalized.includes("review")) {
    const parts = [`🃏 **Flashcards para repasar:**`, ""];
    session.flashcards.forEach((f, i) => {
      parts.push(`${i + 1}. **P:** ${f.question}`);
      parts.push(`   **R:** ${firstSentence(f.answer)}`);
      parts.push("");
    });
    return parts.join("\n");
  }

  const matches = findRelevantTranscriptSegments(session.transcript, message);

  if (matches.length > 0) {
    const parts = [`🔍 **Encontré ${matches.length} fragmento(s) relevante(s):**`, ""];
    matches.forEach((seg) => {
      parts.push(`**[${seg.timestamp}] ${seg.speaker}:**`);
      parts.push(seg.text);
      parts.push("");
    });
    parts.push("💡 Tip: Podés hacer click en el ícono ✨ de cualquier bloque del transcript para pedirme que lo explique en detalle.");
    return parts.join("\n");
  }

  return buildDeepSummary(session);
}

export function createChatMessage(id: string, role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function createBookmarkFromSegment(sessionId: string, segmentId: string, label: string): Bookmark {
  return {
    id: stableId("bookmark", `${sessionId}-${segmentId}-${label}`),
    segmentId,
    label,
    createdAt: new Date().toISOString(),
  };
}

export function createComment(sessionId: string, text: string, segmentId?: string): SessionComment {
  return {
    id: stableId("comment", `${sessionId}-${segmentId || "general"}-${Date.now()}`),
    text,
    segmentId,
    createdAt: new Date().toISOString(),
  };
}
