"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useFadeInStagger } from "@/src/shared/hooks/useAnimations";
import {
  ArrowRight,
  Mic,
  Sparkles,
  Upload,
} from "lucide-react";

gsap.registerPlugin(useGSAP);
import { ANALYTICS_UPDATED_EVENT, getFlashcardAttempts, getQuizAttempts } from "@/lib/analytics-storage";
import { getSessions, patchSession, SESSIONS_UPDATED_EVENT } from "@/lib/storage";
import { StudySession } from "@/lib/types";
import { FREE_PLAN_MINUTES } from "@/lib/constants";
import { AudioRecorderWidget } from "@/components/audio-recorder-widget";
import { SessionComposerCard } from "@/components/session-composer-card";
import { SessionRecordsTable } from "@/components/session-records-table";

type ComposerMode = "upload" | "record" | "online" | "url" | "screen";
type RecordFilter = "recent" | "starred" | "created";

const QUICK_ACTIONS: Array<{
  mode: ComposerMode;
  label: string;
  sublabel: string;
  icon: typeof Upload;
  primary: boolean;
}> = [
  { mode: "record", label: "Grabar audio", sublabel: "Mic del dispositivo", icon: Mic, primary: false },
  { mode: "upload", label: "Subir y transcribir", sublabel: "MP3, MP4, WAV…", icon: Upload, primary: true },
];

const RECORD_FILTERS: { key: RecordFilter; label: string }[] = [
  { key: "recent", label: "Recientes" },
  { key: "starred", label: "Destacadas" },
  { key: "created", label: "Hoy" },
];

function greetingByHour() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

export function DashboardHome() {
  const heroRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [quizAttemptsCount, setQuizAttemptsCount] = useState(0);
  const [flashcardAttemptsCount, setFlashcardAttemptsCount] = useState(0);
  const [flashcardsReviewed, setFlashcardsReviewed] = useState(0);
  const [composerMode, setComposerMode] = useState<ComposerMode>("upload");
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("recent");

  useFadeInStagger(heroRef, ".anim-item", { y: 20, duration: 0.8 });
  useFadeInStagger(quickActionsRef, "button", { y: 15, stagger: 0.08, duration: 0.5, delay: 0.3 });

  useEffect(() => {
    function syncDashboard() {
      const sessions = getSessions();
      const quizAttempts = getQuizAttempts();
      const flashcardAttempts = getFlashcardAttempts();

      setSessions(sessions);
      setQuizAttemptsCount(quizAttempts.length);
      setFlashcardAttemptsCount(flashcardAttempts.length);
      setFlashcardsReviewed(flashcardAttempts.reduce((sum, attempt) => sum + attempt.reviewed, 0));
    }

    syncDashboard();
    window.addEventListener(SESSIONS_UPDATED_EVENT, syncDashboard);
    window.addEventListener(ANALYTICS_UPDATED_EVENT, syncDashboard);
    return () => {
      window.removeEventListener(SESSIONS_UPDATED_EVENT, syncDashboard);
      window.removeEventListener(ANALYTICS_UPDATED_EVENT, syncDashboard);
    };
  }, []);

  const filteredSessions = useMemo(() => {
    if (recordFilter === "starred") return sessions.filter((session) => session.starred);
    if (recordFilter === "created") {
      const todayPrefix = new Date().toISOString().split("T")[0];
      return sessions.filter((session) => session.createdAt.startsWith(todayPrefix));
    }
    return sessions;
  }, [recordFilter, sessions]);

  const totalMinutes = sessions.reduce((sum, session) => sum + session.stats.estimatedDurationMinutes, 0);
  const minutesUsed = Math.min(FREE_PLAN_MINUTES, totalMinutes);
  const streak = Math.min(7, Math.max(1, Math.ceil(sessions.length / 2)));
  const latestSession = sessions[0];

  const refreshSessions = useCallback(() => {
    setSessions(getSessions());
  }, []);

  const toggleStar = useCallback((sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    patchSession(sessionId, { ...session, starred: !session.starred });
    refreshSessions();
  }, [sessions, refreshSessions]);

  return (
    <div className="space-y-4">
      {/* HERO */}
      <section ref={heroRef} className="rounded-panel border border-c-border bg-c-surface p-5">
        <p className="anim-item text-[22px] font-semibold text-c-text">{greetingByHour()}</p>
        <p className="anim-item mt-1 text-[12px] text-c-muted">Convirtamos la clase de hoy en material de estudio.</p>
        <div ref={quickActionsRef} className="mt-4 grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.mode}
                onClick={() => setComposerMode(action.mode)}
                className={`flex cursor-pointer items-center gap-3 rounded-card border p-3 text-left transition-colors hover:border-c-blue-border focus-visible:outline-none ${
                  action.primary ? "border-c-blue-border bg-c-blue-soft" : "border-c-border bg-c-surface-2"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-btn bg-c-surface-2">
                  <Icon className="h-[15px] w-[15px] text-c-blue" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-c-text">{action.label}</p>
                  <p className="truncate text-[10px] text-c-muted">{action.sublabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {composerMode === "record" && <AudioRecorderWidget />}
      {composerMode === "upload" && <SessionComposerCard mode={composerMode} onCreated={refreshSessions} />}

      {/* 2-COLUMN GRID */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        {/* LEFT */}
        <div className="space-y-4">
          <section className="rounded-panel border border-c-border bg-c-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-c-text">Resumen de actividad</p>
              <Link href="/analytics" className="text-[11px] text-c-muted transition-colors hover:text-c-text">Ver todo</Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-card bg-c-surface-2 p-3">
                <p className="text-[20px] font-semibold text-c-blue">{sessions.length}</p>
                <p className="text-[10px] text-c-muted">Sesiones</p>
              </div>
              <div className="rounded-card bg-c-surface-2 p-3">
                <p className="text-[20px] font-semibold text-c-teal">{flashcardsReviewed}</p>
                <p className="text-[10px] text-c-muted">Flashcards</p>
              </div>
              <div className="rounded-card bg-c-surface-2 p-3">
                <p className="text-[20px] font-semibold text-c-violet">{quizAttemptsCount}</p>
                <p className="text-[10px] text-c-muted">Quizzes</p>
              </div>
            </div>
            <div className="mt-3 rounded-card border border-c-amber/20 bg-c-amber-soft p-3">
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-bold text-c-amber">🔥 {streak}</span>
                <div>
                  <p className="text-[12px] font-medium text-c-text">Días seguidos</p>
                  <p className="text-[10px] text-c-muted">Racha de estudio</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-panel border border-c-border bg-c-surface p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-c-border pb-3">
              <p className="text-[12px] font-medium text-c-text">Mis sesiones</p>
              <div className="flex flex-wrap gap-2">
                {RECORD_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setRecordFilter(f.key)}
                    className={`rounded-pill px-3 py-1 text-[11px] transition-colors focus-visible:outline-none ${
                      recordFilter === f.key
                        ? "border border-c-blue-border bg-c-blue-soft text-c-blue"
                        : "border border-c-border text-c-muted hover:bg-c-surface-2"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <SessionRecordsTable
              sessions={filteredSessions}
              emptyTitle="Sin sesiones aún"
              emptyDescription="Creá tu primera sesión desde las acciones rápidas de arriba."
              onToggleStar={toggleStar}
            />
          </section>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <section className="rounded-panel border border-c-border bg-c-surface p-4">
            <div className="inline-flex items-center gap-[5px] rounded-pill border border-c-blue-border bg-c-blue-soft px-2 py-1 text-[10px] text-c-blue">
              <Sparkles className="h-3 w-3" />
              Stude IA
            </div>
            <h3 className="mt-3 text-[14px] font-semibold text-c-text">Preguntale a la IA sobre tu última clase</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-c-muted">
              {latestSession
                ? `Abrí "${latestSession.title}" y pedí resumen, prep para examen o flashcards.`
                : "Creá una sesión y Stude va a resumir, organizar y ayudarte a repasar."}
            </p>
            <Link
              href={latestSession ? `/sessions/${latestSession.id}` : "/dashboard"}
              className="mt-4 inline-flex items-center gap-2 rounded-btn bg-c-blue px-3 py-2 text-[12px] font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none"
            >
              Explorar Stude
              <ArrowRight className="h-[13px] w-[13px]" />
            </Link>
          </section>

          <section className="rounded-panel border border-c-border bg-c-surface p-4">
            <p className="text-[11px] font-medium text-c-text">Plan gratuito</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[20px] font-semibold text-c-text">{minutesUsed}</span>
              <span className="text-[12px] text-c-muted">/ {FREE_PLAN_MINUTES} min</span>
            </div>
            <div className="mt-3 h-[4px] rounded-full bg-c-surface-2">
              <div className="h-full rounded-full bg-c-blue" style={{ width: `${Math.min(100, (minutesUsed / FREE_PLAN_MINUTES) * 100)}%` }} />
            </div>
            <p className="mt-3 text-[10px] text-c-muted">
              {quizAttemptsCount} intentos de quiz · {flashcardsReviewed} flashcards repasadas.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
