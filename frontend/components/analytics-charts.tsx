"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { StudySession, QuizAttempt, FlashcardAttempt } from "@/lib/types";
import { EChartsQuizPilot } from "@/components/echarts-quiz-pilot";
import { EChartsSessionsPilot } from "@/components/echarts-sessions-pilot";

// ── Theme-aware chart palette ──────────────────────────────────────────────
const PALETTE = [
  { stroke: "var(--c-blue)", fill: "var(--c-blue-soft)" },
  { stroke: "var(--c-teal)", fill: "var(--c-teal-soft)" },
  { stroke: "var(--c-violet)", fill: "var(--c-violet-soft)" },
  { stroke: "var(--c-amber)", fill: "var(--c-amber-soft)" },
  { stroke: "var(--c-red)", fill: "var(--c-red-soft)" },
];

const CHART_ANIM_DURATION = 600;

// Recharts Pie types are strict with activeShape; use relaxed alias
const PieAny = Pie as any;

/**
 * Explode sector for pie charts — lifts + shadows on hover.
 */
function ExplodeSector({ filterId, ...sectorProps }: any) {
  const BOOST = 6;
  return (
    <g>
      <Sector
        {...sectorProps}
        outerRadius={sectorProps.outerRadius + BOOST}
        filter={filterId ? `url(#${filterId})` : undefined}
      />
    </g>
  );
}

/** Props for {@link AnalyticsCharts}. */
export interface AnalyticsChartsProps {
  sessions: StudySession[];
  quizAttempts: QuizAttempt[];
  flashcardAttempts: FlashcardAttempt[];
  sessionsByDay: { date: string; sesiones: number; repasos: number }[];
  sessionsByCourse: { name: string; value: number }[];
  recentQuizAttempts: { intento: number; porcentaje: number }[];
  topConcepts: { term: string; count: number }[];
  studyMix: { name: string; value: number }[];
  totalSessions: number;
}

// ── Reusable chart card wrapper ────────────────────────────────────────────

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-panel border border-c-border bg-c-surface p-5 ${className}`}>
      <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-c-muted">
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Placeholder shown when a chart has no data yet. */
function ChartPlaceholder({ hint }: { hint?: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-c-border bg-c-surface-2/50 px-4 text-center">
      <svg className="mb-3 h-10 w-10 text-c-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
      <p className="text-[12px] text-c-muted">Aún no hay suficientes datos</p>
      {hint && <p className="mt-1 text-[11px] text-c-muted">{hint}</p>}
    </div>
  );
}

/**
 * Lazy-loaded Recharts panel — renders all analytics charts.
 */
export function AnalyticsCharts({
  sessions,
  quizAttempts,
  flashcardAttempts,
  sessionsByDay,
  sessionsByCourse,
  recentQuizAttempts,
  topConcepts,
  studyMix,
  totalSessions,
}: AnalyticsChartsProps) {
  const [activeCourseIndex, setActiveCourseIndex] = useState(-1);
  const [activeMixIndex, setActiveMixIndex] = useState(-1);

  if (totalSessions === 0) {
    return (
      <ChartCard title="Actividad">
        <ChartPlaceholder hint="Creá sesiones y completá quizzes para ver tus estadísticas." />
      </ChartCard>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {/* ── 1. Sessions & reviews (ECharts) ──────────────────────── */}
      <ChartCard title="Sesiones y repasos · últimos 7 días">
        <div
          className="h-56 sm:h-64"
          role="img"
          aria-label="Gráfico de sesiones y repasos en los últimos 7 días"
        >
          {sessionsByDay.some((d) => d.sesiones > 0 || d.repasos > 0) ? (
            <EChartsSessionsPilot data={sessionsByDay} />
          ) : (
            <ChartPlaceholder hint="Creá sesiones para ver tu actividad semanal." />
          )}
        </div>
      </ChartCard>

        {/* ── 2. Course distribution ─────────────────────────────── */}
        <ChartCard title="Distribución por materia">
          <div className="h-56 sm:h-64" role="img" aria-label="Gráfico circular de distribución de sesiones por materia">
            {sessionsByCourse.length > 0 ? (
              <div className="relative h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="pie-glow-course">
                        <feDropShadow dx={0} dy={2} stdDeviation={6} floodColor="rgba(0,0,0,0.2)" />
                      </filter>
                    </defs>
                    <PieAny
                      data={sessionsByCourse}
                      cx="50%" cy="50%"
                      innerRadius={52}
                      outerRadius={84}
                      paddingAngle={2}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={CHART_ANIM_DURATION}
                      animationEasing="ease-out"
                      stroke="var(--c-surface)"
                      strokeWidth={2}
                      activeIndex={activeCourseIndex}
                      activeShape={<ExplodeSector filterId="pie-glow-course" />}
                    >
                      {sessionsByCourse.map((entry, index) => (
                        <Cell
                          key={`course-${index}`}
                          fill={PALETTE[index % PALETTE.length].stroke}
                          stroke="var(--c-surface)"
                          strokeWidth={2}
                          onMouseEnter={() => setActiveCourseIndex(index)}
                          onMouseLeave={() => setActiveCourseIndex(-1)}
                        />
                      ))}
                    </PieAny>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "var(--c-muted)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label as HTML overlay to avoid SVG clipping */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ marginTop: '-12px' }}>
                  <div className="flex flex-col items-center">
                    <span className="text-[24px] font-bold leading-none" style={{ color: 'var(--c-text)' }}>
                      {sessions.length}
                    </span>
                    <span className="mt-1 text-[10px] leading-tight" style={{ color: 'var(--c-muted)' }}>
                      sesiones
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <ChartPlaceholder hint="Agregá el nombre de la materia al crear sesiones." />
            )}
          </div>
        </ChartCard>

        {/* ── 3. Quiz evolution (ECharts pilot) ──────────────────── */}
        {recentQuizAttempts.length > 0 && (
          <ChartCard title="Evolución de quiz">
            <div
              className="h-56 sm:h-64"
              role="img"
              aria-label="Gráfico de evolución de resultados en quizzes"
            >
              <EChartsQuizPilot data={recentQuizAttempts} />
            </div>
          </ChartCard>
        )}

        {/* ── 4. Top concepts ────────────────────────────────────── */}
        {topConcepts.length > 0 && (
          <ChartCard title="Conceptos más frecuentes">
            <div className="h-56 sm:h-64" role="img" aria-label="Gráfico de barras de conceptos más frecuentes">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topConcepts} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--c-muted)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis dataKey="term" type="category" stroke="var(--c-muted)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}                  isAnimationActive={true} animationDuration={CHART_ANIM_DURATION} animationEasing="ease-out" maxBarSize={20}>
                    {topConcepts.map((_, index) => (
                      <Cell key={`concept-${index}`} fill={PALETTE[index % PALETTE.length].stroke} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {/* ── 5. Study mix donut ─────────────────────────────────── */}
        {studyMix.length > 0 && (
          <ChartCard title="Mix de estudio">
            <div className="h-56 sm:h-64" role="img" aria-label="Gráfico circular de mix de estudio">
              <div className="relative h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      <filter id="pie-glow-mix">
                        <feDropShadow dx={0} dy={2} stdDeviation={6} floodColor="rgba(0,0,0,0.2)" />
                      </filter>
                    </defs>
                    <PieAny
                      data={studyMix}
                      cx="50%" cy="50%"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={CHART_ANIM_DURATION}
                      animationEasing="ease-out"
                      activeIndex={activeMixIndex}
                      activeShape={<ExplodeSector filterId="pie-glow-mix" />}
                    >
                      {studyMix.map((_, index) => (
                        <Cell
                          key={`mix-${index}`}
                          fill={PALETTE[index % PALETTE.length].stroke}
                          stroke="var(--c-surface)"
                          strokeWidth={2}
                          onMouseEnter={() => setActiveMixIndex(index)}
                          onMouseLeave={() => setActiveMixIndex(-1)}
                        />
                      ))}
                    </PieAny>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11, paddingTop: 12, color: "var(--c-muted)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label as HTML overlay to avoid SVG clipping */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ marginTop: '-12px' }}>
                  <div className="flex flex-col items-center">
                    <span className="text-[24px] font-bold leading-none" style={{ color: 'var(--c-text)' }}>
                      {studyMix.reduce((s, m) => s + m.value, 0)}
                    </span>
                    <span className="mt-1 text-[10px] leading-tight" style={{ color: 'var(--c-muted)' }}>
                      actividades
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ChartCard>
        )}
      </div>
  );
}

// ── Shared custom tooltip (for bar/pie charts) ─────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        fontSize: 12,
      }}
    >
      <p style={{ margin: 0, fontWeight: 600, color: "var(--c-text)", marginBottom: 4 }}>
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ margin: 0, color: entry.color || "var(--c-muted)", lineHeight: 1.5 }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
}
