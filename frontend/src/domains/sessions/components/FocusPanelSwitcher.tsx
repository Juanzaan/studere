"use client";

import {
  Sparkles,
  ClipboardCheck,
  Layers,
  Brain,
  ListTodo,
  Lightbulb,
  StickyNote,
} from "lucide-react";

const FOCUS_PANELS = ["summary", "quiz", "flashcards", "mindmap", "tasks", "insights", "notes"] as const;
export type FocusPanel = (typeof FOCUS_PANELS)[number];

const FOCUS_LABELS: Record<FocusPanel, string> = {
  summary: "Resumen IA",
  quiz: "Quiz",
  flashcards: "Flashcards",
  mindmap: "Mapa Mental",
  tasks: "Tareas",
  insights: "Insights",
  notes: "Mis Notas",
};

const FOCUS_ICONS: Record<FocusPanel, typeof Sparkles> = {
  summary: Sparkles,
  quiz: ClipboardCheck,
  flashcards: Layers,
  mindmap: Brain,
  tasks: ListTodo,
  insights: Lightbulb,
  notes: StickyNote,
};

interface FocusPanelSwitcherProps {
  activePanel: FocusPanel;
  onPanelChange: (panel: FocusPanel) => void;
}

export function FocusPanelSwitcher({ activePanel, onPanelChange }: FocusPanelSwitcherProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4 dark:border-slate-700">
      {FOCUS_PANELS.map((panel) => {
        const Icon = FOCUS_ICONS[panel];
        return (
          <button
            key={panel}
            onClick={() => onPanelChange(panel)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 ${
              activePanel === panel
                ? "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {FOCUS_LABELS[panel]}
          </button>
        );
      })}
    </div>
  );
}
