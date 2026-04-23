"use client";

import { memo, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Sparkles, Star } from "lucide-react";
import { StudySession } from "@/lib/types";
import { useFadeInStagger } from "@/src/shared/hooks/useAnimations";

gsap.registerPlugin(useGSAP);

const AVATAR_COLORS = [
  "border-c-blue-border bg-c-blue-soft text-c-blue",
  "border-c-teal-border bg-c-teal-soft text-c-teal",
  "border-c-violet-border bg-c-violet-soft text-c-violet",
] as const;

function getInitials(title: string): string {
  return title.trim().slice(0, 2).toUpperCase();
}

type SessionRecordsTableProps = {
  sessions: StudySession[];
  emptyTitle: string;
  emptyDescription: string;
  onToggleStar?: (sessionId: string) => void;
};

export const SessionRecordsTable = memo(function SessionRecordsTable({ sessions, emptyTitle, emptyDescription, onToggleStar }: SessionRecordsTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  useFadeInStagger(tableRef, '[data-session-row]', { y: 10, stagger: 0.05, duration: 0.4 });

  if (sessions.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-c-border bg-c-surface p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-panel bg-c-violet-soft text-c-violet">
          <Sparkles className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-[13px] font-semibold text-c-text">{emptyTitle}</h3>
        <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-c-muted">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div ref={tableRef} className="overflow-hidden rounded-panel border border-c-border bg-c-surface">
      <div className="grid grid-cols-[minmax(0,1fr)_48px] gap-4 border-b border-c-border bg-c-surface-2 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wide text-c-muted md:grid-cols-[minmax(0,2.8fr)_80px_100px_100px_48px]">
        <span>Sesión</span>
        <span className="hidden md:block">Duración</span>
        <span className="hidden md:block">Fecha</span>
        <span className="hidden md:block">Creador</span>
        <span className="text-right">Fav</span>
      </div>
      <div>
        {sessions.map((session, index) => {
          const avatarColor = AVATAR_COLORS[index % 3];
          return (
            <div
              key={session.id}
              data-session-row
              className="grid cursor-pointer grid-cols-[minmax(0,1fr)_48px] gap-4 border-b border-c-border px-4 py-3 transition-colors last:border-b-0 hover:bg-c-surface-2 md:grid-cols-[minmax(0,2.8fr)_80px_100px_100px_48px]"
            >
              <Link href={`/sessions/${session.id}`} className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-btn border text-[11px] font-semibold ${avatarColor}`}>
                    {getInitials(session.title)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-c-text">{session.title}</p>
                    <p className="truncate text-[10px] text-c-muted">{session.course || "Sin materia"}</p>
                  </div>
                </div>
              </Link>
              <div className="hidden items-center text-[11px] text-c-muted md:flex">{session.stats.estimatedDurationMinutes} min</div>
              <div className="hidden items-center text-[11px] text-c-muted md:flex">{new Date(session.createdAt).toLocaleDateString("es-AR")}</div>
              <div className="hidden items-center text-[11px] text-c-muted md:flex">Tú</div>
              <div className="flex items-center justify-end">
                <button
                  onClick={() => onToggleStar?.(session.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-btn transition-colors focus-visible:outline-none"
                  aria-label={session.starred ? "Quitar de destacados" : "Destacar sesión"}
                >
                  <Star className={`h-[14px] w-[14px] ${session.starred ? "fill-current text-c-amber" : "text-c-muted opacity-30"}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
