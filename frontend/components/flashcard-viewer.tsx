"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { Flashcard } from "@/lib/types";
import { saveFlashcardAttempt } from "@/lib/analytics-storage";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-[11px] text-c-muted">…</span>,
});

type FlashcardViewerProps = {
  flashcards: Flashcard[];
  sessionId?: string;
  onReviewComplete?: (reviewed: number) => void;
  onGenerateMore?: () => void;
  onConfidence?: (cardIndex: number, confidence: Flashcard["confidence"]) => void;
};

const CONFIDENCE_BUTTONS: Array<{ value: NonNullable<Flashcard["confidence"]>; label: string; color: string }> = [
  { value: "again", label: "De nuevo", color: "border-c-red-border bg-c-red-soft text-c-red" },
  { value: "hard", label: "Difícil", color: "border-c-amber/20 bg-c-amber-soft text-c-amber" },
  { value: "good", label: "Bien", color: "border-c-teal-border bg-c-teal-soft text-c-teal" },
  { value: "easy", label: "Fácil", color: "border-c-blue-border bg-c-blue-soft text-c-blue" },
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
      <div className="rounded-panel border border-dashed border-c-border bg-c-surface p-8 text-center text-[12px] text-c-muted">
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
    <div className="flex flex-1 flex-col items-center justify-center gap-5 min-h-[400px]">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between text-[11px] font-semibold text-c-muted">
          <span>{index + 1} de {total}</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-c-surface-2">
          <div className="h-full rounded-full bg-c-blue transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {completed && (
        <div className="w-full max-w-2xl rounded-card border border-c-teal-border bg-c-teal-soft p-4 text-center">
          <p className="text-[12px] font-semibold text-c-teal">¡Deck completo!</p>
          <p className="mt-1 text-[11px] text-c-teal opacity-80">{total} flashcards repasadas. Seguí repasando para reforzar la retención.</p>
        </div>
      )}

      <button
        onClick={() => setFlipped(!flipped)}
        className="group relative min-h-[240px] w-full max-w-2xl cursor-pointer [perspective:800px]"
        aria-label={flipped ? "Ver pregunta" : "Ver respuesta"}
      >
        <div
          className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-panel border border-c-border bg-c-surface-2 p-5 [backface-visibility:hidden]">
            <p className="text-[10px] uppercase tracking-wide text-c-muted">Pregunta</p>
            <div className="mt-4 text-center text-[13px] font-medium leading-relaxed text-c-text">
              <Md>{card.question}</Md>
            </div>
            <p className="mt-6 text-[10px] text-c-muted">Click para voltear</p>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-panel border border-c-border bg-c-surface-2 p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-[10px] uppercase tracking-wide text-c-muted">Respuesta</p>
            <div className="mt-4 text-center text-[13px] leading-relaxed text-c-text">
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
              className={`rounded-btn border px-3 py-1 text-[11px] transition focus-visible:outline-none ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={prev}
          className="flex h-8 w-8 items-center justify-center rounded-btn border border-c-border text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
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
          className="flex h-8 items-center gap-2 rounded-btn border border-c-border px-3 text-[11px] text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
          aria-label="Reiniciar"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reiniciar
        </button>
        <button
          onClick={next}
          className="flex h-8 w-8 items-center justify-center rounded-btn border border-c-border text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
          aria-label="Siguiente"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {onGenerateMore && (
        <button
          onClick={onGenerateMore}
          className="rounded-btn border border-c-blue-border bg-c-blue-soft px-3 py-1.5 text-[11px] font-medium text-c-blue transition hover:opacity-90 focus-visible:outline-none"
        >
          + Generar más flashcards
        </button>
      )}
    </div>
  );
}
