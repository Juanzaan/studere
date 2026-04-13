import type { Concept, Flashcard, QuizItem, ActionItem, MindMapNode, SessionInsight, ExerciseFeedback } from "@/lib/types";
import { chunkAudioFile } from "@/lib/audio-chunker";
import { BACKEND_URL } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Audio transcription (Whisper) — handles large files via chunking
// ---------------------------------------------------------------------------
export type TranscriptionResult = {
  text: string;
  language: string;
  duration: number | null;
};

async function fileToBase64(file: File): Promise<string> {
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

async function transcribeChunk(
  file: File,
  language?: string,
): Promise<TranscriptionResult> {
  const base64 = await fileToBase64(file);

  const res = await fetch(`${BACKEND_URL}/api/transcribe-audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioBase64: base64,
      fileName: file.name,
      language: language || "auto",
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Transcription failed (${res.status})`);
  }

  return res.json();
}

export async function transcribeAudio(
  file: File,
  language?: string,
  onProgress?: (message: string) => void,
): Promise<TranscriptionResult> {
  onProgress?.("Preparando audio...");
  const chunks = await chunkAudioFile(file, onProgress);

  if (chunks.length === 1) {
    onProgress?.("Transcribiendo audio...");
    return transcribeChunk(chunks[0].file, language);
  }

  // Multiple chunks — transcribe sequentially and concatenate
  const texts: string[] = [];
  let detectedLanguage = "unknown";

  for (const chunk of chunks) {
    onProgress?.(`Transcribiendo parte ${chunk.index + 1} de ${chunk.total}...`);
    const result = await transcribeChunk(chunk.file, language);
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

export type GenerateStudySessionRequest = {
  transcript: string;
  language?: string;
  summaryFocus?: string;
  generateMore?: boolean;
  existingItems?: unknown;
  extras?: Record<string, unknown>;
};

export async function generateStudySession(
  request: GenerateStudySessionRequest,
): Promise<AIStudyPackage> {
  const res = await fetch(`${BACKEND_URL}/api/generate-study-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Backend returned ${res.status}`);
  }

  const data = await res.json();
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
export type EvaluateExerciseRequest = {
  exercise: string;
  studentAnswer: string;
  answerType?: "text" | "image";
  context?: string;
};

export async function evaluateExercise(
  request: EvaluateExerciseRequest,
): Promise<ExerciseFeedback> {
  const res = await fetch(`${BACKEND_URL}/api/evaluate-exercise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Evaluation failed (${res.status})`);
  }

  const data = await res.json();
  return {
    grade: data.grade || "partial",
    explanation: data.explanation || "Sin explicación disponible.",
    receivedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Stude Chat (real AI conversation)
// ---------------------------------------------------------------------------
export type StudeChatRequest = {
  message: string;
  sessionContext?: {
    title?: string;
    course?: string;
    summary?: string;
    concepts?: Array<{ term: string; description: string }>;
    transcriptSnippet?: string;
  };
  chatHistory?: Array<{ role: string; content: string }>;
};

export async function sendStudeChat(
  request: StudeChatRequest,
): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/stude-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Chat failed (${res.status})`);
  }

  const data = await res.json();
  return data.reply || "No pude generar una respuesta.";
}
