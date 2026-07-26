/**
 * Browser audio capture via MediaRecorder API.
 *
 * Provides a simple state-machine interface:
 * - {@link startAudioCapture}: Request mic access and start recording
 * - {@link stopAudioCapture}: Stop recording and return the audio blob
 * - {@link cancelAudioCapture}: Cancel without returning data
 * - {@link isRecording}: Check if currently recording
 *
 * Automatically selects the best supported MIME type (opus, ogg, mp4).
 */

/** State of the audio capture system. */
export type AudioCaptureState = "idle" | "recording" | "stopped" | "error";

/** Result of a completed audio capture, containing the blob and metadata. */
export type AudioCaptureResult = {
  /** The recorded audio blob */
  blob: Blob;
  /** Duration in seconds */
  durationSeconds: number;
  /** MIME type of the recording (e.g. "audio/webm;codecs=opus") */
  mimeType: string;
};

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let startTime = 0;

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "audio/webm";
}

/**
 * Request microphone access and begin recording.
 * Selects the best supported audio MIME type automatically.
 *
 * @returns The active MediaStream (useful for UI feedback like volume meters)
 * @throws If microphone access is denied or unavailable
 */
export async function startAudioCapture(): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();

  chunks = [];
  startTime = Date.now();

  mediaRecorder = new MediaRecorder(stream, { mimeType });
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  mediaRecorder.start(250);
  return stream;
}

/**
 * Stop the current recording and return the captured audio.
 * Stops all media tracks and resolves with the audio blob.
 *
 * @returns Promise resolving with the recorded audio and metadata
 * @throws If no active recording exists
 */
export function stopAudioCapture(): Promise<AudioCaptureResult> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      reject(new Error("No active recording"));
      return;
    }

    mediaRecorder.onstop = () => {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      const mimeType = mediaRecorder?.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: mimeType });

      mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
      mediaRecorder = null;
      chunks = [];

      resolve({ blob, durationSeconds, mimeType });
    };

    try {
      mediaRecorder.stop();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'InvalidStateError') {
        // Already stopped, ignore
      } else {
        throw e;
      }
    }
  });
}

/** Check if audio is currently being recorded. */
export function isRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === "recording";
}

/** Cancel the current recording without saving the audio data. */
export function cancelAudioCapture(): void {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
  mediaRecorder = null;
  chunks = [];
}
