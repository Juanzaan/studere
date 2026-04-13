"use client";

import { SessionComment } from "@/lib/types";

interface NotesPanelProps {
  notes: string;
  comments: SessionComment[];
  onNotesChange: (notes: string) => void;
  onNotesSave: () => void;
}

export function NotesPanel({ notes, comments, onNotesChange, onNotesSave }: NotesPanelProps) {
  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        onBlur={onNotesSave}
        placeholder="Escribí tus notas personales aquí... (se guardan al salir del campo)"
        className="h-48 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
      />

      {comments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Comentarios guardados ({comments.length})
          </p>
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
            >
              <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">{comment.text}</p>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                {new Date(comment.createdAt).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
