"use client";

import { useEffect, useState } from "react";
import { getSessions, patchSession, SESSIONS_UPDATED_EVENT } from "@/lib/storage";
import { SessionRecordsTable } from "@/components/session-records-table";

export function StarredPage() {
  const [sessions, setSessions] = useState(() => getSessions());
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
      <div>
        <h2 className="text-[16px] font-semibold text-c-text">Sesiones destacadas</h2>
        <p className="mt-1 text-[12px] text-c-muted">Acceso rápido a las sesiones que marcaste como importantes.</p>
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
