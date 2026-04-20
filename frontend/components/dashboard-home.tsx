"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useFadeInStagger } from "@/src/shared/hooks/useAnimations";
import {
  ArrowRight,
  CheckCircle2,
  FileAudio2,
  Link2,
  Mic,
  ScreenShare,
  Sparkles,
  Upload,
  Video,
} from "lucide-react";
import { StudereLogo } from "@/components/studere-logo";

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
  icon: typeof Upload;
  color: string;
}> = [
  { mode: "record", label: "Grabar audio", icon: Mic, color: "text-sky-600 bg-sky-50 border-sky-100" },
  { mode: "upload", label: "Subir y transcribir", icon: Upload, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  { mode: "online", label: "Clase en vivo", icon: Video, color: "text-rose-600 bg-rose-50 border-rose-100" },
];

function greetingByHour() {
  const hour = new Date().getHours();
  if (hour < 6) return "Es muy tarde, andá a descansar.";
  if (hour < 12) return "Buenos días. ¿Listo para capturar la clase de hoy?";
  if (hour < 19) return "Buenas tardes. Convirtamos la clase en material de estudio.";
  return "Buenas noches. Momento perfecto para organizar lo que aprendiste hoy.";
}

export function DashboardHome() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [quizAttemptsCount, setQuizAttemptsCount] = useState(0);
  const [flashcardAttemptsCount, setFlashcardAttemptsCount] = useState(0);
  const [flashcardsReviewed, setFlashcardsReviewed] = useState(0);
  const [composerMode, setComposerMode] = useState<ComposerMode>("upload");
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("recent");

  useFadeInStagger(heroRef, '.anim-item', { y: 20, duration: 0.8 });
  useFadeInStagger(quickActionsRef, 'button', { y: 15, stagger: 0.08, duration: 0.5, delay: 0.3 });

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
  const onboardingTasks = [
    { label: "Configurá tu workspace", done: true },
    { label: "Creá tu primera transcripción", done: sessions.length > 0 },
    { label: "Repasá con flashcards o quiz", done: quizAttemptsCount > 0 || flashcardAttemptsCount > 0 },
  ];

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
    <div ref={containerRef} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <section ref={heroRef} className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:from-violet-950/30 dark:via-slate-900 dark:to-fuchsia-950/20 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div className="anim-item flex items-center gap-2.5">
            <StudereLogo className="h-9 w-9" />
            <h1 className="bg-gradient-to-r from-violet-700 via-fuchsia-600 to-violet-700 bg-clip-text text-3xl font-bold text-transparent dark:from-violet-400 dark:via-fuchsia-400 dark:to-violet-400">
              Studere
            </h1>
          </div>
          <p className="anim-item mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Tu copiloto para convertir clases en aprendizaje activo. Transcribe, resume y crea flashcards al instante.</p>

          <h2 className="anim-item mb-4 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Inicio rápido</h2>
          <div ref={quickActionsRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              const active = composerMode === action.mode;

              return (
                <button
                  key={action.mode}
                  onClick={() => setComposerMode(action.mode)}
                  className={`rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                    active
                      ? "border-violet-200 bg-violet-50 shadow-sm ring-1 ring-violet-100 dark:border-violet-700 dark:bg-violet-900/30 dark:ring-violet-800"
                      : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50 hover:-translate-y-0.5 hover:shadow-card dark:border-slate-700 dark:bg-slate-800 dark:hover:border-violet-700 dark:hover:bg-violet-900/20"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${action.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-4 text-sm font-semibold min-h-[2.5rem] flex items-center text-slate-900 dark:text-slate-200">{action.label}</p>
                </button>
              );
            })}
          </div>
        </section>

        {composerMode === "record" && <AudioRecorderWidget />}
        {(composerMode === "upload" || composerMode === "online") && (
          <SessionComposerCard mode={composerMode} onCreated={refreshSessions} />
        )}

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between dark:border-slate-700">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Mis sesiones</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Todo tu historial de estudio, con acceso rápido a las sesiones recientes y destacadas.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "recent", label: "Recientes" },
                { key: "starred", label: "Destacadas" },
                { key: "created", label: "Hoy" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setRecordFilter(filter.key as RecordFilter)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 ${
                    recordFilter === filter.key
                      ? "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <SessionRecordsTable
              sessions={filteredSessions}
              emptyTitle="Sin sesiones aún"
              emptyDescription="Creá tu primera sesión desde las acciones rápidas de arriba para empezar a armar tu workspace de estudio."
              onToggleStar={toggleStar}
            />
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tus sesiones</h2>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {onboardingTasks.filter((task) => task.done).length}/{onboardingTasks.length}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {onboardingTasks.map((task) => (
              <div key={task.label} className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${task.done ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400" : "border border-slate-200 bg-white text-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-600"}`}>
                  {task.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
                </div>
                <p className={`text-sm ${task.done ? "text-slate-700 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>{task.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-violet-100 bg-gradient-to-br from-fuchsia-50 via-violet-50 to-sky-50 p-5 shadow-[0_20px_60px_rgba(139,92,246,0.10)] dark:border-violet-800 dark:from-fuchsia-950/40 dark:via-violet-950/40 dark:to-sky-950/30">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-white/10 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            Stude
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Preguntale a la IA sobre tu última clase</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {latestSession
              ? `Abrí "${latestSession.title}" y pedí resumen, prep para examen o flashcards.`
              : "Creá una sesión y Stude va a resumir, organizar y ayudarte a repasar."}
          </p>
          <Link
            href={latestSession ? `/sessions/${latestSession.id}` : "/dashboard"}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:bg-slate-800 dark:text-violet-300 dark:hover:bg-slate-700"
          >
            Explorar Stude
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Gratis</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{minutesUsed} min</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">de {FREE_PLAN_MINUTES} min usados</p>
          <div className="mt-4 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${Math.min(100, (minutesUsed / FREE_PLAN_MINUTES) * 100)}%` }} />
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-400 dark:text-slate-500">
            {quizAttemptsCount} intentos de quiz · {flashcardsReviewed} flashcards repasadas.
          </p>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Eventos de hoy (0)</h2>
            <Link href="/upcoming" className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition dark:text-sky-400 dark:hover:text-sky-300">
              Ver todos
            </Link>
          </div>
          <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
              <FileAudio2 className="h-5 w-5" />
            </div>
            <h4 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-100">Grabá tus clases del calendario</h4>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Conectá tu calendario para detectar clases, grupos de estudio y repasos.</p>
            <div className="mt-4 grid gap-2">
              <Link href="/integrations" className="block rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                Conectar Google Calendar
              </Link>
              <Link href="/integrations" className="block rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                Conectar Outlook
              </Link>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
