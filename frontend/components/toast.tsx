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
      iconColor: "text-c-teal",
      leftBorder: "border-l-2 border-c-teal",
      progress: "bg-c-teal",
    },
    error: {
      icon: AlertCircle,
      iconColor: "text-c-red",
      leftBorder: "border-l-2 border-c-red",
      progress: "bg-c-red",
    },
    warning: {
      icon: AlertTriangle,
      iconColor: "text-c-amber",
      leftBorder: "border-l-2 border-c-amber",
      progress: "bg-c-amber",
    },
    info: {
      icon: Info,
      iconColor: "text-c-blue",
      leftBorder: "border-l-2 border-c-blue",
      progress: "bg-c-blue",
    },
  };

  const { icon: Icon, iconColor, leftBorder, progress } = config[type];

  return (
    <div
      ref={toastRef}
      className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-panel border border-c-border bg-c-surface shadow-card ${leftBorder}`}
    >
      <div className="p-[12px]">
        <div className="flex items-start gap-[10px]">
          <div className={`flex h-[28px] w-[28px] shrink-0 items-center justify-center ${iconColor}`}>
            <Icon className="h-[16px] w-[16px]" />
          </div>

          <div className="flex-1">
            <h4 className="text-[12px] font-medium text-c-text">
              {title}
            </h4>
            {message && (
              <p className="mt-[2px] text-[11px] text-c-muted">
                {message}
              </p>
            )}
          </div>

          <button
            onClick={handleClose}
            className="shrink-0 rounded-btn p-[3px] text-c-muted transition-colors hover:text-c-text"
          >
            <X className="h-[13px] w-[13px]" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] w-full bg-c-surface-2">
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
