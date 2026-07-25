"use client";

import { memo, useCallback, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { Star } from "lucide-react";
import { StudySession } from "@/lib/types";
import { useFadeInStagger } from "@/src/shared/hooks/useAnimations";
import { IllustrationScene } from "@/components/illustration-scene";

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
      <div className="rounded-panel border border-dashed border-c-border bg-c-surface px-8 py-10 text-center">
        {/* TODO: Replace placeholder-empty with Blush SVG when available.
            Keep data-layer-name convention for animation support. */}
        <div className="mx-auto w-40">
          <IllustrationScene
            src="placeholder-empty"
            animation={{
              delay: 0.1,
              floatLayers: ["dots"],
            }}
          />
        </div>
        <h3 className="mt-2 text-[13px] font-semibold text-c-text">{emptyTitle}</h3>
        <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-c-muted">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div ref={tableRef} className="overflow-hidden rounded-panel border border-c-border bg-c-surface">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-c-border bg-c-surface-2">
            <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-c-muted">
              Sesión
            </th>
            <th scope="col" className="hidden px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-c-muted md:table-cell">
              Duración
            </th>
            <th scope="col" className="hidden px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-c-muted md:table-cell">
              Fecha
            </th>
            <th scope="col" className="hidden px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-wide text-c-muted md:table-cell">
              Creador
            </th>
            <th scope="col" className="px-4 py-2.5 text-right text-[10px] font-medium uppercase tracking-wide text-c-muted">
              Fav
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, index) => {
            const avatarColor = AVATAR_COLORS[index % 3];
            return (
              <tr
                key={session.id}
                data-session-row
                className="group border-b border-c-border transition-colors last:border-b-0 hover:bg-c-surface-2"
              >
                <td className="px-4 py-3.5 md:py-3">
                  <Link
                    href={`/sessions/${session.id}`}
                    className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-c-blue focus-visible:ring-inset rounded-btn"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-btn border text-[11px] font-semibold ${avatarColor} md:h-8 md:w-8`}>
                      {getInitials(session.title)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-c-text">{session.title}</p>
                      <p className="truncate text-[10px] text-c-muted">{session.course || "Sin materia"}</p>
                      {/* Mobile-only compact meta: duration · date */}
                      <p className="mt-0.5 truncate text-[10px] text-c-muted/60 md:hidden">
                        {session.stats.estimatedDurationMinutes} min · {new Date(session.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </Link>
                </td>
                <td className="hidden px-4 py-3.5 align-middle text-[11px] text-c-muted md:table-cell md:py-3">
                  {session.stats.estimatedDurationMinutes} min
                </td>
                <td className="hidden px-4 py-3.5 align-middle text-[11px] text-c-muted md:table-cell md:py-3">
                  {new Date(session.createdAt).toLocaleDateString("es-AR")}
                </td>
                <td className="hidden px-4 py-3.5 align-middle text-[11px] text-c-muted md:table-cell md:py-3">
                  Tú
                </td>
                <td className="px-4 py-3.5 align-middle text-right md:py-3">
                  <button
                    onClick={(e) => {
                      const btn = e.currentTarget.querySelector(".star-icon");
                      if (btn && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                        gsap.fromTo(btn, { scale: 1 }, { scale: 1.35, duration: 0.15, ease: "back.out(2)", yoyo: true, repeat: 1 });
                      }
                      onToggleStar?.(session.id);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-btn transition-colors hover:scale-110 focus-visible:outline-none active:scale-95 md:h-8 md:w-8"
                    aria-label={session.starred ? "Quitar de destacados" : "Destacar sesión"}
                  >
                    <Star className={`star-icon h-[14px] w-[14px] transition-colors ${session.starred ? "fill-current text-c-amber" : "text-c-muted opacity-30 group-hover:opacity-60"}`} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
