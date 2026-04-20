"use client";

import React from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function useFadeInStagger(
  containerRef: React.RefObject<Element>,
  selector: string,
  options: { y?: number; duration?: number; stagger?: number; delay?: number } = {}
) {
  useGSAP(() => {
    const elements = containerRef.current?.querySelectorAll(selector);
    if (!elements?.length) return;
    gsap.fromTo(elements,
      { autoAlpha: 0, y: options.y ?? 15 },
      { autoAlpha: 1, y: 0, duration: options.duration ?? 0.5,
        stagger: options.stagger ?? 0.08, delay: options.delay ?? 0,
        ease: 'power2.out' }
    );
  }, { scope: containerRef });
}

export function useScaleBounce(
  ref: React.RefObject<Element>,
  options: { fromScale?: number; duration?: number; delay?: number } = {}
) {
  useGSAP(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { scale: options.fromScale ?? 0.8, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: options.duration ?? 0.4,
        delay: options.delay ?? 0, ease: 'back.out(1.7)' }
    );
  }, { scope: ref });
}

export function usePulseLoop(
  ref: React.RefObject<Element>,
  options: { scale?: number; opacity?: number; duration?: number } = {}
) {
  useGSAP(() => {
    if (!ref.current) return;
    const props: gsap.TweenVars = {
      duration: options.duration ?? 1.5,
      repeat: -1, yoyo: true, ease: 'sine.inOut'
    };
    if (options.scale) props.scale = options.scale;
    if (options.opacity !== undefined) props.opacity = options.opacity;
    gsap.to(ref.current, props);
  }, { scope: ref });
}

export function useSlideIn(
  ref: React.RefObject<Element>,
  direction: 'right' | 'left' | 'up' | 'down' = 'right',
  options: { distance?: number; duration?: number } = {}
) {
  useGSAP(() => {
    if (!ref.current) return;
    const dist = options.distance ?? 400;
    const axis = direction === 'right' || direction === 'left' ? 'x' : 'y';
    const sign = direction === 'right' || direction === 'down' ? dist : -dist;
    gsap.fromTo(ref.current,
      { [axis]: sign, autoAlpha: 0, scale: 0.8 },
      { [axis]: 0, autoAlpha: 1, scale: 1,
        duration: options.duration ?? 0.5, ease: 'back.out(1.7)' }
    );
  }, { scope: ref });
}
