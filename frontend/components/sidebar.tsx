"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  Menu,
  Plug2,
  Search,
  Star,
  X,
} from "lucide-react";
import { getSessions, SESSIONS_UPDATED_EVENT } from "@/lib/storage";
import { StudySession } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/library", label: "Biblioteca", icon: BookOpen },
  { href: "/upcoming", label: "Próximos", icon: Clock },
  { href: "/starred", label: "Destacados", icon: Star },
  { href: "/analytics", label: "Estadísticas", icon: BarChart2 },
] as const;

const SIDEBAR_STORAGE_KEY = "studere.sidebar.collapsed";

function getInitials(title: string): string {
  return title.trim().slice(0, 2).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next)); } catch {}
  }

  useEffect(() => {
    function syncSessions() { setSessions(getSessions()); }
    syncSessions();
    window.addEventListener(SESSIONS_UPDATED_EVENT, syncSessions);
    return () => window.removeEventListener(SESSIONS_UPDATED_EVENT, syncSessions);
  }, [pathname]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  const recentSessions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? sessions.filter((s) => [s.title, s.course].join(" ").toLowerCase().includes(q))
      : sessions;
    return list.slice(0, 6);
  }, [query, sessions]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed left-4 top-[76px] z-50 flex h-9 w-9 items-center justify-center rounded-input border border-c-border bg-c-surface text-c-muted shadow-sm transition-colors hover:bg-c-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-c-blue lg:hidden"
        aria-label={open ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
        aria-expanded={open}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px] transition-opacity lg:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!open}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-c-border bg-c-surface transition-[width] duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen ${
          collapsed ? "w-[52px]" : "w-[224px]"
        } ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >

        {/* ── HEADER ── */}
        <div className={`flex h-[52px] shrink-0 items-center border-b border-c-border ${collapsed ? "justify-center px-[9px]" : "gap-[9px] px-[10px]"}`}>
          <Link
            href="/dashboard"
            aria-label="Inicio"
            className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-btn bg-c-blue"
          >
            <span className="h-[7px] w-[7px] rounded-full bg-white" />
          </Link>

          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold leading-tight text-c-text">Studere</p>
                <p className="truncate text-[10px] leading-tight text-c-muted">Brain workspace</p>
              </div>
              <button
                onClick={toggleCollapsed}
                aria-label="Colapsar menú"
                className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-btn border border-c-border text-c-muted transition-colors hover:bg-c-surface-2 focus-visible:outline-none"
              >
                <ChevronLeft className="h-[14px] w-[14px]" />
              </button>
            </>
          )}
        </div>

        {/* ── SEARCH ── */}
        <div className="shrink-0 border-b border-c-border p-[8px]">
          {collapsed ? (
            <Link
              href="/library"
              title="Buscar en biblioteca"
              className="mx-auto flex h-[30px] w-[30px] items-center justify-center rounded-input bg-c-surface-2 text-c-muted transition-colors hover:text-c-text"
            >
              <Search className="h-[14px] w-[14px]" />
            </Link>
          ) : (
            <div className="relative">
              <label htmlFor="sidebar-search" className="sr-only">Buscar sesiones</label>
              <Search className="pointer-events-none absolute left-[9px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-c-muted" />
              <input
                id="sidebar-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar sesiones en la biblioteca"
                className="h-[30px] w-full rounded-input bg-c-surface-2 pl-[28px] pr-[36px] text-[12px] text-c-text outline-none placeholder:text-c-muted focus:ring-1 focus:ring-c-blue-border"
              />
              <kbd className="pointer-events-none absolute right-[7px] top-1/2 -translate-y-1/2 rounded-[4px] border border-c-border bg-c-surface px-[4px] py-[1px] text-[9px] font-medium text-c-muted">
                ⌘K
              </kbd>
            </div>
          )}
        </div>

        {/* ── NAV ITEMS ── */}
        <nav id="navigation" className="flex shrink-0 flex-col gap-[1px] p-[6px_8px]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center rounded-input transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-c-blue ${
                  collapsed
                    ? "mx-auto h-[34px] w-[34px] justify-center"
                    : "gap-[9px] px-[10px] py-[7px]"
                } ${isActive ? "bg-c-blue-soft text-c-blue" : "text-c-muted hover:bg-c-surface-2"}`}
              >
                <Icon className={`h-[16px] w-[16px] shrink-0 ${isActive ? "text-c-blue" : "text-c-muted"}`} />
                {!collapsed && (
                  <span className="truncate text-[12px] font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── RECIENTES label ── */}
        {!collapsed && recentSessions.length > 0 && (
          <p className="shrink-0 px-[10px] pb-[3px] pt-[8px] text-[9px] font-semibold uppercase tracking-widest text-c-muted">
            Recientes
          </p>
        )}

        {/* ── RECIENTES list ── */}
        <div className="flex-1 overflow-y-auto">
          <div className={`flex flex-col gap-[1px] ${collapsed ? "p-[4px]" : "p-[2px_8px_8px]"}`}>
            {collapsed ? (
              recentSessions.slice(0, 4).map((session) => {
                const isActive = pathname === `/sessions/${session.id}`;
                return (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    onClick={() => setOpen(false)}
                    title={session.title}
                    className={`mx-auto flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-c-blue ${
                      isActive
                        ? "border-c-blue-border bg-c-blue-soft text-c-blue"
                        : "border-c-border bg-c-surface-2 text-c-muted hover:bg-c-surface-2"
                    }`}
                  >
                    {getInitials(session.title)}
                  </Link>
                );
              })
            ) : recentSessions.length === 0 ? (
              <div className="rounded-input border border-dashed border-c-border px-3 py-5 text-center text-[11px] text-c-muted">
                Sin sesiones todavía
              </div>
            ) : (
              recentSessions.map((session) => {
                const isActive = pathname === `/sessions/${session.id}`;
                return (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-[8px] rounded-input px-[10px] py-[5px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-c-blue ${
                      isActive ? "bg-c-blue-soft" : "hover:bg-c-surface-2"
                    }`}
                  >
                    <span
                      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-btn border text-[9px] font-semibold ${
                        isActive
                          ? "border-c-blue-border bg-c-blue-soft text-c-blue"
                          : "border-c-border bg-c-surface-2 text-c-muted"
                      }`}
                    >
                      {getInitials(session.title)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-c-text">{session.title}</p>
                      <p className="truncate text-[10px] text-c-muted">
                        {new Date(session.createdAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className={`shrink-0 border-t border-c-border p-[6px_8px] ${collapsed ? "flex flex-col items-center gap-[1px]" : "flex flex-col gap-[1px]"}`}>
          <Link
            href="/integrations"
            onClick={() => setOpen(false)}
            title={collapsed ? "Integraciones" : undefined}
            className={`flex items-center rounded-input text-c-muted transition-colors hover:bg-c-surface-2 focus-visible:outline-none ${
              collapsed
                ? "mx-auto h-[34px] w-[34px] justify-center"
                : "gap-[9px] px-[10px] py-[6px]"
            }`}
          >
            <Plug2 className="h-[14px] w-[14px] shrink-0" />
            {!collapsed && <span className="text-[12px]">Integraciones</span>}
          </Link>
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            className={`flex items-center rounded-input text-c-muted transition-colors hover:bg-c-surface-2 focus-visible:outline-none ${
              collapsed
                ? "mx-auto h-[34px] w-[34px] justify-center"
                : "w-full gap-[9px] px-[10px] py-[6px]"
            }`}
          >
            {collapsed ? (
              <ChevronRight className="h-[14px] w-[14px] shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-[14px] w-[14px] shrink-0" />
                <span className="text-[12px]">Colapsar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
