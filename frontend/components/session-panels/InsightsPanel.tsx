"use client";

import { StudySession } from "@/lib/types";

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .trim();
}

interface InsightsPanelProps {
  session: StudySession;
}

export function InsightsPanel({ session }: InsightsPanelProps) {
  if (session.insights.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-c-border bg-c-surface p-8 text-center text-[12px] text-c-muted">
        Sin insights para esta sesión.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {session.insights.map((insight) => (
        <div
          key={insight.id}
          className="rounded-card border border-c-border bg-c-surface-2 p-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-c-muted">
              {insight.label}
            </p>
            <span
              className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold ${
                insight.tone === "good"
                  ? "bg-c-teal-soft text-c-teal"
                  : insight.tone === "warning"
                  ? "bg-c-amber-soft text-c-amber"
                  : "border border-c-border bg-c-surface text-c-muted"
              }`}
            >
              {insight.value}
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-c-muted">{stripMarkdown(insight.description)}</p>
        </div>
      ))}
    </div>
  );
}
