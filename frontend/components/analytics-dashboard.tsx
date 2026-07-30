"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { useFadeInStagger } from "@/src/shared/hooks/useAnimations";
import { getSessions, SESSIONS_UPDATED_EVENT } from "@/lib/storage";
import { ANALYTICS_UPDATED_EVENT, getQuizAttempts, getFlashcardAttempts } from "@/lib/analytics-storage";
import type { StudySession, QuizAttempt, FlashcardAttempt } from "@/lib/types";

/**
 * Lazy-loaded Recharts panel — renders all analytics charts.
 *
 * The ~130 kB Recharts bundle is split into a separate chunk via
 * {@link next/dynamic} with `ssr: false`, so it only loads when the
 * analytics page is actually visited.
 */
const AnalyticsCharts = dynamic(
  () => import("@/components/analytics-charts").then((mod) => mod.AnalyticsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-80 items-center justify-center rounded-panel border border-c-border bg-c-surface">
        <span className="text-[12px] text-c-muted">Cargando gráficos...</span>
      </div>
    ),
  }
);

/**
 * Analytics dashboard — visualizes study progress, performance, and patterns.
 *
 * Shows stat cards (sessions, time, quiz score, flashcards reviewed) and
 * up to 5 Recharts charts via the lazily-loaded {@link AnalyticsCharts}.
 *
 * All entry animations use {@link useFadeInStagger} with scale+fade+ease-smooth.
 *
 * Adapted for mobile: charts stack vertically, grid collapses to single column.
 */
export function AnalyticsDashboard() {
  const headerRef = useRef<HTMLDivElement>(null);
  const statCardsRef = useRef<HTMLDListElement>(null);

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [flashcardAttempts, setFlashcardAttempts] = useState<FlashcardAttempt[]>([]);
  const [mounted, setMounted] = useState(false);

  useFadeInStagger(headerRef, ".analytics-header", { y: 16, stagger: 0.06, duration: 0.5, scale: 0.96, ease: "smooth" });
  useFadeInStagger(statCardsRef, ".analytics-stat", { y: 12, stagger: 0.05, duration: 0.4, delay: 0.2, scale: 0.96, ease: "smooth" });

  useEffect(() => {
    function syncAnalytics() {
      try {
        const sessions = getSessions();
        const quizAttempts = getQuizAttempts();
        const flashcardAttempts = getFlashcardAttempts();
        setSessions(sessions);
        setQuizAttempts(quizAttempts);
        setFlashcardAttempts(flashcardAttempts);
        setMounted(true);
      } catch {
        setSessions([]);
        setQuizAttempts([]);
        setFlashcardAttempts([]);
        setMounted(true);
      }
    }

    syncAnalytics();
    window.addEventListener(SESSIONS_UPDATED_EVENT, syncAnalytics);
    window.addEventListener(ANALYTICS_UPDATED_EVENT, syncAnalytics);
    return () => {
      window.removeEventListener(SESSIONS_UPDATED_EVENT, syncAnalytics);
      window.removeEventListener(ANALYTICS_UPDATED_EVENT, syncAnalytics);
    };
  }, []);

  // ── Derived data for stat cards ───────────────────────────────
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.stats?.estimatedDurationMinutes ?? 0), 0);
  const totalWords = sessions.reduce((sum, s) => sum + (s.stats?.wordCount ?? 0), 0);
  const avgQuizScore = quizAttempts.length > 0
    ? Math.round((quizAttempts.reduce((sum, a) => sum + ((a.correct ?? 0) / (a.total || 1)), 0) / quizAttempts.length) * 100)
    : 0;
  const totalReviews = flashcardAttempts.reduce((sum, attempt) => sum + (attempt.reviewed ?? 0), 0);

  // ── Derived data for charts (passed to AnalyticsCharts) ───────
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const sessionsByDay = last7Days.map((date) => ({
    date: new Date(date).toLocaleDateString("es-AR", { weekday: "short", day: "numeric" }),
    sesiones: sessions.filter((s) => s.createdAt?.startsWith(date)).length,
    repasos: flashcardAttempts.filter((attempt) => attempt.timestamp?.startsWith(date)).length,
  }));

  const courseMap = new Map<string, number>();
  sessions.forEach((s) => {
    const course = s.course || "Sin materia";
    courseMap.set(course, (courseMap.get(course) || 0) + 1);
  });
  const sessionsByCourse = Array.from(courseMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const recentQuizAttempts = quizAttempts.slice(-10).map((a, i) => ({
    intento: i + 1,
    porcentaje: Math.round((a.correct / a.total) * 100),
  }));

  const conceptFreq = new Map<string, number>();
  sessions.forEach((s) => {
    (s.keyConcepts ?? []).forEach((c) => {
      conceptFreq.set(c.term, (conceptFreq.get(c.term) || 0) + 1);
    });
  });
  const topConcepts = Array.from(conceptFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([term, count]) => ({ term, count }));

  const studyMix = [
    { name: "Intentos de quiz", value: quizAttempts.length },
    { name: "Repasos de flashcards", value: flashcardAttempts.length },
    { name: "Sesiones creadas", value: sessions.length },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-4">
      <div ref={headerRef} className="rounded-panel border border-c-border bg-c-surface p-5">
        <div className="space-y-1">
          <h2 className="analytics-header text-[14px] font-semibold text-c-text">Estadísticas</h2>
          <p className="analytics-header text-[12px] text-c-muted">
            Visualiza tu progreso, rendimiento y patrones de estudio con un dashboard alineado al nuevo workspace.
          </p>
        </div>
      </div>

      <dl ref={statCardsRef} className="grid gap-4 grid-cols-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="analytics-stat rounded-card bg-c-surface-2 p-3 card-interactive flex flex-col justify-between">
          <dt className="text-[10px] uppercase tracking-wide text-c-muted">Sesiones</dt>
          <dd className="m-0 text-[20px] font-semibold text-c-text">{totalSessions}</dd>
        </div>
        <div className="analytics-stat rounded-card bg-c-surface-2 p-3 card-interactive flex flex-col justify-between">
          <dt className="text-[10px] uppercase tracking-wide text-c-muted">Tiempo</dt>
          <dd className="m-0 text-[20px] font-semibold text-c-text">{totalMinutes} min</dd>
        </div>
        <div className="analytics-stat rounded-card bg-c-surface-2 p-3 card-interactive flex flex-col justify-between">
          <dt className="text-[10px] uppercase tracking-wide text-c-muted">Quiz</dt>
          <dd className="m-0 text-[20px] font-semibold text-c-text">{avgQuizScore}%</dd>
        </div>
        <div className="analytics-stat rounded-card bg-c-surface-2 p-3 card-interactive flex flex-col justify-between">
          <dt className="text-[10px] uppercase tracking-wide text-c-muted">Cards</dt>
          <dd className="m-0 text-[20px] font-semibold text-c-text">{totalReviews}</dd>
          <p className="text-[9px] text-c-muted leading-tight">{totalWords.toLocaleString()} palabras</p>
        </div>
      </dl>

      {mounted && (
        <AnalyticsCharts
          sessions={sessions}
          quizAttempts={quizAttempts}
          flashcardAttempts={flashcardAttempts}
          sessionsByDay={sessionsByDay}
          sessionsByCourse={sessionsByCourse}
          recentQuizAttempts={recentQuizAttempts}
          topConcepts={topConcepts}
          studyMix={studyMix}
          totalSessions={totalSessions}
        />
      )}
    </div>
  );
}
