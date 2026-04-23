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
      <div className="flex h-full w-[44px] flex-col items-center border-r border-c-border bg-c-surface pt-3 transition-all duration-300">
        <button
          onClick={onToggle}
          className="flex h-8 w-8 items-center justify-center rounded-btn text-c-muted transition hover:bg-c-surface-2 hover:text-c-blue"
          title="Abrir conceptos"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="mt-1 text-[9px] font-medium text-c-muted">
          {concepts.length}
        </span>
      </div>
    );
  }

  return (
    <aside className="flex flex-col rounded-panel border border-c-border bg-c-surface transition-all duration-300 lg:overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-3">
        <Brain className="h-3.5 w-3.5 flex-shrink-0 text-c-blue" />
        <span className="truncate text-[9px] font-semibold uppercase tracking-widest text-c-muted">Conceptos</span>
        <span className="flex-shrink-0 rounded-pill bg-c-blue-soft px-1.5 py-0.5 text-[9px] font-medium text-c-blue">
          {concepts.length}
        </span>
        <button
          onClick={onToggle}
          className="ml-auto flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-btn border border-c-border text-c-muted transition hover:bg-c-surface-2"
          aria-label="Cerrar conceptos"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      </div>
      <div className="min-h-0 flex-1 animate-fade-in overflow-y-auto border-t border-c-border px-3 pb-3 pt-2">
        <div>
          {concepts.map((concept, i) => (
            <div
              key={concept.term + i}
              className="mb-[6px] rounded-card border border-c-border bg-c-surface p-[10px]"
            >
              <p className="mb-[2px] text-[11px] font-semibold leading-tight text-c-text">
                {searchQuery ? <Highlight text={concept.term} query={searchQuery} /> : concept.term}
              </p>
              <div className="text-[10px] leading-[1.5] text-c-muted">
                {searchQuery ? (
                  <Highlight text={concept.description} query={searchQuery} />
                ) : (
                  <Md>{concept.description}</Md>
                )}
              </div>
            </div>
          ))}
          {concepts.length === 0 && (
            <p className="py-4 text-center text-[11px] text-c-muted">Sin conceptos que mostrar.</p>
          )}
        </div>
      </div>
    </aside>
  );
}
