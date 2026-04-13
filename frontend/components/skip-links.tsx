"use client";

import Link from "next/link";

/**
 * Skip links para navegación rápida con teclado
 * WCAG 2.1 Level A (2.4.1 Bypass Blocks)
 */
export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <Link
        href="#main-content"
        className="fixed left-4 top-4 z-[9999] rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
      >
        Saltar al contenido principal
      </Link>
      <Link
        href="#navigation"
        className="fixed left-4 top-16 z-[9999] rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
      >
        Saltar a la navegación
      </Link>
    </div>
  );
}
