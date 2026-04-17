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
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/90">
      <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-3">
          <label className="relative flex min-w-0 flex-1 items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar..."
              className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-16 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
            />
            <span className="pointer-events-none absolute right-3 hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-flex dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500">
              Ctrl K
            </span>
          </label>
        </form>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            Stude
          </div>
          <button className="inline-flex h-9 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-700 transition-all duration-200 hover:border-amber-300 hover:bg-amber-100 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50">
            <Crown className="h-3.5 w-3.5" />
            Iniciar prueba
          </button>
        </div>

        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all duration-150 hover:bg-slate-50 hover:text-slate-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label="Cambiar tema"
        >
          {dark === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-all duration-150 hover:bg-slate-50 hover:text-slate-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1.5 transition-all duration-150 hover:bg-slate-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          aria-label="Perfil de usuario"
        >
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">JP</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Plan Pro</p>
          </div>
          <UserCircle2 className="h-7 w-7 text-slate-400" />
        </button>
      </div>
    </header>
  );
});
