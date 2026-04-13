"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Copy,
  Bookmark,
  MessageSquarePlus,
  Sparkles,
  WandSparkles,
  FileAudio2,
  FileText,
  Film,
} from "lucide-react";
import { TranscriptSegment, StudySession } from "@/lib/types";
import { Highlight } from "@/src/shared/components/Highlight";

interface TranscriptPanelProps {
  session: StudySession;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredSegments: TranscriptSegment[];
  bookmarks: { segmentId: string }[];
  onToggleBookmark: (segmentId: string, label: string) => void;
  onAddComment: (text: string, segmentId?: string) => void;
  onAddFlashcard: (text: string) => void;
  onOpenChat: (message: string) => void;
}

export function TranscriptPanel({
  session,
  searchQuery,
  onSearchChange,
  filteredSegments,
  bookmarks,
  onToggleBookmark,
  onAddComment,
  onAddFlashcard,
  onOpenChat,
}: TranscriptPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sourceIcon =
    session.sourceKind === "video" ? Film : session.sourceKind === "audio" ? FileAudio2 : FileText;
  const SourceIcon = sourceIcon;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <span className="flex items-center gap-2">
          <SourceIcon className="h-3.5 w-3.5" />
          Transcripción ({session.transcript.length} bloques)
        </span>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {isOpen && (
        <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar en la transcripción..."
              className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 py-1 pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:bg-slate-800"
            />
          </label>
          {filteredSegments.map((segment) => {
            const bookmarked = bookmarks.some((b) => b.segmentId === segment.id);
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
                  <Highlight text={segment.text} query={searchQuery} />
                </p>
                <div className="mt-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => navigator.clipboard?.writeText(segment.text)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700"
                    aria-label="Copiar"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onToggleBookmark(segment.id, segment.text.slice(0, 42))}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                      bookmarked
                        ? "border-amber-200 bg-amber-50 text-amber-500"
                        : "border-slate-200 bg-white text-slate-400 hover:text-slate-700"
                    }`}
                    aria-label="Marcador"
                  >
                    <Bookmark className={`h-3 w-3 ${bookmarked ? "fill-current" : ""}`} />
                  </button>
                  <button
                    onClick={() => onAddComment(`Revisar: ${segment.text.slice(0, 90)}`, segment.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700"
                    aria-label="Comentar"
                  >
                    <MessageSquarePlus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onAddFlashcard(segment.text)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700"
                    aria-label="Flashcard"
                  >
                    <Sparkles className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onOpenChat(`Explicame este fragmento: ${segment.text}`)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-slate-700"
                    aria-label="Stude"
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
  );
}
