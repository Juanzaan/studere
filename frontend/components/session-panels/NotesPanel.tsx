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
        className="h-48 w-full resize-none rounded-input border border-c-border bg-c-surface-2 p-4 text-[12px] leading-relaxed text-c-text outline-none placeholder:text-c-muted focus:border-c-blue-border"
      />
      {session.comments.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-c-muted">
            Notas guardadas
          </p>
          {session.comments.map((c) => (
            <div
              key={c.id}
              className="rounded-card border border-c-border bg-c-surface-2 p-2 text-[11px] text-c-muted"
            >
              {c.text}
            </div>
          ))}
        </div>
      )}
      {session.bookmarks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-c-muted">
            Marcadores
          </p>
          {session.bookmarks.map((b) => (
            <div
              key={b.id}
              className="rounded-card border border-c-border bg-c-surface-2 p-2 text-[11px] text-c-muted"
            >
              {b.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
