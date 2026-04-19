"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Bookmark,
  MessageSquarePlus,
  Sparkles,
  WandSparkles,
  Search,
  FileText,
  FileAudio2,
  Film,
} from "lucide-react";
import { StudySession } from "@/lib/types";
import { Highlight } from "@/src/shared/components/Highlight";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-xs text-slate-400">Cargando…</span>,
});

interface SummaryPanelProps {
  session: StudySession;
  onToggleBookmark: (segmentId: string, label: string) => void;
  onAddComment: (text: string, segmentId?: string) => void;
  onAddFlashcard: (text: string) => void;
  onOpenChat: (message: string) => void;
}

export function SummaryPanel({
  session,
  onToggleBookmark,
  onAddComment,
  onAddFlashcard,
  onOpenChat,
}: SummaryPanelProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const filteredTranscript = useMemo(() => {
    if (!q) return session.transcript;
    return session.transcript.filter((segment) =>
      [segment.text, segment.speaker].join(" ").toLowerCase().includes(q)
    );
  }, [session.transcript, q]);

  const sourceIcon =
    session.sourceKind === "video" ? Film : session.sourceKind === "audio" ? FileAudio2 : FileText;
  const SourceIcon = sourceIcon;

  return (
    <div className="space-y-4">
      {session.sourceFileName && session.sourceFileName !== "Sin archivo" && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            <FileText className="h-3 w-3" />
            {session.sourceFileName}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {session.stats.estimatedDurationMinutes} min · {session.stats.wordCount} palabras
          </span>
        </div>
      )}
      <Md>{session.summary || "*Sin resumen generado todavía.*"}</Md>

      {/* ── Collapsible transcript ── */}
      <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setTranscriptOpen(!transcriptOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <span className="flex items-center gap-2">
            <SourceIcon className="h-3.5 w-3.5" />
            Transcripción ({session.transcript.length} bloques)
          </span>
          {transcriptOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {transcriptOpen && (
          <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar en la transcripción..."
                className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 py-1 pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
              />
            </label>
            {filteredTranscript.map((segment) => {
              const bookmarked = session.bookmarks.some((b) => b.segmentId === segment.id);
              return (
                <div
                  key={segment.id}
                  className="group rounded-2xl border border-slate-100 bg-slate-50 p-3 transition hover:border-violet-200 hover:bg-violet-50/40 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-violet-800 dark:hover:bg-violet-900/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {segment.timestamp}
                    </span>
                    <span className="rounded-full bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      {segment.speaker}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-6 text-slate-600 dark:text-slate-300">
                    <Highlight text={segment.text} query={q} />
                  </p>
                  <div className="mt-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => navigator.clipboard?.writeText(segment.text)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-200"
                      aria-label="Copiar texto al portapapeles"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onToggleBookmark(segment.id, segment.text.slice(0, 42))}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        bookmarked
                          ? "border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-700 dark:bg-amber-900/30"
                          : "border-slate-200 bg-white text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-200"
                      }`}
                      aria-label={bookmarked ? "Quitar marcador" : "Agregar marcador"}
                    >
                      <Bookmark className={`h-3 w-3 ${bookmarked ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={() => onAddComment(`Revisar: ${segment.text.slice(0, 90)}`, segment.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-200"
                      aria-label="Agregar comentario"
                    >
                      <MessageSquarePlus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onAddFlashcard(segment.text)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-200"
                      aria-label="Crear flashcard con este fragmento"
                    >
                      <Sparkles className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onOpenChat(`Explicame este fragmento: ${segment.text}`)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-slate-200"
                      aria-label="Preguntar a Stude sobre este fragmento"
                    >
                      <WandSparkles className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
