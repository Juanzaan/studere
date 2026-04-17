// ---------------------------------------------------------------------------
// Audio chunking utilities for large files exceeding Whisper's 25MB limit.
// Decodes audio, resamples to 16kHz mono, splits into WAV chunks.
// ---------------------------------------------------------------------------

const TARGET_SAMPLE_RATE = 16000;
const MAX_CHUNK_SECONDS = 240; // 4 minutes → ~7.3MB WAV → ~10MB base64 (safe under 25MB)
const MAX_AUDIO_DURATION_SECONDS = 7200; // 2 hours max to prevent memory issues

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
  console.log(`[Chunking] File: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  
  // If file is small enough, no chunking needed
  if (file.size <= 24 * 1024 * 1024) {
    console.log('[Chunking] File small enough, no chunking needed');
    return [{ file, index: 0, total: 1 }];
  }

  console.log('[Chunking] File too large, will chunk');
  onProgress?.("Decodificando audio...");
  
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await decodeFile(file);
  } catch (error) {
    console.error('[Chunking] Failed to decode audio:', error);
    throw new Error(`No se pudo decodificar el audio. El archivo puede estar corrupto o en un formato no soportado. Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
  
  const durationSec = audioBuffer.duration;
  console.log(`[Chunking] Decoded: ${durationSec.toFixed(1)}s duration (${(durationSec/60).toFixed(1)} min)`);
  
  // Check duration limit
  if (durationSec > MAX_AUDIO_DURATION_SECONDS) {
    const maxMinutes = Math.floor(MAX_AUDIO_DURATION_SECONDS / 60);
    const actualMinutes = Math.floor(durationSec / 60);
    throw new Error(`El audio es demasiado largo (${actualMinutes} min). Máximo permitido: ${maxMinutes} min (2 horas). Por favor, divide el audio en partes más pequeñas.`);
  }

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
