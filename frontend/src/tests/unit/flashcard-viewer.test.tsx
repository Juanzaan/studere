import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlashcardViewer } from "@/components/flashcard-viewer";
import { saveFlashcardAttempt } from "@/lib/analytics-storage";
import type { Flashcard } from "@/lib/types";

vi.mock("gsap", () => ({
  default: {
    to: (_t: unknown, vars: Record<string, unknown>) => {
      (vars as any).onComplete?.();
      return {};
    },
    fromTo: (_t: unknown, _from: unknown, vars: Record<string, unknown>) => {
      (vars as any).onComplete?.();
      return {};
    },
  },
}));

vi.mock("@/lib/analytics-storage", () => ({
  saveFlashcardAttempt: vi.fn(),
}));

const CARDS: Flashcard[] = [
  { question: "¿Qué es A?", answer: "A es A" },
  { question: "¿Qué es B?", answer: "B es B" },
  { question: "¿Qué es C?", answer: "C es C" },
];

describe("FlashcardViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no cards", () => {
    render(<FlashcardViewer flashcards={[]} />);
    expect(screen.getByText(/No hay flashcards/i)).toBeTruthy();
  });

  it("fires completion exactly once when navigating past the last card", () => {
    const onComplete = vi.fn();
    render(<FlashcardViewer flashcards={CARDS} sessionId="s1" onReviewComplete={onComplete} />);

    // Next, Next, Next (from card 0 → 3, past the last card)
    const nextBtn = screen.getByLabelText("Siguiente");
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(3);
    expect(saveFlashcardAttempt).toHaveBeenCalledTimes(1);
    expect(saveFlashcardAttempt).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "s1", reviewed: 3 }));
    expect(screen.getByText(/Deck completo/i)).toBeTruthy();
  });

  it("does not re-fire completion after reset and re-walking the deck", () => {
    const onComplete = vi.fn();
    render(<FlashcardViewer flashcards={CARDS} sessionId="s1" onReviewComplete={onComplete} />);

    const nextBtn = screen.getByLabelText("Siguiente");
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    expect(onComplete).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Reiniciar"));
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);

    expect(onComplete).toHaveBeenCalledTimes(2);
    expect(saveFlashcardAttempt).toHaveBeenCalledTimes(2);
  });

  it("does not fire completion when going backward past the first card", () => {
    const onComplete = vi.fn();
    render(<FlashcardViewer flashcards={CARDS} onReviewComplete={onComplete} />);

    fireEvent.click(screen.getByLabelText("Anterior"));
    expect(onComplete).not.toHaveBeenCalled();
  });
});
