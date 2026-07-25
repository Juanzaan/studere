"use client";

import { memo } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";

/* ─── SkeletonBlock: a single shimmer rectangle ─── */
function SkeletonBlock({
  className = "",
  width = "100%",
  height = "16px",
}: {
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height }}
    />
  );
}

/* ─── Progress step indicator ─── */
function ProgressStep({
  done,
  label,
  isActive,
}: {
  done: boolean;
  label: string;
  isActive: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-colors ${
          done
            ? "border-2 border-c-teal-border bg-c-teal-soft text-c-teal"
            : isActive
              ? "animate-pulse border border-c-blue-border bg-c-blue-soft text-c-blue"
              : "border border-c-border bg-c-surface-2 text-c-muted"
        }`}
      >
        {done ? <Check className="h-3 w-3" /> : isActive ? <Loader2 className="h-3 w-3 animate-spin" /> : "·"}
      </div>
      <span
        className={`text-[11px] font-medium transition-colors ${
          done ? "text-c-teal" : isActive ? "text-c-blue" : "text-c-muted"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── Props ─── */
export type SessionSkeletonProps = {
  phase: "transcribing" | "generating";
  progressMsg?: string;
};

/* ─── SessionSkeleton ─── */
export const SessionSkeleton = memo(function SessionSkeleton({
  phase,
  progressMsg,
}: SessionSkeletonProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Progress tracker */}
      <div className="rounded-panel border border-c-border bg-c-surface p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-btn bg-c-blue-soft text-c-blue">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-c-text">
              {phase === "transcribing"
                ? "Transcribiendo audio..."
                : "Generando con IA..."}
            </p>
            {progressMsg && (
              <p className="text-[10px] text-c-muted">{progressMsg}</p>
            )}
            <p className="mt-1 text-[10px] text-c-muted">
              Esto puede tardar unos segundos. No cerrés la página.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <ProgressStep
            done={phase === "generating"}
            label="Audio → Transcripción"
            isActive={phase === "transcribing"}
          />
          <ProgressStep
            done={false}
            label="Generar resumen, flashcards y quiz"
            isActive={phase === "generating"}
          />
          <ProgressStep
            done={false}
            label="Material listo para estudiar"
            isActive={false}
          />
        </div>
      </div>

      {/* Skeleton: Session title area */}
      <div className="rounded-panel border border-c-border bg-c-surface p-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock width="40px" height="40px" className="rounded-btn" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock width="55%" height="18px" />
            <SkeletonBlock width="30%" height="12px" />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <SkeletonBlock width="60px" height="26px" className="rounded-btn" />
          <SkeletonBlock width="80px" height="26px" className="rounded-btn" />
          <SkeletonBlock width="70px" height="26px" className="rounded-btn" />
        </div>
      </div>

      {/* Skeleton: 2-column layout (concepts + content) */}
      <div className="flex gap-3">
        {/* Left: concepts sidebar */}
        <div className="hidden w-[160px] shrink-0 space-y-2 md:block">
          <SkeletonBlock width="100%" height="14px" />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} width={`${70 + i * 8}%`} height="28px" className="rounded-btn" />
          ))}
        </div>

        {/* Right: tab bar + content */}
        <div className="flex-1 space-y-3">
          {/* Tab bar */}
          <div className="flex gap-2">
            {["Resumen", "Flashcards", "Quiz", "Mapa"].map((tab) => (
              <SkeletonBlock
                key={tab}
                width={`${50 + Math.random() * 30}px`}
                height="30px"
                className="rounded-btn"
              />
            ))}
          </div>

          {/* Content blocks */}
          <div className="rounded-panel border border-c-border bg-c-surface p-4">
            <SkeletonBlock width="45%" height="16px" />
            <div className="mt-3 space-y-2">
              <SkeletonBlock width="100%" height="12px" />
              <SkeletonBlock width="92%" height="12px" />
              <SkeletonBlock width="85%" height="12px" />
              <SkeletonBlock width="88%" height="12px" />
              <SkeletonBlock width="50%" height="12px" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="space-y-2 rounded-card border border-c-border p-3">
                <SkeletonBlock width="60%" height="14px" />
                <SkeletonBlock width="100%" height="10px" />
                <SkeletonBlock width="80%" height="10px" />
              </div>
              <div className="space-y-2 rounded-card border border-c-border p-3">
                <SkeletonBlock width="55%" height="14px" />
                <SkeletonBlock width="100%" height="10px" />
                <SkeletonBlock width="75%" height="10px" />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <SkeletonBlock width="24px" height="24px" className="rounded-full" />
              <SkeletonBlock width="80%" height="10px" />
            </div>
          </div>
        </div>
      </div>

      {/* Subtle hint */}
      <p className="text-center text-[10px] text-c-muted">
        Stude IA está preparando tu material de estudio…
      </p>
    </div>
  );
});
