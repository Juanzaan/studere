"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getSessions, patchSession, SESSIONS_UPDATED_EVENT } from "@/lib/storage";
import { SessionRecordsTable } from "@/components/session-records-table";

type LibraryFilter = "all" | "starred" | "week";

const LIB_FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "all", label: "Recientes" },
  { key: "starred", label: "Destacadas" },
  { key: "week", label: "Esta semana" },
];

export function LibraryPage({ initialQuery = "" }: { initialQuery?: string }) {
  const [sessions, setSessions] = useState(() => getSessions());
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [libFilter, setLibFilter] = useState<LibraryFilter>("all");
  const query = localQuery.trim().toLowerCase();

  useEffect(() => {
    function sync() { setSessions(getSessions()); }
    window.addEventListener(SESSIONS_UPDATED_EVENT, sync);
    return () => window.removeEventListener(SESSIONS_UPDATED_EVENT, sync);
  }, []);

  const filtered = useMemo(() => {
    let list = sessions;
    if (libFilter === "starred") list = list.filter((s) => s.starred);
    if (libFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      list = list.filter((s) => new Date(s.createdAt) >= weekAgo);
    }
    if (!query) return list;
    return list.filter((s) => [s.title, s.course, s.sourceFileName, s.summary].join(" ").toLowerCase().includes(query));
  }, [query, sessions, libFilter]);

  function toggleStar(sessionId: string) {
    const current = sessions.find((session) => session.id === sessionId);
    if (!current) return;
    patchSession(sessionId, { starred: !current.starred });
    setSessions(getSessions());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-c-text">Biblioteca</h2>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-[5px] rounded-btn border border-c-blue-border bg-c-blue-soft px-[10px] py-[5px] text-[11px] font-medium text-c-blue transition-colors hover:opacity-90"
        >
          <Plus className="h-[11px] w-[11px]" />
          Nueva sesión
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {LIB_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setLibFilter(f.key)}
            className={`rounded-pill px-3 py-1 text-[11px] transition-colors focus-visible:outline-none ${
              libFilter === f.key
                ? "border border-c-blue-border bg-c-blue-soft text-c-blue"
                : "border border-c-border text-c-muted hover:bg-c-surface-2"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-[9px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-c-muted" />
        <input
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Buscar sesiones..."
          className="h-[34px] w-full rounded-input border border-c-border bg-c-surface-2 pl-[28px] pr-3 text-[12px] text-c-text outline-none placeholder:text-c-muted focus:ring-1 focus:ring-c-blue-border"
        />
      </div>

      <SessionRecordsTable
        sessions={filtered}
        emptyTitle="Sin resultados"
        emptyDescription="Probá con otra búsqueda o creá una nueva sesión desde Inicio."
        onToggleStar={toggleStar}
      />
    </div>
  );
}
