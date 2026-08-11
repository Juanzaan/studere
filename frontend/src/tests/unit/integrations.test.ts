import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  INTEGRATIONS_KEY,
  INTEGRATIONS_UPDATED_EVENT,
  INTEGRATION_DEFINITIONS,
  connectIntegration,
  disconnectIntegration,
  getConnectedIntegrations,
  isIntegrationConnected,
} from '@/lib/integrations';

describe('integrations.ts', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('INTEGRATION_DEFINITIONS', () => {
    it('should have unique ids', () => {
      const ids = INTEGRATION_DEFINITIONS.map((integration) => integration.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should cover the MVP catalogue', () => {
      const names = INTEGRATION_DEFINITIONS.map((integration) => integration.name);
      expect(names).toContain('Google Calendar');
      expect(names).toContain('Microsoft Outlook');
      expect(names).toContain('Automatizaciones');
    });
  });

  describe('getConnectedIntegrations', () => {
    it('should return empty array when nothing is stored', () => {
      expect(getConnectedIntegrations()).toEqual([]);
    });

    it('should return stored connected ids', () => {
      localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(['google-calendar', 'automations']));
      expect(getConnectedIntegrations()).toEqual(['google-calendar', 'automations']);
    });

    it('should drop unknown ids on read', () => {
      localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(['google-calendar', 'not-a-real-integration']));
      expect(getConnectedIntegrations()).toEqual(['google-calendar']);
    });

    it('should dedupe repeated ids on read', () => {
      localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(['outlook', 'outlook']));
      expect(getConnectedIntegrations()).toEqual(['outlook']);
    });

    it('should handle invalid JSON gracefully', () => {
      localStorage.setItem(INTEGRATIONS_KEY, 'not-json');
      expect(getConnectedIntegrations()).toEqual([]);
    });

    it('should handle non-array data gracefully', () => {
      localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify({ googleCalendar: true }));
      expect(getConnectedIntegrations()).toEqual([]);
    });

    it('should handle missing localStorage gracefully', () => {
      const originalLocalStorage = global.localStorage;
      // @ts-ignore - Simulating SSR environment
      delete global.localStorage;
      try {
        expect(getConnectedIntegrations()).toEqual([]);
        expect(connectIntegration('outlook')).toBe(false);
        expect(() => disconnectIntegration('outlook')).not.toThrow();
      } finally {
        global.localStorage = originalLocalStorage;
      }
    });
  });

  describe('isIntegrationConnected', () => {
    it('should be false by default', () => {
      expect(isIntegrationConnected('google-calendar')).toBe(false);
    });

    it('should reflect persisted state', () => {
      connectIntegration('google-calendar');
      expect(isIntegrationConnected('google-calendar')).toBe(true);
      expect(isIntegrationConnected('outlook')).toBe(false);
    });
  });

  describe('connectIntegration', () => {
    it('should persist the connection', () => {
      connectIntegration('slack-discord');
      const stored = JSON.parse(localStorage.getItem(INTEGRATIONS_KEY)!);
      expect(stored).toEqual(['slack-discord']);
    });

    it('should be idempotent', () => {
      connectIntegration('outlook');
      connectIntegration('outlook');
      const stored = JSON.parse(localStorage.getItem(INTEGRATIONS_KEY)!);
      expect(stored).toEqual(['outlook']);
    });

    it('should dispatch INTEGRATIONS_UPDATED_EVENT', () => {
      const listener = vi.fn();
      window.addEventListener(INTEGRATIONS_UPDATED_EVENT, listener);
      connectIntegration('outlook');
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener(INTEGRATIONS_UPDATED_EVENT, listener);
    });

    it('should reject unknown ids without persisting', () => {
      expect(connectIntegration('not-a-real-integration')).toBe(false);
      expect(localStorage.getItem(INTEGRATIONS_KEY)).toBeNull();
    });
  });

  describe('disconnectIntegration', () => {
    it('should remove the connection', () => {
      connectIntegration('automations');
      disconnectIntegration('automations');
      const stored = JSON.parse(localStorage.getItem(INTEGRATIONS_KEY)!);
      expect(stored).toEqual([]);
    });

    it('should dispatch INTEGRATIONS_UPDATED_EVENT', () => {
      connectIntegration('automations');
      const listener = vi.fn();
      window.addEventListener(INTEGRATIONS_UPDATED_EVENT, listener);
      disconnectIntegration('automations');
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener(INTEGRATIONS_UPDATED_EVENT, listener);
    });

    it('should not throw when disconnecting something never connected', () => {
      expect(() => disconnectIntegration('google-calendar')).not.toThrow();
    });
  });
});
