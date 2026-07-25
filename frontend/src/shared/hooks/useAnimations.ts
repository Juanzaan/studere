"use client";

import React, { useEffect, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// ─── Shared animation config ───────────────────────────────────────────────
// All animations across the app use these defaults for consistency.
export const ANIMATION_CONFIG = {
  duration: { fast: 0.2, normal: 0.35, slow: 0.5, stagger: 0.06 },
  ease: {
    out: "power2.out",
    inOut: "power2.inOut",
    bounce: "back.out(1.7)",
    smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
  },
  distance: { y: 16, x: 12, slide: 400 },
  /** On narrow viewports (<768px) distances and durations are reduced */
  mobile: {
    distance: { y: 8, x: 6, slide: 100 },
    duration: { fast: 0.15, normal: 0.25, slow: 0.35, stagger: 0.04 },
  },
} as const;

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

/** Resolve a config value — if mobile and a mobile override exists, use it. */
function cfg<T>(mobile: boolean, normal: T, mobileVal: T): T {
  return mobile ? mobileVal : normal;
}

// ─── prefers-reduced-motion SSOT ───────────────────────────────────────────
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

/**
 * Staggered fade-in + slide-up for child elements selected by `selector`.
 * Respects prefers-reduced-motion (no animation) and mobile breakpoints.
 */
export function useFadeInStagger(
  containerRef: React.RefObject<Element>,
  selector: string,
  options: {
    y?: number;
    duration?: number;
    stagger?: number;
    delay?: number;
    /** Starting scale (1 = no scale). E.g. 0.96 gives a subtle "zoom in" feel. */
    scale?: number;
    /** GSAP easing string. Defaults to "power2.out". Use "smooth" for the custom cubic-bezier. */
    ease?: string;
  } = {},
) {
  const isMobile = useIsMobile();

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const elements = containerRef.current?.querySelectorAll(selector);
    if (!elements?.length) return;

    const y = options.y ?? cfg(isMobile, ANIMATION_CONFIG.distance.y, ANIMATION_CONFIG.mobile.distance.y);
    gsap.fromTo(
      elements,
      { autoAlpha: 0, y, scale: options.scale ?? 1 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: options.duration ?? cfg(isMobile, ANIMATION_CONFIG.duration.normal, ANIMATION_CONFIG.mobile.duration.normal),
        stagger: options.stagger ?? cfg(isMobile, ANIMATION_CONFIG.duration.stagger, ANIMATION_CONFIG.mobile.duration.stagger),
        delay: options.delay ?? 0,
        ease: ANIMATION_CONFIG.ease[options.ease as keyof typeof ANIMATION_CONFIG.ease] ?? options.ease ?? ANIMATION_CONFIG.ease.out,
      },
    );
  }, { scope: containerRef });
}

/**
 * Scale bounce entrance — great for badges, stat numbers, buttons.
 */
export function useScaleBounce(
  ref: React.RefObject<Element>,
  options: { fromScale?: number; duration?: number; delay?: number } = {},
) {
  const isMobile = useIsMobile();

  useGSAP(() => {
    if (prefersReducedMotion() || !ref.current) return;
    gsap.fromTo(
      ref.current,
      { scale: options.fromScale ?? 0.8, autoAlpha: 0 },
      {
        scale: 1,
        autoAlpha: 1,
        duration: options.duration ?? cfg(isMobile, ANIMATION_CONFIG.duration.normal, ANIMATION_CONFIG.mobile.duration.normal),
        delay: options.delay ?? 0,
        ease: ANIMATION_CONFIG.ease.bounce,
      },
    );
  }, { scope: ref });
}

/**
 * Continuous pulse loop — use sparingly (recording indicator, loading dots).
 */
export function usePulseLoop(
  ref: React.RefObject<Element>,
  options: { scale?: number; opacity?: number; duration?: number } = {},
) {
  useGSAP(() => {
    if (prefersReducedMotion() || !ref.current) return;
    const props: gsap.TweenVars = {
      duration: options.duration ?? 1.5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    };
    if (options.scale) props.scale = options.scale;
    if (options.opacity !== undefined) props.opacity = options.opacity;
    gsap.to(ref.current, props);
  }, { scope: ref });
}

/**
 * Slide in from a direction — for panels, modals, toasts.
 * On mobile the slide distance is reduced.
 */
export function useSlideIn(
  ref: React.RefObject<Element>,
  direction: "right" | "left" | "up" | "down" = "right",
  options: { distance?: number; duration?: number } = {},
) {
  const isMobile = useIsMobile();

  useGSAP(() => {
    if (prefersReducedMotion() || !ref.current) return;
    const dist = options.distance ?? cfg(isMobile, ANIMATION_CONFIG.distance.slide, ANIMATION_CONFIG.mobile.distance.slide);
    const axis = direction === "right" || direction === "left" ? "x" : "y";
    const sign = direction === "right" || direction === "down" ? dist : -dist;
    gsap.fromTo(
      ref.current,
      { [axis]: sign, autoAlpha: 0, scale: 0.95 },
      {
        [axis]: 0,
        autoAlpha: 1,
        scale: 1,
        duration: options.duration ?? cfg(isMobile, ANIMATION_CONFIG.duration.normal, ANIMATION_CONFIG.mobile.duration.normal),
        ease: ANIMATION_CONFIG.ease.bounce,
      },
    );
  }, { scope: ref });
}

// ─── New: Entrance stagger (list/item groups) ──────────────────────────────

/**
 * Staggered entrance with slide-up for a list of refs or container children.
 * Unlike `useFadeInStagger` (querySelector-based), this one takes an array of
 * refs — useful when items are virtualised or dynamically generated.
 */
export function useStaggeredList(
  itemsRefs: React.RefObject<Element>[],
  options: {
    y?: number;
    duration?: number;
    stagger?: number;
    delay?: number;
  } = {},
) {
  const isMobile = useIsMobile();

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const valid = itemsRefs.map((r) => r.current).filter(Boolean);
    if (!valid.length) return;

    const y = options.y ?? cfg(isMobile, ANIMATION_CONFIG.distance.y, ANIMATION_CONFIG.mobile.distance.y);
    gsap.fromTo(
      valid,
      { autoAlpha: 0, y },
      {
        autoAlpha: 1,
        y: 0,
        duration: options.duration ?? cfg(isMobile, ANIMATION_CONFIG.duration.normal, ANIMATION_CONFIG.mobile.duration.normal),
        stagger: options.stagger ?? cfg(isMobile, ANIMATION_CONFIG.duration.stagger, ANIMATION_CONFIG.mobile.duration.stagger),
        delay: options.delay ?? 0,
        ease: ANIMATION_CONFIG.ease.out,
      },
    );
  });
}

// ─── Utility: animate panel switch ─────────────────────────────────────────

/**
 * Smooth panel transition: quickly fade-out the old panel, then fade-in the new.
 * Returns a promise that resolves when the entrance completes.
 */
export function animatePanelSwitch(
  container: Element,
  options?: { exitDuration?: number; enterDuration?: number },
): Promise<void> {
  if (prefersReducedMotion()) return Promise.resolve();

  return new Promise((resolve) => {
    const children = Array.from(container.children) as HTMLElement[];
    const tl = gsap.timeline({
      onComplete: () => resolve(),
    });

    tl.to(children, {
      autoAlpha: 0,
      y: -8,
      duration: options?.exitDuration ?? 0.15,
      ease: "power2.in",
      stagger: { each: 0.02, from: "end" },
    });

    tl.set(children, { y: 12, clearProps: "y" }, "+=0.05");

    tl.to(children, {
      autoAlpha: 1,
      y: 0,
      duration: options?.enterDuration ?? 0.3,
      ease: ANIMATION_CONFIG.ease.smooth,
      stagger: { each: 0.04, from: "start" },
    });
  });
}
