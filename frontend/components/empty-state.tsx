"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { LucideIcon } from "lucide-react";

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
    )
    // Icon bounce in
    .fromTo(iconRef.current,
      {
        scale: 0,
        rotation: -180
      },
      {
        scale: 1,
        rotation: 0,
        duration: 0.8,
        ease: "back.out(1.7)"
      },
      "-=0.4"
    )
    // Text fade in
    .fromTo(containerRef.current?.querySelectorAll('.fade-in-text') || [],
      {
        opacity: 0,
        y: 10
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: "power2.out"
      },
      "-=0.3"
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
      className="relative flex min-h-[400px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"
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
        className="relative z-10 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-violet-50 text-violet-600 shadow-sm dark:from-violet-950/30 dark:to-violet-900/20 dark:text-violet-400"
      >
        <Icon className="h-8 w-8" />
      </div>

      {/* Text */}
      <h3 className="fade-in-text relative z-10 mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="fade-in-text relative z-10 mb-6 max-w-md text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="fade-in-text relative z-10 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-violet-500/30 dark:from-violet-500 dark:to-violet-400"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
