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
  onFocusMode?: () => void;
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
  onFocusMode,
}: SessionHeaderProps) {
  return (
    <div className="rounded-panel border border-c-border bg-c-surface p-4 overflow-hidden">
      {/* Badges row */}
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={onToggleStarred}
          className={`flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium transition focus-visible:outline-none ${
            starred
              ? "bg-c-amber-soft text-c-amber"
              : "bg-c-surface-2 text-c-muted hover:text-c-amber"
          }`}
        >
          <Star className={`h-3 w-3 ${starred ? "fill-current" : ""}`} />
          {starred ? "Destacada" : "Marcar"}
        </button>
        <span className="flex items-center gap-1 rounded-pill bg-c-violet-soft px-2 py-0.5 text-[10px] font-medium text-c-violet">
          <Sparkles className="h-3 w-3" />
          Stude workspace
        </span>
      </div>

      {/* Title */}
      <h1 className="text-[15px] font-semibold text-c-text">
        {session.title}
      </h1>

      {/* Meta */}
      <p className="mt-1 text-[11px] text-c-muted">
        {session.course ? session.course + " · " : ""}
        {session.sourceFileName} · {session.stats.estimatedDurationMinutes} min · {session.stats.wordCount} palabras
      </p>

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2">
        {onFocusMode && (
          <button
            onClick={onFocusMode}
            className="flex items-center gap-1.5 rounded-btn border border-c-blue-border bg-c-blue-soft px-3 py-1.5 text-[11px] text-c-blue transition hover:opacity-80 focus-visible:outline-none"
          >
            ⏱ Modo Foco
          </button>
        )}
        <button
          onClick={onExportMd}
          className="flex items-center gap-1.5 rounded-btn border border-c-border px-3 py-1.5 text-[11px] text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
        >
          <Download className="h-3.5 w-3.5" />
          Markdown
        </button>
        <button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 rounded-btn border border-c-border px-3 py-1.5 text-[11px] text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </button>
        {!confirmDelete ? (
          <button
            onClick={onDeleteClick}
            className="flex items-center gap-1.5 rounded-btn border border-c-red-border bg-c-red-soft px-3 py-1.5 text-[11px] text-c-red transition hover:opacity-90 focus-visible:outline-none"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onDeleteConfirm}
              className="flex items-center gap-1.5 rounded-btn bg-red-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-red-700 focus-visible:outline-none"
            >
              Confirmar
            </button>
            <button
              onClick={onDeleteCancel}
              className="flex items-center rounded-btn border border-c-border px-3 py-1.5 text-[11px] text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
