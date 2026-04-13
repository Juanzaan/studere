"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronsLeft,
  FileAudio2,
  FileText,
  Film,
  Home,
  Menu,
  Plug2,
  Search,
  Star,
  X,
} from "lucide-react";
import { getSessions, SESSIONS_UPDATED_EVENT } from "@/lib/storage";
import { StudySession } from "@/lib/types";
import { StudereLogo } from "@/components/studere-logo";

function kindIcon(kind: StudySession["sourceKind"]) {
  if (kind === "video") return Film;
  if (kind === "audio") return FileAudio2;
  return FileText;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/library", label: "Biblioteca", icon: FileText },
  { href: "/upcoming", label: "Próximos", icon: CalendarDays },
  { href: "/starred", label: "Destacados", icon: Star },
  { href: "/analytics", label: "Estadísticas", icon: BarChart3 },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    function syncSessions() {
      setSessions(getSessions());
    }

    syncSessions();
    window.addEventListener(SESSIONS_UPDATED_EVENT, syncSessions);
    return () => window.removeEventListener(SESSIONS_UPDATED_EVENT, syncSessions);
  }, [pathname]);

  const recentSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? sessions.filter((session) => [session.title, session.course].join(" ").toLowerCase().includes(q))
      : sessions;

    return list.slice(0, 6);
  }, [query, sessions]);

  return (
    <>
      <button
        onClick={() => setOpen((value) => !value)}
        className="fixed left-4 top-[76px] z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-md lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        aria-label={open ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
        aria-expanded={open}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {collapsed && !open && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed left-[62px] top-[50%] z-30 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-md transition-all hover:bg-violet-50 hover:text-violet-600 lg:flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-violet-900/40 dark:hover:text-violet-400"
          aria-label="Expandir menú"
        >
          <ChevronsLeft className="h-3.5 w-3.5 rotate-180" />
        </button>
      )}

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-900/25 backdrop-blur-[1px] lg:hidden" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-slate-200 bg-[#fbfcff] transition-all duration-200 lg:sticky lg:top-0 lg:h-screen dark:border-slate-700 dark:bg-[#0f1117] ${
          collapsed ? "w-[68px]" : "w-[280px]"
        } ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className={`flex h-[68px] items-center border-b border-slate-200 dark:border-slate-700 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          <Link href="/dashboard" className={`flex min-w-0 items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <StudereLogo size={collapsed ? 36 : 32} animated={true} />
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">Studere</p>
                <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">Brain workspace</p>
              </div>
            )}
          </Link>
        </div>

        <div className={`py-4 ${collapsed ? "px-2" : "px-3"}`}>
          {collapsed ? (
            <Link
              href="/library"
              className="flex h-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 transition hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:text-slate-300"
              title="Buscar en biblioteca"
            >
              <Search className="h-4 w-4" />
            </Link>
          ) : (
            <div className="relative">
              <label htmlFor="sidebar-search" className="sr-only">Buscar sesiones</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                id="sidebar-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar sesiones en la biblioteca"
                className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500"
              />
            </div>
          )}
        </div>

        <nav id="navigation" className={`space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center rounded-2xl text-sm font-medium transition-all duration-150 ${
                  collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2.5"
                } ${
                  isActive
                    ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800"
                    : "text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-sky-600 dark:text-sky-400" : "text-slate-400 dark:text-slate-500"}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && recentSessions.length > 0 && (
          <div className="px-3 pt-5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Recientes</p>
          </div>
        )}

        <div className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
          {collapsed ? (
            <div className="space-y-1">
              {recentSessions.slice(0, 4).map((session) => {
                const Icon = kindIcon(session.sourceKind);
                const isActive = pathname === `/sessions/${session.id}`;
                return (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-center rounded-2xl py-2 transition-all duration-150 ${
                      isActive ? "bg-violet-50 text-violet-600 shadow-sm ring-1 ring-violet-100 dark:bg-violet-900/30 dark:text-violet-400 dark:ring-violet-800" : "text-slate-400 hover:bg-white hover:text-slate-700 hover:shadow-sm dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    }`}
                    title={session.title}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
              Sin sesiones todavía
            </div>
          ) : (
            <div className="space-y-1">
              {recentSessions.map((session) => {
                const Icon = kindIcon(session.sourceKind);
                const isActive = pathname === `/sessions/${session.id}`;

                return (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    onClick={() => setOpen(false)}
                    className={`group flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-all duration-150 ${
                      isActive ? "bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-100 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800" : "hover:bg-white hover:shadow-sm dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${isActive ? "border-violet-100 bg-white text-violet-600 dark:border-violet-800 dark:bg-slate-800 dark:text-violet-400" : "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{session.title}</p>
                        {session.starred && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                        {session.course || "Sin materia"} ·{" "}
                        {new Date(session.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-700">
          <Link
            href="/integrations"
            className={`flex items-center rounded-2xl text-sm text-slate-500 transition hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
              collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2.5"
            }`}
            title={collapsed ? "Integraciones" : undefined}
          >
            <Plug2 className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
            {!collapsed && <span>Integraciones</span>}
          </Link>
          <button
            onClick={() => setCollapsed((value) => !value)}
            className={`mt-1 flex w-full items-center rounded-2xl text-sm text-slate-500 transition hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${
              collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2.5"
            }`}
          >
            <ChevronsLeft className={`h-4 w-4 shrink-0 text-slate-400 transition dark:text-slate-500 ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span>Colapsar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
