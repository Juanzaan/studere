"use client";

import { useState } from "react";
import { StudySession } from "@/lib/types";

interface NotesPanelProps {
  session: StudySession;
  onAddComment: (text: string) => void;
}

export function NotesPanel({ session, onAddComment }: NotesPanelProps) {
  const [userNotes, setUserNotes] = useState("");

  function handleBlur() {
    if (userNotes.trim()) {
      onAddComment(userNotes.trim());
      setUserNotes("");
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={userNotes}
        onChange={(e) => setUserNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Escribí tus notas personales aquí... (se guardan al salir del campo)"
        className="h-48 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
      />
      {session.comments.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Notas guardadas
          </p>
          {session.comments.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {c.text}
            </div>
          ))}
        </div>
      )}
      {session.bookmarks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Marcadores
          </p>
          {session.bookmarks.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {b.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
