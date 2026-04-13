"use client";

import { Star, Sparkles, Download, Trash2 } from "lucide-react";
import { StudySession } from "@/lib/types";

interface SessionHeaderProps {
  session: StudySession;
  starred: boolean;
  confirmDelete: boolean;
  onToggleStarred: () => void;
  onExportMd: () => void;
  onExportCsv: () => void;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

export function SessionHeader({
  session,
  starred,
  confirmDelete,
  onToggleStarred,
  onExportMd,
  onExportCsv,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: SessionHeaderProps) {
  return (
    <header className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-6 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onToggleStarred}
              className={`flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold transition ${
                starred ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${starred ? "fill-current" : ""}`} />
              {starred ? "Destacada" : "Marcar como importante"}
            </button>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              Stude workspace
            </div>
          </div>
          <h1 className="mt-4 truncate text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{session.title}</h1>
          <p className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">
            {session.course || "Sin materia"} · {session.sourceFileName} · {session.stats.estimatedDurationMinutes} min · {session.stats.wordCount} palabras
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onExportMd}
            className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            Markdown
          </button>
          <button
            onClick={onExportCsv}
            className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          {!confirmDelete ? (
            <button
              onClick={onDeleteClick}
              className="flex h-10 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onDeleteConfirm}
                className="flex h-10 items-center gap-2 rounded-full bg-red-600 px-4 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Confirmar
              </button>
              <button
                onClick={onDeleteCancel}
                className="flex h-10 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
