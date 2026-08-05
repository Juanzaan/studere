"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { startAudioCapture, stopAudioCapture, cancelAudioCapture, isRecording } from "@/lib/audio-capture";
import { createStudySession } from "@/lib/study-generator";
import { transcribeAudio, generateStudySession } from "@/lib/api";
import { getSessions, upsertSession } from "@/lib/storage";
import { createWelcomeChat, createMindMap, isTrialExhausted } from "@/lib/session-utils";
import { TRIAL_MINUTES } from "@/lib/constants";
import { useToastContext } from "@/components/toast-provider";
import { SessionSkeleton } from "@/components/session-skeleton";

/**
 * Audio recorder widget — records from the browser mic, transcribes with
 * Azure Whisper, and creates a fully generated study session.
 *
 * State machine: idle → recording → transcribing → generating → success
 * Shows a {@link SessionSkeleton} during processing phases.
 * Falls back to local content generation if the AI endpoint fails.
 */
export function AudioRecorderWidget() {
  const router = useRouter();
  const toast = useToastContext();
  const { getToken } = useAuth();
  const [state, setState] = useState<"idle" | "recording" | "transcribing" | "generating" | "processing" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [course, setCourse] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (isRecording()) cancelAudioCapture();
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      setErrorMsg("");
      setState("recording");
      setElapsed(0);
      await startAudioCapture();

      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "No se pudo acceder al micrófono";
      setState("error");
      setErrorMsg(errorMessage);
      toast.error("Error de grabación", errorMessage);
    }
  }, [toast]);

  const stopRecording = useCallback(async () => {
    // Guard against double-clicks: a second stopAudioCapture would reject
    // (no active recording) and surface a spurious error mid-flow.
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      if (isTrialExhausted(getSessions())) {
        toast.warning(
          "Trial finalizado",
          `Alcanzaste los ${TRIAL_MINUTES} minutos del trial. Suscribite para seguir usando la IA.`
        );
        busyRef.current = false;
        return;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setState("transcribing");

      const result = await stopAudioCapture();
      const fileName = `recording-${Date.now()}.webm`;

      // Step 1: Transcribe audio with Whisper
      let rawText = "";
      try {
        const audioFile = new File([result.blob], fileName, { type: result.mimeType });
        const token = await getToken();
        const transcription = await transcribeAudio(audioFile, undefined, undefined, { token: token || undefined });
        rawText = transcription.text || "";
        if (rawText.length < 10) {
          toast.warning("Transcripción muy corta", "El audio no generó suficiente texto.");
        }
      } catch (transcribeErr) {
        const errorMessage = transcribeErr instanceof Error ? transcribeErr.message : "Error desconocido";
        toast.error("Error al transcribir audio", errorMessage);
        setState("error");
        setErrorMsg(errorMessage);
        return;
      }

      // Step 2: Create local session with transcript
      const session = createStudySession({
        title: `Audio recording — ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`,
        course: course.trim(),
        fileName,
        fileType: result.mimeType,
        notes: rawText,
      });

      // Step 3: AI enhancement if we got a real transcript
      if (rawText.length > 30) {
        setState("generating");
        try {
          const token = await getToken();
          const ai = await generateStudySession({ transcript: rawText, language: "auto" }, token || undefined);
          if (ai.summary?.trim()) session.summary = ai.summary;
          if (ai.keyConcepts.length > 0) session.keyConcepts = ai.keyConcepts;
          if (ai.flashcards.length > 0) session.flashcards = ai.flashcards;
          if (ai.quiz.length > 0) session.quiz = ai.quiz;
          if (ai.actionItems.length > 0) session.actionItems = ai.actionItems;
          if (ai.insights.length > 0) session.insights = ai.insights;
          if (ai.mindMap?.children?.length) session.mindMap = ai.mindMap;
          if (!session.mindMap?.children?.length) session.mindMap = createMindMap(session);
          session.chatHistory = createWelcomeChat(session);
        } catch (aiErr) {
          const errorMessage = aiErr instanceof Error ? aiErr.message : "Error desconocido";
          toast.warning("Generación con IA falló", `${errorMessage}. Usando contenido local.`);
        }
      }

      const saved = upsertSession(session);
      if (!saved) {
        toast.error("No se pudo guardar la sesión", "El almacenamiento local está lleno. Eliminá sesiones viejas o exportá el contenido.");
        setState("error");
        setErrorMsg("Almacenamiento lleno");
        return;
      }
      toast.success("Grabación procesada", "Tu sesión está lista para estudiar.");
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error en la grabación";
      setState("error");
      setErrorMsg(errorMessage);
      toast.error("Error procesando grabación", errorMessage);
    } finally {
      busyRef.current = false;
    }
  }, [router, course, toast]);

  const cancel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    cancelAudioCapture();
    setState("idle");
    setElapsed(0);
  }, []);

  if (state === "transcribing" || state === "generating" || state === "processing") {
    return (
      <div className="rounded-panel border border-c-border bg-c-surface p-5">
        <SessionSkeleton phase={state === "processing" ? "generating" : state} />
      </div>
    );
  }

  return (
    <div className="rounded-panel border border-c-border bg-c-surface p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          state === "recording"
            ? "animate-pulse bg-c-red text-white"
            : "border border-c-blue-border bg-c-blue-soft text-c-blue"
        }`}>
          {state === "recording" ? <Mic className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </div>
        <div aria-live="polite" aria-atomic="true">
          <h3 className="text-[13px] font-semibold text-c-text">
            {state === "idle" && "Grabar audio"}
            {state === "recording" && "Grabando..."}
            {state === "error" && "Error de grabación"}
          </h3>
          <p className={state === "recording" ? "text-[20px] font-semibold text-c-text tabular-nums" : state === "error" ? "text-[11px] text-c-red" : "text-[11px] text-c-muted"}
             role={state === "recording" ? "timer" : undefined}
             aria-label={state === "recording" ? `Tiempo de grabación: ${formatTime(elapsed)}` : undefined}
          >
            {state === "idle" && "Captúrá audio desde tu micrófono. Ideal para clases en vivo y notas de estudio."}
            {state === "recording" && formatTime(elapsed)}
            {state === "error" && errorMsg}
          </p>
        </div>
      </div>

      {state === "idle" && (
        <div className="mt-4">
          <label className="block max-w-sm space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-c-muted">Materia / curso (opcional)</span>
            <input
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="Ej. Historia económica"
              className="h-9 w-full rounded-input border border-c-border bg-c-surface-2 px-4 text-[12px] text-c-text outline-none placeholder:text-c-muted focus:border-c-blue-border focus:outline-none"
            />
          </label>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {state === "idle" && (
          <button
            onClick={startRecording}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-c-red px-4 text-[12px] font-medium text-white transition hover:opacity-90 focus-visible:outline-none"
          >
            <Mic className="h-4 w-4" />
            Iniciar grabación
          </button>
        )}

        {state === "recording" && (
          <>
            <button
              onClick={stopRecording}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-c-blue px-4 text-[12px] font-medium text-white transition hover:opacity-90 focus-visible:outline-none"
            >
              <Square className="h-4 w-4" />
              Detener y crear sesión
            </button>
            <button
              onClick={cancel}
              className="inline-flex h-9 items-center gap-2 rounded-btn border border-c-border px-4 text-[12px] text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
            >
              <MicOff className="h-4 w-4" />
              Cancelar
            </button>
          </>
        )}

        {state === "error" && (
          <button
            onClick={() => { setState("idle"); setErrorMsg(""); }}
            className="inline-flex h-9 items-center gap-2 rounded-btn border border-c-border px-4 text-[12px] text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
