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
  loading: () => <span className="text-[11px] text-c-muted">Cargando…</span>,
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
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-c-blue-border bg-c-blue-soft px-3 py-1 text-[11px] font-medium text-c-blue">
            <FileText className="h-3 w-3" />
            {session.sourceFileName}
          </span>
          <span className="text-[11px] text-c-muted">
            {session.stats.estimatedDurationMinutes} min · {session.stats.wordCount} palabras
          </span>
        </div>
      )}
      <Md>{session.summary || "*Sin resumen generado todavía.*"}</Md>

      {/* ── Collapsible transcript ── */}
      <div className="mt-4 rounded-panel border border-c-border">
        <button
          onClick={() => setTranscriptOpen(!transcriptOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-[11px] font-semibold text-c-muted transition hover:text-c-text focus-visible:outline-none"
        >
          <span className="flex items-center gap-2">
            <SourceIcon className="h-3.5 w-3.5" />
            Transcripción ({session.transcript.length} bloques)
          </span>
          {transcriptOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {transcriptOpen && (
          <div className="space-y-2 border-t border-c-border p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-c-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar en la transcripción..."
                className="h-8 w-full rounded-input border border-c-border bg-c-surface-2 pl-9 pr-3 text-[11px] text-c-muted outline-none placeholder:text-c-muted focus:border-c-blue-border"
              />
            </label>
            {filteredTranscript.map((segment) => {
              const bookmarked = session.bookmarks.some((b) => b.segmentId === segment.id);
              return (
                <div
                  key={segment.id}
                  className="group mb-2 border-l-2 border-c-border pl-3 transition-colors hover:border-c-blue"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-c-muted">
                      {segment.timestamp}
                    </span>
                    <span className="rounded-btn bg-c-surface-2 px-1.5 py-0.5 text-[10px] text-c-muted">
                      {segment.speaker}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-c-muted">
                    <Highlight text={segment.text} query={q} />
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => navigator.clipboard?.writeText(segment.text)}
                      className="flex h-6 w-6 items-center justify-center rounded-btn border border-c-border text-c-muted hover:text-c-blue"
                      aria-label="Copiar texto al portapapeles"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onToggleBookmark(segment.id, segment.text.slice(0, 42))}
                      className={`flex h-6 w-6 items-center justify-center rounded-btn border ${
                        bookmarked
                          ? "border-c-amber/20 bg-c-amber-soft text-c-amber"
                          : "border-c-border text-c-muted hover:text-c-blue"
                      }`}
                      aria-label={bookmarked ? "Quitar marcador" : "Agregar marcador"}
                    >
                      <Bookmark className={`h-3 w-3 ${bookmarked ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={() => onAddComment(`Revisar: ${segment.text.slice(0, 90)}`, segment.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-btn border border-c-border text-c-muted hover:text-c-blue"
                      aria-label="Agregar comentario"
                    >
                      <MessageSquarePlus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onAddFlashcard(segment.text)}
                      className="flex h-6 w-6 items-center justify-center rounded-btn border border-c-border text-c-muted hover:text-c-blue"
                      aria-label="Crear flashcard con este fragmento"
                    >
                      <Sparkles className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onOpenChat(`Explicame este fragmento: ${segment.text}`)}
                      className="flex h-6 w-6 items-center justify-center rounded-btn border border-c-border text-c-muted hover:text-c-blue"
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
