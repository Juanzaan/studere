"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";
import { useSlideIn } from "@/src/shared/hooks/useAnimations";

gsap.registerPlugin(useGSAP);

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const toastRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useSlideIn(toastRef, 'right', { distance: 400, duration: 0.5 });

  // Progress bar and auto-close
  useGSAP(() => {

    // Progress bar animation
    if (progressRef.current) {
      gsap.fromTo(progressRef.current,
        { scaleX: 1 },
        {
          scaleX: 0,
          duration: duration / 1000,
          ease: "none",
          transformOrigin: "left"
        }
      );
    }

    // Auto close after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, { scope: toastRef });

  const handleClose = () => {
    gsap.to(toastRef.current, {
      x: 400,
      opacity: 0,
      scale: 0.8,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => onClose(id)
    });
  };

  const config = {
    success: {
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
      progress: "bg-emerald-500"
    },
    error: {
      icon: AlertCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      progress: "bg-red-500"
    },
    warning: {
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      progress: "bg-amber-500"
    },
    info: {
      icon: Info,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      progress: "bg-blue-500"
    }
  };

  const { icon: Icon, color, bg, border, progress } = config[type];

  return (
    <div
      ref={toastRef}
      className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border shadow-lg ${bg} ${border}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 pt-0.5">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h4>
            {message && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {message}
              </p>
            )}
          </div>

          <button
            onClick={handleClose}
            className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-slate-200/50 dark:bg-slate-800/50">
        <div
          ref={progressRef}
          className={`h-full ${progress}`}
        />
      </div>
    </div>
  );
}

// Toast container
export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed bottom-0 right-0 z-50 flex flex-col gap-3 p-4 sm:p-6">
      {children}
    </div>
  );
}
