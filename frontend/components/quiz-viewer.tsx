"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, RotateCcw, Trophy, XCircle } from "lucide-react";
import { QuizItem } from "@/lib/types";
import { saveQuizAttempt } from "@/lib/analytics-storage";

const Md = dynamic(() => import("@/components/md-renderer"), {
  ssr: false,
  loading: () => <span className="text-xs text-slate-400">…</span>,
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
    ([qi, chosen]) => quiz[qi] && chosen === quiz[qi].correct
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
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
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
      <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {totalAnswered} / {quiz.length} respondidas
            {totalAnswered > 0 && <span className="ml-2 text-emerald-600 dark:text-emerald-400">{correctCount} correctas</span>}
          </p>
          {totalAnswered > 0 && (
            <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
              <RotateCcw className="h-3 w-3" /> Reiniciar
            </button>
          )}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-500"
            style={{ width: `${(totalAnswered / quiz.length) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Score summary when done ── */}
      {allDone && (
        <div className={`flex items-center gap-3 rounded-[24px] border p-4 ${pct >= 70 ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30" : pct >= 40 ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30"}`}>
          <Trophy className={`h-5 w-5 ${pct >= 70 ? "text-emerald-500 dark:text-emerald-400" : pct >= 40 ? "text-amber-500 dark:text-amber-400" : "text-red-500 dark:text-red-400"}`} />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{pct}% — {correctCount} de {quiz.length} correctas</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
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
            className={`rounded-[22px] border p-5 transition ${
              answered
                ? isCorrect
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/20"
                  : "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20"
                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            }`}
          >
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {qi + 1}. {item.question}
            </p>

            {hasOptions && item.options && item.options.length >= 2 ? (
              /* ── Multiple choice options ── */
              <div className="mt-3 space-y-2">
                {item.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const isCorrectOption = oi === item.correct;
                  let optClass = "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-500 dark:hover:bg-violet-900/30";

                  if (answered) {
                    if (isCorrectOption) {
                      optClass = "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30";
                    } else if (isChosen && !isCorrectOption) {
                      optClass = "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30";
                    } else {
                      optClass = "border-slate-100 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-800";
                    }
                  }

                  return (
                    <button
                      key={oi}
                      onClick={() => choose(qi, oi)}
                      disabled={answered}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left text-sm transition ${optClass}`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        answered && isCorrectOption
                          ? "bg-emerald-500 text-white dark:bg-emerald-600"
                          : answered && isChosen && !isCorrectOption
                          ? "bg-red-500 text-white dark:bg-red-600"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {answered && isCorrectOption ? <CheckCircle2 className="h-3.5 w-3.5" /> : answered && isChosen ? <XCircle className="h-3.5 w-3.5" /> : OPTION_LETTERS[oi]}
                      </span>
                      <span className="leading-6 text-slate-700 dark:text-slate-300">{opt}</span>
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
              <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Explicación</p>
                <Md>{item.explanation}</Md>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
