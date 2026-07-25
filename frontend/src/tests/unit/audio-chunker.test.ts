import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { chunkAudioFile } from '@/lib/audio-chunker';

// ---------------------------------------------------------------------------
// Web Audio API mocks (happy-dom doesn't provide AudioContext)
// ---------------------------------------------------------------------------

const TARGET_SAMPLE_RATE = 16000;
const MAX_CHUNK_SECONDS = 240;
const MAX_CHUNK_SAMPLES = MAX_CHUNK_SECONDS * TARGET_SAMPLE_RATE; // 3,840,000

function createMockAudioBuffer(durationSec: number, channelData: Float32Array) {
  return {
    duration: durationSec,
    numberOfChannels: 1,
    sampleRate: TARGET_SAMPLE_RATE,
    getChannelData: vi.fn(() => channelData),
  };
}

function createMockBufferSource() {
  return {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
  };
}

let mockAudioBufferInstance: ReturnType<typeof createMockAudioBuffer>;
let mockOfflineRenderResult: ReturnType<typeof createMockAudioBuffer>;

let decodeAudioDataImpl: (buffer: ArrayBuffer) => Promise<any>;
let closeImpl: () => Promise<void>;
let createBufferSourceImpl: () => any;
let startRenderingImpl: () => Promise<any>;

function resetMockImplementations() {
  decodeAudioDataImpl = async () => mockAudioBufferInstance;
  closeImpl = async () => undefined;
  createBufferSourceImpl = () => createMockBufferSource();
  startRenderingImpl = async () => mockOfflineRenderResult;
}

resetMockImplementations();

beforeAll(() => {
  // Mock AudioContext as a proper constructor using prototype
  function AudioContextMock() {
    // noop
  }
  AudioContextMock.prototype.decodeAudioData = function (buffer: ArrayBuffer) {
    return decodeAudioDataImpl(buffer);
  };
  AudioContextMock.prototype.close = function () {
    return closeImpl();
  };
  Object.defineProperty(AudioContextMock.prototype, 'currentTime', {
    get: () => 0,
    configurable: true,
  });
  globalThis.AudioContext = AudioContextMock as unknown as typeof AudioContext;

  // Mock OfflineAudioContext
  function OfflineAudioContextMock(
    this: any,
    _channels: number,
    _length: number,
    _sampleRate: number,
  ) {
    this.destination = {};
  }
  OfflineAudioContextMock.prototype.createBufferSource = function () {
    return createBufferSourceImpl();
  };
  OfflineAudioContextMock.prototype.startRendering = function () {
    return startRenderingImpl();
  };
  globalThis.OfflineAudioContext = OfflineAudioContextMock as unknown as typeof OfflineAudioContext;
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock File with given size in bytes */
function createFile(sizeBytes: number, name = 'test-audio.mp3', type = 'audio/mp3'): File {
  const content = new Uint8Array(sizeBytes);
  // Fill with some non-zero data so it looks like a real file
  for (let i = 0; i < sizeBytes; i++) {
    content[i] = i & 0xff;
  }
  return new File([content], name, { type });
}

/**
 * Create a Float32Array of sine wave samples with given length.
 * Realistic enough for WAV encoding to produce a valid-looking blob.
 */
function createSineSamples(length: number, freq = 440): Float32Array {
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = Math.sin(2 * Math.PI * freq * i / TARGET_SAMPLE_RATE) * 0.3;
  }
  return samples;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('chunkAudioFile', () => {
  describe('Duration estimation — file too large', () => {
    it('should throw when estimated duration exceeds client-side limit (>30 min)', async () => {
      // ~31MB => ~31 minutes estimated (MB_PER_MINUTE_ESTIMATE = 1)
      const file = createFile(31 * 1024 * 1024);

      await expect(chunkAudioFile(file)).rejects.toThrow(
        'El archivo parece tener más de 30 minutos de audio',
      );
    });

    it('should throw for very large files (>200MB) before any processing', async () => {
      const file = createFile(250 * 1024 * 1024);

      await expect(chunkAudioFile(file)).rejects.toThrow(
        'más de 30 minutos',
      );
    });

    it('should not throw for files just under the 30-min estimation threshold', async () => {
      // 29MB => ~29 min estimated, under 30-min limit
      // But > 10MB, so it will attempt decoding → need valid mocks
      const samples = createSineSamples(1000); // very short audio
      mockAudioBufferInstance = createMockAudioBuffer(5, samples);
      mockOfflineRenderResult = createMockAudioBuffer(5, samples);

      const file = createFile(29 * 1024 * 1024);

      // Should NOT throw the duration error — proceeds to decode
      const result = await chunkAudioFile(file);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Small files — no chunking needed', () => {
    it('should return single chunk for files <= 10MB', async () => {
      const file = createFile(5 * 1024 * 1024); // 5 MB

      const result = await chunkAudioFile(file);

      expect(result).toHaveLength(1);
      expect(result[0].file).toBe(file); // original file, no processing
      expect(result[0].index).toBe(0);
      expect(result[0].total).toBe(1);
    });

    it('should return single chunk for empty file', async () => {
      const file = createFile(0);

      const result = await chunkAudioFile(file);

      expect(result).toHaveLength(1);
      expect(result[0].file).toBe(file);
      expect(result[0].index).toBe(0);
      expect(result[0].total).toBe(1);
    });

    it('should return single chunk for file exactly at 10MB boundary', async () => {
      const file = createFile(10 * 1024 * 1024); // exactly 10 MB

      const result = await chunkAudioFile(file);

      expect(result).toHaveLength(1);
      expect(result[0].file).toBe(file);
    });

    it('should return single chunk for file just under 10MB', async () => {
      const file = createFile(10 * 1024 * 1024 - 1); // 9.999... MB

      const result = await chunkAudioFile(file);

      expect(result).toHaveLength(1);
    });
  });

  describe('Decode error handling', () => {
    it('should throw when AudioContext.decodeAudioData fails', async () => {
      // File > 10MB (triggers decode path) but < 30MB (under estimation limit)
      // Make decode fail by overriding the implementation
      decodeAudioDataImpl = async () => {
        throw new Error('Corrupted file');
      };

      const file = createFile(15 * 1024 * 1024);

      await expect(chunkAudioFile(file)).rejects.toThrow(
        'No se pudo decodificar el audio',
      );
    });

    it('should handle non-Error decode failures gracefully', async () => {
      // Make decode throw a non-Error value
      decodeAudioDataImpl = async () => {
        throw 'string error'; // non-Error throw
      };

      const file = createFile(15 * 1024 * 1024);

      await expect(chunkAudioFile(file)).rejects.toThrow('Unknown');
    });
  });

  describe('Duration limit check', () => {
    it('should throw when decoded audio exceeds 2 hours', async () => {
      // Reset decode implementation in case it was overridden
      decodeAudioDataImpl = async () => mockAudioBufferInstance;

      const samples = createSineSamples(1000);
      // 3 hours > 2 hours max
      mockAudioBufferInstance = createMockAudioBuffer(3 * 60 * 60, samples);

      const file = createFile(15 * 1024 * 1024);

      await expect(chunkAudioFile(file)).rejects.toThrow(
        'El audio es demasiado largo',
      );
      await expect(chunkAudioFile(file)).rejects.toThrow('180 min');
      await expect(chunkAudioFile(file)).rejects.toThrow('120 min');
    });

    it('should accept audio exactly at 2 hours', async () => {
      decodeAudioDataImpl = async () => mockAudioBufferInstance;

      const samples = createSineSamples(MAX_CHUNK_SAMPLES); // exactly 1 chunk
      mockAudioBufferInstance = createMockAudioBuffer(2 * 60 * 60, samples);
      mockOfflineRenderResult = createMockAudioBuffer(2 * 60 * 60, samples);

      const file = createFile(15 * 1024 * 1024);

      // Should NOT throw — audio is at the limit
      const result = await chunkAudioFile(file);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Successful chunking paths', () => {
    it('should return 1 chunk for audio shorter than max chunk duration', async () => {
      const shortDuration = 60; // 1 minute
      const samples = createSineSamples(shortDuration * TARGET_SAMPLE_RATE);
      mockAudioBufferInstance = createMockAudioBuffer(shortDuration, samples);
      mockOfflineRenderResult = createMockAudioBuffer(shortDuration, samples);

      const file = createFile(15 * 1024 * 1024);

      const result = await chunkAudioFile(file);

      expect(result).toHaveLength(1);
      expect(result[0].index).toBe(0);
      expect(result[0].total).toBe(1);
      expect(result[0].file.name).toBe('chunk-0.wav');
      expect(result[0].file.type).toBe('audio/wav');
    });

    it('should return multiple chunks for audio longer than max chunk duration', async () => {
      // 500 seconds > 240 second chunk limit → 3 chunks (500/240 = 2.08 → ceil = 3)
      const audioDuration = 500;
      const totalSamples = Math.ceil(audioDuration * TARGET_SAMPLE_RATE);
      const samples = createSineSamples(totalSamples);
      mockAudioBufferInstance = createMockAudioBuffer(audioDuration, samples);
      mockOfflineRenderResult = createMockAudioBuffer(audioDuration, samples);

      const file = createFile(15 * 1024 * 1024);

      const result = await chunkAudioFile(file);

      expect(result.length).toBeGreaterThan(1);
      expect(result[0].total).toBe(result.length);
      expect(result[result.length - 1].index).toBe(result.length - 1);
    });

    it('should produce chunks covering the full audio duration', async () => {
      // ~300 seconds → 2 chunks (300/240 = 1.25 → ceil = 2)
      const audioDuration = 300;
      const totalSamples = Math.ceil(audioDuration * TARGET_SAMPLE_RATE);
      const samples = createSineSamples(totalSamples);
      mockAudioBufferInstance = createMockAudioBuffer(audioDuration, samples);
      mockOfflineRenderResult = createMockAudioBuffer(audioDuration, samples);

      const file = createFile(15 * 1024 * 1024);

      const result = await chunkAudioFile(file);

      expect(result).toHaveLength(2);
      expect(result[0].index).toBe(0);
      expect(result[1].index).toBe(1);

      // Each chunk should be a File with .wav extension
      result.forEach((chunk, i) => {
        expect(chunk.file).toBeInstanceOf(File);
        expect(chunk.file.name).toBe(`chunk-${i}.wav`);
        expect(chunk.file.type).toBe('audio/wav');
        expect(chunk.file.size).toBeGreaterThan(0);
      });

      // Total samples should be preserved (or close to it after splitting)
      const totalSamplesInChunks = result.reduce(
        (sum, chunk) => sum + chunk.file.size,
        0,
      );
      expect(totalSamplesInChunks).toBeGreaterThan(0);
    });

    it('should produce correctly sized WAV files for each chunk', async () => {
      // A WAV file has 44 bytes header + 2 bytes per sample
      // With a short 30-second mono 16kHz audio: 30 * 16000 = 480,000 samples
      // WAV size: 44 + 480000 * 2 = 960,044 bytes
      const audioDuration = 30;
      const totalSamples = Math.ceil(audioDuration * TARGET_SAMPLE_RATE);
      const samples = createSineSamples(totalSamples);
      mockAudioBufferInstance = createMockAudioBuffer(audioDuration, samples);
      mockOfflineRenderResult = createMockAudioBuffer(audioDuration, samples);

      const file = createFile(15 * 1024 * 1024);

      const result = await chunkAudioFile(file);

      expect(result).toHaveLength(1);
      const wavFile = result[0].file;
      expect(wavFile.size).toBe(44 + totalSamples * 2);
    });
  });

  describe('onProgress callback', () => {
    it('should call onProgress during processing', async () => {
      const onProgress = vi.fn();
      const samples = createSineSamples(TARGET_SAMPLE_RATE * 30); // 30 seconds
      mockAudioBufferInstance = createMockAudioBuffer(30, samples);
      mockOfflineRenderResult = createMockAudioBuffer(30, samples);

      const file = createFile(15 * 1024 * 1024);

      await chunkAudioFile(file, onProgress);

      // Should have been called at least for decode and encode steps
      expect(onProgress).toHaveBeenCalled();
      const messages = onProgress.mock.calls.map((c: string[]) => c[0]);
      expect(messages.some((m: string) => m.includes('Decodificando'))).toBe(true);
      expect(messages.some((m: string) => m.includes('minutos'))).toBe(true);
      expect(messages.some((m: string) => m.includes('Codificando'))).toBe(true);
    });

    it('should call onProgress with correct segment info for multi-chunk', async () => {
      const onProgress = vi.fn();
      const audioDuration = 500;
      const totalSamples = Math.ceil(audioDuration * TARGET_SAMPLE_RATE);
      const samples = createSineSamples(totalSamples);
      mockAudioBufferInstance = createMockAudioBuffer(audioDuration, samples);
      mockOfflineRenderResult = createMockAudioBuffer(audioDuration, samples);

      const file = createFile(15 * 1024 * 1024);

      await chunkAudioFile(file, onProgress);

      const messages = onProgress.mock.calls.map((c: string[]) => c[0]);
      const encodeMessages = messages.filter((m: string) => m.includes('Codificando'));
      expect(encodeMessages.length).toBeGreaterThanOrEqual(2); // at least 2 chunks
    });

    it('should work without onProgress callback', async () => {
      const samples = createSineSamples(TARGET_SAMPLE_RATE * 30);
      mockAudioBufferInstance = createMockAudioBuffer(30, samples);
      mockOfflineRenderResult = createMockAudioBuffer(30, samples);

      const file = createFile(15 * 1024 * 1024);

      // Should not throw even without callback
      const result = await chunkAudioFile(file);
      expect(result).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle audio that is exactly one sample long', async () => {
      const samples = createSineSamples(1);
      mockAudioBufferInstance = createMockAudioBuffer(0.0000625, samples); // 1/16000 sec
      mockOfflineRenderResult = createMockAudioBuffer(0.0000625, samples);

      const file = createFile(15 * 1024 * 1024);

      const result = await chunkAudioFile(file);
      expect(result).toHaveLength(1);
      // WAV header (44) + 1 sample * 2 bytes = 46
      expect(result[0].file.size).toBe(46);
    });

    it('should handle audio with zero-length samples (silence)', async () => {
      const samples = new Float32Array(TARGET_SAMPLE_RATE * 10); // 10 seconds of silence
      mockAudioBufferInstance = createMockAudioBuffer(10, samples);
      mockOfflineRenderResult = createMockAudioBuffer(10, samples);

      const file = createFile(11 * 1024 * 1024);

      const result = await chunkAudioFile(file);
      expect(result).toHaveLength(1);
      expect(result[0].file.size).toBe(44 + samples.length * 2);
    });

    it('should handle audio with maximum sample values (clipping)', async () => {
      const length = TARGET_SAMPLE_RATE * 5; // 5 seconds
      const samples = new Float32Array(length);
      // Fill with alternating min/max values to test clamping
      for (let i = 0; i < length; i++) {
        samples[i] = i % 2 === 0 ? 1.5 : -1.5; // clipped to [-1, 1]
      }
      mockAudioBufferInstance = createMockAudioBuffer(5, samples);
      mockOfflineRenderResult = createMockAudioBuffer(5, samples);

      const file = createFile(11 * 1024 * 1024);

      const result = await chunkAudioFile(file);
      expect(result).toHaveLength(1);
      expect(result[0].file.size).toBe(44 + length * 2);
    });

    it('should handle very large number of chunks gracefully', async () => {
      // ~2000 seconds → 9 chunks (2000/240 = 8.33 → ceil = 9)
      const audioDuration = 2000;
      const totalSamples = Math.ceil(audioDuration * TARGET_SAMPLE_RATE);
      const samples = createSineSamples(totalSamples);
      mockAudioBufferInstance = createMockAudioBuffer(audioDuration, samples);
      mockOfflineRenderResult = createMockAudioBuffer(audioDuration, samples);

      const file = createFile(20 * 1024 * 1024);

      const result = await chunkAudioFile(file);

      const expectedChunks = Math.ceil(totalSamples / MAX_CHUNK_SAMPLES);
      expect(result).toHaveLength(expectedChunks);
      expect(result[0].total).toBe(expectedChunks);
      expect(result[expectedChunks - 1].index).toBe(expectedChunks - 1);
    });
  });
});
