"use client";

import { SessionInsight } from "@/lib/types";

interface InsightsPanelProps {
  insights: SessionInsight[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        Sin insights para esta sesión.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.map((insight) => (
        <div
          key={insight.id}
          className="rounded-[22px] border border-slate-200 bg-white p-4 transition hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {insight.label}
            </p>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                insight.tone === "good"
                  ? "bg-emerald-100 text-emerald-700"
                  : insight.tone === "warning"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {insight.value}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{insight.description}</p>
        </div>
      ))}
    </div>
  );
}
