"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Brain,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  FileAudio2,
  FileText,
  Film,
  Layers,
  Lightbulb,
  ListTodo,
  Loader2,
  MessageSquarePlus,
  Search,
  Sparkles,
  Star,
  StickyNote,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { flashcardsToCsv, sessionToMarkdown, triggerDownload } from "@/lib/exporters";
import { generateFlashcards } from "@/lib/study-generator";
import { deleteSession, patchSession } from "@/lib/storage";
import { createBookmarkFromSegment, createComment, createInsights } from "@/lib/session-utils";
import { evaluateExercise } from "@/lib/api";
import { ActionItem, ChatMessage, StudySession } from "@/lib/types";
import { useThrottledPersist } from "@/lib/use-throttled-persist";
import { FLASHCARD_INTERVALS, QUIZ_ACCURACY_THRESHOLDS } from "@/lib/constants";
import { compressImage } from "@/lib/image-compression";
import { SessionHeader, ConceptsSidebar, FocusPanelSwitcher, FocusPanel } from "@/src/domains/sessions/components";
import { Highlight } from "@/src/shared/components/Highlight";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-xs text-slate-400">Cargando…</span>,
});

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

const FlashcardViewer = dynamic(
  () => import("@/components/flashcard-viewer").then(mod => ({ default: mod.FlashcardViewer })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Cargando flashcards..." />
  }
);

const QuizViewer = dynamic(
  () => import("@/components/quiz-viewer").then(mod => ({ default: mod.QuizViewer })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Cargando quiz..." />
  }
);

const MindMapCanvas = dynamic(
  () => import("@/components/mind-map-canvas").then(mod => ({ default: mod.MindMapCanvas })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Cargando mapa mental..." />
  }
);

const StudeChatPopup = dynamic(
  () => import("@/components/stude-chat-popup").then(mod => ({ default: mod.StudeChatPopup })),
  { 
    ssr: false,
    loading: () => <ComponentLoader message="Iniciando Stude..." />
  }
);

const StudeChartWindow = dynamic(
  () => import("@/components/stude-chart-window").then(mod => ({ default: mod.StudeChartWindow })),
  { ssr: false }
);

const completionRateCache = new Map<string, number>();

function completionRate(session: StudySession): number {
  const cacheKey = `${session.actionItems.length}-${session.actionItems.filter(i => i.status === "completed").length}-${session.studyMetrics.reviewCount}-${session.studyMetrics.quizAccuracy}`;
  
  if (completionRateCache.has(cacheKey)) {
    return completionRateCache.get(cacheKey)!;
  }
  
  const taskRatio =
    session.actionItems.length === 0
      ? 0
      : session.actionItems.filter((item) => item.status === "completed").length / session.actionItems.length;
  const reviewBonus = session.studyMetrics.reviewCount > 0 ? 0.2 : 0;
  const accuracyBonus = session.studyMetrics.quizAccuracy >= QUIZ_ACCURACY_THRESHOLDS.excellent ? 0.15 : session.studyMetrics.quizAccuracy > 0 ? 0.08 : 0;
  const result = Math.min(100, Math.round((taskRatio + reviewBonus + accuracyBonus) * 100));
  
  completionRateCache.set(cacheKey, result);
  return result;
}

export function SessionDetail({ session }: { session: StudySession }) {
  const router = useRouter();
  const [current, setCurrent] = useState(session);
  const throttledPersist = useThrottledPersist(session.id, 500);
  const [conceptsOpen, setConceptsOpen] = useState(true);
  const [focusPanel, setFocusPanel] = useState<FocusPanel>("summary");
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [userNotes, setUserNotes] = useState("");
  const [query, setQuery] = useState("");
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

  const q = query.trim().toLowerCase();

  const filteredTranscript = useMemo(() => {
    if (!q) return current.transcript;
    return current.transcript.filter((segment) => [segment.text, segment.speaker].join(" ").toLowerCase().includes(q));
  }, [current.transcript, q]);

  const filteredConcepts = useMemo(() => {
    if (!q) return current.keyConcepts;
    return current.keyConcepts.filter((concept) =>
      [concept.term, concept.description].join(" ").toLowerCase().includes(q)
    );
  }, [current.keyConcepts, q]);

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
    } catch (err) {
      persistWithDerived({
        ...withSubmission,
        actionItems: withSubmission.actionItems.map((item) =>
          item.id === taskId
            ? { ...item, submission, feedback: { grade: "partial" as const, explanation: `Error al evaluar: ${(err as Error).message}. Intentá de nuevo más tarde.`, receivedAt: new Date().toISOString() } }
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
      // Fallback: usar imagen original si compresión falla
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        submitExercise(taskId, "image", dataUrl);
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

  const sourceIcon =
    current.sourceKind === "video" ? Film : current.sourceKind === "audio" ? FileAudio2 : FileText;
  const SourceIcon = sourceIcon;

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

      <div className={`grid gap-4 transition-all duration-300 ${conceptsOpen ? "lg:grid-cols-[300px_minmax(0,1fr)]" : "lg:grid-cols-[44px_minmax(0,1fr)]"}`}>
        <ConceptsSidebar
          concepts={filteredConcepts}
          isOpen={conceptsOpen}
          searchQuery={q}
          onToggle={() => setConceptsOpen(!conceptsOpen)}
        />

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-5 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <FocusPanelSwitcher activePanel={focusPanel} onPanelChange={setFocusPanel} />

          {/* ── Focus panel content ── */}
          <div className="mt-4 max-h-[calc(100vh-290px)] overflow-y-auto pr-1">
            {focusPanel === "summary" && (
              <div className="space-y-4">
                {current.sourceFileName && current.sourceFileName !== "Sin archivo" && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                      <FileText className="h-3 w-3" />
                      {current.sourceFileName}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">{current.stats.estimatedDurationMinutes} min · {current.stats.wordCount} palabras</span>
                  </div>
                )}
                <Md>{current.summary || "*Sin resumen generado todavía.*"}</Md>

                {/* ── Collapsible transcript ── */}
                <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setTranscriptOpen(!transcriptOpen)}
                    className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <SourceIcon className="h-3.5 w-3.5" />
                      Transcripción ({current.transcript.length} bloques)
                    </span>
                    {transcriptOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {transcriptOpen && (
                    <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
                      <label className="relative block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Buscar en la transcripción..."
                          className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 py-1 pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
                        />
                      </label>
                      {filteredTranscript.map((segment) => {
                        const bookmarked = current.bookmarks.some((b) => b.segmentId === segment.id);
                        return (
                          <div key={segment.id} className="group rounded-2xl border border-slate-100 bg-slate-50 p-3 transition hover:border-violet-200 hover:bg-violet-50/40 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-violet-800 dark:hover:bg-violet-900/20">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{segment.timestamp}</span>
                              <span className="rounded-full bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">{segment.speaker}</span>
                            </div>
                            <p className="mt-1.5 text-xs leading-6 text-slate-600 dark:text-slate-300">
                              <Highlight text={segment.text} query={q} />
                            </p>
                            <div className="mt-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                              <button onClick={() => navigator.clipboard?.writeText(segment.text)} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-200" aria-label="Copiar texto al portapapeles"><Copy className="h-3 w-3" /></button>
                              <button onClick={() => toggleBookmark(segment.id, segment.text.slice(0, 42))} className={`flex h-7 w-7 items-center justify-center rounded-full border ${bookmarked ? "border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-700 dark:bg-amber-900/30" : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-200"}`} aria-label={bookmarked ? "Quitar marcador" : "Agregar marcador"}><Bookmark className={`h-3 w-3 ${bookmarked ? "fill-current" : ""}`} /></button>
                              <button onClick={() => addComment(`Revisar: ${segment.text.slice(0, 90)}`, segment.id)} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-200" aria-label="Agregar comentario"><MessageSquarePlus className="h-3 w-3" /></button>
                              <button onClick={() => addFlashcardFromSegment(segment.text)} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-200" aria-label="Crear flashcard con este fragmento"><Sparkles className="h-3 w-3" /></button>
                              <button onClick={() => handleOpenChatWith(`Explicame este fragmento: ${segment.text}`)} className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-200" aria-label="Preguntar a Stude sobre este fragmento"><WandSparkles className="h-3 w-3" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
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
              <div className="space-y-4">
                {current.actionItems.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    No hay tareas para esta sesión.
                  </div>
                ) : (
                  current.actionItems.map((item) => (
                    <div key={item.id} className={`rounded-[22px] border p-4 transition ${
                      item.status === "completed" ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                    }`}>
                      {/* Task header */}
                      <button onClick={() => toggleTask(item.id)} className="flex w-full items-start gap-3 text-left">
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${item.status === "completed" ? "bg-emerald-500 text-white" : "border-2 border-slate-300"}`}>
                          {item.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${item.status === "completed" ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>{item.title}</p>
                          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{item.owner} · {item.dueLabel}</p>
                        </div>
                      </button>

                      {/* Exercise prompt */}
                      {item.exercisePrompt && (
                        <div className="ml-8 mt-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-800 dark:bg-violet-900/20">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-500">Ejercicio</p>
                          <div className="mt-1"><Md>{item.exercisePrompt}</Md></div>
                        </div>
                      )}

                      {/* Feedback display */}
                      {item.feedback && (
                        <div className={`ml-8 mt-3 rounded-2xl border p-3 ${
                          item.feedback.grade === "correct" ? "border-emerald-200 bg-emerald-50" :
                          item.feedback.grade === "incorrect" ? "border-red-200 bg-red-50" :
                          "border-amber-200 bg-amber-50"
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              item.feedback.grade === "correct" ? "bg-emerald-100 text-emerald-700" :
                              item.feedback.grade === "incorrect" ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>
                              {item.feedback.grade === "correct" ? "✓ Correcto" : item.feedback.grade === "incorrect" ? "✗ Incorrecto" : "~ Parcial"}
                            </span>
                          </div>
                          <div className="mt-2"><Md>{item.feedback.explanation}</Md></div>
                        </div>
                      )}

                      {/* Evaluating spinner */}
                      {evaluatingTask === item.id && (
                        <div className="ml-8 mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Stude está evaluando tu respuesta…</span>
                        </div>
                      )}

                      {/* Exercise submission (show if has exercise prompt AND no feedback yet AND not evaluating) */}
                      {item.exercisePrompt && !item.feedback && evaluatingTask !== item.id && (
                        <div className="ml-8 mt-3 space-y-2">
                          <textarea
                            value={exerciseInput[item.id] || ""}
                            onChange={(e) => setExerciseInput({ ...exerciseInput, [item.id]: e.target.value })}
                            placeholder="Escribí tu respuesta aquí..."
                            className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const text = exerciseInput[item.id]?.trim();
                                if (text) {
                                  submitExercise(item.id, "text", text);
                                  setExerciseInput({ ...exerciseInput, [item.id]: "" });
                                }
                              }}
                              disabled={!exerciseInput[item.id]?.trim()}
                              className="flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Sparkles className="h-3 w-3" />
                              Enviar respuesta
                            </button>
                            <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                              <Camera className="h-3 w-3" />
                              Subir foto
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(item.id, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {focusPanel === "insights" && (
              <div className="space-y-3">
                {current.insights.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    Sin insights para esta sesión.
                  </div>
                ) : (
                  current.insights.map((insight) => (
                    <div key={insight.id} className="rounded-[22px] border border-slate-200 bg-white p-4 transition hover:shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{insight.label}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            insight.tone === "good"
                              ? "bg-emerald-100 text-emerald-700"
                              : insight.tone === "warning"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {insight.value}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{insight.description}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {focusPanel === "notes" && (
              <div className="space-y-3">
                <textarea
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  onBlur={() => { if (userNotes.trim()) addComment(userNotes.trim()); setUserNotes(""); }}
                  placeholder="Escribí tus notas personales aquí... (se guardan al salir del campo)"
                  className="h-48 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
                />
                {current.comments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Notas guardadas</p>
                    {current.comments.map((c) => (
                      <div key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{c.text}</div>
                    ))}
                  </div>
                )}
                {current.bookmarks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Marcadores</p>
                    {current.bookmarks.map((b) => (
                      <div key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{b.label}</div>
                    ))}
                  </div>
                )}
              </div>
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
        <StudeChatPopup
          session={current}
          chatHistory={current.chatHistory}
          onChatUpdate={handleChatUpdate}
          initialMessage={pendingChatMessage}
          onClose={() => { setShowChat(false); setPendingChatMessage(undefined); }}
          onChartDetected={(data) => setChartData(data)}
        />
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
