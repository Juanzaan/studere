"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Flashcard } from "@/lib/types";
import { saveFlashcardAttempt } from "@/lib/analytics-storage";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-xs text-slate-400">…</span>,
});

type FlashcardViewerProps = {
  flashcards: Flashcard[];
  sessionId?: string;
  onReviewComplete?: (reviewed: number) => void;
  onGenerateMore?: () => void;
  onConfidence?: (cardIndex: number, confidence: Flashcard["confidence"]) => void;
};

const CONFIDENCE_BUTTONS: Array<{ value: NonNullable<Flashcard["confidence"]>; label: string; color: string }> = [
  { value: "again", label: "De nuevo", color: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50" },
  { value: "hard", label: "Difícil", color: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50" },
  { value: "good", label: "Bien", color: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50" },
  { value: "easy", label: "Fácil", color: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/50" },
];

export function FlashcardViewer({ flashcards, sessionId, onReviewComplete, onGenerateMore, onConfidence }: FlashcardViewerProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [maxReached, setMaxReached] = useState(0);

  useEffect(() => {
    if (index >= flashcards.length && flashcards.length > 0) {
      setIndex(flashcards.length - 1);
    }
  }, [flashcards.length, index]);

  if (flashcards.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        No hay flashcards para esta sesion.
      </div>
    );
  }

  const safeIndex = Math.min(index, flashcards.length - 1);
  const card = flashcards[safeIndex];
  const total = flashcards.length;

  function prev() {
    setFlipped(false);
    setIndex((i) => (i > 0 ? i - 1 : total - 1));
  }

  function next() {
    setFlipped(false);
    setIndex((i) => {
      const nextIndex = i < total - 1 ? i + 1 : 0;

      if (nextIndex > maxReached) setMaxReached(nextIndex);

      if (i === total - 1 && !completed) {
        setCompleted(true);
        setMaxReached(total - 1);
        if (sessionId) {
          saveFlashcardAttempt({
            sessionId,
            timestamp: new Date().toISOString(),
            reviewed: total,
          });
        }
        onReviewComplete?.(total);
      }

      return nextIndex;
    });
  }

  const progress = Math.round(((maxReached + 1) / total) * 100);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          <span>{index + 1} de {total}</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {completed && (
        <div className="w-full max-w-lg rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-900/30">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">¡Deck completo!</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">{total} flashcards repasadas. Seguí repasando para reforzar la retención.</p>
        </div>
      )}

      <button
        onClick={() => setFlipped(!flipped)}
        className="group relative h-56 w-full max-w-lg cursor-pointer [perspective:800px]"
        aria-label={flipped ? "Ver pregunta" : "Ver respuesta"}
      >
        <div
          className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm [backface-visibility:hidden] dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">Pregunta</p>
            <div className="mt-4 text-center text-lg font-medium leading-relaxed text-slate-900 dark:text-slate-100">
              <Md>{card.question}</Md>
            </div>
            <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">Click para voltear</p>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-[28px] border border-violet-100 bg-violet-50 p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-violet-800 dark:bg-violet-900/30">
            <p className="text-[11px] uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">Respuesta</p>
            <div className="mt-4 text-center text-sm leading-7 text-slate-700 dark:text-slate-300">
              <Md>{card.answer}</Md>
            </div>
          </div>
        </div>
      </button>

      {/* Confidence rating — show only when flipped */}
      {flipped && onConfidence && (
        <div className="flex w-full max-w-lg items-center justify-center gap-2">
          {CONFIDENCE_BUTTONS.map((btn) => (
            <button
              key={btn.value}
              onClick={() => {
                onConfidence(safeIndex, btn.value);
                next();
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={prev}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Anterior"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setFlipped(false);
            setIndex(0);
            setCompleted(false);
            setMaxReached(0);
          }}
          className="flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Reiniciar"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reiniciar
        </button>
        <button
          onClick={next}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Siguiente"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {onGenerateMore && (
        <button
          onClick={onGenerateMore}
          className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50"
        >
          + Generar más flashcards
        </button>
      )}
    </div>
  );
}
