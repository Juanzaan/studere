export type ScreenCaptureResult = {
  blob: Blob;
  durationSeconds: number;
  mimeType: string;
};

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let startTime = 0;

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "video/webm";
}

let onBrowserStopCallback: ((result: ScreenCaptureResult) => void) | null = null;

export async function startScreenCapture(onBrowserStop?: (result: ScreenCaptureResult) => void): Promise<MediaStream> {
  onBrowserStopCallback = onBrowserStop ?? null;
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: true,
  });

  let audioStream: MediaStream | null = null;
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    // mic not available, continue with display audio only
  }

  const tracks = [...displayStream.getTracks()];
  if (audioStream) {
    for (const track of audioStream.getAudioTracks()) {
      tracks.push(track);
    }
  }

  const combinedStream = new MediaStream(tracks);
  const mimeType = pickMimeType();

  chunks = [];
  startTime = Date.now();

  mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  displayStream.getVideoTracks()[0].addEventListener("ended", () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      stopScreenCapture()
        .then((result) => onBrowserStopCallback?.(result))
        .catch(() => {});
    }
  });

  mediaRecorder.start(250);
  return combinedStream;
}

export function stopScreenCapture(): Promise<ScreenCaptureResult> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      reject(new Error("No active screen recording"));
      return;
    }

    mediaRecorder.onstop = () => {
      const durationSeconds = Math.round((Date.now() - startTime) / 1000);
      const mimeType = mediaRecorder?.mimeType || "video/webm";
      const blob = new Blob(chunks, { type: mimeType });

      mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
      mediaRecorder = null;
      chunks = [];

      resolve({ blob, durationSeconds, mimeType });
    };

    mediaRecorder.stop();
  });
}

export function isScreenRecording(): boolean {
  return mediaRecorder !== null && mediaRecorder.state === "recording";
}

export function cancelScreenCapture(): void {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
  mediaRecorder = null;
  chunks = [];
}
