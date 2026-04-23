"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CHART_BAR_COLORS = ["#4f7cff", "#2dd4aa", "#a78bfa", "#fbbf24", "#ef4444", "#ec4899", "#f97316", "#06b6d4"];
import { getSessions, SESSIONS_UPDATED_EVENT } from "@/lib/storage";
import { ANALYTICS_UPDATED_EVENT, getQuizAttempts, getFlashcardAttempts } from "@/lib/analytics-storage";
import { StudySession, QuizAttempt, FlashcardAttempt } from "@/lib/types";

const COLORS = ["#4f7cff", "#2dd4aa", "#a78bfa", "#fbbf24", "#ef4444", "#ec4899"];

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDark;
}

export function AnalyticsDashboard() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [flashcardAttempts, setFlashcardAttempts] = useState<FlashcardAttempt[]>([]);
  const [mounted, setMounted] = useState(false);
  const isDark = useDarkMode();

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
      } catch (e) {
        console.error('[Analytics] Failed to load analytics data:', e);
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

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const sessionsByDay = last7Days.map((date) => ({
    date: new Date(date).toLocaleDateString("es-AR", { weekday: "short", day: "numeric" }),
    sesiones: sessions.filter((s) => s.createdAt.startsWith(date)).length,
    repasos: flashcardAttempts.filter((attempt) => attempt.timestamp.startsWith(date)).length,
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

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.stats.estimatedDurationMinutes, 0);
  const totalWords = sessions.reduce((sum, s) => sum + s.stats.wordCount, 0);
  const avgQuizScore = quizAttempts.length > 0
    ? Math.round((quizAttempts.reduce((sum, a) => sum + (a.correct / a.total), 0) / quizAttempts.length) * 100)
    : 0;
  const totalReviews = flashcardAttempts.reduce((sum, attempt) => sum + attempt.reviewed, 0);

  const conceptFreq = new Map<string, number>();
  sessions.forEach((s) => {
    s.keyConcepts.forEach((c) => {
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

  function chartPlaceholder(hint?: string) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-panel border border-dashed border-c-border bg-c-surface px-4 text-center">
        <p className="text-[12px] text-c-muted">Aún no hay suficientes datos</p>
        {hint && <p className="mt-1 text-[12px] text-c-muted">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-panel border border-c-border bg-c-surface p-5">
        <div className="space-y-1">
          <h2 className="text-[14px] font-semibold text-c-text">Estadísticas</h2>
          <p className="text-[12px] text-c-muted">
            Visualiza tu progreso, rendimiento y patrones de estudio con un dashboard alineado al nuevo workspace.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card bg-c-surface-2 p-3">
          <p className="text-[10px] uppercase tracking-wide text-c-muted">Sesiones</p>
          <p className="text-[20px] font-semibold text-c-text">{totalSessions}</p>
        </div>
        <div className="rounded-card bg-c-surface-2 p-3">
          <p className="text-[10px] uppercase tracking-wide text-c-muted">Tiempo de estudio</p>
          <p className="text-[20px] font-semibold text-c-text">{totalMinutes} min</p>
        </div>
        <div className="rounded-card bg-c-surface-2 p-3">
          <p className="text-[10px] uppercase tracking-wide text-c-muted">Precisión en quiz</p>
          <p className="text-[20px] font-semibold text-c-text">{avgQuizScore}%</p>
        </div>
        <div className="rounded-card bg-c-surface-2 p-3">
          <p className="text-[10px] uppercase tracking-wide text-c-muted">Cards repasadas</p>
          <p className="text-[20px] font-semibold text-c-text">{totalReviews}</p>
          <p className="text-[10px] text-c-muted">{totalWords.toLocaleString()} palabras procesadas</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-panel border border-c-border bg-c-surface p-4">
          <h2 className="text-[14px] font-semibold text-c-text">Sesiones y repasos · últimos 7 días</h2>
          <div className="mt-4 h-64">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sessionsByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0f172a" : "#ffffff",
                      border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                      borderRadius: "12px",
                    }}
                    labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
                    itemStyle={{ color: isDark ? "#cbd5e1" : "#475569" }}
                  />
                  <Area type="monotone" dataKey="sesiones" stroke="#4f7cff" fill="#e0e8ff" strokeWidth={2} />
                  <Area type="monotone" dataKey="repasos" stroke="#2dd4aa" fill="#d0f5ee" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              chartPlaceholder("Creá sesiones para ver tu actividad semanal.")
            )}
          </div>
        </div>

        <div className="rounded-panel border border-c-border bg-c-surface p-4">
          <h2 className="text-[14px] font-semibold text-c-text">Distribución por materia</h2>
          <div className="mt-4 h-64">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sessionsByCourse}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sessionsByCourse.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0f172a" : "#ffffff",
                      border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                      borderRadius: "12px",
                    }}
                    labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
                    itemStyle={{ color: isDark ? "#cbd5e1" : "#475569" }}
                    formatter={(value, name) => [`${value} sesión(es)`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              chartPlaceholder("Agregá el nombre de la materia al crear sesiones.")
            )}
          </div>
        </div>

        {recentQuizAttempts.length > 0 && (
          <div className="rounded-panel border border-c-border bg-c-surface p-4">
            <h2 className="text-[14px] font-semibold text-c-text">Evolución de quiz</h2>
            <div className="mt-4 h-64">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={recentQuizAttempts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="intento" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                        borderRadius: "12px",
                      }}
                      labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
                      itemStyle={{ color: isDark ? "#cbd5e1" : "#475569" }}
                    />
                    <Area type="monotone" dataKey="porcentaje" stroke="#4f7cff" fill="#e0e8ff" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                chartPlaceholder("Completá quizzes para ver tu evolución.")
              )}
            </div>
          </div>
        )}

        {topConcepts.length > 0 && (
          <div className="rounded-panel border border-c-border bg-c-surface p-4">
            <h2 className="text-[14px] font-semibold text-c-text">Conceptos más frecuentes</h2>
            <div className="mt-4 h-64">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topConcepts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                    <YAxis dataKey="term" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                        borderRadius: "12px",
                      }}
                      labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
                      itemStyle={{ color: isDark ? "#cbd5e1" : "#475569" }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {topConcepts.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_BAR_COLORS[index % CHART_BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                chartPlaceholder("Los conceptos aparecen a medida que creás sesiones.")
              )}
            </div>
          </div>
        )}

        {studyMix.length > 0 && (
          <div className="rounded-panel border border-c-border bg-c-surface p-4">
            <h2 className="text-[14px] font-semibold text-c-text">Mix de estudio</h2>
            <div className="mt-4 h-64">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={studyMix} cx="50%" cy="50%" innerRadius={52} outerRadius={84} dataKey="value">
                      {studyMix.map((_, index) => (
                        <Cell key={`mix-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                        borderRadius: "12px",
                      }}
                      labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
                      itemStyle={{ color: isDark ? "#cbd5e1" : "#475569" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                chartPlaceholder("Probá quizzes y flashcards para ver tu mix de estudio.")
              )}
            </div>
          </div>
        )}
      </div>

      {totalSessions === 0 && (
        <div className="rounded-panel border border-dashed border-c-border bg-c-surface p-10 text-center">
          <p className="text-[12px] text-c-muted">Crea sesiones y completa quizzes para ver tus estadísticas.</p>
        </div>
      )}
    </div>
  );
}
