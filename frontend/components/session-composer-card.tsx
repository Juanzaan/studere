"use client";

import { memo, ChangeEvent, FormEvent, useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useScaleBounce } from "@/src/shared/hooks/useAnimations";
import { CheckCircle2, FileUp, Link2, Loader2, Mic, Plus, ScreenShare, Sparkles, Upload, Video, X } from "lucide-react";
import { createStudySession } from "@/lib/study-generator";
import { generateStudySession, transcribeAudio } from "@/lib/api";
import { upsertSession } from "@/lib/storage";
import { StudySession } from "@/lib/types";
import { createWelcomeChat, createMindMap } from "@/lib/session-utils";
import { validateAudioFile, getAudioCategoryEmoji, getProcessingDescription, getAudioSizeLabel } from "@/lib/audio-validation";
import { useToastContext } from "@/components/toast-provider";

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
  const toast = useToastContext();
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
  const [audioValidation, setAudioValidation] = useState<ReturnType<typeof validateAudioFile> | null>(null);

  const modeConfig = useMemo(() => MODE_COPY[mode], [mode]);
  const ModeIcon = modeConfig.icon;

  useScaleBounce(cardRef, { fromScale: 0.95, duration: 0.4 });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    setAiStatus("idle");
    try {
      const fileText = await readOptionalText(file);
      let rawText = notes.trim() || fileText;

      const isAudioVideo = file && (file.type.startsWith("audio/") || file.type.startsWith("video/"));

      // Confirm if large file
      if (audioValidation && audioValidation.requiresConfirmation) {
        const confirmed = window.confirm(
          `${audioValidation.message}\n\n` +
          `Tiempo estimado: ${audioValidation.estimatedProcessingTime.min}-${audioValidation.estimatedProcessingTime.max} minutos.\n\n` +
          `¿Deseas continuar?`
        );
        if (!confirmed) {
          setIsCreating(false);
          return;
        }
      }

      // Step 1: If audio/video file + AI enabled → transcribe first
      if (useAI && isAudioVideo && file) {
        setAiStatus("transcribing");
        try {
          const transcription = await transcribeAudio(file, undefined, (msg) => setProgressMsg(msg));
          rawText = transcription.text || rawText;
          if (rawText.length < 10) {
            toast.warning("Transcripción muy corta", "El audio no generó suficiente texto. Continuando con datos locales.");
          }
        } catch (transcribeError) {
          console.error("Audio transcription failed:", transcribeError);
          const errorMessage = transcribeError instanceof Error ? transcribeError.message : "Error desconocido";
          toast.error("Error al transcribir audio", errorMessage);
          setIsCreating(false);
          return;
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
          console.error("AI generation failed:", aiError);
          const errorMessage = aiError instanceof Error ? aiError.message : "Error desconocido";
          toast.warning("Generación con IA falló", `${errorMessage}. Usando contenido local.`);
          setAiStatus("fallback");
        }
      }

      upsertSession(session);
      toast.success("Sesión creada", `"${session.title}" está lista para estudiar.`);
      onCreated?.();
      router.push(`/sessions/${session.id}`);
    } catch (error) {
      console.error("Session creation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al crear sesión", errorMessage);
      setIsCreating(false);
    } finally {
      if (aiStatus !== "idle") setIsCreating(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    
    // Validate if it's an audio/video file
    if (selectedFile && (selectedFile.type.startsWith("audio/") || selectedFile.type.startsWith("video/"))) {
      const validation = validateAudioFile(selectedFile);
      setAudioValidation(validation);
      
      // If invalid, show alert immediately
      if (!validation.valid) {
        alert(validation.message);
        setFile(null);
        setAudioValidation(null);
      }
    } else {
      setAudioValidation(null);
    }
  }

  return (
    <section ref={cardRef} className="rounded-panel border border-c-border bg-c-surface p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn border border-c-blue-border bg-c-blue-soft text-c-blue">
          <ModeIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center rounded-btn border border-c-blue-border bg-c-blue-soft px-3 py-1 text-[11px] font-medium text-c-blue">
            {modeConfig.label}
          </div>
          <h2 className="mt-2 text-[15px] font-semibold text-c-text">Crear nueva sesión de estudio</h2>
          <p className="mt-1 max-w-2xl text-[12px] text-c-muted">{modeConfig.hint}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-c-muted">Título de la sesión</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Marketing digital — clase 3"
              className="h-9 w-full rounded-input border border-c-border bg-c-surface-2 px-4 text-[12px] text-c-text outline-none placeholder:text-c-muted focus:border-c-blue-border focus:outline-none"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-c-muted">Materia / curso</span>
            <input
              value={course}
              onChange={(event) => setCourse(event.target.value)}
              placeholder="Ej. Historia económica"
              className="h-9 w-full rounded-input border border-c-border bg-c-surface-2 px-4 text-[12px] text-c-text outline-none placeholder:text-c-muted focus:border-c-blue-border focus:outline-none"
            />
          </label>
        </div>

        {(mode === "url" || mode === "online") && (
          <label className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-c-muted">URL de origen</span>
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://..."
              className="h-9 w-full rounded-input border border-c-border bg-c-surface-2 px-4 text-[12px] text-c-text outline-none placeholder:text-c-muted focus:border-c-blue-border focus:outline-none"
            />
          </label>
        )}

        <div className="space-y-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-c-muted">Archivo base</span>
          <label
            className={`block cursor-pointer overflow-hidden rounded-input border border-dashed p-5 transition ${
              file ? "border-c-blue-border bg-c-blue-soft" : "border-c-border bg-c-surface-2 hover:border-c-blue-border"
            }`}
          >
            <input
              type="file"
              accept="audio/*,video/*,.txt,.md,text/plain"
              onChange={handleFileChange}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-btn border ${
                file ? "border-c-blue-border bg-c-surface text-c-blue" : "border-c-border bg-c-surface text-c-muted"
              }`}>
                <FileUp className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-c-text">
                  {file ? "Archivo listo" : "Arrastrá un archivo o hacé click para subir"}
                </p>
                <p className="mt-1 text-[11px] text-c-muted">
                  Audio, video, `.txt` o `.md`. Se transcribe multimedia y se usa texto directo cuando es posible.
                </p>
              </div>
            </div>
          </label>

          {file && (
            <>
              <div className="flex items-center justify-between rounded-card border border-c-teal-border bg-c-teal-soft px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-c-teal">{file.name}</p>
                  <p className="text-[11px] text-c-teal opacity-70">{file.type || "Tipo desconocido"}</p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-c-teal" />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setAudioValidation(null);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-btn border border-c-border text-c-muted transition hover:bg-c-surface-2 hover:text-c-text"
                    aria-label="Quitar archivo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {audioValidation && (
                <div className={`rounded-card border p-3 text-[11px] ${
                  audioValidation.category === "small" 
                    ? "border-c-teal-border bg-c-teal-soft"
                    : audioValidation.category === "medium"
                    ? "border-c-blue-border bg-c-blue-soft"
                    : "border-c-amber/20 bg-c-amber-soft"
                }`}>
                  <p className={`font-semibold ${
                    audioValidation.category === "small" ? "text-c-teal"
                      : audioValidation.category === "medium" ? "text-c-blue"
                      : "text-c-amber"
                  }`}>
                    {getAudioCategoryEmoji(audioValidation.category)} Archivo: {getAudioSizeLabel(audioValidation.sizeMB)} (~{audioValidation.estimatedMinutes} min)
                  </p>
                  <p className={`mt-1 ${
                    audioValidation.category === "small" ? "text-c-teal"
                      : audioValidation.category === "medium" ? "text-c-blue"
                      : "text-c-amber"
                  } opacity-80`}>
                    {getProcessingDescription(audioValidation.category)}
                  </p>
                  <p className={`mt-1 ${
                    audioValidation.category === "small" ? "text-c-teal"
                      : audioValidation.category === "medium" ? "text-c-blue"
                      : "text-c-amber"
                  } opacity-70`}>
                    Tiempo estimado: {audioValidation.estimatedProcessingTime.min}-{audioValidation.estimatedProcessingTime.max} minutos
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <label className="space-y-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-c-muted">Notas o transcripción</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={6}
            placeholder="Pegá apuntes, un transcript o contexto para que Studere genere resumen, conceptos, flashcards, quiz y plan de repaso."
            className={`w-full rounded-input border bg-c-surface-2 px-4 py-3 text-[12px] leading-relaxed text-c-text outline-none placeholder:text-c-muted focus:outline-none ${
              useAI && !notes.trim() && !file ? "border-c-amber/20" : "border-c-border"
            }`}
          />
          {useAI && !notes.trim() && !file && (
            <p className="text-[11px] text-c-amber">Subí un audio/video o pegá apuntes para que la IA genere contenido de calidad.</p>
          )}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isCreating || !title.trim()}
            className="inline-flex h-9 items-center gap-2 rounded-btn bg-c-blue px-4 text-[12px] font-medium text-white transition hover:opacity-90 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
              <div className={`h-5 w-9 rounded-full transition ${useAI ? "bg-c-blue" : "bg-c-surface-2 border border-c-border"}`} />
              <div className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${useAI ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <span className="text-[11px] font-medium text-c-muted">Con IA</span>
          </label>

          <p className="text-[11px] text-c-muted">
            {modeConfig.templateId === "class-summary" ? "Resumen de clase" : modeConfig.templateId === "exam-review" ? "Repaso de examen" : "Notas de reunión"}
          </p>
        </div>
      </form>
    </section>
  );
}
