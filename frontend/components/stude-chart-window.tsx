"use client";

import { useCallback, useRef, useState } from "react";
import { GripVertical, Maximize2, Minimize2, X } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { StudySession } from "@/lib/types";

type ChartData = {
  type: "bar" | "line" | "pie" | "mindmap";
  description: string;
  reply: string;
};

type StudeChartWindowProps = {
  session: StudySession;
  chartData: ChartData;
  onClose: () => void;
  onElementClick?: (label: string) => void;
  anchorY?: number;
};

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1", "#14b8a6"];
const MIN_W = 360;
const MIN_H = 300;
const DEFAULT_W = 460;
const DEFAULT_H = 380;

function buildChartData(session: StudySession) {
  const conceptData = session.keyConcepts.slice(0, 8).map((c, i) => ({
    name: c.term.length > 18 ? c.term.slice(0, 16) + "…" : c.term,
    fullName: c.term,
    relevance: Math.max(20, 100 - i * 12),
    mentions: Math.max(1, Math.floor(c.description.length / 30)),
  }));
  return conceptData.length > 0
    ? conceptData
    : [{ name: "Sin datos", fullName: "Sin datos", relevance: 0, mentions: 0 }];
}

function MindMapDiagram({ session, onElementClick }: { session: StudySession; onElementClick?: (label: string) => void }) {
  const root = session.mindMap;
  if (!root) {
    return <p className="p-4 text-center text-sm text-slate-400">No hay datos de mapa mental.</p>;
  }

  const accentMap: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    blue: "bg-sky-100 text-sky-700 border-sky-200",
    violet: "bg-violet-100 text-violet-700 border-violet-200",
  };

  return (
    <div className="overflow-auto p-4">
      <div className="inline-block min-w-[280px]">
        <button
          onClick={() => onElementClick?.(root.label)}
          className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition hover:shadow-md ${accentMap[root.accent || "violet"] || accentMap.violet}`}
        >
          {root.label}
        </button>
        {root.children && root.children.length > 0 && (
          <div className="ml-6 mt-3 space-y-2 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
            {root.children.map((child) => (
              <div key={child.id}>
                <button
                  onClick={() => onElementClick?.(child.label)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:shadow-sm ${accentMap[child.accent || "blue"] || accentMap.blue}`}
                >
                  {child.label}
                </button>
                {child.children && child.children.length > 0 && (
                  <div className="ml-4 mt-1.5 space-y-1.5 border-l border-slate-100 pl-3 dark:border-slate-800">
                    {child.children.map((leaf) => (
                      <button
                        key={leaf.id}
                        onClick={() => onElementClick?.(leaf.label)}
                        className={`block rounded-lg border px-2.5 py-1 text-[11px] font-medium transition hover:shadow-sm ${accentMap[leaf.accent || "green"] || accentMap.green}`}
                      >
                        {leaf.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StudeChartWindow({ session, chartData, onClose, onElementClick, anchorY }: StudeChartWindowProps) {
  const data = buildChartData(session);
  const [pos, setPos] = useState({ x: Math.max(40, window.innerWidth - DEFAULT_W - 80), y: (anchorY ?? 400) + 16 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [expanded, setExpanded] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 100, dragRef.current.origX + (ev.clientX - dragRef.current.startX))),
        y: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.origY + (ev.clientY - dragRef.current.startY))),
      });
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pos]);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
    function onMove(ev: MouseEvent) {
      if (!resizeRef.current) return;
      setSize({
        w: Math.max(MIN_W, resizeRef.current.origW + (ev.clientX - resizeRef.current.startX)),
        h: Math.max(MIN_H, resizeRef.current.origH + (ev.clientY - resizeRef.current.startY)),
      });
    }
    function onUp() {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [size]);

  const handleBarClick = (entry: { fullName?: string; name?: string }) => {
    onElementClick?.(entry.fullName || entry.name || "");
  };

  const renderChart = () => {
    if (chartData.type === "mindmap") {
      return <MindMapDiagram session={session} onElementClick={onElementClick} />;
    }

    if (chartData.type === "pie") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={Math.min(size.w, size.h) * 0.25}
              dataKey="relevance"
              nameKey="name"
              onClick={(_, idx) => handleBarClick(data[idx])}
              className="cursor-pointer"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
            <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartData.type === "line") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
            <Line
              type="monotone"
              dataKey="relevance"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 5, cursor: "pointer" }}
              activeDot={{ r: 7, onClick: (_, payload) => {
                const p = payload as unknown as { payload?: { fullName?: string } };
                if (p.payload?.fullName) handleBarClick({ fullName: p.payload.fullName });
              }}}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Default: bar chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
          <Bar dataKey="relevance" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(entry) => handleBarClick(entry)}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const displayStyle = expanded
    ? { left: 20, top: 20, width: window.innerWidth - 40, height: window.innerHeight - 40 }
    : { left: pos.x, top: pos.y, width: size.w, height: size.h };

  return (
    <div
      className="fixed z-40 flex flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.15)] dark:border-slate-700 dark:bg-slate-900"
      style={{ ...displayStyle, transition: expanded ? "all 0.25s ease" : undefined }}
    >
      {/* Title bar */}
      <div
        onMouseDown={onDragStart}
        className="flex h-11 shrink-0 cursor-move items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-800/60"
      >
        <span className="flex-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
          {chartData.type === "mindmap" ? "Mapa conceptual" : `Gráfico ${chartData.type}`} — Stude
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label={expanded ? "Restaurar" : "Maximizar"}
        >
          {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          aria-label="Cerrar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Chart body */}
      <div className="relative flex-1 p-2">
        {renderChart()}
      </div>

      {/* Hint */}
      <div className="border-t border-slate-100 px-3 py-1.5 dark:border-slate-800">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Hacé click en cualquier elemento para pedirle más detalles a Stude.
        </p>
      </div>

      {/* Resize handle */}
      {!expanded && (
        <div
          onMouseDown={onResizeStart}
          className="absolute bottom-0 right-0 flex h-5 w-5 cursor-se-resize items-center justify-center text-slate-300"
        >
          <GripVertical className="h-3 w-3 rotate-[-45deg]" />
        </div>
      )}
    </div>
  );
}
