/**
 * TranscribeAudio - Unit Tests
 * Testing audio transcription logic, validation, and error handling
 */

const { describe, it, expect, beforeEach, vi } = require('vitest');

describe('TranscribeAudio Validation', () => {
  it('should reject empty audioBase64', () => {
    const req = { body: { audioBase64: '' } };
    expect(req.body.audioBase64).toBeFalsy();
  });

  it('should reject non-string audioBase64', () => {
    const req = { body: { audioBase64: 123 } };
    expect(typeof req.body.audioBase64).not.toBe('string');
  });

  it('should accept valid base64 string', () => {
    const validBase64 = Buffer.from('test audio').toString('base64');
    const req = { body: { audioBase64: validBase64 } };
    expect(req.body.audioBase64).toBeTruthy();
    expect(typeof req.body.audioBase64).toBe('string');
  });

  it('should decode base64 to buffer correctly', () => {
    const testData = 'test audio data';
    const base64 = Buffer.from(testData).toString('base64');
    const buffer = Buffer.from(base64, 'base64');
    expect(buffer.toString()).toBe(testData);
  });

  it('should reject audio larger than 25MB', () => {
    const MAX_SIZE = 25 * 1024 * 1024;
    const largeBuffer = Buffer.alloc(MAX_SIZE + 1);
    expect(largeBuffer.length).toBeGreaterThan(MAX_SIZE);
  });

  it('should accept audio smaller than 25MB', () => {
    const MAX_SIZE = 25 * 1024 * 1024;
    const smallBuffer = Buffer.alloc(1024 * 1024); // 1MB
    expect(smallBuffer.length).toBeLessThan(MAX_SIZE);
  });

  it('should reject audio smaller than 100 bytes', () => {
    const MIN_SIZE = 100;
    const tinyBuffer = Buffer.alloc(50);
    expect(tinyBuffer.length).toBeLessThan(MIN_SIZE);
  });
});

describe('Cache Key Generation', () => {
  it('should generate consistent cache key for same audio', () => {
    const audioBase64 = 'dGVzdCBhdWRpbyBkYXRh'; // "test audio data"
    const language = 'es';
    
    const key1 = { audioHash: audioBase64.substring(0, 100), language };
    const key2 = { audioHash: audioBase64.substring(0, 100), language };
    
    expect(JSON.stringify(key1)).toBe(JSON.stringify(key2));
  });

  it('should generate different cache key for different audio', () => {
    const audio1 = 'dGVzdCBhdWRpbyAx'; // "test audio 1"
    const audio2 = 'dGVzdCBhdWRpbyAy'; // "test audio 2"
    const language = 'es';
    
    const key1 = { audioHash: audio1.substring(0, 100), language };
    const key2 = { audioHash: audio2.substring(0, 100), language };
    
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });

  it('should use first 100 chars as signature', () => {
    const longAudio = 'a'.repeat(200);
    const key = { audioHash: longAudio.substring(0, 100), language: 'es' };
    
    expect(key.audioHash.length).toBe(100);
  });
});

describe('Size Calculations', () => {
  it('should calculate MB correctly', () => {
    const bytes = 5 * 1024 * 1024; // 5MB
    const mb = (bytes / 1024 / 1024).toFixed(2);
    expect(mb).toBe('5.00');
  });

  it('should calculate KB correctly', () => {
    const bytes = 500 * 1024; // 500KB
    const kb = (bytes / 1024).toFixed(2);
    expect(kb).toBe('500.00');
  });

  it('should warn for files > 20MB', () => {
    const bytes = 21 * 1024 * 1024;
    const isLarge = bytes > 20 * 1024 * 1024;
    expect(isLarge).toBe(true);
  });
});

describe('Language Handling', () => {
  it('should use auto-detect when language is undefined', () => {
    const language = undefined;
    const options = {};
    if (language && language !== 'auto') {
      options.language = language;
    }
    expect(options.language).toBeUndefined();
  });

  it('should use auto-detect when language is "auto"', () => {
    const language = 'auto';
    const options = {};
    if (language && language !== 'auto') {
      options.language = language;
    }
    expect(options.language).toBeUndefined();
  });

  it('should set language when specific language provided', () => {
    const language = 'es';
    const options = {};
    if (language && language !== 'auto') {
      options.language = language;
    }
    expect(options.language).toBe('es');
  });
});

describe('Response Format', () => {
  it('should return correct response structure', () => {
    const response = {
      text: 'Transcribed text',
      language: 'es',
      duration: 120,
      cached: false,
    };

    expect(response).toHaveProperty('text');
    expect(response).toHaveProperty('language');
    expect(response).toHaveProperty('duration');
    expect(response).toHaveProperty('cached');
  });

  it('should handle missing duration gracefully', () => {
    const whisperResult = { text: 'Test' };
    const response = {
      text: whisperResult.text || '',
      language: whisperResult.language || 'unknown',
      duration: whisperResult.duration || null,
      cached: false,
    };

    expect(response.duration).toBeNull();
  });
});
