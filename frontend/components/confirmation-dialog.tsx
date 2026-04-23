"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { AlertTriangle, X } from "lucide-react";
import { useScaleBounce } from "@/src/shared/hooks/useAnimations";

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

  useScaleBounce(dialogRef, { fromScale: 0.8, duration: 0.3 });

  useGSAP(() => {
    if (!isOpen) return;

    // Overlay fade in
    gsap.fromTo(overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.2, ease: "power2.out" }
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
      icon: "bg-c-red-soft text-c-red",
      button: "bg-c-red-soft border border-c-red-border text-c-red hover:bg-c-red/20",
    },
    warning: {
      icon: "bg-c-amber-soft text-c-amber",
      button: "bg-c-blue-soft border border-c-blue-border text-c-blue",
    },
    info: {
      icon: "bg-c-blue-soft text-c-blue",
      button: "bg-c-blue-soft border border-c-blue-border text-c-blue",
    },
  };

  const config = variants[variant];

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[380px] rounded-panel border border-c-border bg-c-surface p-[20px] shadow-card"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-[12px] top-[12px] rounded-btn p-[4px] text-c-muted transition-colors hover:bg-c-surface-2 hover:text-c-text"
        >
          <X className="h-[14px] w-[14px]" />
        </button>

        {/* Icon */}
        <div className={`flex h-[36px] w-[36px] items-center justify-center rounded-panel ${config.icon}`}>
          <AlertTriangle className="h-[18px] w-[18px]" />
        </div>

        {/* Content */}
        <div className="mt-[12px]">
          <h3 className="text-[14px] font-semibold text-c-text">
            {title}
          </h3>
          <p className="mt-[6px] text-[12px] leading-relaxed text-c-muted">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-[16px] flex gap-[8px]">
          <button
            onClick={handleClose}
            className="flex-1 rounded-btn border border-c-border px-[14px] py-[7px] text-[12px] font-medium text-c-muted transition-colors hover:bg-c-surface-2"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 rounded-btn px-[14px] py-[7px] text-[12px] font-medium transition-colors ${config.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
