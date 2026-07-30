"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

/* Lazy-load echarts-for-react — ~100KB gzipped, only on analytics page. */
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

/** Resolve a CSS variable to its current computed value (client-side only). */
function cssVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** All CSS colour variables used by the chart theme. */
interface ChartColors {
  violet: string;
  violetSoft: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
}

function readColors(): ChartColors {
  return {
    violet: cssVar("--c-violet") || "#8b5cf6",
    violetSoft: cssVar("--c-violet-soft") || "#1e1b4b",
    text: cssVar("--c-text") || "#f1f5f9",
    muted: cssVar("--c-muted") || "#94a3b8",
    border: cssVar("--c-border") || "#334155",
    surface: cssVar("--c-surface") || "#1e293b",
  };
}

/**
 * Props for {@link EChartsQuizPilot}.
 */
export interface EChartsQuizPilotProps {
  /** Array of quiz attempts with intento (1-based) and porcentaje (0–100). */
  data: { intento: number; porcentaje: number }[];
}

/**
 * ECharts pilot — "Evolución de Quiz" line chart.
 *
 * Features:
 * - Continuous crosshair cursor with interpolated values (`axisPointer.type: 'cross'`)
 * - Dashed guide lines to both X/Y axes (built-in axisPointer)
 * - SVG draw animation on mount (`animationDuration: 1200`)
 * - Gradient area fill (light -> transparent)
 * - Theme-aware colours (reads CSS variables, re-syncs on class change)
 *
 * Imported via `next/dynamic` with `ssr: false` to avoid hydration mismatches.
 */
export function EChartsQuizPilot({ data }: EChartsQuizPilotProps) {
  const [colors, setColors] = useState<ChartColors>(readColors);

  // ── Sync colours when theme (dark/light) toggles ────────────────
  useEffect(() => {
    const sync = () => setColors(readColors());
    // Re-sync on attribute/class changes (Tailwind dark mode toggles a class on <html>)
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => observer.disconnect();
  }, []);

  // ── Build ECharts option (memoized, only rebuilds when data or colours change) ──
  const option: EChartsOption = useMemo(
    () => ({
      tooltip: {
        trigger: "axis",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 10,
        padding: [10, 14],
        textStyle: { color: colors.text, fontSize: 12 },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p) return "";
          const label = `Intento #${p.axisValueLabel}`;
          return `<div style="font-weight:600;margin-bottom:4px">${label}</div><div style="color:${colors.violet}">${p.value}%</div>`;
        },
        axisPointer: {
          type: "cross" as const,
          snap: false,
          lineStyle: {
            type: "dashed" as const,
            color: colors.muted,
            opacity: 0.4,
            width: 1,
          },
          crossStyle: {
            type: "dashed" as const,
            color: colors.muted,
            opacity: 0.4,
            width: 1,
          },
          label: {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 6,
            padding: [4, 8] as [number, number],
            color: colors.text,
            fontSize: 11,
          },
        },
      },
      xAxis: {
        type: "category",
        data: data.map((d) => d.intento),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: colors.muted, fontSize: 11 },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: colors.muted, fontSize: 11, formatter: "{value}%" },
        splitLine: { lineStyle: { color: colors.border, type: "dashed" as const } },
      },
      grid: { left: 40, right: 16, top: 10, bottom: 24 },
      series: [
        {
          type: "line",
          data: data.map((d) => d.porcentaje),
          smooth: true,
          symbol: "none",
          lineStyle: { width: 2.5, color: colors.violet },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: colors.violet + "40" }, // 25% opacity
                { offset: 1, color: colors.violet + "08" }, // ~3% opacity
              ],
              global: false,
            },
          },
          animationDuration: 1200,
          animationEasing: "cubicOut",
          animationDelay: 0,
        },
      ],
    }),
    [data, colors],
  );

  if (data.length === 0) return null;

  return (
    <div className="h-full w-full">
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
