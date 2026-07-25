/**
 * Unit tests for tutorial-overlay.tsx
 *
 * Covers: helpers, off-screen guard, keyboard navigation,
 * blocking vs click-through, aria-live, mobile targets, TutorialTrigger.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

// ─── Mock GSAP before importing the component ─────────────────────────────
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
    /* no-op */
  },
}));

vi.mock("gsap/dist/DrawSVGPlugin", () => ({ DrawSVGPlugin: {} }));
vi.mock("gsap/dist/MorphSVGPlugin", () => ({ MorphSVGPlugin: {} }));

vi.mock("@/components/illustration-scene", () => ({
  IllustrationScene: () => null,
}));

import {
  TutorialOverlay,
  TutorialTrigger,
  isTutorialCompleted,
  markTutorialCompleted,
  resetTutorialCompleted,
} from "@/components/tutorial-overlay";

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// Off-screen target guard
// ═══════════════════════════════════════════════════════════════════════════

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

    vi.spyOn(navEl, "getBoundingClientRect").mockReturnValue({
      top: -300, left: 0, bottom: -100, right: 224,
      width: 224, height: 200, x: 0, y: -300, toJSON: () => ({}),
    });

    const { container } = render(
      <TutorialOverlay
        steps={[{ id: "sidebar-test", title: "Navegá por la app", description: "Test description", target: "#navigation", placement: "right", blocking: false }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      const spotlightHoles = container.querySelectorAll('[style*="box-shadow"]');
      expect(spotlightHoles.length).toBe(0);
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("outside viewport"));
    warnSpy.mockRestore();
  });

  it("should render the spotlight normally when the target IS within viewport", async () => {
    vi.spyOn(navEl, "getBoundingClientRect").mockReturnValue({
      top: 50, left: 50, bottom: 250, right: 274,
      width: 224, height: 200, x: 50, y: 50, toJSON: () => ({}),
    });

    const { container } = render(
      <TutorialOverlay
        steps={[{ id: "sidebar-test", title: "Navegá por la app", description: "Test description", target: "#navigation", placement: "right", blocking: false }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      const spotlightHoles = container.querySelectorAll('[style*="box-shadow"]');
      expect(spotlightHoles.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("should not warn when target selector does not match any element", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <TutorialOverlay
        steps={[{ id: "nonexistent", title: "Missing target", description: "Desc", target: "#does-not-exist", placement: "bottom", blocking: false }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(warnSpy).not.toHaveBeenCalled();
    });
    warnSpy.mockRestore();
  });

  it("should not render backdrop when blocking: false even with off-screen spotlight", async () => {
    vi.spyOn(navEl, "getBoundingClientRect").mockReturnValue({
      top: -300, left: 0, bottom: -100, right: 224,
      width: 224, height: 200, x: 0, y: -300, toJSON: () => ({}),
    });

    const { container } = render(
      <TutorialOverlay
        steps={[{ id: "sidebar-test", title: "Navegá por la app", description: "Test description", target: "#navigation", placement: "right", blocking: false }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      const overlays = container.querySelectorAll('[class*="backdrop-blur"]');
      expect(overlays.length).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Keyboard navigation
// ═══════════════════════════════════════════════════════════════════════════

describe("TutorialOverlay keyboard navigation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should advance to next step on ArrowRight", async () => {
    const { getByText } = render(
      <TutorialOverlay
        steps={[
          { id: "s1", title: "Step 1", description: "First", placement: "center", blocking: true },
          { id: "s2", title: "Step 2", description: "Second", placement: "center", blocking: true },
          { id: "s3", title: "Step 3", description: "Third", placement: "center", blocking: true },
        ]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => expect(getByText("Step 1")).toBeTruthy());
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));

    await waitFor(() => {
      expect(getByText("Step 2")).toBeTruthy();
    });
  });

  it("should go back to previous step on ArrowLeft", async () => {
    const { getByText } = render(
      <TutorialOverlay
        steps={[
          { id: "s1", title: "Step 1", description: "First", placement: "center", blocking: true },
          { id: "s2", title: "Step 2", description: "Second", placement: "center", blocking: true },
        ]}
        onComplete={vi.fn()}
        initialStep={1}
      />,
    );

    await waitFor(() => expect(getByText("Step 2")).toBeTruthy());
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));

    await waitFor(() => {
      expect(getByText("Step 1")).toBeTruthy();
    });
  });

  it("should stay on first step when pressing ArrowLeft on step 0", async () => {
    const { getByText, queryByText } = render(
      <TutorialOverlay
        steps={[
          { id: "s1", title: "Step 1", description: "First", placement: "center", blocking: true },
          { id: "s2", title: "Step 2", description: "Second", placement: "center", blocking: true },
        ]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => expect(getByText("Step 1")).toBeTruthy());
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));

    await waitFor(() => {
      expect(getByText("Step 1")).toBeTruthy();
      expect(queryByText("Step 2")).toBeNull();
    });
  });

  it("should call onComplete when pressing ArrowRight on the last step", async () => {
    const onComplete = vi.fn();

    render(
      <TutorialOverlay
        steps={[
          { id: "s1", title: "Step 1", description: "First", placement: "center", blocking: true },
          { id: "s2", title: "Step 2", description: "Second", placement: "center", blocking: true },
        ]}
        onComplete={onComplete}
        initialStep={1}
      />,
    );

    await waitFor(() => expect(onComplete).not.toHaveBeenCalled());
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("should call onComplete when pressing Escape", async () => {
    const onComplete = vi.fn();

    render(
      <TutorialOverlay
        steps={[{ id: "s1", title: "Step 1", description: "First", placement: "center", blocking: true }]}
        onComplete={onComplete}
      />,
    );

    await waitFor(() => expect(onComplete).not.toHaveBeenCalled());
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("should mark localStorage as completed when completing via keyboard", async () => {
    const onComplete = vi.fn();
    expect(isTutorialCompleted()).toBe(false);

    render(
      <TutorialOverlay
        steps={[{ id: "s1", title: "Step 1", description: "First", placement: "center", blocking: true }]}
        onComplete={onComplete}
      />,
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
      expect(isTutorialCompleted()).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Blocking vs click-through
// ═══════════════════════════════════════════════════════════════════════════

describe("TutorialOverlay blocking behavior", () => {
  it("should render backdrop with pointer-events: auto when blocking: true", async () => {
    const { container } = render(
      <TutorialOverlay
        steps={[{ id: "s1", title: "Blocking", description: "Blocks clicks", target: "header", placement: "bottom", blocking: true }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      const backdrop = container.querySelector('[class*="backdrop-blur"]');
      expect(backdrop).toBeTruthy();
      expect((backdrop as HTMLElement)?.style?.pointerEvents).toBe("auto");
    });
  });

  it("should NOT render backdrop when blocking: false", async () => {
    const { container } = render(
      <TutorialOverlay
        steps={[{ id: "s1", title: "Click-through", description: "Allow clicks", target: "header", placement: "bottom", blocking: false }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      const backdrops = container.querySelectorAll('[class*="backdrop-blur"]');
      expect(backdrops.length).toBe(0);
    });
  });

  it("should set aria-modal based on blocking prop", async () => {
    const { rerender, container: c1 } = render(
      <TutorialOverlay
        steps={[{ id: "s1", title: "Blocking", description: "Blocks", target: "header", placement: "bottom", blocking: true }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      const tooltip = c1.querySelector('[role="dialog"]');
      expect(tooltip?.getAttribute("aria-modal")).toBe("true");
    });

    rerender(
      <TutorialOverlay
        steps={[{ id: "s1", title: "Not Blocking", description: "No block", target: "header", placement: "bottom", blocking: false }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      const tooltip = document.querySelector('[role="dialog"]');
      expect(tooltip?.getAttribute("aria-modal")).toBe("false");
    });
  });

  it("should default center steps to blocking: true", async () => {
    const { container } = render(
      <TutorialOverlay
        steps={[{ id: "welcome", title: "Welcome", description: "Center step without explicit blocking", placement: "center" }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      const backdrop = container.querySelector('[class*="backdrop-blur"]');
      expect(backdrop).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Aria-live announcements
// ═══════════════════════════════════════════════════════════════════════════

describe("TutorialOverlay aria-live announcements", () => {
  it("should render step title when mounted", async () => {
    const { container } = render(
      <TutorialOverlay
        steps={[{ id: "s1", title: "Welcome", description: "First step", placement: "center", blocking: true }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("Welcome");
      expect(container.textContent).toContain("1/1");
    });
  });

  it("should update announcement when advancing to next step", async () => {
    const { container } = render(
      <TutorialOverlay
        steps={[
          { id: "s1", title: "First", description: "First step", placement: "center", blocking: true },
          { id: "s2", title: "Second", description: "Second step", placement: "center", blocking: true },
        ]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain("First");
    });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));

    await waitFor(() => {
      expect(container.textContent).toContain("Second");
      expect(container.textContent).toContain("2/2");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Mobile target resolution
// ═══════════════════════════════════════════════════════════════════════════

describe("TutorialOverlay mobile targets", () => {
  let navEl: HTMLElement;
  let hamburgerEl: HTMLElement;

  beforeEach(() => {
    navEl = document.createElement("nav");
    navEl.id = "navigation";
    document.body.appendChild(navEl);

    hamburgerEl = document.createElement("button");
    hamburgerEl.setAttribute("aria-label", "Abrir menú de navegación");
    document.body.appendChild(hamburgerEl);

    vi.spyOn(navEl, "getBoundingClientRect").mockReturnValue({
      top: 80, left: 0, bottom: 400, right: 224, width: 224, height: 320, x: 0, y: 80, toJSON: () => ({}),
    });
    vi.spyOn(hamburgerEl, "getBoundingClientRect").mockReturnValue({
      top: 80, left: 16, bottom: 120, right: 56, width: 40, height: 40, x: 16, y: 80, toJSON: () => ({}),
    });
  });

  afterEach(() => {
    navEl?.remove();
    hamburgerEl?.remove();
    vi.restoreAllMocks();
  });

  it("should use target (not mobileTarget) on desktop viewport", async () => {
    const { container, getByText } = render(
      <TutorialOverlay
        steps={[{
          id: "sidebar", title: "Navigation", description: "Desktop description",
          mobileDescription: "Mobile description", target: "#navigation",
          mobileTarget: "[aria-label='Abrir menú de navegación']",
          placement: "right", mobilePlacement: "bottom", blocking: false,
        }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(getByText("Desktop description")).toBeTruthy();
      const spotlights = container.querySelectorAll('[style*="width: 224px"]');
      expect(spotlights.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("should use mobileTarget + mobilePlacement + mobileDescription on mobile viewport", async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 767px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container, getByText } = render(
      <TutorialOverlay
        steps={[{
          id: "sidebar", title: "Navigation", description: "Desktop description",
          mobileDescription: "Mobile description", target: "#navigation",
          mobileTarget: "[aria-label='Abrir menú de navegación']",
          placement: "right", mobilePlacement: "bottom", blocking: false,
        }]}
        onComplete={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(getByText("Mobile description")).toBeTruthy();
      const spotlights = container.querySelectorAll('[style*="width: 40px"]');
      expect(spotlights.length).toBeGreaterThanOrEqual(1);
    });

    window.matchMedia = originalMatchMedia;
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TutorialTrigger
// ═══════════════════════════════════════════════════════════════════════════

describe("TutorialTrigger", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("should reset localStorage and call onRestart when clicked", async () => {
    markTutorialCompleted();
    expect(isTutorialCompleted()).toBe(true);

    const onRestart = vi.fn();
    const { getByLabelText } = render(<TutorialTrigger onRestart={onRestart} />);
    getByLabelText("Reiniciar tutorial de bienvenida").click();

    expect(isTutorialCompleted()).toBe(false);
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("should render compact mode without label when compact: true", () => {
    const { queryByText } = render(<TutorialTrigger onRestart={vi.fn()} compact />);
    expect(queryByText("Tutorial")).toBeNull();
  });

  it("should render label when compact: false (default)", () => {
    const { getByText } = render(<TutorialTrigger onRestart={vi.fn()} />);
    expect(getByText("Tutorial")).toBeTruthy();
  });
});
