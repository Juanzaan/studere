"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { flashcardsToCsv, sessionToMarkdown, triggerDownload } from "@/lib/exporters";
import { generateFlashcards } from "@/lib/study-generator";
import { deleteSession, patchSession } from "@/lib/storage";
import { createBookmarkFromSegment, createComment, createInsights } from "@/lib/session-utils";
import { evaluateExercise } from "@/lib/api";
import { ActionItem, ChatMessage, StudySession } from "@/lib/types";
import { useThrottledPersist } from "@/lib/use-throttled-persist";
import { FLASHCARD_INTERVALS, QUIZ_ACCURACY_THRESHOLDS } from "@/lib/constants";
import { compressImage } from "@/lib/image-compression";
import { SessionHeader, ConceptsSidebar, FocusPanelSwitcher, FocusPanel, TasksPanel } from "@/src/domains/sessions/components";

import { useToastContext } from "@/components/toast-provider";
import { PanelErrorBoundary } from "@/components/error-boundary";
import { SummaryPanel, InsightsPanel, NotesPanel } from "@/components/session-panels";
import {
  FlashcardViewer,
  QuizViewer,
  MindMapCanvas,
  StudeChatPopup,
  StudeChartWindow,
  completionRate,
} from "@/components/session-detail-helpers";

export function SessionDetail({ session }: { session: StudySession }) {
  const router = useRouter();
  const toast = useToastContext();
  const [current, setCurrent] = useState(session);
  const throttledPersist = useThrottledPersist(session.id, 500);
  const [conceptsOpen, setConceptsOpen] = useState(true);
  const [focusPanel, setFocusPanel] = useState<FocusPanel>("summary");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [pendingChatMessage, setPendingChatMessage] = useState<string | undefined>(undefined);
  const [chartData, setChartData] = useState<{ type: string; description: string; reply: string } | null>(null);
  const [exerciseInput, setExerciseInput] = useState<Record<string, string>>({});
  const [evaluatingTask, setEvaluatingTask] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  const filteredConcepts = current.keyConcepts;

  function persist(nextSession: StudySession) {
    setCurrent(nextSession); // UI update inmediato (optimistic)
    throttledPersist(nextSession); // localStorage throttled
  }

  function persistWithDerived(nextSession: StudySession) {
    const withDerived: StudySession = {
      ...nextSession,
      studyMetrics: {
        ...nextSession.studyMetrics,
        completionRate: completionRate(nextSession),
      },
    };
    withDerived.insights = createInsights(withDerived);
    persist(withDerived);
  }

  function toggleStarred() {
    persist({ ...current, starred: !current.starred });
  }

  function handleDelete() {
    deleteSession(current.id);
    router.push("/dashboard");
  }

  function exportMd() {
    triggerDownload(current.id + ".md", sessionToMarkdown(current), "text/markdown;charset=utf-8");
  }

  function exportCsv() {
    triggerDownload(current.id + "-flashcards.csv", flashcardsToCsv(current), "text/csv;charset=utf-8");
  }

  function toggleTask(id: string) {
    persistWithDerived({
      ...current,
      actionItems: current.actionItems.map((item) =>
        item.id === id ? { ...item, status: item.status === "completed" ? "pending" : "completed" } : item
      ),
    });
  }

  async function submitExercise(taskId: string, answerType: "text" | "image", content: string) {
    setEvaluatingTask(taskId);
    const task = current.actionItems.find((t) => t.id === taskId);
    if (!task) { setEvaluatingTask(null); return; }

    const submission = { type: answerType, content, submittedAt: new Date().toISOString() } as const;
    // Optimistic: save submission immediately
    const withSubmission = {
      ...current,
      actionItems: current.actionItems.map((item) =>
        item.id === taskId ? { ...item, submission } : item
      ),
    };
    persist(withSubmission);

    try {
      const feedback = await evaluateExercise({
        exercise: task.exercisePrompt || task.title,
        studentAnswer: content,
        answerType,
        context: `Materia: ${current.course}. Sesión: ${current.title}. Conceptos: ${current.keyConcepts.map((c) => c.term).join(", ")}`,
      });
      persistWithDerived({
        ...withSubmission,
        actionItems: withSubmission.actionItems.map((item) =>
          item.id === taskId ? { ...item, submission, feedback, status: feedback.grade === "correct" ? "completed" : item.status } : item
        ),
      });
      if (feedback.grade === "correct") {
        toast.success("¡Excelente!", "Tu respuesta es correcta.");
      } else if (feedback.grade === "incorrect") {
        toast.warning("Respuesta incorrecta", "Revisá el feedback de Stude.");
      } else {
        toast.info("Respuesta parcial", "Revisá el feedback para mejorar.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      console.error("Exercise evaluation error:", err);
      toast.error("Error al evaluar ejercicio", errorMessage);
      persistWithDerived({
        ...withSubmission,
        actionItems: withSubmission.actionItems.map((item) =>
          item.id === taskId
            ? { ...item, submission, feedback: { grade: "partial" as const, explanation: `Error al evaluar: ${errorMessage}. Intentá de nuevo más tarde.`, receivedAt: new Date().toISOString() } }
            : item
        ),
      });
    } finally {
      setEvaluatingTask(null);
    }
  }

  async function handleImageUpload(taskId: string, file: File) {
    try {
      const compressedDataUrl = await compressImage(file, 1200, 1200, 0.8);
      submitExercise(taskId, "image", compressedDataUrl);
    } catch (error) {
      console.error("Error al comprimir imagen:", error);
      toast.warning("Compresión fallida", "Usando imagen original.");
      // Fallback: usar imagen original si compresión falla
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        submitExercise(taskId, "image", dataUrl);
      };
      reader.onerror = () => {
        toast.error("Error al cargar imagen", "No se pudo procesar el archivo.");
      };
      reader.readAsDataURL(file);
    }
  }

  function toggleBookmark(segmentId: string, label: string) {
    const exists = current.bookmarks.some((bookmark) => bookmark.segmentId === segmentId);
    persist({
      ...current,
      bookmarks: exists
        ? current.bookmarks.filter((bookmark) => bookmark.segmentId !== segmentId)
        : [...current.bookmarks, createBookmarkFromSegment(current.id, segmentId, label)],
    });
  }

  function addComment(text: string, segmentId?: string) {
    persist({
      ...current,
      comments: [createComment(current.id, text, segmentId), ...current.comments],
    });
  }

  function addFlashcardFromSegment(text: string) {
    persist({
      ...current,
      flashcards: [
        ...current.flashcards,
        {
          question: "¿Qué explica este fragmento?",
          answer: text,
        },
      ],
    });
    setFocusPanel("flashcards");
  }

  function handleGenerateMoreFlashcards() {
    const existingQuestions = new Set(current.flashcards.map((f) => f.question));
    const sentences = current.transcript.map((s) => s.text);
    const newCards = generateFlashcards(
      current.keyConcepts,
      sentences,
      existingQuestions,
      current.flashcards.length,
    );
    if (newCards.length === 0) return;
    persist({
      ...current,
      flashcards: [...current.flashcards, ...newCards],
    });
  }

  function handleFlashcardConfidence(cardIndex: number, confidence: import("@/lib/types").Flashcard["confidence"]) {
    const now = new Date();
    const interval = FLASHCARD_INTERVALS[confidence || "good"] || FLASHCARD_INTERVALS.good;
    const nextReview = new Date(now.getTime() + interval * 86400000).toISOString();
    persist({
      ...current,
      flashcards: current.flashcards.map((card, i) =>
        i === cardIndex ? { ...card, confidence, lastReviewed: now.toISOString(), nextReview, interval } : card
      ),
    });
  }

  function handleChatUpdate(messages: ChatMessage[]) {
    persist({ ...current, chatHistory: messages });
  }

  function handleOpenChatWith(message: string) {
    setPendingChatMessage(message);
    setShowChat(true);
  }

  function handleQuizComplete(correct: number, total: number) {
    persistWithDerived({
      ...current,
      studyMetrics: {
        ...current.studyMetrics,
        quizAccuracy: Math.round((correct / total) * 100),
        reviewCount: current.studyMetrics.reviewCount + 1,
        lastReviewedAt: new Date().toISOString(),
      },
    });
  }

  function handleFlashcardReview(reviewed: number) {
    persistWithDerived({
      ...current,
      studyMetrics: {
        ...current.studyMetrics,
        reviewCount: current.studyMetrics.reviewCount + 1,
        lastReviewedAt: new Date().toISOString(),
      },
      actionItems: current.actionItems.map((item, index) =>
        index === 1 && item.status === "pending" ? { ...item, status: "completed" } : item
      ),
    });
  }

  return (
    <div className="space-y-4">
      <SessionHeader
        session={current}
        starred={current.starred}
        confirmDelete={confirmDelete}
        onToggleStarred={toggleStarred}
        onExportMd={exportMd}
        onExportCsv={exportCsv}
        onDeleteClick={() => setConfirmDelete(true)}
        onDeleteConfirm={handleDelete}
        onDeleteCancel={() => setConfirmDelete(false)}
      />

      <div className={`grid gap-4 transition-all duration-300 lg:h-[calc(100vh-100px)] lg:overflow-hidden ${conceptsOpen ? "lg:grid-cols-[300px_minmax(0,1fr)]" : "lg:grid-cols-[44px_minmax(0,1fr)]"}`}>
        <ConceptsSidebar
          concepts={filteredConcepts}
          isOpen={conceptsOpen}
          searchQuery=""
          onToggle={() => setConceptsOpen(!conceptsOpen)}
        />

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)] lg:overflow-y-auto">
          <div className="sticky top-0 z-10 -mx-4 mb-3 bg-white px-4 pb-3 pt-1 sm:-mx-5 sm:px-5 dark:bg-slate-900">
            <FocusPanelSwitcher activePanel={focusPanel} onPanelChange={setFocusPanel} />
          </div>

          {/* ── Focus panel content ── */}
          <div className="mt-4">
            {focusPanel === "summary" && (
              <PanelErrorBoundary panelName="Resumen">
                <SummaryPanel
                  session={current}
                  onToggleBookmark={toggleBookmark}
                  onAddComment={addComment}
                  onAddFlashcard={addFlashcardFromSegment}
                  onOpenChat={handleOpenChatWith}
                />
              </PanelErrorBoundary>
            )}

            {focusPanel === "flashcards" && (
              <FlashcardViewer
                flashcards={current.flashcards}
                sessionId={current.id}
                onReviewComplete={handleFlashcardReview}
                onGenerateMore={handleGenerateMoreFlashcards}
                onConfidence={handleFlashcardConfidence}
              />
            )}

            {focusPanel === "quiz" && (
              <QuizViewer quiz={current.quiz} sessionId={current.id} onQuizComplete={handleQuizComplete} />
            )}

            {focusPanel === "mindmap" && (
              <MindMapCanvas mindMap={current.mindMap} />
            )}

            {focusPanel === "tasks" && (
              <PanelErrorBoundary panelName="Tareas">
                <TasksPanel
                  tasks={current.actionItems}
                  exerciseInput={exerciseInput}
                  evaluatingTaskId={evaluatingTask}
                  onToggleTask={toggleTask}
                  onExerciseInputChange={(taskId: string, value: string) => setExerciseInput({ ...exerciseInput, [taskId]: value })}
                  onSubmitExercise={(taskId: string) => {
                    const text = exerciseInput[taskId]?.trim();
                    if (text) {
                      submitExercise(taskId, "text", text);
                      setExerciseInput({ ...exerciseInput, [taskId]: "" });
                    }
                  }}
                  onCaptureImage={(taskId: string) => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleImageUpload(taskId, file);
                    };
                    input.click();
                  }}
                />
              </PanelErrorBoundary>
            )}

            {focusPanel === "insights" && (
              <PanelErrorBoundary panelName="Conceptos">
                <InsightsPanel session={current} />
              </PanelErrorBoundary>
            )}

            {focusPanel === "notes" && (
              <PanelErrorBoundary panelName="Notas">
                <NotesPanel session={current} onAddComment={addComment} />
              </PanelErrorBoundary>
            )}
          </div>
        </section>

      </div>

      {/* Floating Stude button */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(139,92,246,0.4)] transition hover:opacity-90"
        >
          <Brain className="h-4 w-4" />
          Stude
        </button>
      )}

      {/* Stude chat popup */}
      {showChat && (
        <PanelErrorBoundary panelName="Chat">
          <StudeChatPopup
            session={current}
            chatHistory={current.chatHistory}
            onChatUpdate={handleChatUpdate}
            initialMessage={pendingChatMessage}
            onClose={() => { setShowChat(false); setPendingChatMessage(undefined); }}
            onChartDetected={(data) => setChartData(data)}
          />
        </PanelErrorBoundary>
      )}

      {/* Stude chart window */}
      {chartData && (
        <StudeChartWindow
          session={current}
          chartData={chartData as { type: "bar" | "line" | "pie" | "mindmap"; description: string; reply: string }}
          onClose={() => setChartData(null)}
          onElementClick={(label) => {
            setShowChat(true);
          }}
        />
      )}
    </div>
  );
}
