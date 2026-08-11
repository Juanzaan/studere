/**
 * Session utility functions for creating and managing study session content.
 *
 * Provides factory functions for:
 * - Action items (with exercise prompts generated from session content)
 * - Mind map tree structures (with accent colors for ReactFlow)
 * - Insights/metrics cards for the dashboard
 * - Welcome chat messages for Stude
 * - Bookmarks, comments, and chat messages
 * - Re-exports from {@link session-normalizer} and {@link brain-reply}
 */

import { TRIAL_MINUTES } from "@/lib/constants";
import {
  ActionItem,
  Bookmark,
  ChatMessage,
  MindMapNode,
  SessionComment,
  SessionInsight,
  StudySession,
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

/**
 * Generate action items (tasks) from session content.
 * Creates up to 3 items: general review, key concept explanation, and
 * comparison or quiz practice. Each includes an exercise prompt
 * for AI evaluation.
 *
 * @param session - Session data (id, summary, keyConcepts, quiz, transcript)
 * @returns Array of ActionItems with exercise prompts
 */
export function createActionItems(session: Pick<StudySession, "id" | "summary" | "keyConcepts" | "quiz" | "transcript">): ActionItem[] {
  const concept = session.keyConcepts[0];
  const secondConcept = session.keyConcepts[1];
  const firstSegment = session.transcript[0];
  const summaryParas = summaryParagraphs(session.summary);
  const mainTopic = summaryParas[0] ? firstSentence(summaryParas[0]) : "la sesión";

  const items: ActionItem[] = [];

  items.push({
    id: stableId("task", `${session.id}-repaso-general`),
    title: session.summary
      ? `Releer y resumir con tus propias palabras: ${mainTopic}`
      : "Releer el material de la sesión y escribir un resumen propio",
    owner: "Tú",
    status: "pending",
    dueLabel: "Hoy",
    sourceSegmentId: firstSegment?.id,
    exercisePrompt: session.summary
      ? `Escribí un párrafo de al menos 100 palabras explicando ${mainTopic} con tus propias palabras, sin mirar el resumen original.`
      : "Escribí un resumen de lo que recordás de la clase en al menos 100 palabras.",
  });

  if (concept) {
    items.push({
      id: stableId("task", `${session.id}-concepto-clave`),
      title: `Explicar el concepto "${concept.term}" con un ejemplo concreto`,
      owner: "Tú",
      status: "pending",
      dueLabel: "Antes del próximo repaso",
      sourceSegmentId: firstSegment?.id,
      exercisePrompt: `Explicá qué es "${concept.term}" como si se lo contaras a un compañero que no entendió. Incluí un ejemplo real o aplicado.`,
    });
  }

  if (secondConcept) {
    items.push({
      id: stableId("task", `${session.id}-comparacion`),
      title: `Comparar "${concept?.term || "el primer concepto"}" con "${secondConcept.term}"`,
      owner: "Tú",
      status: "pending",
      dueLabel: "Esta semana",
      sourceSegmentId: session.transcript[1]?.id,
      exercisePrompt: `Escribí tres diferencias claras y una similitud entre "${concept?.term || "concepto A"}" y "${secondConcept.term}".`,
    });
  } else if (session.quiz.length > 0) {
    items.push({
      id: stableId("task", `${session.id}-practica`),
      title: `Resolver la pregunta de práctica: ${firstSentence(session.quiz[0].question)}`,
      owner: "Tú",
      status: "pending",
      dueLabel: "Esta semana",
      sourceSegmentId: session.transcript[1]?.id,
      exercisePrompt: session.quiz[0].question,
    });
  }

  return items;
}

function mapAccent(index: number): MindMapNode["accent"] {
  if (index % 4 === 0) return "violet";
  if (index % 4 === 1) return "blue";
  if (index % 4 === 2) return "green";
  return "amber";
}

/**
 * Build a hierarchical mind map tree from session content.
 * Structure: Root → [Summary, Concepts, Practice] → child nodes with accents.
 * Each concept gets a description child node.
 *
 * @param session - Session data (id, title, summary, keyConcepts, quiz)
 * @returns Root MindMapNode with nested children
 */
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

/**
 * Generate insight/metric cards for the dashboard and session detail.
 * Returns 4 insights: coverage, concept density, quiz accuracy, readiness.
 * Each has a tone (good/neutral/warning) based on current values.
 *
 * @param session - Session data (keyConcepts, stats, studyMetrics, quiz, summary)
 * @returns Array of 4 SessionInsight objects
 */
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

/**
 * Create the initial welcome message from Stude when opening a session's chat.
 * Includes session title, course, and a summary snippet.
 *
 * @param session - Session data (id, title, course, summary)
 * @returns Array with a single assistant welcome message
 */
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

/**
 * Factory for a single ChatMessage with auto-generated timestamp.
 *
 * @param id - Message ID (should be unique, e.g. `user-${Date.now()}`)
 * @param role - Message role ('user' | 'assistant')
 * @param content - Message body text
 * @returns A ChatMessage object
 */
export function createChatMessage(id: string, role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a bookmark anchored to a specific transcript segment.
 *
 * @param sessionId - Parent session ID
 * @param segmentId - Target transcript segment ID
 * @param label - User-visible label for the bookmark
 * @returns A Bookmark object
 */
export function createBookmarkFromSegment(sessionId: string, segmentId: string, label: string): Bookmark {
  return {
    id: stableId("bookmark", `${sessionId}-${segmentId}-${label}`),
    segmentId,
    label,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a comment on a session, optionally linked to a transcript segment.
 *
 * @param sessionId - Parent session ID
 * @param text - Comment body
 * @param segmentId - Optional transcript segment ID to anchor the comment
 * @returns A SessionComment object
 */
export function createComment(sessionId: string, text: string, segmentId?: string): SessionComment {
  return {
    id: stableId("comment", `${sessionId}-${segmentId || "general"}-${Date.now()}`),
    text,
    segmentId,
    createdAt: new Date().toISOString(),
  };
}

// Re-export from new modules for backward compatibility
export { normalizeSession } from "@/lib/session-normalizer";
export { buildBrainReply, BRAIN_PROMPT_TEMPLATES } from "@/lib/brain-reply";
export type { BrainPromptTemplate } from "@/lib/brain-reply";

function dayKey(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().split("T")[0];
}

function shiftDay(key: string, delta: number): string {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return dayKey(date);
}

/**
 * Calculate the current study streak (consecutive days with sessions).
 *
 * A day counts if at least one session has that `createdAt` date (UTC).
 * The streak starts today if there is a session today, otherwise it starts
 * yesterday — a streak only breaks at the end of the day, so a user who
 * studied yesterday but not yet today still keeps it alive.
 *
 * @param sessions - Sessions to compute the streak from
 * @returns Number of consecutive days with activity (0 if none)
 */
export function calculateStreak(sessions: Pick<StudySession, "createdAt">[]): number {
  if (sessions.length === 0) return 0;

  const days = new Set(
    sessions.map((session) => dayKey(new Date(session.createdAt))).filter(Boolean),
  );
  const today = dayKey(new Date());

  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

/**
 * Total trial minutes consumed by the given sessions.
 *
 * Each session counts its `stats.estimatedDurationMinutes` (audio length or,
 * for pasted text, the duration derived from the word count). Returns the
 * real accumulated total, uncapped.
 *
 * @param sessions - Sessions to sum minutes from
 * @returns Total minutes consumed
 */
export interface TrialSession {
  stats?: { estimatedDurationMinutes?: number } | null;
}

export function calculateTrialMinutesUsed(sessions: TrialSession[]): number {
  return sessions.reduce((sum, session) => sum + (session.stats?.estimatedDurationMinutes ?? 0), 0);
}

/**
 * Whether the trial has been exhausted (consumed minutes >= {@link TRIAL_MINUTES}).
 *
 * Once exhausted, AI features (transcription and generation) are blocked;
 * local-only session creation stays available.
 *
 * @param sessions - Sessions to evaluate against the trial limit
 * @returns True when the user has no trial minutes left
 */
export function isTrialExhausted(sessions: TrialSession[]): boolean {
  return calculateTrialMinutesUsed(sessions) >= TRIAL_MINUTES;
}
