"use client";

/**
 * Theme management — persists light/dark preference to localStorage
 * and syncs the `.dark` class on `<html>`.
 *
 * Falls back to OS preference (prefers-color-scheme) if no stored preference.
 * SSR-safe: returns "light" when `window` is undefined.
 */

const STORAGE_KEY = "studere-theme";

/** Available theme options. */
export type Theme = "light" | "dark";

/**
 * Get the currently stored theme, or detect from OS preference.
 * Returns "light" as default during SSR.
 */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  if (stored === "dark" || stored === "light") return stored;
  // Respect OS preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

/**
 * Set the theme and persist to localStorage.
 * Toggles the "dark" class on `document.documentElement`.
 */
export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage unavailable — apply the class anyway for this session
  }
  document.documentElement.classList.toggle("dark", theme === "dark");
}
