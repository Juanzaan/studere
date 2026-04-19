import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { StudySession } from "@/lib/types";
import { QUIZ_ACCURACY_THRESHOLDS } from "@/lib/constants";

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

export const FlashcardViewer = dynamic(
  () => import("@/components/flashcard-viewer").then(mod => ({ default: mod.FlashcardViewer })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Cargando flashcards..." />
  }
);

export const QuizViewer = dynamic(
  () => import("@/components/quiz-viewer").then(mod => ({ default: mod.QuizViewer })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Cargando quiz..." />
  }
);

export const MindMapCanvas = dynamic(
  () => import("@/components/mind-map-canvas").then(mod => ({ default: mod.MindMapCanvas })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Cargando mapa mental..." />
  }
);

export const StudeChatPopup = dynamic(
  () => import("@/components/stude-chat-popup").then(mod => ({ default: mod.StudeChatPopup })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Iniciando Stude..." />
  }
);

export const StudeChartWindow = dynamic(
  () => import("@/components/stude-chart-window").then(mod => ({ default: mod.StudeChartWindow })),
  { ssr: false }
);

// TODO: Replace with useMemo inside SessionDetail component to avoid module-level state
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
