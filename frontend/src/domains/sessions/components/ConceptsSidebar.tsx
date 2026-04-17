"use client";

import dynamic from "next/dynamic";
import { Layers, ChevronsLeft } from "lucide-react";
import { Concept } from "@/lib/types";
import { Highlight } from "@/src/shared/components/Highlight";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-xs text-slate-400">Cargando…</span>,
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
      <aside className="rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-all duration-300 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex items-start">
        <button
          onClick={onToggle}
          className="flex w-full flex-col items-center gap-2 py-4 text-slate-400 transition hover:text-violet-600 dark:text-slate-500 dark:hover:text-violet-400"
          title="Abrir Conceptos Clave"
        >
          <Layers className="h-4 w-4" />
          <span className="text-[10px] font-semibold tracking-wider [writing-mode:vertical-lr]">CONCEPTOS</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-all duration-300 dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between px-4 py-3.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Layers className="h-4 w-4 text-violet-500" />
          Conceptos Clave
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{concepts.length}</span>
        </span>
        <button
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          aria-label="Cerrar conceptos"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 animate-fade-in overflow-y-auto border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800">
        <div className="space-y-3">
          {concepts.map((concept) => (
            <div key={concept.term} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {searchQuery ? <Highlight text={concept.term} query={searchQuery} /> : concept.term}
              </p>
              <div className="mt-2">
                {searchQuery ? (
                  <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
                    <Highlight text={concept.description} query={searchQuery} />
                  </p>
                ) : (
                  <Md>{concept.description}</Md>
                )}
              </div>
            </div>
          ))}
          {concepts.length === 0 && (
            <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">Sin conceptos que mostrar.</p>
          )}
        </div>
      </div>
    </aside>
  );
}
