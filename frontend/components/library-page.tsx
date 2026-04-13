"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenText, Search } from "lucide-react";
import { getSessions, patchSession, SESSIONS_UPDATED_EVENT } from "@/lib/storage";
import { SessionRecordsTable } from "@/components/session-records-table";

export function LibraryPage({ initialQuery = "" }: { initialQuery?: string }) {
  const [sessions, setSessions] = useState(() => getSessions());
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const query = localQuery.trim().toLowerCase();

  useEffect(() => {
    function sync() { setSessions(getSessions()); }
    window.addEventListener(SESSIONS_UPDATED_EVENT, sync);
    return () => window.removeEventListener(SESSIONS_UPDATED_EVENT, sync);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return sessions;
    return sessions.filter((session) => [session.title, session.course, session.sourceFileName, session.summary].join(" ").toLowerCase().includes(query));
  }, [query, sessions]);

  function toggleStar(sessionId: string) {
    const current = sessions.find((session) => session.id === sessionId);
    if (!current) return;
    patchSession(sessionId, { starred: !current.starred });
    setSessions(getSessions());
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
          <BookOpenText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Biblioteca</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Biblioteca completa de sesiones, clases, notas y material transcrito.{query ? ` Resultado para “${query}”.` : ""}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <label className="relative block max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Buscar sesiones..."
            className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
          />
        </label>
      </div>

      <div className="mt-4">
        <SessionRecordsTable
          sessions={filtered}
          emptyTitle="Sin resultados"
          emptyDescription="Probá con otra búsqueda o creá una nueva sesión desde Inicio."
          onToggleStar={toggleStar}
        />
      </div>
    </div>
  );
}
