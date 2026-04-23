"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { LucideIcon } from "lucide-react";
import { useFadeInStagger, useScaleBounce } from "@/src/shared/hooks/useAnimations";

gsap.registerPlugin(useGSAP);

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  animated?: boolean;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  animated = true 
}: EmptyStateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  useFadeInStagger(containerRef, '.anim-text', { y: 10, stagger: 0.1, duration: 0.5 });
  useScaleBounce(iconRef, { fromScale: 0, duration: 0.8 });

  useGSAP(() => {
    if (!animated) return;

    const tl = gsap.timeline();

    // Particles float in
    tl.fromTo(particlesRef.current?.children || [],
      {
        scale: 0,
        opacity: 0,
        y: 20
      },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "back.out(1.7)"
      }
    );

    // Floating animation loop for particles
    gsap.to(particlesRef.current?.children || [], {
      y: (i) => `+=${gsap.utils.random(-10, 10)}`,
      x: (i) => `+=${gsap.utils.random(-10, 10)}`,
      duration: () => gsap.utils.random(3, 5),
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: {
        each: 0.2,
        from: "random"
      }
    });

    // Icon subtle pulse
    gsap.to(iconRef.current, {
      scale: 1.05,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });

  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-[400px] flex-col items-center justify-center rounded-panel border border-dashed border-c-border bg-c-surface p-12 text-center"
    >
      {/* Floating particles */}
      <div ref={particlesRef} className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
        <div className="absolute left-[15%] top-[20%] h-24 w-24 rounded-full bg-gradient-to-br from-violet-400/10 to-fuchsia-400/10 blur-2xl dark:from-violet-500/5 dark:to-fuchsia-500/5" />
        <div className="absolute right-[20%] top-[30%] h-20 w-20 rounded-full bg-gradient-to-br from-cyan-400/10 to-blue-400/10 blur-2xl dark:from-cyan-500/5 dark:to-blue-500/5" />
        <div className="absolute bottom-[25%] left-[25%] h-16 w-16 rounded-full bg-gradient-to-br from-amber-400/10 to-orange-400/10 blur-2xl dark:from-amber-500/5 dark:to-orange-500/5" />
        <div className="absolute bottom-[20%] right-[15%] h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400/10 to-teal-400/10 blur-2xl dark:from-emerald-500/5 dark:to-teal-500/5" />
      </div>

      {/* Icon */}
      <div
        ref={iconRef}
        className="relative z-10 mb-[16px] flex h-14 w-14 items-center justify-center rounded-panel border border-c-border bg-c-surface-2 text-c-blue"
      >
        <Icon className="h-6 w-6" />
      </div>

      {/* Text */}
      <h3 className="anim-text relative z-10 mb-[6px] text-[14px] font-medium text-c-text">
        {title}
      </h3>
      <p className="anim-text relative z-10 mb-[20px] max-w-md text-[12px] text-c-muted">
        {description}
      </p>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="anim-text relative z-10 rounded-btn border border-c-blue-border bg-c-blue-soft px-[14px] py-[7px] text-[12px] font-medium text-c-blue transition-colors hover:bg-c-blue-soft"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
