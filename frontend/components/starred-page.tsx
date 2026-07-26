"use client";

import { useEffect, useRef, useState } from "react";
import { getSessions, patchSession, SESSIONS_UPDATED_EVENT } from "@/lib/storage";
import { useFadeInStagger } from "@/src/shared/hooks/useAnimations";
import { SessionRecordsTable } from "@/components/session-records-table";

/**
 * Starred sessions page — quick access to all favorited sessions.
 *
 * Filters sessions where `starred === true`. Syncs reactively via
 * {@link SESSIONS_UPDATED_EVENT}. Shows a contextual empty state
 * with instructions when no sessions are starred.
 */
export function StarredPage() {
  const headerRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState(() => getSessions());

  useFadeInStagger(headerRef, ".starred-header", { y: 16, stagger: 0.06, duration: 0.5, scale: 0.96, ease: "smooth" });
  const starred = sessions.filter((session) => session.starred);

  useEffect(() => {
    function sync() { setSessions(getSessions()); }
    window.addEventListener(SESSIONS_UPDATED_EVENT, sync);
    return () => window.removeEventListener(SESSIONS_UPDATED_EVENT, sync);
  }, []);

  function toggleStar(sessionId: string) {
    const current = sessions.find((session) => session.id === sessionId);
    if (!current) return;
    patchSession(sessionId, { starred: !current.starred });
    setSessions(getSessions());
  }

  return (
    <div className="space-y-4">
      <div ref={headerRef}>
        <h2 className="starred-header text-[16px] font-semibold text-c-text">Sesiones destacadas</h2>
        <p className="starred-header mt-1 text-[12px] text-c-muted">Acceso rápido a las sesiones que marcaste como importantes.</p>
      </div>
      <SessionRecordsTable
        sessions={starred}
        emptyTitle="Sin sesiones destacadas"
        emptyDescription="Marcá una sesión con la estrella desde Inicio, Biblioteca o el editor."
        onToggleStar={toggleStar}
      />
    </div>
  );
}
