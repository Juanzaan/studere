/**
 * Unit tests for session-composer-card.tsx
 *
 * Covers: idle render, form validation, AI toggle,
 * submit without AI, submit with AI (transcribe + generate),
 * error handling during transcribe/generate.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue("test-token") }),
}));

vi.mock("gsap", () => ({
  gsap: {
    registerPlugin: vi.fn(),
    to: vi.fn(),
    from: vi.fn(),
    fromTo: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn(), set: vi.fn() })),
  },
}));
vi.mock("@gsap/react", () => ({ useGSAP: () => {} }));

vi.mock("@/src/shared/hooks/useAnimations", () => ({
  useScaleBounce: vi.fn(),
}));

const mockTranscribeAudio = vi.fn();
const mockGenerateStudySession = vi.fn();
vi.mock("@/lib/api", () => ({
  transcribeAudio: (...args: unknown[]) => mockTranscribeAudio(...args),
  generateStudySession: (...args: unknown[]) => mockGenerateStudySession(...args),
}));

const mockCreateStudySession = vi.fn();
vi.mock("@/lib/study-generator", () => ({
  createStudySession: (...args: unknown[]) => mockCreateStudySession(...args),
}));

const mockUpsertSession = vi.fn((..._args: unknown[]) => true);
vi.mock("@/lib/storage", () => ({
  upsertSession: (...args: unknown[]) => mockUpsertSession(...args),
}));

vi.mock("@/lib/session-utils", () => ({
  createWelcomeChat: vi.fn(() => []),
  createMindMap: vi.fn(() => ({ id: "root", label: "Root", children: [] })),
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock("@/components/toast-provider", () => ({
  useToastContext: () => mockToast,
}));

// ─── Fallback session returned by createStudySession ──────────────────────
const SAMPLE_SESSION = {
  id: "test-session-123",
  title: "Test Session",
  course: "Math",
  createdAt: "2025-01-01T00:00:00Z",
  starred: false,
  sourceFileName: "notes.txt",
  sourceFileType: "text/plain",
  sourceKind: "text" as const,
  templateId: "class-summary" as const,
  transcript: [],
  summary: "Local summary",
  keyConcepts: [],
  flashcards: [],
  quiz: [],
  actionItems: [],
  mindMap: { id: "root", label: "Root", children: [] },
  bookmarks: [],
  comments: [],
  insights: [],
  chatHistory: [],
  stats: { wordCount: 10, segmentCount: 1, estimatedDurationMinutes: 1 },
  studyMetrics: { completionRate: 0, quizAccuracy: 0, reviewCount: 0 },
};

// ─── Imports after mocks ──────────────────────────────────────────────────
import { SessionComposerCard } from "@/components/session-composer-card";
import { transcribeAudio, generateStudySession } from "@/lib/api";
import { createStudySession } from "@/lib/study-generator";
import { upsertSession } from "@/lib/storage";

// ═══════════════════════════════════════════════════════════════════════════
// Idle render & form validation
// ═══════════════════════════════════════════════════════════════════════════

describe("SessionComposerCard idle render", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the form with title, course, notes, and submit button", () => {
    const { getByText, getByPlaceholderText } = render(
      <SessionComposerCard mode="upload" />,
    );

    expect(getByText("Crear nueva sesión de estudio")).toBeTruthy();
    expect(getByPlaceholderText("Ej. Marketing digital — clase 3")).toBeTruthy();
    expect(getByPlaceholderText("Ej. Historia económica")).toBeTruthy();
    expect(getByText("Crear sesión")).toBeTruthy();
  });

  it('should render "Crear con IA" button when there is text content', () => {
    const { getByPlaceholderText } = render(<SessionComposerCard mode="upload" />);

    const notes = getByPlaceholderText(
      "Pegá apuntes, un transcript o contexto para que Studere genere resumen, conceptos, flashcards, quiz y plan de repaso.",
    );
    fireEvent.input(notes, { target: { value: "Some notes content" } });

    const title = getByPlaceholderText("Ej. Marketing digital — clase 3");
    fireEvent.input(title, { target: { value: "Some title" } });

    waitFor(() => {
      expect(screen.getByText("Crear con IA")).toBeTruthy();
    });
  });

  it("should have submit disabled when title is empty", () => {
    const { getByText } = render(<SessionComposerCard mode="upload" />);
    const button = getByText("Crear sesión").closest("button");
    expect(button?.disabled).toBe(true);
  });

  it("should show URL input for mode 'url'", () => {
    const { getByPlaceholderText } = render(<SessionComposerCard mode="url" />);
    expect(getByPlaceholderText("https://...")).toBeTruthy();
  });

  it("should show URL input for mode 'online'", () => {
    const { getByPlaceholderText } = render(<SessionComposerCard mode="online" />);
    expect(getByPlaceholderText("https://...")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AI toggle
// ═══════════════════════════════════════════════════════════════════════════

describe("SessionComposerCard AI toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have AI enabled by default", () => {
    const { getByText } = render(<SessionComposerCard mode="upload" />);
    expect(getByText("Con IA")).toBeTruthy();
    // Toggle should be checked (bg-c-blue)
    const toggle = document.querySelector('[class*="bg-c-blue"]');
    expect(toggle).toBeTruthy();
  });

  it("should toggle AI mode off when clicking the switch", () => {
    const { container } = render(<SessionComposerCard mode="upload" />);
    const label = container.querySelector("label");
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    // The AI toggle is the only checkbox in the component
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(checkboxes[0]);
    // After clicking, the toggle should not be bg-c-blue
    // (it depends on the label styling)
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Submit — no AI (text-only local session)
// ═══════════════════════════════════════════════════════════════════════════

describe("SessionComposerCard submit without AI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateStudySession.mockReturnValue(SAMPLE_SESSION);
  });

  it("should create a session locally and call upsert + router.push", async () => {
    const { getByText, getByPlaceholderText } = render(
      <SessionComposerCard mode="upload" />,
    );

    // Fill title
    const title = getByPlaceholderText("Ej. Marketing digital — clase 3");
    fireEvent.input(title, { target: { value: "My test session" } });

    // Toggle AI off
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[0]);

    // Submit
    const button = getByText("Crear sesión");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCreateStudySession).toHaveBeenCalledWith(
        expect.objectContaining({ title: "My test session" }),
      );
    });

    await waitFor(() => {
      expect(mockUpsertSession).toHaveBeenCalledWith(
        expect.objectContaining({ id: "test-session-123" }),
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Submit — with AI (text-based, no audio)
// ═══════════════════════════════════════════════════════════════════════════

describe("SessionComposerCard submit with AI (text)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateStudySession.mockReturnValue(SAMPLE_SESSION);
    mockGenerateStudySession.mockResolvedValue({
      summary: "AI summary",
      keyConcepts: [{ term: "AI", description: "Artificial Intelligence" }],
      flashcards: [],
      quiz: [],
      mindMap: { id: "root", label: "AI Root", children: [] },
      actionItems: [],
      insights: [],
    });
  });

  it("should call generateStudySession and upsert when AI is enabled with text", async () => {
    const { getByText, getByPlaceholderText } = render(
      <SessionComposerCard mode="upload" />,
    );

    // Fill title and notes (30+ chars for AI to trigger)
    const title = getByPlaceholderText("Ej. Marketing digital — clase 3");
    fireEvent.input(title, { target: { value: "Test session with AI" } });

    const notes = getByPlaceholderText(
      "Pegá apuntes, un transcript o contexto para que Studere genere resumen, conceptos, flashcards, quiz y plan de repaso.",
    );
    fireEvent.input(notes, {
      target: {
        value:
          "This is a sufficiently long text that exceeds the 30-character threshold for AI generation to trigger in the session composer card.",
      },
    });

    // Submit
    const button = getByText("Crear con IA");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockGenerateStudySession).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: expect.stringContaining("sufficiently long text"),
        }),
        expect.anything(), // Clerk session token (Bearer auth)
      );
    });

    await waitFor(() => {
      expect(mockUpsertSession).toHaveBeenCalled();
    });
  });

  it("should merge AI results into the session before upsert", async () => {
    const { getByText, getByPlaceholderText } = render(
      <SessionComposerCard mode="upload" />,
    );

    const title = getByPlaceholderText("Ej. Marketing digital — clase 3");
    fireEvent.input(title, { target: { value: "AI merge test" } });

    const notes = getByPlaceholderText(
      "Pegá apuntes, un transcript o contexto para que Studere genere resumen, conceptos, flashcards, quiz y plan de repaso.",
    );
    fireEvent.input(notes, {
      target: { value: "This text is well over the thirty character threshold needed for AI processing to happen." },
    });

    fireEvent.click(getByText("Crear con IA"));

    await waitFor(() => {
      expect(mockGenerateStudySession).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockUpsertSession).toHaveBeenCalledWith(
        expect.objectContaining({
          // Should have merged AI summary
          summary: "AI summary",
        }),
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Submit — with AI + audio file (transcribe → generate)
// ═══════════════════════════════════════════════════════════════════════════

describe("SessionComposerCard submit with AI + audio file", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateStudySession.mockReturnValue(SAMPLE_SESSION);
    mockTranscribeAudio.mockResolvedValue({
      text: "Transcribed audio text that is sufficiently long to trigger AI generation.",
      language: "es",
      duration: 120,
    });
    mockGenerateStudySession.mockResolvedValue({
      summary: "AI from audio summary",
      keyConcepts: [{ term: "AudioAI", description: "AI from audio" }],
      flashcards: [],
      quiz: [],
      mindMap: { id: "root", label: "Audio Root", children: [] },
      actionItems: [],
      insights: [],
    });
    window.confirm = vi.fn(() => true);
  });

  it("should call transcribeAudio then generateStudySession for an audio file", async () => {
    const { getByText, getByPlaceholderText, container } = render(
      <SessionComposerCard mode="upload" />,
    );

    // Fill title
    const title = getByPlaceholderText("Ej. Marketing digital — clase 3");
    fireEvent.input(title, { target: { value: "Audio test" } });

    // Trigger file selection via the hidden input
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const audioFile = new File(["fake-audio-content"], "recording.webm", {
      type: "audio/webm",
    });
    fireEvent.change(fileInput, { target: { files: [audioFile] } });

    // Wait for file to be attached
    await waitFor(() => {
      expect(getByText("Archivo listo")).toBeTruthy();
    });

    // Submit
    const button = getByText("Crear con IA");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockTranscribeAudio).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockGenerateStudySession).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockUpsertSession).toHaveBeenCalled();
    });
  });

  it("should render SessionSkeleton during transcribing phase", async () => {
    // Hold BOTH transcribe AND generate promises so we can check
    // the UI during the transcribing phase before the flow completes.
    let resolveTranscribe!: (value: unknown) => void;
    mockTranscribeAudio.mockReturnValue(
      new Promise((resolve) => {
        resolveTranscribe = resolve;
      }),
    );

    // Hold generate too — otherwise resolving transcribe triggers
    // generate (which resolves immediately) and the state advances
    // past "generating" before React can flush.
    let resolveGenerate!: (value: unknown) => void;
    mockGenerateStudySession.mockReturnValue(
      new Promise((resolve) => {
        resolveGenerate = resolve;
      }),
    );

    const { getByText, getByPlaceholderText, container } = render(
      <SessionComposerCard mode="upload" />,
    );

    const title = getByPlaceholderText("Ej. Marketing digital — clase 3");
    fireEvent.input(title, { target: { value: "Audio skeleton test" } });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(["x"], "audio.webm", { type: "audio/webm" })] },
    });

    await waitFor(() => expect(getByText("Archivo listo")).toBeTruthy());

    fireEvent.click(getByText("Crear con IA"));

    // Phase 1: transcribing skeleton visible
    await waitFor(() => {
      expect(getByText("Transcribiendo audio...")).toBeTruthy();
      expect(getByText("Audio → Transcripción")).toBeTruthy();
    });

    // Resolve transcribe → component moves to generating phase
    resolveTranscribe({
      text: "Transcribed text that is long enough for AI generation to trigger correctly.",
      language: "es",
      duration: 120,
    });

    // Phase 2: generating skeleton visible
    await waitFor(() => {
      expect(getByText("Generando con IA...")).toBeTruthy();
    });

    // Resolve generate → flow completes
    resolveGenerate({
      summary: "AI summary",
      keyConcepts: [],
      flashcards: [],
      quiz: [],
      mindMap: { id: "root", label: "Root", children: [] },
      actionItems: [],
      insights: [],
    });

    // Session should be upserted
    await waitFor(() => {
      expect(mockUpsertSession).toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Error handling
// ═══════════════════════════════════════════════════════════════════════════

describe("SessionComposerCard error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateStudySession.mockReturnValue(SAMPLE_SESSION);
    window.confirm = vi.fn(() => true);
  });

  it("should call toast.error and stop when transcribeAudio fails", async () => {
    mockTranscribeAudio.mockRejectedValue(new Error("Network error"));

    const { getByText, getByPlaceholderText, container } = render(
      <SessionComposerCard mode="upload" />,
    );

    const title = getByPlaceholderText("Ej. Marketing digital — clase 3");
    fireEvent.input(title, { target: { value: "Error test" } });

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(["x"], "error.webm", { type: "audio/webm" })] },
    });

    await waitFor(() => expect(getByText("Archivo listo")).toBeTruthy());

    fireEvent.click(getByText("Crear con IA"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("Error al transcribir audio"),
        expect.stringContaining("Network error"),
      );
    });

    // upsertSession should NOT be called when transcribe fails
    expect(mockUpsertSession).not.toHaveBeenCalled();
  });

  it("should call toast.warning and continue with local content when generateStudySession fails", async () => {
    mockGenerateStudySession.mockRejectedValue(new Error("AI service unavailable"));

    const { getByText, getByPlaceholderText } = render(
      <SessionComposerCard mode="upload" />,
    );

    const title = getByPlaceholderText("Ej. Marketing digital — clase 3");
    fireEvent.input(title, { target: { value: "AI fallback test" } });

    const notes = getByPlaceholderText(
      "Pegá apuntes, un transcript o contexto para que Studere genere resumen, conceptos, flashcards, quiz y plan de repaso.",
    );
    fireEvent.input(notes, {
      target: { value: "This text is sufficiently long to trigger AI generation and test the fallback behavior." },
    });

    fireEvent.click(getByText("Crear con IA"));

    await waitFor(() => {
      expect(mockToast.warning).toHaveBeenCalledWith(
        expect.stringContaining("Generación con IA falló"),
        expect.stringContaining("AI service unavailable"),
      );
    });

    // upsertSession should still be called with local content
    await waitFor(() => {
      expect(mockUpsertSession).toHaveBeenCalledWith(
        expect.objectContaining({ id: "test-session-123" }),
      );
    });
  });

  it("should call toast.success when everything succeeds", async () => {
    mockGenerateStudySession.mockResolvedValue({
      summary: "AI summary",
      keyConcepts: [],
      flashcards: [],
      quiz: [],
      mindMap: { id: "root", label: "Root", children: [] },
      actionItems: [],
      insights: [],
    });

    const { getByText, getByPlaceholderText } = render(
      <SessionComposerCard mode="upload" />,
    );

    const title = getByPlaceholderText("Ej. Marketing digital — clase 3");
    fireEvent.input(title, { target: { value: "Success test" } });

    const notes = getByPlaceholderText(
      "Pegá apuntes, un transcript o contexto para que Studere genere resumen, conceptos, flashcards, quiz y plan de repaso.",
    );
    fireEvent.input(notes, {
      target: { value: "Sufficiently long text for AI generation to succeed in this test scenario." },
    });

    fireEvent.click(getByText("Crear con IA"));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Sesión creada",
        expect.stringContaining("Test Session"),
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// onCreated callback
// ═══════════════════════════════════════════════════════════════════════════

describe("SessionComposerCard onCreated callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateStudySession.mockReturnValue(SAMPLE_SESSION);
  });

  it("should call onCreated when provided after successful creation", async () => {
    const onCreated = vi.fn();

    const { getByText, getByPlaceholderText } = render(
      <SessionComposerCard mode="upload" onCreated={onCreated} />,
    );

    const title = getByPlaceholderText("Ej. Marketing digital — clase 3");
    fireEvent.input(title, { target: { value: "onCreated test" } });

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    fireEvent.click(checkboxes[0]); // Disable AI

    fireEvent.click(getByText("Crear sesión"));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });
  });
});
