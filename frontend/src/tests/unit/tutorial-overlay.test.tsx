/**
 * Unit tests for tutorial-overlay.tsx
 *
 * TODO: Add more comprehensive test coverage:
 * - Keyboard navigation (ArrowRight, ArrowLeft, Escape)
 * - blocking:true blocks pointer events
 * - blocking:false allows click-through
 * - Step transition triggers aria-live announcement
 * - Mobile target resolution
 * - localStorage persistence
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

// ─── Mock GSAP before importing the component ─────────────────────────────
// The module-level gsap.registerPlugin() call would fail without these mocks.
vi.mock("gsap", () => ({
  gsap: {
    registerPlugin: vi.fn(),
    set: vi.fn(),
    to: vi.fn(),
    from: vi.fn(),
    fromTo: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn(),
      set: vi.fn(),
    })),
  },
}));

vi.mock("@gsap/react", () => ({
  useGSAP: () => {
    /* no-op — animations not needed in unit tests */
  },
}));

vi.mock("gsap/dist/DrawSVGPlugin", () => ({ DrawSVGPlugin: {} }));
vi.mock("gsap/dist/MorphSVGPlugin", () => ({ MorphSVGPlugin: {} }));

// Mock the IllustrationScene — it imports gsap which is already mocked above.
vi.mock("@/components/illustration-scene", () => ({
  IllustrationScene: () => null,
}));

import {
  TutorialOverlay,
  isTutorialCompleted,
  markTutorialCompleted,
  resetTutorialCompleted,
} from "@/components/tutorial-overlay";

// ─── Pure helper tests (no DOM needed beyond localStorage mock) ────────────

describe("tutorial-overlay helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe("isTutorialCompleted / markTutorialCompleted / resetTutorialCompleted", () => {
    it("should return false when nothing has been persisted", () => {
      expect(isTutorialCompleted()).toBe(false);
    });

    it("should return true after marking completed", () => {
      markTutorialCompleted();
      expect(isTutorialCompleted()).toBe(true);
    });

    it("should return false after resetting", () => {
      markTutorialCompleted();
      resetTutorialCompleted();
      expect(isTutorialCompleted()).toBe(false);
    });

    it("should persist across multiple mark/reset cycles", () => {
      markTutorialCompleted();
      expect(isTutorialCompleted()).toBe(true);
      resetTutorialCompleted();
      expect(isTutorialCompleted()).toBe(false);
      markTutorialCompleted();
      expect(isTutorialCompleted()).toBe(true);
    });

    it("should not throw when localStorage is unavailable", () => {
      const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("localStorage blocked");
      });

      expect(isTutorialCompleted()).toBe(false);
      getItem.mockRestore();
    });
  });
});

// ─── Off-screen target guard ───────────────────────────────────────────────

describe("TutorialOverlay off-screen guard", () => {
  let navEl: HTMLElement;

  beforeEach(() => {
    navEl = document.createElement("nav");
    navEl.id = "navigation";
    document.body.appendChild(navEl);
  });

  afterEach(() => {
    navEl?.remove();
    vi.restoreAllMocks();
  });

  it("should nullify spotlight and warn when the target element is outside viewport", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // happy-dom doesn't apply CSS, so we mock getBoundingClientRect directly
    // to simulate an element that is translated off-screen (e.g. sidebar hidden).
    vi.spyOn(navEl, "getBoundingClientRect").mockReturnValue({
      top: -300,
      left: 0,
      bottom: -100,
      right: 224,
      width: 224,
      height: 200,
      x: 0,
      y: -300,
      toJSON: () => ({}),
    });

    const { container } = render(
      <TutorialOverlay
        steps={[
          {
            id: "sidebar-test",
            title: "Navegá por la app",
            description: "Test description",
            target: "#navigation",
            placement: "right",
            blocking: false,
          },
        ]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      // The spotlight uses an inline style with box-shadow. If the guard worked,
      // no element with box-shadow should exist.
      const spotlightHoles = container.querySelectorAll('[style*="box-shadow"]');
      expect(spotlightHoles.length).toBe(0);
    });

    // The component should have logged a warning about the off-screen target
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("outside viewport"),
    );

    warnSpy.mockRestore();
  });

  it("should render the spotlight normally when the target IS within viewport", async () => {
    // Mock getBoundingClientRect to return in-viewport coordinates
    vi.spyOn(navEl, "getBoundingClientRect").mockReturnValue({
      top: 50,
      left: 50,
      bottom: 250,
      right: 274,
      width: 224,
      height: 200,
      x: 50,
      y: 50,
      toJSON: () => ({}),
    });

    const { container } = render(
      <TutorialOverlay
        steps={[
          {
            id: "sidebar-test",
            title: "Navegá por la app",
            description: "Test description",
            target: "#navigation",
            placement: "right",
            blocking: false,
          },
        ]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      // The spotlight renders a div with box-shadow when the target is in viewport
      const spotlightHoles = container.querySelectorAll('[style*="box-shadow"]');
      expect(spotlightHoles.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("should not warn when target selector does not match any element", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <TutorialOverlay
        steps={[
          {
            id: "nonexistent",
            title: "Missing target",
            description: "This element does not exist",
            target: "#does-not-exist",
            placement: "bottom",
            blocking: false,
          },
        ]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(warnSpy).not.toHaveBeenCalled();
    });

    warnSpy.mockRestore();
  });

  it("should not render backdrop when blocking: false even with off-screen spotlight", async () => {
    // Off-screen target triggers the guard, falling back internally.
    // With blocking: false, no dark backdrop should render.
    vi.spyOn(navEl, "getBoundingClientRect").mockReturnValue({
      top: -300,
      left: 0,
      bottom: -100,
      right: 224,
      width: 224,
      height: 200,
      x: 0,
      y: -300,
      toJSON: () => ({}),
    });

    const { container } = render(
      <TutorialOverlay
        steps={[
          {
            id: "sidebar-test",
            title: "Navegá por la app",
            description: "Test description",
            target: "#navigation",
            placement: "right",
            blocking: false,
          },
        ]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      // The dark overlay uses backdrop-blur class. With blocking:false,
      // it should not render even when falling back to center due to off-screen target.
      const overlays = container.querySelectorAll('[class*="backdrop-blur"]');
      expect(overlays.length).toBe(0);
    });
  });
});
