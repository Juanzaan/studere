"use client";

import dynamic from "next/dynamic";
import { Brain, ChevronLeft, ChevronRight } from "lucide-react";
import { Concept } from "@/lib/types";
import { Highlight } from "@/src/shared/components/Highlight";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-[10px] text-c-muted">Cargando…</span>,
});

interface ConceptsSidebarProps {
  concepts: Concept[];
  isOpen: boolean;
  searchQuery: string;
  onToggle: () => void;
}

export function ConceptsSidebar({ concepts, isOpen, searchQuery, onToggle }: ConceptsSidebarProps) {
  if (!isOpen) {
    return (
      <div className="flex h-full w-[44px] flex-col items-center border-r border-c-border bg-c-surface pt-3">
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-btn text-c-muted hover:bg-c-surface-2"
          title="Abrir conceptos"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {concepts.length > 0 && (
          <span className="mt-1 text-[9px] font-medium text-c-muted">
            {concepts.length}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-panel border border-c-border bg-c-surface">
      <div className="flex flex-shrink-0 items-center gap-1.5 border-b border-c-border px-3 py-2 bg-white dark:bg-[#151b27]">
        <Brain className="h-3.5 w-3.5 flex-shrink-0 text-c-blue" />
        <span className="text-[9px] font-semibold uppercase tracking-widest text-c-muted">
          Conceptos
        </span>
        <span className="flex-shrink-0 rounded-pill bg-c-blue-soft px-1.5 py-0.5 text-[9px] font-medium text-c-blue">
          {concepts.length}
        </span>
        <button
          onClick={onToggle}
          className="ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-btn text-c-muted hover:bg-c-surface-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {concepts.length === 0 ? (
          <p className="p-3 text-center text-[10px] text-c-muted">
            Sin conceptos detectados
          </p>
        ) : (
          <div className="space-y-2">
            {concepts.map((concept, i) => (
              <div
                key={concept.term + i}
                className="rounded-card border border-c-border bg-c-surface-2 p-3"
              >
                <p className="mb-1 text-[11px] font-semibold leading-snug text-c-text">
                  {searchQuery ? <Highlight text={concept.term} query={searchQuery} /> : concept.term}
                </p>
                <div className="text-[10px] leading-relaxed text-c-muted">
                  {searchQuery ? (
                    <Highlight text={concept.description} query={searchQuery} />
                  ) : (
                    <Md>{concept.description}</Md>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
