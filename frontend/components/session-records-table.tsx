"use client";

import { memo, useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { FileAudio2, FileText, Film, Sparkles, Star } from "lucide-react";
import { StudySession } from "@/lib/types";

gsap.registerPlugin(useGSAP);

function detectKind(session: StudySession) {
  if (session.sourceKind === "video") {
    return {
      label: "Video",
      icon: Film,
      badge: "bg-rose-50 text-rose-600 border-rose-100",
    };
  }

  if (session.sourceKind === "audio") {
    return {
      label: "Audio",
      icon: FileAudio2,
      badge: "bg-emerald-50 text-emerald-600 border-emerald-100",
    };
  }

  return {
    label: "Texto",
    icon: FileText,
    badge: "bg-sky-50 text-sky-600 border-sky-100",
  };
}

type SessionRecordsTableProps = {
  sessions: StudySession[];
  emptyTitle: string;
  emptyDescription: string;
  onToggleStar?: (sessionId: string) => void;
};

export const SessionRecordsTable = memo(function SessionRecordsTable({ sessions, emptyTitle, emptyDescription, onToggleStar }: SessionRecordsTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);

  // Animate session cards on mount/update
  useGSAP(() => {
    if (sessions.length > 0) {
      const rows = tableRef.current?.querySelectorAll('[data-session-row]');
      if (rows) {
        gsap.fromTo(rows,
          {
            autoAlpha: 0,
            y: 10
          },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.05,
            ease: "power2.out"
          }
        );
      }
    }
  }, { dependencies: [sessions.length], scope: tableRef });

  if (sessions.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
          <Sparkles className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">{emptyTitle}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div ref={tableRef} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900">
      <div className="grid grid-cols-[minmax(0,1fr)_60px] gap-4 border-b border-slate-200 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:grid-cols-[minmax(0,2.8fr)_92px_128px_120px_60px] dark:border-slate-700 dark:text-slate-500">
        <span>Sesión</span>
        <span className="hidden md:block">Duración</span>
        <span className="hidden md:block">Fecha</span>
        <span className="hidden md:block">Creador</span>
        <span className="text-right">Fav</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {sessions.map((session) => {
          const meta = detectKind(session);
          const Icon = meta.icon;

          return (
            <div key={session.id} data-session-row className="grid grid-cols-[minmax(0,1fr)_60px] gap-4 px-5 py-4 transition-all duration-150 hover:bg-violet-50/40 md:grid-cols-[minmax(0,2.8fr)_92px_128px_120px_60px] dark:hover:bg-violet-900/10">
              <Link href={`/sessions/${session.id}`} className="min-w-0">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border ${meta.badge}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{session.title}</p>
                      {session.starred && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          Destacada
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{session.course || "Sin materia"}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-400 dark:text-slate-500">{(session.summary || "").split(/\n\n?/)[0]}</p>
                  </div>
                </div>
              </Link>
              <div className="hidden text-sm text-slate-500 md:block dark:text-slate-400">{session.stats.estimatedDurationMinutes} min</div>
              <div className="hidden text-sm text-slate-500 md:block dark:text-slate-400">{new Date(session.createdAt).toLocaleDateString("es-AR")}</div>
              <div className="hidden text-sm text-slate-500 md:block dark:text-slate-400">Tú</div>
              <div className="flex justify-end">
                <button
                  onClick={() => onToggleStar?.(session.id)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
                    session.starred
                      ? "border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "border-slate-200 bg-white text-slate-300 hover:border-slate-300 hover:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600 dark:hover:text-slate-400"
                  }`}
                  aria-label={session.starred ? "Quitar de destacados" : "Destacar sesión"}
                >
                  <Star className={`h-4 w-4 ${session.starred ? "fill-current" : ""}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
