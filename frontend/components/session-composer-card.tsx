"use client";

import { memo, ChangeEvent, FormEvent, useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { CheckCircle2, FileUp, Link2, Loader2, Mic, Plus, ScreenShare, Sparkles, Upload, Video, X } from "lucide-react";
import { createStudySession } from "@/lib/study-generator";
import { generateStudySession, transcribeAudio } from "@/lib/api";
import { upsertSession } from "@/lib/storage";
import { StudySession } from "@/lib/types";
import { createWelcomeChat, createMindMap, createInsights, createActionItems } from "@/lib/session-utils";

gsap.registerPlugin(useGSAP);

type ComposerMode = "upload" | "record" | "online" | "url" | "screen";

const MODE_COPY: Record<ComposerMode, { label: string; hint: string; icon: typeof Upload; templateId: StudySession["templateId"] }> = {
  upload: {
    label: "Subir y transcribir",
    hint: "Subí audio, video o texto y generá tu workspace de estudio.",
    icon: Upload,
    templateId: "class-summary",
  },
  record: {
    label: "Grabar audio",
    hint: "Preparado para notas de voz y clases rápidas desde el navegador.",
    icon: Mic,
    templateId: "class-summary",
  },
  online: {
    label: "Clase en vivo",
    hint: "Pensado para Meet, Zoom o Teams. En esta fase crea la sesión con contexto y enlace.",
    icon: Video,
    templateId: "meeting-notes",
  },
  url: {
    label: "Transcribir desde URL",
    hint: "Pegá una URL de YouTube, Drive o recurso remoto para usarla como fuente.",
    icon: Link2,
    templateId: "class-summary",
  },
  screen: {
    label: "Grabar pantalla",
    hint: "Preparado para clases online, tutoriales y demos con captura de pantalla.",
    icon: ScreenShare,
    templateId: "exam-review",
  },
};

async function readOptionalText(file: File | null) {
  if (!file) return "";
  const lower = file.name.toLowerCase();
  const isReadableText = file.type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md");
  if (!isReadableText) return "";
  return file.text();
}

type SessionComposerCardProps = {
  mode: ComposerMode;
  onCreated?: () => void;
};

export function SessionComposerCard({ mode, onCreated }: SessionComposerCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [aiStatus, setAiStatus] = useState<"idle" | "transcribing" | "generating" | "success" | "fallback">("idle");
  const [progressMsg, setProgressMsg] = useState("");

  const modeConfig = useMemo(() => MODE_COPY[mode], [mode]);
  const ModeIcon = modeConfig.icon;

  // Card entrance animation
  useGSAP(() => {
    gsap.fromTo(cardRef.current,
      {
        scale: 0.95,
        autoAlpha: 0
      },
      {
        scale: 1,
        autoAlpha: 1,
        duration: 0.4,
        ease: "power2.out"
      }
    );
  }, { scope: cardRef });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    setAiStatus("idle");
    try {
      const fileText = await readOptionalText(file);
      let rawText = notes.trim() || fileText;

      const isAudioVideo = file && (file.type.startsWith("audio/") || file.type.startsWith("video/"));

      // Step 1: If audio/video file + AI enabled → transcribe first
      if (useAI && isAudioVideo && file) {
        setAiStatus("transcribing");
        try {
          const transcription = await transcribeAudio(file, undefined, (msg) => setProgressMsg(msg));
          rawText = transcription.text || rawText;
        } catch (transcribeError) {
          console.warn("Audio transcription failed:", transcribeError);
          // Continue with whatever text we have
        }
      }

      // Step 2: Create local session (instant fallback structure)
      const session = createStudySession({
        title: title.trim(),
        course: course.trim(),
        fileName: file?.name,
        fileType: file?.type || (mode === "record" ? "audio/webm" : undefined),
        notes: rawText,
        sourceUrl: sourceUrl.trim() || undefined,
        templateId: modeConfig.templateId,
      });

      // Step 3: AI enhancement if enabled and there's real text
      if (useAI && rawText.length > 30) {
        setAiStatus("generating");
        try {
          const ai = await generateStudySession({
            transcript: rawText,
            language: "auto",
            summaryFocus: title.trim(),
          });

          // Merge AI results into the session
          session.summary = (ai.summary && ai.summary.length > 0) ? ai.summary : session.summary;
          session.keyConcepts = ai.keyConcepts.length > 0 ? ai.keyConcepts : session.keyConcepts;
          session.flashcards = ai.flashcards.length > 0 ? ai.flashcards : session.flashcards;
          session.quiz = ai.quiz.length > 0 ? ai.quiz : session.quiz;
          session.actionItems = ai.actionItems.length > 0 ? ai.actionItems : session.actionItems;
          session.insights = ai.insights.length > 0 ? ai.insights : session.insights;
          if (ai.mindMap?.children?.length) session.mindMap = ai.mindMap;

          // Rebuild derived fields from AI content
          if (!session.mindMap?.children?.length) {
            session.mindMap = createMindMap(session);
          }
          session.chatHistory = createWelcomeChat(session);

          setAiStatus("success");
        } catch (aiError) {
          console.warn("AI generation failed, using local heuristics:", aiError);
          setAiStatus("fallback");
        }
      }

      upsertSession(session);
      onCreated?.();
      router.push(`/sessions/${session.id}`);
    } finally {
      setIsCreating(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  return (
    <section ref={cardRef} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
          <ModeIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
            {modeConfig.label}
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">Crear nueva sesión de estudio</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{modeConfig.hint}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Título de la sesión</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Marketing digital — clase 3"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Materia / curso</span>
            <input
              value={course}
              onChange={(event) => setCourse(event.target.value)}
              placeholder="Ej. Historia económica"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
            />
          </label>
        </div>

        {(mode === "url" || mode === "online") && (
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">URL de origen</span>
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
            />
          </label>
        )}

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Archivo base</span>
          <label
            className={`block cursor-pointer overflow-hidden rounded-[24px] border border-dashed p-5 transition ${
              file ? "border-violet-200 bg-violet-50/70 dark:border-violet-700 dark:bg-violet-900/20" : "border-slate-200 bg-slate-50 hover:border-violet-200 hover:bg-violet-50/40 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-700"
            }`}
          >
            <input
              type="file"
              accept="audio/*,video/*,.txt,.md,text/plain"
              onChange={handleFileChange}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${file ? "bg-white text-violet-600 dark:bg-slate-700 dark:text-violet-400" : "bg-white text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                <FileUp className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {file ? "Archivo listo" : "Arrastrá un archivo o hacé click para subir"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Audio, video, `.txt` o `.md`. Se transcribe multimedia y se usa texto directo cuando es posible.
                </p>
              </div>
            </div>
          </label>

          {file && (
            <div className="flex items-center justify-between rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm dark:border-violet-800 dark:bg-slate-800">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{file.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{file.type || "Tipo desconocido"}</p>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  aria-label="Quitar archivo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Notas o transcripción</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={6}
            placeholder="Pegá apuntes, un transcript o contexto para que Studere genere resumen, conceptos, flashcards, quiz y plan de repaso."
            className={`w-full rounded-3xl border bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800 ${
              useAI && !notes.trim() && !file ? "border-amber-300 dark:border-amber-600" : "border-slate-200 dark:border-slate-700"
            }`}
          />
          {useAI && !notes.trim() && !file && (
            <p className="text-xs text-amber-600">Subí un audio/video o pegá apuntes para que la IA genere contenido de calidad.</p>
          )}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isCreating || !title.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiStatus === "transcribing" || aiStatus === "generating" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : useAI && (notes.trim() || file) ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {aiStatus === "transcribing" ? (progressMsg || "Transcribiendo audio...") : aiStatus === "generating" ? "Generando con IA..." : isCreating ? "Creando..." : useAI && (notes.trim() || file) ? "Crear con IA" : "Crear sesión"}
          </button>

          <label className="flex cursor-pointer items-center gap-2">
            <div className="relative">
              <input
                type="checkbox"
                checked={useAI}
                onChange={(e) => setUseAI(e.target.checked)}
                className="sr-only"
              />
              <div className={`h-5 w-9 rounded-full transition ${useAI ? "bg-violet-500" : "bg-slate-300"}`} />
              <div className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${useAI ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Con IA</span>
          </label>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            {modeConfig.templateId === "class-summary" ? "Resumen de clase" : modeConfig.templateId === "exam-review" ? "Repaso de examen" : "Notas de reunión"}
          </p>
        </div>
      </form>
    </section>
  );
}
