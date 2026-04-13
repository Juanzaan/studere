"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MonitorStop, ScreenShare, Square } from "lucide-react";
import { startScreenCapture, stopScreenCapture, cancelScreenCapture, isScreenRecording } from "@/lib/screen-capture";
import { createStudySession } from "@/lib/study-generator";
import { upsertSession } from "@/lib/storage";

export function ScreenRecorderWidget() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "recording" | "processing" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [course, setCourse] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (isScreenRecording()) cancelScreenCapture();
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setErrorMsg("");
      setState("recording");
      setElapsed(0);
      stoppingRef.current = false;

      await startScreenCapture((result) => {
        // Browser "Stop sharing" was clicked — auto-process the recording
        if (!stoppingRef.current) {
          stoppingRef.current = true;
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setState("processing");

          const textFromScreen = [
            `[Screen recording — ${formatTime(result.durationSeconds)} — ${result.mimeType}]`,
            "",
            "En esta grabación de pantalla se capturó una clase online, tutorial o demo con el contenido visual y el audio del sistema y micrófono.",
            "Se abordaron explicaciones, diagramas y flujos de trabajo que el estudiante puede repasar con el material generado.",
            "La grabación incluye puntos clave que conviene revisar antes del próximo examen o entrega.",
            "El video fue procesado por el motor de transcripción simulado del MVP. En producción, Studere extraerá audio y usará ASR real.",
          ].join("\n");

          const sess = createStudySession({
            title: `Screen capture — ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`,
            course: course.trim(),
            fileName: `screen-${Date.now()}.webm`,
            fileType: result.mimeType,
            notes: textFromScreen,
          });

          upsertSession(sess);
          router.push(`/sessions/${sess.id}`);
        }
      });

      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "No se pudo iniciar la captura de pantalla");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setState("processing");

    try {
      const result = await stopScreenCapture();
      const textFromScreen = [
        `[Screen recording — ${formatTime(result.durationSeconds)} — ${result.mimeType}]`,
        "",
        "En esta grabación de pantalla se capturó una clase online, tutorial o demo con el contenido visual y el audio del sistema y micrófono.",
        "Se abordaron explicaciones, diagramas y flujos de trabajo que el estudiante puede repasar con el material generado.",
        "La grabación incluye puntos clave que conviene revisar antes del próximo examen o entrega.",
        "El video fue procesado por el motor de transcripción simulado del MVP. En producción, Studere extraerá audio y usará ASR real.",
      ].join("\n");

      const session = createStudySession({
        title: `Screen capture — ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`,
        course: course.trim(),
        fileName: `screen-${Date.now()}.webm`,
        fileType: result.mimeType,
        notes: textFromScreen,
      });

      upsertSession(session);
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Error en la grabación de pantalla");
    }
  }, [router, course]);

  const cancel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    cancelScreenCapture();
    setState("idle");
    setElapsed(0);
  }, []);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${state === "recording" ? "animate-pulse bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400" : "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"}`}>
          {state === "processing" ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScreenShare className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {state === "idle" && "Grabar pantalla"}
            {state === "recording" && "Grabando pantalla..."}
            {state === "processing" && "Procesando grabación..."}
            {state === "error" && "Error de captura"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {state === "idle" && "Capturá tu pantalla + audio para clases online, tutoriales y demos."}
            {state === "recording" && formatTime(elapsed)}
            {state === "processing" && "Creando tu workspace de estudio..."}
            {state === "error" && errorMsg}
          </p>
        </div>
      </div>

      {state === "idle" && (
        <div className="mt-4">
          <label className="block max-w-sm space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Materia / curso (opcional)</span>
            <input
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="Ej. Historia económica"
              className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
            />
          </label>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {state === "idle" && (
          <button
            onClick={startRecording}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            <ScreenShare className="h-4 w-4" />
            Iniciar captura de pantalla
          </button>
        )}

        {state === "recording" && (
          <>
            <button
              onClick={stopRecording}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              <Square className="h-4 w-4" />
              Detener y crear sesión
            </button>
            <button
              onClick={cancel}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <MonitorStop className="h-4 w-4" />
              Cancelar
            </button>
          </>
        )}

        {state === "error" && (
          <button
            onClick={() => { setState("idle"); setErrorMsg(""); }}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
