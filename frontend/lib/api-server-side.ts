/**
 * Server-Side Audio Transcription
 * Para archivos grandes (>24MB) que no pueden procesarse en el browser
 */

import { BACKEND_URL } from './constants';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ServerSideUploadProgress {
  phase: 'uploading' | 'processing' | 'transcribing' | 'complete';
  progress: number; // 0-100
  message: string;
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Convert File chunk to base64
 */
async function chunkToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result can be null on aborted/errored loads even when onloadend fires
      if (reader.error || typeof reader.result !== "string") {
        reject(new Error(reader.error?.message || "No se pudo leer el archivo de audio"));
        return;
      }
      const base64 = reader.result;
      // Remove data URL prefix
      const base64Data = base64.split(',')[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload audio file in chunks.
 * Reuses the same sessionId across retries: the backend uploads are
 * idempotent (overwrite), so a failed chunk can be re-sent safely and
 * previously uploaded chunks are never orphaned.
 */
async function uploadAudioChunks(
  file: File,
  onProgress?: (progress: ServerSideUploadProgress) => void,
  token?: string,
): Promise<string> {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAY_MS = 1500;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const sessionId = generateSessionId();

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const base64 = await chunkToBase64(chunk);

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const progress = Math.floor((i / totalChunks) * 100);
      onProgress?.({
        phase: 'uploading',
        progress,
        message: `Subiendo ${i + 1}/${totalChunks}${attempt > 1 ? ` (reintento ${attempt})` : ''}...`
      });

      const url = `${BACKEND_URL}/api/upload-audio-chunk`;

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
          body: JSON.stringify({
            sessionId,
            chunkIndex: i,
            totalChunks,
            chunkData: base64,
            fileName: file.name
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error(`Error: tiempo de espera agotado subiendo parte ${i + 1}/${totalChunks}. Verificá tu conexión.`);
        } else {
          lastError = new Error(`Error subiendo audio (parte ${i + 1}/${totalChunks}): ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
        if (attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw lastError;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const errorMsg = error.error || 'Error desconocido del servidor';
        lastError = new Error(`Error al subir audio (parte ${i + 1}/${totalChunks}): ${errorMsg}`);
        if (attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw lastError;
      }

      // Body is not consumed by the caller — a 200 is the success signal.
      // A missing/empty body must not fail an otherwise successful upload.
      await response.json().catch(() => null);
      break;
    }
  }

  onProgress?.({
    phase: 'uploading',
    progress: 100,
    message: 'Upload completo'
  });

  return sessionId;
}

/**
 * Process uploaded audio
 */
async function processAudio(
  sessionId: string,
  language?: string,
  onProgress?: (progress: ServerSideUploadProgress) => void,
  token?: string,
): Promise<{ text: string; language: string }> {
  onProgress?.({
    phase: 'processing',
    progress: 0,
    message: 'Procesando audio en servidor...'
  });

  const url = `${BACKEND_URL}/api/process-audio`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35 * 60 * 1000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({
        sessionId,
        language: language || 'auto'
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMsg = error.error || 'Error desconocido del servidor';
      throw new Error(`Error al procesar audio en el servidor: ${errorMsg}`);
    }

    const result = await response.json();
  
    onProgress?.({
      phase: 'complete',
      progress: 100,
      message: `Transcripción completa (${result.segments} segmentos)`
    });

    return {
      text: result.text,
      language: result.language
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Transcribe audio using server-side chunking
 * For large files (>24MB)
 */
export async function transcribeAudioServerSide(
  file: File,
  language?: string,
  onProgress?: (message: string) => void,
  token?: string,
): Promise<{ text: string; language: string; duration: number | null }> {
  
  const progressAdapter = (progress: ServerSideUploadProgress) => {
    onProgress?.(progress.message);
  };

  try {
    // 1. Upload in chunks
    const sessionId = await uploadAudioChunks(file, progressAdapter, token);

    // 2. Process audio
    const result = await processAudio(sessionId, language, progressAdapter, token);

    return {
      text: result.text,
      language: result.language,
      duration: null // Duration not available in server-side mode
    };

  } catch (error) {
    throw error;
  }
}
