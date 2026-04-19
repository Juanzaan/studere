/**
 * Server-Side Audio Transcription
 * Para archivos grandes (>24MB) que no pueden procesarse en el browser
 */

import { BACKEND_URL } from './constants';

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
      const base64 = reader.result as string;
      // Remove data URL prefix
      const base64Data = base64.split(',')[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload audio file in chunks
 */
async function uploadAudioChunks(
  file: File,
  onProgress?: (progress: ServerSideUploadProgress) => void
): Promise<string> {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const sessionId = generateSessionId();

  console.log(`[ServerSide] Uploading ${file.name} in ${totalChunks} chunks`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const base64 = await chunkToBase64(chunk);

    const progress = Math.floor((i / totalChunks) * 100);
    onProgress?.({
      phase: 'uploading',
      progress,
      message: `Subiendo ${i + 1}/${totalChunks}...`
    });

    const url = `${BACKEND_URL}/api/upload-audio-chunk`;
    console.log(`[ServerSide] Uploading chunk ${i + 1}/${totalChunks}, size: ${chunk.size} bytes`);
    console.log(`[ServerSide] URL: ${url}`);

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      console.error(`[ServerSide] Chunk ${i + 1} upload failed:`, error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Error: tiempo de espera agotado subiendo parte ${i + 1}/${totalChunks}. Verificá tu conexión.`);
      }
      throw new Error(`Error subiendo audio (parte ${i + 1}/${totalChunks}): ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMsg = error.error || 'Error desconocido del servidor';
      throw new Error(`Error al subir audio (parte ${i + 1}/${totalChunks}): ${errorMsg}`);
    }

    const result = await response.json();
    console.log(`[ServerSide] Chunk ${i + 1} uploaded. Complete: ${result.complete}`);
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
  onProgress?: (progress: ServerSideUploadProgress) => void
): Promise<{ text: string; language: string }> {
  onProgress?.({
    phase: 'processing',
    progress: 0,
    message: 'Procesando audio en servidor...'
  });

  const url = `${BACKEND_URL}/api/process-audio`;
  console.log(`[ServerSide] Processing session ${sessionId}`);
  console.log(`[ServerSide] URL: ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35 * 60 * 1000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    console.log(`[ServerSide] Processing complete:`, {
      segments: result.segments,
      textLength: result.text.length
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
  onProgress?: (message: string) => void
): Promise<{ text: string; language: string; duration: number | null }> {
  console.log(`[ServerSide] Starting server-side transcription for ${file.name}`);
  
  const progressAdapter = (progress: ServerSideUploadProgress) => {
    onProgress?.(progress.message);
  };

  try {
    // 1. Upload in chunks
    const sessionId = await uploadAudioChunks(file, progressAdapter);

    // 2. Process audio
    const result = await processAudio(sessionId, language, progressAdapter);

    return {
      text: result.text,
      language: result.language,
      duration: null // Duration not available in server-side mode
    };

  } catch (error) {
    console.error('[ServerSide] Transcription failed:', error);
    throw error;
  }
}
