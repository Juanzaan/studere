"use client";

import Link from "next/link";

/**
 * Skip links for keyboard navigation — WCAG 2.1 Level A (2.4.1 Bypass Blocks).
 *
 * Renders two hidden links that become visible on focus:
 * 1. "Saltar al contenido principal" → `#main-content`
 * 2. "Saltar a la navegación" → `#navigation`
 *
 * Using `sr-only focus-within:not-sr-only` pattern for visibility.
 */
export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <Link
        href="#main-content"
        className="fixed left-4 top-4 z-[9999] rounded-btn bg-c-blue px-4 py-2 text-sm font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-c-blue-border focus:ring-offset-2"
      >
        Saltar al contenido principal
      </Link>
      <Link
        href="#navigation"
        className="fixed left-4 top-16 z-[9999] rounded-btn bg-c-blue px-4 py-2 text-sm font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-c-blue-border focus:ring-offset-2"
      >
        Saltar a la navegación
      </Link>
    </div>
  );
}
