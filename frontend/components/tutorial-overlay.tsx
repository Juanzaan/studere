"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
} from "lucide-react";
import { IllustrationScene } from "@/components/illustration-scene";
import { prefersReducedMotion } from "@/src/shared/hooks/useAnimations";
import type { ReactNode } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

type TutorialPlacement = "center" | "bottom" | "top" | "left" | "right";

export interface TutorialStep {
  id: string;
  /** Title shown in the tooltip */
  title: string;
  /** Description shown in the tooltip */
  description: string;
  /**
   * Override description for mobile — use when the target and purpose change
   * (e.g. "Presioná ☰ para abrir el menú" instead of "Usá la barra lateral").
   */
  mobileDescription?: string;
  /** CSS selector for the element to highlight (omit for center overlay) */
  target?: string;
  /**
   * CSS selector for mobile — overrides `target` on narrow viewports.
   * Use when the desktop target is hidden on mobile (e.g. sidebar → hamburger).
   */
  mobileTarget?: string;
  /** Tooltip placement relative to the target. Defaults to "bottom" */
  placement?: TutorialPlacement;
  /** Tooltip placement on mobile — overrides `placement` on narrow viewports. */
  mobilePlacement?: TutorialPlacement;
  /**
   * Whether this step blocks interaction with the page behind.
   * - `true`  → backdrop blocks clicks (pasos informativos: bienvenida, cierre)
   * - `false` → user can click the highlighted element (pasos click-through)
   * Defaults to `false`. Center-placement steps default to `true`.
   */
  blocking?: boolean;
  /** Illustration to show — built-in placeholder key or ReactNode */
  illustration?: ReactNode | "placeholder-study" | "placeholder-celebration";
}

interface SpotlightRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface TutorialOverlayProps {
  /** The sequence of tutorial steps */
  steps: TutorialStep[];
  /** Called when the tutorial is completed or dismissed */
  onComplete: () => void;
  /** Initial step index (default 0) */
  initialStep?: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "studere.tutorial.completed";

/** Default tutorial steps for Studere */
export const DEFAULT_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "¡Bienvenido a Studere!",
    description:
      "Studere convierte tus grabaciones de clase en paquetes completos de estudio con resúmenes, flashcards, quizzes, mapas mentales y más — todo generado con IA.",
    placement: "center",
    blocking: true,
    illustration: "placeholder-study",
  },
  {
    id: "sidebar",
    title: "Navegá por la app",
    description:
      "Usá la barra lateral para ir a Inicio, Biblioteca, Próximos, Destacados y Estadísticas. Cada sección te ayuda a organizar tu estudio de forma distinta.",
    mobileDescription:
      "Presioná el botón ☰ para abrir el menú de navegación. Desde ahí podés ir a Inicio, Biblioteca, Próximos, Destacados y Estadísticas.",
    target: "#navigation",
    mobileTarget: "[aria-label='Abrir menú de navegación']",
    placement: "right",
    mobilePlacement: "bottom",
    blocking: false,
  },
  {
    id: "topbar",
    title: "Búsqueda y herramientas",
    description:
      "Desde la barra superior podés buscar sesiones con Ctrl+K, cambiar entre tema claro/oscuro, y acceder a tu perfil y notificaciones.",
    target: "header",
    placement: "bottom",
    blocking: false,
  },
  {
    id: "composer",
    title: "Creá material de estudio",
    description:
      "Subí un audio, pegá tu transcript o escribí notas. La IA genera automáticamente: resumen explicativo, flashcards, quiz interactivo, mapa mental y ejercicios prácticos.",
    target: "[data-tutorial='composer']",
    placement: "bottom",
    blocking: false,
  },
  {
    id: "wrap-up",
    title: "¡Todo listo para estudiar!",
    description:
      "Creá tu primera sesión y explorá las pestañas de resumen, flashcards, quiz interactivo, mapa mental y ejercicios. Stude, tu tutor IA, te va a acompañar en cada paso.",
    placement: "center",
    blocking: true,
    illustration: "placeholder-celebration",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler as EventListener);
    return () => mq.removeEventListener("change", handler as EventListener);
  }, []);
  return mobile;
}

function prefersReduced(): boolean {
  return typeof window !== "undefined" && prefersReducedMotion();
}

/** Check if the tutorial has been completed before */
export function isTutorialCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/** Mark the tutorial as completed */
export function markTutorialCompleted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // localStorage not available
  }
}

/** Reset the tutorial completion flag (for re-launch) */
export function resetTutorialCompleted(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage not available
  }
}

// ─── Tooltip position calculator ──────────────────────────────────────────

function calcTooltipPosition(
  rect: SpotlightRect | null,
  placement: TutorialPlacement,
  tooltipWidth: number,
  tooltipHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  isMobile: boolean,
  margin = 12,
): { top: number; left: number; arrow: "top" | "bottom" | "left" | "right" | "none" } {
  // Default for "center" placement
  if (!rect || placement === "center") {
    return {
      top: isMobile ? viewportHeight * 0.55 : viewportHeight * 0.52,
      left: viewportWidth / 2 - tooltipWidth / 2,
      arrow: "none",
    };
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let top: number;
  let left: number;
  let arrow: "top" | "bottom" | "left" | "right" | "none";

  switch (placement) {
    case "top":
      top = rect.top - tooltipHeight - margin;
      left = centerX - tooltipWidth / 2;
      arrow = "bottom";
      break;
    case "bottom":
      top = rect.bottom + margin;
      left = centerX - tooltipWidth / 2;
      arrow = "top";
      break;
    case "left":
      top = centerY - tooltipHeight / 2;
      left = rect.left - tooltipWidth - margin;
      arrow = "right";
      break;
    case "right":
      top = centerY - tooltipHeight / 2;
      left = rect.right + margin;
      arrow = "left";
      break;
    default:
      top = rect.bottom + margin;
      left = centerX - tooltipWidth / 2;
      arrow = "top";
  }

  // Clamp to viewport
  left = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin));
  top = Math.max(margin, Math.min(top, viewportHeight - tooltipHeight - margin));

  return { top, left, arrow };
}

// ─── Spotlight rectangle getter ──────────────────────────────────────────

function getTargetRect(selector: string): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

// ─── Component ────────────────────────────────────────────────────────────

export function TutorialOverlay({
  steps,
  onComplete,
  initialStep = 0,
}: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(initialStep);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrow: "bottom" | "top" | "left" | "right" | "none" }>({ top: 0, left: 0, arrow: "none" });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // ── Update viewport on resize ──────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const update = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Resolve effective target + placement for current viewport ────────
  const effectiveTarget =
    isMobile && step.mobileTarget ? step.mobileTarget : step.target;
  const effectivePlacement =
    isMobile && step.mobilePlacement ? step.mobilePlacement : step.placement;
  const effectiveDescription = isMobile && step.mobileDescription
    ? step.mobileDescription
    : step.description;

  // ── Recalculate spotlight + tooltip position ──────────────────────────
  const recalculate = useCallback(() => {
    if (!effectiveTarget || effectivePlacement === "center") {
      setSpotlight(null);
      return;
    }

    const rect = getTargetRect(effectiveTarget);
    if (!rect) {
      setSpotlight(null);
      return;
    }

    // Safety guard: if target is outside the viewport (e.g. hidden sidebar on mobile
    // without mobileTarget), null the spotlight and let the component fall back to
    // a center-positioned tooltip with no backdrop.
    const withinViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth;

    if (!withinViewport) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[Tutorial] Step "${step?.id}" target "${effectiveTarget}" is outside viewport, ` +
          `falling back to center without spotlight. ` +
          `Consider setting mobileTarget for this step.`,
        );
      }
      setSpotlight(null);
      return;
    }

    setSpotlight(rect);
  }, [effectiveTarget, effectivePlacement, step?.id]);

  // Recalculate on step change, scroll, and resize
  useEffect(() => {
    recalculate();
  }, [recalculate, stepIndex, viewport]);

  useEffect(() => {
    if (!effectiveTarget || effectivePlacement === "center") return;

    const handleScroll = () => recalculate();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [effectiveTarget, effectivePlacement, recalculate]);

  // Observe tooltip ref to measure its actual rendered size
  useEffect(() => {
    if (!tooltipRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { inlineSize, blockSize } = entry.contentBoxSize[0] ?? {};
        if (inlineSize && blockSize) {
          setTooltipSize({ width: inlineSize, height: blockSize });
        }
      }
    });
    ro.observe(tooltipRef.current);
    return () => ro.disconnect();
  }, [stepIndex]);

  // ── Position tooltip based on calculated values ────────────────────────
  useEffect(() => {
    if (!mounted) return;

    const tw = tooltipSize.width || (isMobile ? 280 : 320);
    const th = tooltipSize.height || 200;

    if (effectivePlacement === "center") {
      const top = isMobile ? viewport.height * 0.52 : viewport.height * 0.48;
      const left = isMobile ? 16 : viewport.width / 2 - tw / 2;
      setTooltipPos({ top, left, arrow: "none" });
    } else {
      const pos = calcTooltipPosition(
        spotlight,
        effectivePlacement || "bottom",
        tw,
        th,
        viewport.width,
        viewport.height,
        isMobile,
      );
      setTooltipPos(pos);
    }
  }, [spotlight, effectivePlacement, tooltipSize, viewport, isMobile, mounted]);

  // ── Announce step to screen readers ───────────────────────────────────
  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `Tutorial: paso ${stepIndex + 1} de ${steps.length}. ${step.title}: ${step.description}`;
    }
  }, [stepIndex, step, steps.length]);

  // ── Focus the tooltip on mount ─────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      tooltipRef.current?.focus({ preventScroll: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [stepIndex]);

  // ── Keyboard nav ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        if (isLast) {
          handleComplete();
        } else {
          setStepIndex((i) => i + 1);
        }
      }
      if (e.key === "ArrowLeft") {
        if (!isFirst) {
          e.preventDefault();
          setStepIndex((i) => Math.max(i - 1, 0));
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleComplete();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isFirst, isLast, stepIndex, steps.length]);

  function handleNext() {
    if (isLast) {
      handleComplete();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handlePrev() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function handleComplete() {
    markTutorialCompleted();
    onComplete();
  }

  function handleSkip() {
    handleComplete();
  }

  // ── Don't render until mounted (avoids flash of misplaced tooltip) ────
  const isCenter =
    effectivePlacement === "center" || (!effectiveTarget && !spotlight);

  const isBlocking = step.blocking ?? (step.placement === "center");

  if (!mounted) return null;
  if (!step) return null;

  return (
    <>
      {/* ── Visually hidden live region ──────────────────────────────── */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* ── Backdrop with spotlight ──────────────────────────────────── */}
      {/* z-[60] is above sidebar (z-40), topbar (z-20), Stude chat (z-40),
           mobile hamburger (z-50) — but below tooltip (z-[70])           */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ pointerEvents: isBlocking ? "auto" : "none" }}
        aria-hidden={!isBlocking}
      >
        {/* The spotlight "hole" div: box-shadow creates the dark overlay */}
        {!isCenter && spotlight && (
          <div
            className="absolute rounded-[8px]"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
              pointerEvents: "none",
              transition: prefersReduced()
                ? "none"
                : "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        )}

        {/* Full-screen overlay when blocking or when target is off-screen */}
        {isBlocking && (
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            style={{ pointerEvents: "auto" }}
            onClick={handleSkip}
          />
        )}
      </div>

      {/* ── Tooltip card ─────────────────────────────────────────────── */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-label={`Tutorial: paso ${stepIndex + 1} de ${steps.length}`}
        aria-modal={isBlocking ? "true" : "false"}
        tabIndex={-1}
        className="fixed z-[70] w-[300px] rounded-[16px] border border-c-border bg-c-surface shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-c-violet/40"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          transition: prefersReduced()
            ? "none"
            : "top 0.3s cubic-bezier(0.22, 1, 0.36, 1), left 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Arrow indicator */}
        {tooltipPos.arrow !== "none" && (
          <div
            className="absolute h-3 w-3 rotate-45 border-c-border bg-c-surface"
            style={{
              [tooltipPos.arrow === "top"
                ? "top"
                : tooltipPos.arrow === "bottom"
                  ? "bottom"
                  : tooltipPos.arrow === "left"
                    ? "left"
                    : "right"]: -6,
              [tooltipPos.arrow === "top" || tooltipPos.arrow === "bottom"
                ? "left"
                : "top"]: "50%",
              marginLeft: tooltipPos.arrow === "top" || tooltipPos.arrow === "bottom" ? -6 : 0,
              marginTop: tooltipPos.arrow === "left" || tooltipPos.arrow === "right" ? -6 : 0,
              borderWidth:
                tooltipPos.arrow === "top"
                  ? "0 0 1px 1px"
                  : tooltipPos.arrow === "bottom"
                    ? "1px 1px 0 0"
                    : tooltipPos.arrow === "left"
                      ? "1px 0 0 1px"
                      : "0 1px 1px 0",
            }}
          />
        )}

        {/* Illustration */}
        {step.illustration && (
          <div className="px-6 pt-5">
            <IllustrationScene
              src={step.illustration as any}
              animation={{
                delay: 0.1,
                floatLayers: ["sparkles", "dots", "confetti"],
              }}
              className="mx-auto h-28 w-28"
              aspectRatio={1}
            />
          </div>
        )}

        {/* Content */}
        <div className="px-5 pb-4 pt-3">
          {/* Step indicator */}
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-c-violet-soft px-2.5 py-0.5 text-[10px] font-semibold text-c-violet">
              {stepIndex + 1}/{steps.length}
            </span>
          </div>

          <h3 className="text-[14px] font-semibold text-c-text">
            {step.title}
          </h3>

          <p className="mt-1.5 text-[12px] leading-relaxed text-c-muted">
            {effectiveDescription}
          </p>

          {/* Navigation buttons */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  aria-label="Paso anterior"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-c-border text-c-muted transition-colors hover:bg-c-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-c-violet/40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSkip}
                aria-label="Saltar tutorial"
                className="rounded-[8px] px-3 py-1.5 text-[11px] font-medium text-c-muted transition-colors hover:bg-c-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-c-violet/40"
              >
                {isLast ? "Cerrar" : "Saltar"}
              </button>
              <button
                onClick={handleNext}
                aria-label={isLast ? "Finalizar tutorial" : "Siguiente paso"}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-c-violet px-3.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-c-violet/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-c-violet/40"
              >
                {isLast ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Listo
                  </>
                ) : (
                  <>
                    Siguiente
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Tutorial trigger button (for sidebar / settings) ──────────────────────

interface TutorialTriggerProps {
  /** Called to restart the tutorial */
  onRestart: () => void;
  /** Compact mode for collapsed sidebar */
  compact?: boolean;
}

export function TutorialTrigger({ onRestart, compact }: TutorialTriggerProps) {
  return (
    <button
      onClick={() => {
        resetTutorialCompleted();
        onRestart();
      }}
      title={compact ? "Reiniciar tutorial" : undefined}
      aria-label="Reiniciar tutorial de bienvenida"
      className={`flex items-center rounded-input text-c-muted transition-colors hover:bg-c-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-c-violet ${
        compact
          ? "mx-auto h-[34px] w-[34px] justify-center"
          : "w-full gap-[9px] px-[10px] py-[6px]"
      }`}
    >
      <RotateCcw className="h-[14px] w-[14px] shrink-0" />
      {!compact && <span className="text-[12px]">Tutorial</span>}
    </button>
  );
}
