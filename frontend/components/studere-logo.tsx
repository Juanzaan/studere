"use client";

import { memo, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface StudereLogoProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export const StudereLogo = memo(function StudereLogo({ size = 48, className = "", animated = true }: StudereLogoProps) {
  const containerRef = useRef<SVGSVGElement>(null);
  const circlesRef = useRef<SVGGElement>(null);
  const waveRef = useRef<SVGPathElement>(null);

  // Entrance animation
  useGSAP(() => {
    if (!animated) return;

    const tl = gsap.timeline();

    // Circles expand
    tl.fromTo(circlesRef.current?.children || [],
      {
        scale: 0,
        transformOrigin: "center"
      },
      {
        scale: 1,
        duration: 0.6,
        stagger: 0.1,
        ease: "back.out(1.7)"
      }
    )
    // Wave draw
    .fromTo(waveRef.current,
      {
        strokeDashoffset: 200
      },
      {
        strokeDashoffset: 0,
        duration: 0.8,
        ease: "power2.inOut"
      },
      "-=0.3"
    );

  }, { scope: containerRef });

  // Hover animation
  useGSAP(() => {
    if (!animated || !containerRef.current) return;

    const handleMouseEnter = () => {
      gsap.to(circlesRef.current?.children || [], {
        scale: 1.15,
        transformOrigin: "center",
        duration: 0.4,
        stagger: 0.05,
        ease: "power2.out"
      });

      gsap.to(waveRef.current, {
        strokeDashoffset: -200,
        duration: 1.5,
        ease: "none"
      });
    };

    const handleMouseLeave = () => {
      gsap.to(circlesRef.current?.children || [], {
        scale: 1,
        duration: 0.4,
        ease: "power2.out"
      });

      gsap.to(waveRef.current, {
        strokeDashoffset: 0,
        duration: 0.5,
        ease: "power2.out"
      });
    };

    const container = containerRef.current;
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, { scope: containerRef, dependencies: [animated] });

  return (
    <svg
      ref={containerRef}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`cursor-pointer ${className}`}
    >
      {/* Abstract circles - represent sound/waves */}
      <g ref={circlesRef}>
        {/* Outer ring */}
        <circle
          cx="32"
          cy="32"
          r="24"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.2"
          className="text-violet-500 dark:text-violet-400"
        />
        
        {/* Middle ring */}
        <circle
          cx="32"
          cy="32"
          r="18"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.4"
          className="text-violet-500 dark:text-violet-400"
        />
        
        {/* Inner solid circle */}
        <circle
          cx="32"
          cy="32"
          r="8"
          fill="currentColor"
          className="text-violet-500 dark:text-violet-400"
        />
      </g>

      {/* Abstract wave through center - represents audio/transcription */}
      <path
        ref={waveRef}
        d="M 8 32 Q 16 24, 24 32 T 40 32 T 56 32"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        className="text-fuchsia-500 dark:text-fuchsia-400"
      />
    </svg>
  );
});
