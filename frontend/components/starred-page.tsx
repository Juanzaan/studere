"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
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
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <Star className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Sesiones destacadas</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Acceso rápido a las sesiones que marcaste como importantes para volver a estudiar más tarde.</p>
        </div>
      </div>

      <div className="mt-6">
        <SessionRecordsTable
          sessions={starred}
          emptyTitle="Sin sesiones destacadas"
          emptyDescription="Marcá una sesión con la estrella desde Inicio, Biblioteca o el editor."
          onToggleStar={toggleStar}
        />
      </div>
    </div>
  );
}
