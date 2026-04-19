"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BookOpen, Brain, Clock3, TrendingUp } from "lucide-react";
import { getSessions, SESSIONS_UPDATED_EVENT } from "@/lib/storage";
import { ANALYTICS_UPDATED_EVENT, getQuizAttempts, getFlashcardAttempts } from "@/lib/analytics-storage";
import { StudySession, QuizAttempt, FlashcardAttempt } from "@/lib/types";

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

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
      <div className="flex h-64 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 text-center dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">Aún no hay suficientes datos</p>
        {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Estadísticas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Visualiza tu progreso, rendimiento y patrones de estudio con un dashboard alineado al nuevo workspace.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-lift dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-900/30">
              <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Sesiones</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-lift dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-900/30">
              <Clock3 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Tiempo de estudio</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{totalMinutes} min</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-lift dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Precisión en quiz</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{avgQuizScore}%</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-lift dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/30">
              <Brain className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Cards repasadas</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{totalReviews}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{totalWords.toLocaleString()} palabras procesadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">Sesiones y repasos · últimos 7 días</h2>
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
                  <Area type="monotone" dataKey="sesiones" stroke="#8b5cf6" fill="#ede9fe" strokeWidth={2} />
                  <Area type="monotone" dataKey="repasos" stroke="#06b6d4" fill="#cffafe" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              chartPlaceholder("Creá sesiones para ver tu actividad semanal.")
            )}
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">Distribución por materia</h2>
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
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">Evolución de quiz</h2>
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
                    <Area type="monotone" dataKey="porcentaje" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                chartPlaceholder("Completá quizzes para ver tu evolución.")
              )}
            </div>
          </div>
        )}

        {topConcepts.length > 0 && (
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">Conceptos más frecuentes</h2>
            <div className="mt-4 h-64">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topConcepts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                    <YAxis dataKey="term" type="category" stroke="#94a3b8" fontSize={12} width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                        borderRadius: "12px",
                      }}
                      labelStyle={{ color: isDark ? "#f1f5f9" : "#0f172a" }}
                      itemStyle={{ color: isDark ? "#cbd5e1" : "#475569" }}
                    />
                    <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                chartPlaceholder("Los conceptos aparecen a medida que creás sesiones.")
              )}
            </div>
          </div>
        )}

        {studyMix.length > 0 && (
          <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">Mix de estudio</h2>
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
        <div className="rounded-[30px] border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Crea sesiones y completa quizzes para ver tus estadísticas.</p>
        </div>
      )}
    </div>
  );
}
