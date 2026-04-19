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
 * Safely set item in localStorage with quota handling
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('[Storage] Quota exceeded for key:', key);
      return false;
    }
    throw e;
  }
}
