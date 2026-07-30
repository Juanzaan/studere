"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

/** Resolve a CSS variable to its current computed value (client-side only). */
function cssVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

interface ChartColors {
  blue: string;
  blueSoft: string;
  teal: string;
  tealSoft: string;
  text: string;
  muted: string;
  border: string;
  surface: string;
}

function readColors(): ChartColors {
  return {
    blue: cssVar("--c-blue") || "#3b5fc0",
    blueSoft: cssVar("--c-blue-soft") || "rgba(59,95,192,0.08)",
    teal: cssVar("--c-teal") || "#0c857a",
    tealSoft: cssVar("--c-teal-soft") || "rgba(12,133,122,0.08)",
    text: cssVar("--c-text") || "#f1f5f9",
    muted: cssVar("--c-muted") || "#94a3b8",
    border: cssVar("--c-border") || "#334155",
    surface: cssVar("--c-surface") || "#1e293b",
  };
}

export interface EChartsSessionsPilotProps {
  data: { date: string; sesiones: number; repasos: number }[];
}

/**
 * ECharts pilot — "Sesiones y repasos" dual-series line chart.
 *
 * Features (identical to EChartsQuizPilot):
 * - Continuous crosshair cursor with interpolated values
 * - Dashed guide lines to both X/Y axes
 * - SVG draw animation on mount (1200ms)
 * - Gradient area fill for each series
 * - Theme-aware colours (MutationObserver on <html>)
 */
export function EChartsSessionsPilot({ data }: EChartsSessionsPilotProps) {
  const [colors, setColors] = useState<ChartColors>(readColors);

  // Sync colours when theme toggles
  useEffect(() => {
    const sync = () => setColors(readColors());
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => observer.disconnect();
  }, []);

  // ── Compute Y domain dynamically ────────────────────────────────
  const dataMax = useMemo(
    () => Math.max(...data.map((d) => Math.max(d.sesiones, d.repasos)), 1),
    [data],
  );

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
          const items = Array.isArray(params) ? params : [];
          if (!items.length) return "";
          const date = items[0].axisValueLabel;
          let html = `<div style="font-weight:600;margin-bottom:6px">${date}</div>`;
          items.forEach((p: any) => {
            const dotColor = p.color || colors.muted;
            html += `<div style="display:flex;align-items:center;gap:6px;line-height:1.6">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};flex-shrink:0"></span>
              <span style="color:${colors.text}">${p.seriesName}: <strong>${p.value}</strong></span>
            </div>`;
          });
          return html;
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
      legend: {
        bottom: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: colors.muted, fontSize: 11 },
        selectedMode: false, // disable legend click toggling (avoids focus outline)
      },
      xAxis: {
        type: "category",
        data: data.map((d) => d.date),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: colors.muted, fontSize: 11 },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: Math.max(dataMax + 2, 4),
        interval: Math.max(1, Math.ceil((dataMax + 1) / 4)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: colors.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: colors.border, type: "dashed" as const } },
      },
      grid: { left: 36, right: 16, top: 10, bottom: 36 },
      series: [
        {
          name: "Sesiones",
          type: "line",
          data: data.map((d) => d.sesiones),
          smooth: true,
          symbol: "none",
          lineStyle: { width: 2.5, color: colors.blue },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: colors.blue + "40" },
                { offset: 1, color: colors.blue + "08" },
              ],
              global: false,
            },
          },
          animationDuration: 1200,
          animationEasing: "cubicOut",
        },
        {
          name: "Repasos",
          type: "line",
          data: data.map((d) => d.repasos),
          smooth: true,
          symbol: "none",
          lineStyle: { width: 2.5, color: colors.teal },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: colors.teal + "40" },
                { offset: 1, color: colors.teal + "08" },
              ],
              global: false,
            },
          },
          animationDuration: 1200,
          animationEasing: "cubicOut",
          animationDelay: 100, // slight delay so both lines draw together
        },
      ],
    }),
    [data, colors, dataMax],
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
