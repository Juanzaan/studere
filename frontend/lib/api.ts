import type { Concept, Flashcard, QuizItem, ActionItem, MindMapNode, SessionInsight, ExerciseFeedback } from "@/lib/types";
import { chunkAudioFile } from "@/lib/audio-chunker";
import { BACKEND_URL, AUDIO_LIMITS } from "@/lib/constants";

/**
 * API client for Azure OpenAI backend endpoints.
 *
 * Provides:
 * - {@link transcribeAudio}: Dual-path audio transcription (client-side for <10MB,
 *   server-side with FFmpeg for larger files)
 * - {@link generateStudySession}: AI study package generation (summary, concepts,
 *   flashcards, quiz, mind map)
 * - {@link evaluateExercise}: Exercise grading with AI feedback
 * - {@link sendStudeChat}: Contextual AI tutor chat
 * - {@link fileToBase64}: File-to-base64 encoding with Web Worker for large files
 */

// ---------------------------------------------------------------------------
// Audio transcription (Whisper) — handles large files via chunking
// ---------------------------------------------------------------------------

/** Result from a Whisper transcription request. */
export type TranscriptionResult = {
  /** Transcribed text content */
  text: string;
  /** Detected language code (e.g. "es", "en") */
  language: string;
  /** Duration in seconds, or null if not available */
  duration: number | null;
};

/**
 * Fetch with a hard timeout via AbortController.
 * Prevents the UI from hanging forever when the backend stalls or the
 * network degrades. Timeouts are set above the backend's own timeouts.
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("La solicitud tardó demasiado. Verificá tu conexión e intentá de nuevo.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Build auth headers for the backend.
 * The backend verifies the Clerk session token (Bearer) on every AI endpoint.
 */
function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Convert a File to a base64 string.
 * Uses a fast sync path for files <1MB and a Web Worker for larger files
 * to avoid blocking the main thread.
 *
 * Exported for testing — mocked in unit tests via {@link TranscribeChunkOptions}.
 */
export async function fileToBase64(file: File): Promise<string> {
  // Para archivos pequeños (<1MB), usar método síncrono rápido
  if (file.size < 1024 * 1024) {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Para archivos grandes, usar Web Worker
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./base64-worker.ts', import.meta.url));
    
    worker.onmessage = (e) => {
      if (e.data.type === 'success') {
        resolve(e.data.base64);
        worker.terminate();
      } else if (e.data.type === 'error') {
        reject(new Error(e.data.error));
        worker.terminate();
      }
      // Ignorar mensajes de progreso por ahora
    };

    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };

    worker.postMessage({ file });
  });
}

/**
 * Options for transcribing a single audio chunk.
 */
export type TranscribeChunkOptions = {
  /** Override for fileToBase64 — used to mock the Web Worker path in tests */
  fileToBase64?: typeof fileToBase64;
};

async function transcribeChunk(
  file: File,
  language?: string,
  options?: TranscribeChunkOptions,
  token?: string,
): Promise<TranscriptionResult> {
  const encodeFile = options?.fileToBase64 ?? fileToBase64;
  const base64 = await encodeFile(file);

  const res = await fetchWithTimeout(
    `${BACKEND_URL}/api/transcribe-audio`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify({
        audioBase64: base64,
        fileName: file.name,
        language: language || "auto",
      }),
    },
    320000, // backend Whisper timeout is 5 min — give it a little more
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const errorMsg = body?.error || 'Error desconocido del servidor';
    throw new Error(`Error al transcribir audio: ${errorMsg}`);
  }

  let result;
  try {
    result = await res.json();
  } catch {
    throw new Error('Invalid response from server — expected JSON');
  }
  return result;
}

/**
 * Options for the full audio transcription pipeline.
 */
export type TranscribeAudioOptions = {
  /** Override for fileToBase64 — used to mock the Web Worker path in tests */
  fileToBase64?: typeof fileToBase64;
  /** Override for server-side audio processing — used to mock the dynamic import in tests */
  transcribeAudioServerSide?: (
    file: File,
    language?: string,
    onProgress?: (message: string) => void,
    token?: string,
  ) => Promise<TranscriptionResult>;
  /** Clerk session token — sent as "Authorization: Bearer" for backend auth */
  token?: string;
};

/**
 * Transcribe an audio/video file using Azure OpenAI Whisper.
 *
 * Routes to server-side processing if the file exceeds client-side limits
 * (10MB or estimated 30 min duration). For smaller files, splits into chunks
 * and transcribes each chunk sequentially.
 *
 * @param file - Audio/video file to transcribe
 * @param language - Optional language hint (e.g. "es", "en")
 * @param onProgress - Progress callback (called with status messages)
 * @param options - Optional overrides (for testing: mock fileToBase64 or server-side)
 * @returns TranscriptionResult with text, detected language, and duration
 */
export async function transcribeAudio(
  file: File,
  language?: string,
  onProgress?: (message: string) => void,
  options?: TranscribeAudioOptions,
): Promise<TranscriptionResult> {
  const DIRECT_UPLOAD_LIMIT = AUDIO_LIMITS.CLIENT_SIDE_MAX_MB * 1024 * 1024;
  const MAX_CLIENT_DURATION_BYTES = 
    AUDIO_LIMITS.MAX_CLIENT_SIDE_DURATION_ESTIMATE_MIN * 
    AUDIO_LIMITS.MB_PER_MINUTE_ESTIMATE * 1024 * 1024;
  
  // Route to server-side if file is too large OR likely too long
  const useServerSide = file.size > DIRECT_UPLOAD_LIMIT || 
                        file.size > MAX_CLIENT_DURATION_BYTES;
  
  if (useServerSide) {
    if (options?.transcribeAudioServerSide) {
      // Injected mock (testing)
      return options.transcribeAudioServerSide(file, language, onProgress, options.token);
    }
    // Import dynamically to avoid bundle bloat
    const { transcribeAudioServerSide } = await import('./api-server-side');
    return transcribeAudioServerSide(file, language, onProgress, options?.token);
  }
  
  // Client-side processing for smaller files
  
  onProgress?.("Preparando audio...");
  const chunkOptions: TranscribeChunkOptions = options ? { fileToBase64: options.fileToBase64 } : {};
  let chunks: Awaited<ReturnType<typeof chunkAudioFile>>;
  try {
    chunks = await chunkAudioFile(file, onProgress);
  } catch (error) {
    // Client-side limits exceeded (e.g. actual duration > 2h at very low
    // bitrates) — route to the server instead of failing the upload.
    const message = error instanceof Error ? error.message : "";
    if (message.includes("demasiado largo")) {
      onProgress?.("Audio demasiado largo para el procesamiento local; enviando al servidor...");
      if (options?.transcribeAudioServerSide) {
        return options.transcribeAudioServerSide(file, language, onProgress, options.token);
      }
      const { transcribeAudioServerSide } = await import('./api-server-side');
      return transcribeAudioServerSide(file, language, onProgress, options?.token);
    }
    throw error;
  }

  if (chunks.length === 1) {
    onProgress?.("Transcribiendo audio...");
    return transcribeChunk(chunks[0].file, language, chunkOptions, options?.token);
  }

  // Multiple chunks — transcribe sequentially and concatenate
  const texts: string[] = [];
  let detectedLanguage = "unknown";

  for (const chunk of chunks) {
    onProgress?.(`Transcribiendo parte ${chunk.index + 1} de ${chunk.total}...`);
    const result = await transcribeChunk(chunk.file, language, chunkOptions, options?.token);
    texts.push(result.text);
    if (result.language && result.language !== "unknown") {
      detectedLanguage = result.language;
    }
  }

  return {
    text: texts.join(" "),
    language: detectedLanguage,
    duration: null,
  };
}

/**
 * Complete AI-generated study package returned by {@link generateStudySession}.
 */
export type AIStudyPackage = {
  summary: string;
  keyConcepts: Concept[];
  flashcards: Flashcard[];
  quiz: QuizItem[];
  mindMap: MindMapNode;
  actionItems: ActionItem[];
  insights: SessionInsight[];
  detectedAssets?: Array<{ type: string; description: string; suggestedFormat?: string }>;
};

/** Request body for the study session generation endpoint. */
export type GenerateStudySessionRequest = {
  transcript: string;
  language?: string;
  summaryFocus?: string;
  generateMore?: boolean;
  existingItems?: unknown;
  extras?: Record<string, unknown>;
};

/**
 * Generate a complete AI study package (summary, concepts, flashcards, quiz,
 * mind map, action items, insights) from a transcript.
 *
 * @param request - Transcript and generation options
 * @param token - Optional Clerk session token (sent as Bearer for backend auth)
 * @returns AIStudyPackage with all generated materials
 * @throws If the server returns an error or unparseable response
 */
export async function generateStudySession(
  request: GenerateStudySessionRequest,
  token?: string,
): Promise<AIStudyPackage> {
  const res = await fetchWithTimeout(
    `${BACKEND_URL}/api/generate-study-session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(request),
    },
    220000, // backend does up to 2 attempts at 90 s each
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const errorMsg = body?.error || 'Error desconocido del servidor';
    throw new Error(`Error al generar sesión de estudio: ${errorMsg}`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid response from server — expected JSON');
  }
  const output = data.output;

  if (!output || typeof output === "string") {
    throw new Error("AI returned an unparseable response. Please try again.");
  }

  return {
    summary: Array.isArray(output.summary) ? output.summary.join("\n\n") : (typeof output.summary === "string" ? output.summary : ""),
    keyConcepts: Array.isArray(output.keyConcepts) ? output.keyConcepts : [],
    flashcards: Array.isArray(output.flashcards) ? output.flashcards : [],
    quiz: Array.isArray(output.quiz) ? output.quiz : [],
    mindMap: output.mindMap ?? { id: "root", label: "Session", children: [] },
    actionItems: Array.isArray(output.actionItems) ? output.actionItems : [],
    insights: Array.isArray(output.insights) ? output.insights : [],
    detectedAssets: Array.isArray(output.detectedAssets) ? output.detectedAssets : [],
  };
}

// ---------------------------------------------------------------------------
// Exercise evaluation (Stude AI corrects student answers)
// ---------------------------------------------------------------------------
/** Request body for the exercise evaluation endpoint. */
export type EvaluateExerciseRequest = {
  exercise: string;
  studentAnswer: string;
  answerType?: "text" | "image";
  context?: string;
};

/**
 * Submit a student's answer to an exercise for AI evaluation.
 * Supports text and image (base64) answers.
 *
 * @param request - Exercise details and student answer
 * @param token - Optional Clerk session token (sent as Bearer for backend auth)
 * @returns ExerciseFeedback with grade and explanation
 */
export async function evaluateExercise(
  request: EvaluateExerciseRequest,
  token?: string,
): Promise<ExerciseFeedback> {
  const res = await fetchWithTimeout(
    `${BACKEND_URL}/api/evaluate-exercise`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(request),
    },
    90000, // backend eval timeout is 60 s
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const errorMsg = body?.error || 'Error desconocido del servidor';
    throw new Error(`Error al evaluar ejercicio: ${errorMsg}`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid response from server — expected JSON');
  }
  return {
    grade: data.grade || "partial",
    explanation: data.explanation || "Sin explicación disponible.",
    receivedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Stude Chat (real AI conversation)
// ---------------------------------------------------------------------------
/** Request body for the Stude AI chat endpoint. */
export type StudeChatRequest = {
  message: string;
  /** The signed-in user's Clerk user ID (used to isolate server-side cache) */
  userId?: string;
  sessionContext?: {
    title?: string;
    course?: string;
    summary?: string;
    concepts?: Array<{ term: string; description: string }>;
    transcriptSnippet?: string;
  };
  chatHistory?: Array<{ role: string; content: string }>;
};

/**
 * Send a message to the Stude AI tutor with session context.
 * The AI responds with contextual help based on the session's content.
 *
 * @param request - Message, optional user ID, session context, and optional chat history
 * @param token - Optional Clerk session token (sent as Bearer for backend auth)
 * @returns The AI's reply text
 */
export async function sendStudeChat(
  request: StudeChatRequest,
  token?: string,
): Promise<string> {
  const res = await fetchWithTimeout(
    `${BACKEND_URL}/api/stude-chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(request),
    },
    90000, // backend chat timeout is 60 s
  );

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const errorMsg = body?.error || 'Error desconocido del servidor';
    throw new Error(`Error en chat con Stude: ${errorMsg}`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid response from server — expected JSON');
  }
  return data.reply || "No pude generar una respuesta.";
}
