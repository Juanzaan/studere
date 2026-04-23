"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, RotateCcw, Trophy, XCircle } from "lucide-react";
import { QuizItem } from "@/lib/types";
import { saveQuizAttempt } from "@/lib/analytics-storage";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-[11px] text-c-muted">…</span>,
});

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

type QuizViewerProps = {
  quiz: QuizItem[];
  sessionId: string;
  onQuizComplete?: (correct: number, total: number) => void;
};

export function QuizViewer({ quiz, sessionId, onQuizComplete }: QuizViewerProps) {
  // answers[i] = index of chosen option, or undefined if unanswered
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [trackedCompletion, setTrackedCompletion] = useState(false);

  const totalAnswered = answers.size;
  const correctCount = [...answers.entries()].filter(
    ([qi, chosen]) => chosen === quiz[qi]?.correct
  ).length;
  const allDone = totalAnswered === quiz.length && quiz.length > 0;
  const pct = allDone ? Math.round((correctCount / quiz.length) * 100) : 0;

  useEffect(() => {
    if (allDone && !trackedCompletion) {
      saveQuizAttempt({
        sessionId,
        timestamp: new Date().toISOString(),
        correct: correctCount,
        total: quiz.length,
      });
      onQuizComplete?.(correctCount, quiz.length);
      setTrackedCompletion(true);
    }
  }, [allDone, correctCount, onQuizComplete, quiz.length, sessionId, trackedCompletion]);

  if (quiz.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-c-border bg-c-surface p-8 text-center text-[12px] text-c-muted">
        No hay preguntas para esta sesión.
      </div>
    );
  }

  function choose(questionIndex: number, optionIndex: number) {
    if (answers.has(questionIndex)) return; // already answered
    setAnswers((prev) => new Map(prev).set(questionIndex, optionIndex));
  }

  function reset() {
    setAnswers(new Map());
    setTrackedCompletion(false);
  }

  // Check if quiz has new-format options or is legacy (no options)
  const hasOptions = quiz[0]?.options && quiz[0].options.length >= 2;

  return (
    <div className="space-y-4">
      {/* ── Progress bar ── */}
      <div className="rounded-panel border border-c-border bg-c-surface px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-c-muted">
            {totalAnswered} / {quiz.length} respondidas
            {totalAnswered > 0 && <span className="ml-2 text-c-teal">{correctCount} correctas</span>}
          </p>
          {totalAnswered > 0 && (
            <button onClick={reset} className="flex items-center gap-1.5 text-[11px] text-c-muted transition hover:text-c-text focus-visible:outline-none">
              <RotateCcw className="h-3 w-3" /> Reiniciar
            </button>
          )}
        </div>
        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-c-surface-2">
          <div
            className="h-full rounded-full bg-c-blue transition-all duration-500"
            style={{ width: `${(totalAnswered / quiz.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Score summary when done ── */}
      {allDone && (
        <div className={`flex items-center gap-3 rounded-panel border p-4 ${pct >= 70 ? "border-c-teal-border bg-c-teal-soft" : pct >= 40 ? "border-c-amber/20 bg-c-amber-soft" : "border-c-red-border bg-c-red-soft"}`}>
          <Trophy className={`h-5 w-5 ${pct >= 70 ? "text-c-teal" : pct >= 40 ? "text-c-amber" : "text-c-red"}`} />
          <div>
            <p className="text-[13px] font-semibold text-c-text"><span className="text-c-blue">{pct}%</span> — {correctCount} de {quiz.length} correctas</p>
            <p className="text-[11px] text-c-muted">
              {pct >= 90 ? "¡Excelente! Dominás el tema." : pct >= 70 ? "¡Muy bien! Repasá los errores." : pct >= 40 ? "Bien, pero hay conceptos para repasar." : "Necesitás repasar este tema antes del examen."}
            </p>
          </div>
        </div>
      )}

      {/* ── Questions ── */}
      {quiz.map((item, qi) => {
        const chosen = answers.get(qi);
        const answered = chosen !== undefined;
        const isCorrect = answered && chosen === item.correct;

        return (
          <div
            key={qi}
            className="rounded-panel border border-c-border bg-c-surface p-4"
          >
            <p className="text-[13px] font-medium leading-relaxed text-c-text">
              {qi + 1}. {item.question}
            </p>

            {hasOptions && item.options && item.options.length >= 2 ? (
              /* ── Multiple choice options ── */
              <div className="mt-3 space-y-2">
                {item.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const isCorrectOption = oi === item.correct;
                  let optClass = "border-c-border bg-c-surface-2 hover:border-c-blue-border hover:text-c-text cursor-pointer";

                  if (answered) {
                    if (isCorrectOption) {
                      optClass = "border-c-teal bg-c-teal-soft text-c-text";
                    } else if (isChosen && !isCorrectOption) {
                      optClass = "border-c-red bg-c-red-soft text-c-text";
                    } else {
                      optClass = "border-c-border bg-c-surface opacity-60";
                    }
                  }

                  return (
                    <button
                      key={oi}
                      onClick={() => choose(qi, oi)}
                      disabled={answered}
                      className={`flex w-full items-center gap-3 rounded-card border p-3 text-left text-[12px] transition focus-visible:outline-none ${optClass}`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-btn text-[11px] font-bold ${
                        answered && isCorrectOption
                          ? "bg-c-teal text-white"
                          : answered && isChosen && !isCorrectOption
                          ? "bg-c-red text-white"
                          : "border border-c-border bg-c-surface text-c-muted"
                      }`}>
                        {answered && isCorrectOption ? <CheckCircle2 className="h-3.5 w-3.5" /> : answered && isChosen ? <XCircle className="h-3.5 w-3.5" /> : OPTION_LETTERS[oi]}
                      </span>
                      <span className="text-[12px] text-c-muted">{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* ── Legacy fallback (no options) — show explanation as text ── */
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                <Md>{item.explanation || ""}</Md>
              </div>
            )}

            {/* ── Explanation after answer ── */}
            {answered && item.explanation && (
              <div className="mt-3 rounded-card border border-c-border bg-c-surface-2 p-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-c-muted">Explicación</p>
                <Md>{item.explanation}</Md>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
