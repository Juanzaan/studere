"use client";

import { useRef, useEffect, useCallback, ReactNode, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/dist/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/dist/MorphSVGPlugin";
import { ANIMATION_CONFIG } from "@/src/shared/hooks/useAnimations";
import {
  PlaceholderStudy,
  PlaceholderEmptyState,
  PlaceholderCelebration,
} from "@/lib/illustrations/placeholders";

gsap.registerPlugin(useGSAP, DrawSVGPlugin, MorphSVGPlugin);

// ─── Types ─────────────────────────────────────────────────────────────────

type PlaceholderKey = "placeholder-study" | "placeholder-empty" | "placeholder-celebration";

export interface IllustrationAnimationOptions {
  /** Delay before the entrance animation starts (seconds) */
  delay?: number;
  /** Stagger gap between each layer (seconds) */
  stagger?: number;
  /** Duration of each layer's entrance (seconds) */
  duration?: number;
  /** Which layer IDs (data-layer-name) should float/breathe continuously */
  floatLayers?: string[];
  /** Float amplitude in pixels */
  floatAmplitude?: number;
  /** Float cycle duration in seconds */
  floatDuration?: number;
  /** Which layer IDs should draw-in with DrawSVG (only stroked paths) */
  drawLayers?: string[];
  /** Layers to skip from the initial stagger entrance (e.g. background) */
  skipEntrance?: string[];
}

export interface IllustrationSceneProps {
  /** A React SVG element, or a built-in placeholder key */
  src?: ReactNode | PlaceholderKey;
  /** Per-layer animation configuration */
  animation?: IllustrationAnimationOptions;
  /** Optional className for the svg wrapper */
  className?: string;
  /** Aspect ratio: width/height. Default 200/180 ≈ 1.11 */
  aspectRatio?: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler as EventListener);
    return () => mq.removeEventListener("change", handler as EventListener);
  }, []);
  return mobile;
}

/**
 * Resolve built-in placeholder component by key.
 */
function resolvePlaceholder(key: PlaceholderKey): ReactNode {
  switch (key) {
    case "placeholder-study":
      return <PlaceholderStudy />;
    case "placeholder-empty":
      return <PlaceholderEmptyState />;
    case "placeholder-celebration":
      return <PlaceholderCelebration />;
  }
}

const BASE_VIEWBOX_W = 200;
const BASE_VIEWBOX_H = 180;

// ─── Component ─────────────────────────────────────────────────────────────

export function IllustrationScene({
  src = "placeholder-study",
  animation = {},
  className = "",
  aspectRatio = BASE_VIEWBOX_W / BASE_VIEWBOX_H,
}: IllustrationSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isMobile = useIsMobile();

  // Resolve what to render
  const illustration: ReactNode =
    typeof src === "string" && src in PLACEHOLDER_KEY_MAP
      ? resolvePlaceholder(src as PlaceholderKey)
      : src;

  // ─── Entrance stagger + draw-in ─────────────────────────────────────────
  useGSAP(() => {
    if (prefersReducedMotion() || !svgRef.current) return;

    const svg = svgRef.current;
    const layers = Array.from(svg.querySelectorAll<SVGGElement>("[data-layer-name]"));
    if (!layers.length) return;

    const {
      delay = 0,
      stagger = isMobile ? 0.04 : 0.06,
      duration = isMobile ? 0.25 : 0.4,
      floatLayers = [],
      drawLayers = [],
      skipEntrance = [],
    } = animation;

    // -- Entrance: stagger those not skipped --
    const entranceLayers = layers.filter(
      (el) => !skipEntrance.includes(el.getAttribute("data-layer-name") || ""),
    );

    // Set initial hidden state
    gsap.set(entranceLayers, { autoAlpha: 0, y: isMobile ? 8 : 16 });

    // Animate in with stagger
    gsap.to(entranceLayers, {
      autoAlpha: 1,
      y: 0,
      duration,
      stagger,
      delay,
      ease: ANIMATION_CONFIG.ease.smooth,
    });

    // -- Draw-in for stroked paths --
    if (drawLayers.length > 0) {
      drawLayers.forEach((layerName) => {
        const group = svg.querySelector<SVGGElement>(
          `[data-layer-name="${layerName}"]`,
        );
        if (!group) return;

        // Target all <path>, <line>, <circle>, <rect> inside the group
        const drawTargets = group.querySelectorAll("path, line, circle, rect");
        if (!drawTargets.length) return;

        gsap.fromTo(
          drawTargets,
          { drawSVG: "0%" },
          {
            drawSVG: "100%",
            duration: duration * 1.5,
            delay: delay + layers.indexOf(group) * stagger + 0.1,
            ease: ANIMATION_CONFIG.ease.out,
          },
        );
      });
    }

    // -- Float loops ────────────────────────────────────────────────────
    if (floatLayers.length > 0) {
      const floatAmp = isMobile ? 3 : (animation.floatAmplitude ?? 5);
      const floatDur = animation.floatDuration ?? 2.5;

      floatLayers.forEach((layerName) => {
        const group = svg.querySelector<SVGGElement>(
          `[data-layer-name="${layerName}"]`,
        );
        if (!group) return;

        gsap.to(group, {
          y: -floatAmp,
          duration: floatDur,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: Math.random() * 0.5, // offset so they don't all move in sync
        });
      });

      // Also float sparkle dots individually with a subtle secondary bob
      const sparkleDots = svg.querySelectorAll<SVGCircleElement>(
        "[data-layer-name='sparkles'] circle, [data-layer-name='dots'] circle, [data-layer-name='confetti'] circle",
      );
      sparkleDots.forEach((dot) => {
        gsap.to(dot, {
          y: -3,
          opacity: 0.6,
          duration: 1.5 + Math.random(),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: Math.random() * 2,
        });
      });
    }

    // -- Pulse rings ────────────────────────────────────────────────────
    if (!skipEntrance.includes("rings")) {
      const ring = svg.querySelector<SVGCircleElement>("[data-layer-name='rings'] circle");
      if (ring) {
        gsap.to(ring, {
          scale: 1.1,
          opacity: 0.08,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          transformOrigin: "center center",
          delay: 0.5,
        });
      }
    }
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className={`illustration-scene overflow-hidden ${className}`}
      style={{ aspectRatio: `${aspectRatio}` }}
      role="img"
      aria-label="Ilustración decorativa"
    >
      <div ref={svgRef as any} className="h-full w-full">
        {illustration}
      </div>
    </div>
  );
}

// Quick lookup for type narrowing
const PLACEHOLDER_KEY_MAP: Record<string, boolean> = {
  "placeholder-study": true,
  "placeholder-empty": true,
  "placeholder-celebration": true,
};

// ─── Imperative API (for re-triggering) ────────────────────────────────────

/**
 * Manually re-trigger the entrance animation on an IllustrationScene.
 * Useful when the illustration enters the viewport later (e.g. scroll-triggered).
 */
export function animateIllustrationIn(
  container: HTMLElement,
  options?: {
    stagger?: number;
    duration?: number;
    delay?: number;
  },
) {
  if (prefersReducedMotion()) return;

  const layers = Array.from(
    container.querySelectorAll<SVGGElement>("[data-layer-name]"),
  ).filter(
    (el) =>
      !["bg-circle", "bg", "glow", "rings"].includes(
        el.getAttribute("data-layer-name") || "",
      ),
  );

  if (!layers.length) return;

  gsap.fromTo(
    layers,
    { autoAlpha: 0, y: 16 },
    {
      autoAlpha: 1,
      y: 0,
      duration: options?.duration ?? 0.35,
      stagger: options?.stagger ?? 0.06,
      delay: options?.delay ?? 0,
      ease: ANIMATION_CONFIG.ease.smooth,
    },
  );
}
