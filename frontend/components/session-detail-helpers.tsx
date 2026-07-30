/**
 * Lazy-loaded dynamic imports for session detail panels and a completion rate helper.
 *
 * All panels use Next.js `dynamic()` with `ssr: false` to avoid
 * SSR issues with client-only libraries (GSAP, ReactFlow, Recharts).
 * Each has a contextual loading placeholder via {@link ComponentLoader}.
 */

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { StudySession } from "@/lib/types";
import { QUIZ_ACCURACY_THRESHOLDS } from "@/lib/constants";

/**
 * Loading placeholder shown while a dynamically-imported panel loads.
 * Centers a spinner with a contextual message.
 */
function ComponentLoader({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}

/** Lazy-loaded FlashcardViewer (GSAP animation, SSR disabled). */
export const FlashcardViewer = dynamic(
  () => import("@/components/flashcard-viewer").then(mod => ({ default: mod.FlashcardViewer })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Cargando flashcards..." />
  }
);

/** Lazy-loaded QuizViewer (SSR disabled for dynamic import). */
export const QuizViewer = dynamic(
  () => import("@/components/quiz-viewer").then(mod => ({ default: mod.QuizViewer })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Cargando quiz..." />
  }
);

/** Lazy-loaded MindMapGraph (ECharts force-directed graph, SSR disabled). */
export const MindMapCanvas = dynamic(
  () => import("@/components/mind-map-graph").then(mod => ({ default: mod.MindMapGraph })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Cargando grafo conceptual..." />
  }
);

/** Lazy-loaded StudeChatPopup (dialog with GSAP, focus trap, SSR disabled). */
export const StudeChatPopup = dynamic(
  () => import("@/components/stude-chat-popup").then(mod => ({ default: mod.StudeChatPopup })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Iniciando Stude..." />
  }
);

/** Lazy-loaded StudeChartWindow (Recharts, SSR disabled). */
export const StudeChartWindow = dynamic(
  () => import("@/components/stude-chart-window").then(mod => ({ default: mod.StudeChartWindow })),
  { ssr: false }
);

/**
 * Compute a composite completion rate for a session based on:
 * - Task completion ratio
 * - Review count bonus (0.2 if any reviews exist)
 * - Quiz accuracy bonus (0.15 if ≥ excellent threshold, 0.08 if > 0)
 *
 * @param session - The study session to evaluate
 * @returns Percentage from 0 to 100
 */
export function completionRate(session: StudySession): number {
  const taskRatio =
    session.actionItems.length === 0
      ? 0
      : session.actionItems.filter((item) => item.status === "completed").length / session.actionItems.length;
  const reviewBonus = session.studyMetrics.reviewCount > 0 ? 0.2 : 0;
  const accuracyBonus = session.studyMetrics.quizAccuracy >= QUIZ_ACCURACY_THRESHOLDS.excellent ? 0.15 : session.studyMetrics.quizAccuracy > 0 ? 0.08 : 0;
  const result = Math.min(100, Math.round((taskRatio + reviewBonus + accuracyBonus) * 100));
  
  return result;
}
