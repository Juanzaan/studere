"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { AlertTriangle, X } from "lucide-react";

gsap.registerPlugin(useGSAP);

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "warning",
  onConfirm,
  onCancel
}: ConfirmationDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!isOpen) return;

    const tl = gsap.timeline();

    // Overlay fade in
    tl.fromTo(overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.2, ease: "power2.out" }
    )
    // Dialog scale in
    .fromTo(dialogRef.current,
      {
        scale: 0.8,
        opacity: 0,
        y: 20
      },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: "back.out(1.7)"
      },
      "-=0.1"
    );

  }, { dependencies: [isOpen], scope: overlayRef });

  const handleClose = () => {
    const tl = gsap.timeline();
    
    tl.to(dialogRef.current, {
      scale: 0.8,
      opacity: 0,
      y: 20,
      duration: 0.2,
      ease: "power2.in"
    })
    .to(overlayRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: onCancel
    }, "-=0.1");
  };

  const handleConfirm = () => {
    const tl = gsap.timeline();
    
    tl.to(dialogRef.current, {
      scale: 0.8,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in"
    })
    .to(overlayRef.current, {
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: onConfirm
    }, "-=0.1");
  };

  if (!isOpen) return null;

  const variants = {
    danger: {
      icon: "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400",
      button: "bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600"
    },
    warning: {
      icon: "bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
      button: "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
    },
    info: {
      icon: "bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
      button: "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
    }
  };

  const config = variants[variant];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${config.icon}`}>
          <AlertTriangle className="h-6 w-6" />
        </div>

        {/* Content */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${config.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
