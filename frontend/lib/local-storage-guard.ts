/**
 * Check if localStorage is available
 */
export function canUseStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Safely read from localStorage.
 * Property access and getItem can throw (SecurityError in private browsing,
 * blocked storage) — never let that crash the app.
 */
export function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely set item in localStorage with quota handling
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('[Storage] Quota exceeded for key:', key);
      return false;
    }
    throw e;
  }
}
