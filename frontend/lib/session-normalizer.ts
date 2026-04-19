import { StudySession, TranscriptSegment } from "@/lib/types";
import { createActionItems, createMindMap, createInsights, createWelcomeChat } from "@/lib/session-utils";

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
