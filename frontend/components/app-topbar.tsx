"use client";

import { memo, FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Crown, Moon, Search, Sparkles, Sun, UserCircle2 } from "lucide-react";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";
import { getSessions, SESSIONS_UPDATED_EVENT } from "@/lib/storage";
import { StudySession } from "@/lib/types";

export const AppTopbar = memo(function AppTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [dark, setDark] = useState<Theme>("light");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDark(getStoredTheme());
  }, []);

  function toggleTheme() {
    const next = dark === "dark" ? "light" : "dark";
    setTheme(next);
    setDark(next);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function syncSessions() {
      setSessions(getSessions());
    }

    syncSessions();
    window.addEventListener(SESSIONS_UPDATED_EVENT, syncSessions);
    return () => window.removeEventListener(SESSIONS_UPDATED_EVENT, syncSessions);
  }, [pathname]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      router.push("/library");
      return;
    }

    const match = sessions.find((session) => [session.title, session.course, session.sourceFileName].join(" ").toLowerCase().includes(normalized));

    if (match) {
      router.push(`/sessions/${match.id}`);
      return;
    }

    router.push(`/library?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-c-border bg-c-surface">
      <div className="flex h-[52px] items-center gap-3 px-4 sm:px-5">
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-3">
          <label className="relative flex min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-[9px] h-[13px] w-[13px] text-c-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar..."
              className="h-[30px] w-full rounded-input border border-c-border bg-c-surface-2 pl-[28px] pr-[40px] text-[12px] text-c-text outline-none placeholder:text-c-muted focus:ring-1 focus:ring-c-blue-border"
            />
            <span className="pointer-events-none absolute right-[7px] hidden rounded-[4px] border border-c-border bg-c-surface px-[4px] py-[1px] text-[9px] font-medium text-c-muted sm:inline-flex">
              Ctrl K
            </span>
          </label>
        </form>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="inline-flex items-center gap-[5px] rounded-btn border border-c-blue-border bg-c-blue-soft px-[10px] py-[5px] text-[11px] font-medium text-c-blue">
            <Sparkles className="h-[12px] w-[12px]" />
            Stude
          </div>
          <button className="inline-flex h-[28px] items-center gap-[5px] rounded-btn border border-c-border px-[10px] text-[11px] font-medium text-c-muted transition-colors hover:bg-c-surface-2 focus-visible:outline-none">
            <Crown className="h-[12px] w-[12px]" />
            Iniciar prueba
          </button>
        </div>

        <button
          onClick={toggleTheme}
          className="flex h-[28px] w-[28px] items-center justify-center rounded-btn border border-c-border text-c-muted transition-colors hover:bg-c-surface-2 focus-visible:outline-none"
          aria-label="Cambiar tema"
        >
          {dark === "dark" ? <Sun className="h-[13px] w-[13px]" /> : <Moon className="h-[13px] w-[13px]" />}
        </button>
        <button
          className="flex h-[28px] w-[28px] items-center justify-center rounded-btn border border-c-border text-c-muted transition-colors hover:bg-c-surface-2 focus-visible:outline-none"
          aria-label="Notificaciones"
        >
          <Bell className="h-[13px] w-[13px]" />
        </button>
        <button
          className="flex items-center gap-[6px] rounded-full border border-c-border bg-c-surface-2 px-[8px] py-[4px] transition-colors hover:bg-c-surface-2 focus-visible:outline-none"
          aria-label="Perfil de usuario"
        >
          <div className="hidden text-right sm:block">
            <p className="text-[11px] font-medium text-c-text">JP</p>
            <p className="text-[10px] text-c-muted">Plan Pro</p>
          </div>
          <UserCircle2 className="h-[20px] w-[20px] text-c-muted" />
        </button>
      </div>
    </header>
  );
});
