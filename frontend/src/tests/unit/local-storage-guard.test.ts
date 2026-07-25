import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { canUseStorage, safeSetItem } from '@/lib/local-storage-guard';

describe('local-storage-guard.ts', () => {
  describe('canUseStorage', () => {
    const originalWindow = globalThis.window;

    afterEach(() => {
      globalThis.window = originalWindow;
    });

    it('should return false when window is undefined (SSR)', () => {
      // Simulate SSR: delete window
      delete (globalThis as any).window;

      expect(canUseStorage()).toBe(false);
    });

    it('should return true when localStorage is available', () => {
      // In test env, localStorage is already mocked
      expect(canUseStorage()).toBe(true);
    });

    it('should return false when localStorage access throws', () => {
      // Mock window.localStorage to throw on access
      Object.defineProperty(globalThis, 'localStorage', {
        get: () => { throw new Error('localStorage not available'); },
        configurable: true,
      });

      expect(canUseStorage()).toBe(false);

      // Restore localStorage mock
      const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
          getItem: (key: string) => store[key] || null,
          setItem: (key: string, value: string) => { store[key] = value; },
          removeItem: (key: string) => { delete store[key]; },
          clear: () => { store = {}; },
        };
      })();
      Object.defineProperty(globalThis, 'localStorage', {
        value: localStorageMock,
        configurable: true,
      });
    });

    it('should return false when localStorage is undefined', () => {
      Object.defineProperty(globalThis, 'localStorage', {
        get: () => undefined,
        configurable: true,
      });

      expect(canUseStorage()).toBe(false);

      // Restore
      const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
          getItem: (key: string) => store[key] || null,
          setItem: (key: string, value: string) => { store[key] = value; },
          removeItem: (key: string) => { delete store[key]; },
          clear: () => { store = {}; },
        };
      })();
      Object.defineProperty(globalThis, 'localStorage', {
        value: localStorageMock,
        configurable: true,
      });
    });
  });

  describe('safeSetItem', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should return true on successful set', () => {
      const result = safeSetItem('test-key', 'test-value');
      expect(result).toBe(true);
      expect(localStorage.getItem('test-key')).toBe('test-value');
    });

    it('should return false when QuotaExceededError occurs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
        const error = new DOMException('Quota exceeded', 'QuotaExceededError');
        throw error;
      });

      const result = safeSetItem('big-key', 'big-value');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Storage] Quota exceeded for key:',
        'big-key',
      );

      consoleSpy.mockRestore();
    });

    it('should re-throw errors that are not QuotaExceededError', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
        throw new Error('Unexpected storage error');
      });

      expect(() => safeSetItem('key', 'value')).toThrow('Unexpected storage error');
    });

    it('should re-throw non-DOMException errors', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
        // A TypeError is not a DOMException
        throw new TypeError('Some type error');
      });

      expect(() => safeSetItem('key', 'value')).toThrow(TypeError);
    });

    it('should handle generic DOMException that is not quota-related', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
        const error = new DOMException('Not allowed', 'SecurityError');
        throw error;
      });

      // Non-quota DOMException should be re-thrown
      expect(() => safeSetItem('key', 'value')).toThrow(DOMException);
    });
  });
});
