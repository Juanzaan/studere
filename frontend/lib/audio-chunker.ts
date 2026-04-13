// ---------------------------------------------------------------------------
// Audio chunking utilities for large files exceeding Whisper's 25MB limit.
// Decodes audio, resamples to 16kHz mono, splits into WAV chunks.
// ---------------------------------------------------------------------------

const TARGET_SAMPLE_RATE = 16000;
const MAX_CHUNK_SECONDS = 480; // 8 minutes → ~14.6MB WAV → ~20MB base64 (safe under 25MB)

/** Decode an audio/video file into an AudioBuffer. */
async function decodeFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();
  return decoded;
}

/** Resample an AudioBuffer to 16kHz mono using OfflineAudioContext. */
async function resampleToMono16k(audioBuffer: AudioBuffer): Promise<Float32Array> {
  const outLength = Math.ceil(audioBuffer.duration * TARGET_SAMPLE_RATE);
  const offlineCtx = new OfflineAudioContext(1, outLength, TARGET_SAMPLE_RATE);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}

/** Write a string into a DataView at a given offset. */
function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/** Encode a Float32Array of mono 16kHz PCM samples into a WAV Blob. */
function encodeWav(samples: Float32Array): Blob {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export type AudioChunk = {
  file: File;
  index: number;
  total: number;
};

/**
 * Split a large audio file into WAV chunks suitable for Whisper (< 25MB each).
 * Returns an array of File objects, each a WAV chunk of ~8 minutes.
 * If the file is small enough, returns a single-element array with the original.
 */
export async function chunkAudioFile(
  file: File,
  onProgress?: (message: string) => void,
): Promise<AudioChunk[]> {
  // If file is small enough, no chunking needed
  if (file.size <= 24 * 1024 * 1024) {
    return [{ file, index: 0, total: 1 }];
  }

  onProgress?.("Decodificando audio...");
  const audioBuffer = await decodeFile(file);
  const durationSec = audioBuffer.duration;

  onProgress?.(`Audio: ${Math.round(durationSec / 60)} minutos. Preparando segmentos...`);
  const monoSamples = await resampleToMono16k(audioBuffer);

  const samplesPerChunk = MAX_CHUNK_SECONDS * TARGET_SAMPLE_RATE;
  const chunks: AudioChunk[] = [];
  const totalChunks = Math.ceil(monoSamples.length / samplesPerChunk);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * samplesPerChunk;
    const end = Math.min(start + samplesPerChunk, monoSamples.length);
    const segment = monoSamples.slice(start, end);

    onProgress?.(`Codificando segmento ${i + 1} de ${totalChunks}...`);
    const wavBlob = encodeWav(segment);
    const wavFile = new File([wavBlob], `chunk-${i}.wav`, { type: "audio/wav" });

    chunks.push({ file: wavFile, index: i, total: totalChunks });
  }

  return chunks;
}
