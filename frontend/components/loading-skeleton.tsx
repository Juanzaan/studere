"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { usePulseLoop } from "@/src/shared/hooks/useAnimations";

gsap.registerPlugin(useGSAP);

interface LoadingSkeletonProps {
  variant?: "card" | "list" | "hero" | "text" | "circle";
  className?: string;
  count?: number;
  animated?: boolean;
}

export function LoadingSkeleton({ 
  variant = "card", 
  className = "", 
  count = 1,
  animated = true 
}: LoadingSkeletonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!animated) return;
    const elements = containerRef.current?.querySelectorAll('.skeleton-pulse');
    if (elements) {
      gsap.to(elements, {
        opacity: 0.5,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.1
      });
    }
  }, { scope: containerRef });

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div ref={containerRef} className={className}>
      {items.map((i) => (
        <div key={i}>
          {variant === "card" && (
            <div className="rounded-card border border-c-border bg-c-surface p-6">
              <div className="space-y-4">
                <div className="skeleton-pulse h-4 w-24 rounded-full bg-c-surface-2" />
                <div className="skeleton-pulse h-8 w-full rounded-card bg-c-surface-2" />
                <div className="flex gap-2">
                  <div className="skeleton-pulse h-6 w-16 rounded-full bg-c-surface-2" />
                  <div className="skeleton-pulse h-6 w-20 rounded-full bg-c-surface-2" />
                </div>
              </div>
            </div>
          )}

          {variant === "list" && (
            <div className="flex items-center gap-4 rounded-card border border-c-border bg-c-surface p-4">
              <div className="skeleton-pulse h-12 w-12 rounded-card bg-c-surface-2" />
              <div className="flex-1 space-y-2">
                <div className="skeleton-pulse h-4 w-3/4 rounded-full bg-c-surface-2" />
                <div className="skeleton-pulse h-3 w-1/2 rounded-full bg-c-surface-2" />
              </div>
            </div>
          )}

          {variant === "hero" && (
            <div className="rounded-card border border-c-border bg-c-surface p-6">
              <div className="space-y-6">
                <div className="skeleton-pulse h-6 w-32 rounded-full bg-c-surface-2" />
                <div className="skeleton-pulse h-12 w-3/4 rounded-card bg-c-surface-2" />
                <div className="space-y-2">
                  <div className="skeleton-pulse h-4 w-full rounded-card bg-c-surface-2" />
                  <div className="skeleton-pulse h-4 w-5/6 rounded-card bg-c-surface-2" />
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {[...Array(5)].map((_, idx) => (
                    <div key={idx} className="skeleton-pulse h-24 rounded-card bg-c-surface-2" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {variant === "text" && (
            <div className="space-y-2">
              <div className="skeleton-pulse h-4 w-full rounded-card bg-c-surface-2" />
              <div className="skeleton-pulse h-4 w-5/6 rounded-card bg-c-surface-2" />
              <div className="skeleton-pulse h-4 w-4/6 rounded-card bg-c-surface-2" />
            </div>
          )}

          {variant === "circle" && (
            <div className="skeleton-pulse h-12 w-12 rounded-full bg-c-surface-2" />
          )}
        </div>
      ))}
    </div>
  );
}

// Specific skeleton components for common use cases
export function DashboardSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <LoadingSkeleton variant="hero" />
        <LoadingSkeleton variant="card" count={3} className="space-y-3" />
      </div>
      <div className="space-y-4">
        <LoadingSkeleton variant="card" count={2} />
      </div>
    </div>
  );
}

export function LibrarySkeleton() {
  return (
    <div className="rounded-panel border border-c-border bg-c-surface p-6">
      <div className="mb-6 space-y-4">
        <LoadingSkeleton variant="text" />
        <div className="skeleton-pulse h-10 w-full rounded-card bg-c-surface-2" />
      </div>
      <LoadingSkeleton variant="list" count={5} className="space-y-3" />
    </div>
  );
}

export function SessionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton-pulse h-8 w-3/4 rounded-card bg-c-surface-2" />
      <div className="grid gap-4 md:grid-cols-2">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" />
      </div>
      <LoadingSkeleton variant="text" count={1} className="space-y-2" />
      <div className="skeleton-pulse h-64 w-full rounded-panel bg-c-surface-2" />
    </div>
  );
}
