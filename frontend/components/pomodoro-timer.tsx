"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { POMODORO } from "@/lib/constants";

type TimerMode = "focus" | "short-break" | "long-break";

interface PomodoroTimerProps {
  onExit: () => void;
}

const STORAGE_KEY = "studere.pomodoro-state";

function modeMinutes(mode: TimerMode): number {
  switch (mode) {
    case "focus":
      return POMODORO.FOCUS_MINUTES;
    case "short-break":
      return POMODORO.SHORT_BREAK_MINUTES;
    case "long-break":
      return POMODORO.LONG_BREAK_MINUTES;
    default:
      return POMODORO.FOCUS_MINUTES;
  }
}

function modeLabel(mode: TimerMode): string {
  switch (mode) {
    case "focus":
      return "Foco profundo";
    case "short-break":
      return "Descanso corto";
    case "long-break":
      return "Descanso largo";
    default:
      return "Foco profundo";
  }
}

function modeColor(mode: TimerMode): { bg: string; text: string; bar: string; border: string; track: string } {
  switch (mode) {
    case "focus":
      return {
        bg: "bg-c-blue-soft",
        text: "text-c-blue",
        bar: "bg-c-blue",
        border: "border-c-blue-border",
        track: "bg-c-surface-2",
      };
    case "short-break":
    case "long-break":
      return {
        bg: "bg-c-amber-soft",
        text: "text-c-amber",
        bar: "bg-c-amber",
        border: "border-c-amber/20",
        track: "bg-c-amber-soft",
      };
  }
}

interface TimerState {
  mode: TimerMode;
  secondsLeft: number;
  isRunning: boolean;
  round: number;
  endTime?: number;
}

function saveState(state: TimerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function loadState(): TimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TimerState;
  } catch {
    return null;
  }
}

function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroTimer({ onExit }: PomodoroTimerProps) {
  const saved = loadState();
  const initialMode: TimerMode = saved?.mode ?? "focus";
  const initialRound = saved?.round ?? 1;

  // If there was a saved running state with an endTime, resume from elapsed
  let initialSeconds = modeMinutes(initialMode) * 60;
  if (saved?.endTime && saved.isRunning) {
    const remaining = Math.ceil((saved.endTime - Date.now()) / 1000);
    initialSeconds = Math.max(0, remaining);
  } else if (saved?.secondsLeft != null) {
    initialSeconds = saved.secondsLeft;
  }

  const [mode, setMode] = useState<TimerMode>(initialMode);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(saved?.isRunning ?? false);
  const [round, setRound] = useState(initialRound);
  const [notified, setNotified] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(saved?.endTime ?? null);

  const totalSeconds = modeMinutes(mode) * 60;
  const colors = modeColor(mode);

  const advanceMode = useCallback(() => {
    setMode((prevMode) => {
      if (prevMode === "focus") {
        if (round >= POMODORO.ROUNDS_BEFORE_LONG_BREAK) {
          setRound(1);
          return "long-break";
        }
        return "short-break";
      }
      // Coming back from any break → next focus round
      if (prevMode === "short-break") {
        setRound((r) => r + 1);
      }
      if (prevMode === "long-break") {
        setRound(1);
      }
      return "focus";
    });
  }, [round]);

  const tick = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        // Timer finished
        return 0;
      }
      return prev - 1;
    });
  }, []);

  // Handle timer hitting 0
  useEffect(() => {
    if (secondsLeft === 0 && isRunning && !notified) {
      setNotified(true);
      // Send browser notification if permitted
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          const title = mode === "focus" ? "\u00a1Tiempo! Tom\u00e1 un descanso \ud83c\udf89" : "\u00a1Descanso terminado! A estudiar \ud83d\udcda";
          new Notification(title);
        }
      }
      // Auto-advance after a brief pause so the user sees 00:00
      const timeout = setTimeout(() => {
        advanceMode();
        const nextMode = mode === "focus"
          ? (round >= POMODORO.ROUNDS_BEFORE_LONG_BREAK ? "long-break" : "short-break")
          : "focus";
        const nextSeconds = modeMinutes(nextMode) * 60;
        setSecondsLeft(nextSeconds);
        setIsRunning(false);
        endTimeRef.current = null;
        setNotified(false);
        saveState({
          mode: nextMode,
          secondsLeft: nextSeconds,
          isRunning: false,
          round: mode === "focus" ? (round >= POMODORO.ROUNDS_BEFORE_LONG_BREAK ? 1 : round + 1) : round,
        });
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [secondsLeft, isRunning, mode, round, advanceMode, notified]);

  // Interval management
  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(tick, 1000);
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + secondsLeft * 1000;
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      endTimeRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, tick]);

  // Persist state changes
  useEffect(() => {
    const state: TimerState = {
      mode,
      secondsLeft,
      isRunning,
      round,
      endTime: endTimeRef.current ?? undefined,
    };
    saveState(state);
  }, [mode, secondsLeft, isRunning, round]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearState();
    };
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!isRunning) {
      // Request notification permission on first play
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
      endTimeRef.current = Date.now() + secondsLeft * 1000;
    } else {
      endTimeRef.current = null;
    }
    setIsRunning((r) => !r);
  }, [isRunning, secondsLeft]);

  const handleSkip = useCallback(() => {
    advanceMode();
    const nextSeconds = modeMinutes(mode) * 60;
    setSecondsLeft(nextSeconds);
    setIsRunning(false);
    endTimeRef.current = null;
    setNotified(false);
    saveState({
      mode,
      secondsLeft: nextSeconds,
      isRunning: false,
      round,
    });
  }, [advanceMode, mode, round]);

  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  const isFocus = mode === "focus";

  return (
    <div className={`sticky top-0 z-30 border-b ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Timer + label */}
        <div className="flex flex-col">
          <span className={`text-[18px] font-bold leading-tight tabular-nums ${colors.text}`}>
            {formatTime(secondsLeft)}
          </span>
          <span className="text-[10px] text-c-muted">
            Pomodoro {round}/{POMODORO.ROUNDS_BEFORE_LONG_BREAK} · {modeLabel(mode)}
          </span>
        </div>

        {/* Center: Round indicators */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: POMODORO.ROUNDS_BEFORE_LONG_BREAK }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                i < round
                  ? isFocus
                    ? "bg-c-blue"
                    : "bg-c-amber"
                  : "border border-c-border bg-c-surface-2"
              }`}
            />
          ))}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className={`rounded-btn border px-3 py-1.5 text-[11px] transition hover:opacity-80 focus-visible:outline-none ${
              isRunning
                ? "border-c-border text-c-muted"
                : `border-c-blue-border ${colors.text}`
            }`}
          >
            {isRunning ? "⏸ Pausar" : secondsLeft < totalSeconds ? "▶ Reanudar" : "▶ Iniciar"}
          </button>
          <button
            onClick={handleSkip}
            className="rounded-btn border border-c-border px-3 py-1.5 text-[11px] text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
          >
            ↩ Saltar
          </button>
          {isFocus && (
            <button
              onClick={onExit}
              className="rounded-btn border border-c-border px-3 py-1.5 text-[11px] text-c-muted transition hover:bg-c-surface-2 focus-visible:outline-none"
            >
              ✕ Salir del modo foco
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className={`h-0.5 w-full ${colors.track}`}>
        <div
          className={`h-0.5 transition-all duration-1000 ease-linear ${colors.bar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
