"use client";

import dynamic from "next/dynamic";
import { CheckCircle2, Camera, Loader2 } from "lucide-react";
import { ActionItem, ExerciseFeedback } from "@/lib/types";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-[11px] text-c-muted">Cargando…</span>,
});

interface TasksPanelProps {
  tasks: ActionItem[];
  exerciseInput: Record<string, string>;
  evaluatingTaskId: string | null;
  onToggleTask: (taskId: string) => void;
  onExerciseInputChange: (taskId: string, value: string) => void;
  onSubmitExercise: (taskId: string) => void;
  onCaptureImage: (taskId: string) => void;
}

export function TasksPanel({
  tasks,
  exerciseInput,
  evaluatingTaskId,
  onToggleTask,
  onExerciseInputChange,
  onSubmitExercise,
  onCaptureImage,
}: TasksPanelProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-c-border bg-c-surface p-8 text-center text-[12px] text-c-muted">
        No hay tareas para esta sesión.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((item) => (
        <div
          key={item.id}
          className="rounded-panel border border-c-border bg-c-surface p-4"
        >
          {/* Task header */}
          <button onClick={() => onToggleTask(item.id)} className="flex w-full items-start gap-3 text-left focus-visible:outline-none rounded-btn">
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                item.status === "completed"
                  ? "border-c-blue bg-c-blue text-white"
                  : "border-c-border"
              }`}
            >
              {item.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-[13px] font-medium ${
                  item.status === "completed"
                    ? "text-c-muted line-through"
                    : "text-c-text"
                }`}
              >
                {item.title}
              </p>
              <p className="mt-1 text-[10px] text-c-muted">
                {item.owner} · {item.dueLabel}
              </p>
            </div>
          </button>

          {/* Exercise prompt */}
          {item.exercisePrompt && (
            <div className="ml-8 mt-3 rounded-card border border-c-violet-border bg-c-violet-soft p-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-c-violet">Ejercicio</p>
              <div className="mt-1">
                <Md>{item.exercisePrompt}</Md>
              </div>
            </div>
          )}

          {/* Feedback display */}
          {item.feedback && (
            <div
              className={`ml-8 mt-3 rounded-card border p-3 ${
                item.feedback.grade === "correct"
                  ? "border-c-teal-border bg-c-teal-soft"
                  : item.feedback.grade === "incorrect"
                  ? "border-c-red-border bg-c-red-soft"
                  : "border-c-amber/20 bg-c-amber-soft"
              }`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  item.feedback.grade === "correct"
                    ? "text-c-teal"
                    : item.feedback.grade === "incorrect"
                    ? "text-c-red"
                    : "text-c-amber"
                }`}
              >
                {item.feedback.grade === "correct"
                  ? "✓ Correcto"
                  : item.feedback.grade === "incorrect"
                  ? "✗ Incorrecto"
                  : "~ Parcialmente correcto"}
              </p>
              <div className="mt-1 text-[12px] leading-relaxed text-c-muted">
                <Md>{item.feedback.explanation}</Md>
              </div>
            </div>
          )}

          {/* Submission input if not completed */}
          {item.status === "pending" && item.exercisePrompt && !item.feedback && (
            <div className="ml-8 mt-3 space-y-2">
              <textarea
                value={exerciseInput[item.id] || ""}
                onChange={(e) => onExerciseInputChange(item.id, e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                className="w-full rounded-input border border-c-border bg-c-surface-2 p-3 text-[12px] text-c-text outline-none focus:border-c-blue-border"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onSubmitExercise(item.id)}
                  disabled={evaluatingTaskId === item.id}
                  className="flex h-8 items-center gap-1.5 rounded-btn border border-c-blue-border bg-c-blue-soft px-3 text-[11px] font-medium text-c-blue transition disabled:opacity-50 focus-visible:outline-none"
                >
                  {evaluatingTaskId === item.id ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Evaluando...
                    </>
                  ) : (
                    "Enviar respuesta"
                  )}
                </button>
                <button
                  onClick={() => onCaptureImage(item.id)}
                  className="flex h-8 items-center gap-1.5 rounded-btn border border-c-border px-3 text-[11px] text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
                >
                  <Camera className="h-3 w-3" />
                  Foto
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
