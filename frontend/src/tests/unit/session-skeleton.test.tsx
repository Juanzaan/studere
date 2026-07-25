/**
 * Unit tests for session-skeleton.tsx
 *
 * SessionSkeleton is a pure presentational component — no GSAP, no side effects.
 * It renders skeleton shimmer blocks + progress indicators based on `phase` prop.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SessionSkeleton } from "@/components/session-skeleton";

describe("SessionSkeleton", () => {
  describe("phase: transcribing", () => {
    it('should render "Transcribiendo audio..." as the header', () => {
      const { getByText } = render(<SessionSkeleton phase="transcribing" />);
      expect(getByText("Transcribiendo audio...")).toBeTruthy();
    });

    it("should mark Step 1 (Audio → Transcripción) as active (has spinner)", () => {
      const { container } = render(<SessionSkeleton phase="transcribing" />);
      // Step 1 is active: its circle should contain an animated Loader2
      const activeStep = container.querySelector('[class*="animate-spin"]');
      expect(activeStep).toBeTruthy();
    });

    it("should mark Step 2 (Generar) as pending (shown but not active)", () => {
      const { getByText } = render(<SessionSkeleton phase="transcribing" />);
      expect(getByText("Generar resumen, flashcards y quiz")).toBeTruthy();
    });

    it("should mark Step 3 (Material listo) as pending", () => {
      const { getByText } = render(<SessionSkeleton phase="transcribing" />);
      expect(getByText("Material listo para estudiar")).toBeTruthy();
    });
  });

  describe("phase: generating", () => {
    it('should render "Generando con IA..." as the header', () => {
      const { getByText } = render(<SessionSkeleton phase="generating" />);
      expect(getByText("Generando con IA...")).toBeTruthy();
    });

    it("should mark Step 1 as done (✓ checkmark)", () => {
      const { getByText } = render(<SessionSkeleton phase="generating" />);
      // Step 1 is done: label says "Audio → Transcripción" and has a checkmark
      const checkmarks = getByText("✓");
      expect(checkmarks).toBeTruthy();
    });

    it("should mark Step 2 as active (has spinner)", () => {
      const { container } = render(<SessionSkeleton phase="generating" />);
      const spinners = container.querySelectorAll('[class*="animate-spin"]');
      expect(spinners.length).toBeGreaterThanOrEqual(1);
    });

    it("should mark Step 3 as pending", () => {
      const { getByText } = render(<SessionSkeleton phase="generating" />);
      expect(getByText("Material listo para estudiar")).toBeTruthy();
    });
  });

  describe("progressMsg prop", () => {
    it("should render the progress message when provided", () => {
      const { getByText } = render(
        <SessionSkeleton phase="transcribing" progressMsg="Procesando chunk 3 de 5..." />,
      );
      expect(getByText("Procesando chunk 3 de 5...")).toBeTruthy();
    });

    it("should NOT render progress message when not provided", () => {
      const { queryByText } = render(<SessionSkeleton phase="generating" />);
      expect(queryByText("Procesando")).toBeNull();
    });
  });

  describe("layout structure", () => {
    it("should render skeleton shimmer blocks (elements with .skeleton class)", () => {
      const { container } = render(<SessionSkeleton phase="generating" />);
      const skeletons = container.querySelectorAll(".skeleton");
      expect(skeletons.length).toBeGreaterThan(5);
    });

    it('should render the hint text at the bottom', () => {
      const { getByText } = render(<SessionSkeleton phase="generating" />);
      expect(
        getByText("Stude IA está preparando tu material de estudio…"),
      ).toBeTruthy();
    });

    it("should render Sparkles icon in the progress tracker header", () => {
      const { container } = render(<SessionSkeleton phase="generating" />);
      // Sparkles icon renders as an SVG element
      const sparkles = container.querySelector("svg");
      expect(sparkles).toBeTruthy();
    });
  });

  describe("phase transition consistency", () => {
    it("should not show checkmark in transcribing phase", () => {
      const { queryByText } = render(<SessionSkeleton phase="transcribing" />);
      expect(queryByText("✓")).toBeNull();
    });

    it("renders the same layout structure in both phases", () => {
      const t = render(<SessionSkeleton phase="transcribing" />);
      const g = render(<SessionSkeleton phase="generating" />);

      // Both should have skeleton blocks
      expect(t.container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
      expect(g.container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    });
  });
});
