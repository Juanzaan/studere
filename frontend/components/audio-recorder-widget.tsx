"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { startAudioCapture, stopAudioCapture, cancelAudioCapture, isRecording } from "@/lib/audio-capture";
import { createStudySession } from "@/lib/study-generator";
import { transcribeAudio, generateStudySession } from "@/lib/api";
import { upsertSession } from "@/lib/storage";
import { createWelcomeChat, createMindMap } from "@/lib/session-utils";
import { useToastContext } from "@/components/toast-provider";

export function AudioRecorderWidget() {
  const router = useRouter();
  const toast = useToastContext();
  const [state, setState] = useState<"idle" | "recording" | "transcribing" | "generating" | "processing" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [course, setCourse] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setState("transcribing");

    try {
      const result = await stopAudioCapture();
      const fileName = `recording-${Date.now()}.webm`;

      // Step 1: Transcribe audio with Whisper
      let rawText = "";
      try {
        const audioFile = new File([result.blob], fileName, { type: result.mimeType });
        const transcription = await transcribeAudio(audioFile);
        rawText = transcription.text || "";
        if (rawText.length < 10) {
          toast.warning("Transcripción muy corta", "El audio no generó suficiente texto.");
        }
      } catch (transcribeErr) {
        console.error("Whisper transcription failed:", transcribeErr);
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
          const ai = await generateStudySession({ transcript: rawText, language: "auto" });
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
          console.error("AI generation failed:", aiErr);
          const errorMessage = aiErr instanceof Error ? aiErr.message : "Error desconocido";
          toast.warning("Generación con IA falló", `${errorMessage}. Usando contenido local.`);
        }
      }

      upsertSession(session);
      toast.success("Grabación procesada", "Tu sesión está lista para estudiar.");
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error en la grabación";
      setState("error");
      setErrorMsg(errorMessage);
      toast.error("Error procesando grabación", errorMessage);
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

  return (
    <div className="rounded-panel border border-c-border bg-c-surface p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          state === "recording"
            ? "animate-pulse bg-c-red text-white"
            : "border border-c-blue-border bg-c-blue-soft text-c-blue"
        }`}>
          {state === "recording" ? <Mic className="h-5 w-5" /> : state === "transcribing" || state === "generating" || state === "processing" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
        </div>
        <div aria-live="polite" aria-atomic="true">
          <h3 className="text-[13px] font-semibold text-c-text">
            {state === "idle" && "Grabar audio"}
            {state === "recording" && "Grabando..."}
            {state === "transcribing" && "Transcribiendo audio..."}
            {state === "generating" && "Generando con IA..."}
            {state === "processing" && "Procesando audio..."}
            {state === "error" && "Error de grabación"}
          </h3>
          <p className={state === "recording" ? "text-[20px] font-semibold text-c-text tabular-nums" : state === "error" ? "text-[11px] text-c-red" : "text-[11px] text-c-muted"}>
            {state === "idle" && "Captúrá audio desde tu micrófono. Ideal para clases en vivo y notas de estudio."}
            {state === "recording" && formatTime(elapsed)}
            {state === "transcribing" && "Whisper está procesando el audio..."}
            {state === "generating" && "Stude IA está creando tu material de estudio..."}
            {state === "processing" && "Creando tu workspace de estudio..."}
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
