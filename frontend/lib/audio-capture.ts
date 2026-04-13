export type AudioCaptureState = "idle" | "recording" | "stopped" | "error";

export type AudioCaptureResult = {
  blob: Blob;
  durationSeconds: number;
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

    mediaRecorder.stop();
  });
}

export function isRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === "recording";
}

export function cancelAudioCapture(): void {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
  mediaRecorder = null;
  chunks = [];
}
