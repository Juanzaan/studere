"use client";

import dynamic from "next/dynamic";
import { CheckCircle2, Camera, Loader2 } from "lucide-react";
import { ActionItem, ExerciseFeedback } from "@/lib/types";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-xs text-slate-400">Cargando…</span>,
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
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        No hay tareas para esta sesión.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((item) => (
        <div
          key={item.id}
          className={`rounded-[22px] border p-4 transition ${
            item.status === "completed"
              ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20"
              : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
          }`}
        >
          {/* Task header */}
          <button onClick={() => onToggleTask(item.id)} className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 rounded-xl">
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                item.status === "completed"
                  ? "bg-emerald-500 text-white"
                  : "border-2 border-slate-300"
              }`}
            >
              {item.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${
                  item.status === "completed"
                    ? "text-slate-400 line-through dark:text-slate-500"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {item.title}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {item.owner} · {item.dueLabel}
              </p>
            </div>
          </button>

          {/* Exercise prompt */}
          {item.exercisePrompt && (
            <div className="ml-8 mt-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-800 dark:bg-violet-900/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-500">Ejercicio</p>
              <div className="mt-1">
                <Md>{item.exercisePrompt}</Md>
              </div>
            </div>
          )}

          {/* Feedback display */}
          {item.feedback && (
            <div
              className={`ml-8 mt-3 rounded-2xl border p-3 ${
                item.feedback.grade === "correct"
                  ? "border-emerald-200 bg-emerald-50"
                  : item.feedback.grade === "incorrect"
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  item.feedback.grade === "correct"
                    ? "text-emerald-600"
                    : item.feedback.grade === "incorrect"
                    ? "text-red-600"
                    : "text-amber-600"
                }`}
              >
                {item.feedback.grade === "correct"
                  ? "✓ Correcto"
                  : item.feedback.grade === "incorrect"
                  ? "✗ Incorrecto"
                  : "~ Parcialmente correcto"}
              </p>
              <div className="mt-1 text-xs leading-6 text-slate-600">
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
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-700 outline-none transition focus:border-violet-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-violet-500"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onSubmitExercise(item.id)}
                  disabled={evaluatingTaskId === item.id}
                  className="flex h-8 items-center gap-1.5 rounded-full bg-violet-600 px-4 text-xs font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 disabled:opacity-50"
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
                  className="flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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
