/**
 * Application constants — single source of truth for configuration values.
 *
 * Centralizes magic numbers for:
 * - Plan limits (FREE_PLAN_MINUTES)
 * - Spaced repetition intervals (FLASHCARD_INTERVALS)
 * - Quiz accuracy thresholds (QUIZ_ACCURACY_THRESHOLDS)
 * - localStorage storage limits (STORAGE_LIMITS)
 * - Audio processing limits and estimates (AUDIO_LIMITS, PROCESSING_TIME_ESTIMATES)
 * - Pomodoro timer configuration (POMODORO)
 * - Backend URL resolution (BACKEND_URL)
 */

/** Free plan monthly minute limit for audio processing. */
export const FREE_PLAN_MINUTES = 120;

/** Spaced repetition intervals for flashcards in days (SM-2 inspired). */
export const FLASHCARD_INTERVALS = {
  again: 0,
  hard: 1,
  good: 3,
  easy: 7,
} as const;

/** Accuracy thresholds for quiz performance classification. */
export const QUIZ_ACCURACY_THRESHOLDS = {
  excellent: 70,
  good: 50,
} as const;

/** localStorage storage limits to prevent quota errors. */
export const STORAGE_LIMITS = {
  maxImageSizeMB: 5,
  maxTotalSizeMB: 10,
} as const;

/** Throttle interval (ms) for debounced session persistence writes. */
export const PERSIST_THROTTLE_MS = 500;

/** Chunk size (MB) for splitting large audio files before server-side processing. */
export const AUDIO_CHUNK_SIZE_MB = 25;

/** Audio file size limits and routing thresholds. */
export const AUDIO_LIMITS = {
  /** Archivos <10MB: procesamiento client-side rápido */
  CLIENT_SIDE_MAX_MB: 10,
  /** Tamaño recomendado para mejor experiencia (~45-50 min de audio) */
  RECOMMENDED_MAX_MB: 50,
  /** Límite absoluto (>200MB rechazado) */
  ABSOLUTE_MAX_MB: 200,
  /** Estimación: ~1MB por minuto de audio promedio */
  MB_PER_MINUTE_ESTIMATE: 1,
  /** Si la duración estimada > 30min, usar servidor */
  MAX_CLIENT_SIDE_DURATION_ESTIMATE_MIN: 30,
} as const;

/** Estimated processing times for different audio file sizes, used for user-facing progress messages. */
export const PROCESSING_TIME_ESTIMATES = {
  /** Client-side: ~1-3 minutos para archivos <24MB */
  CLIENT_SIDE_MINUTES: { min: 1, max: 3 },
  /** Server-side: ~5-10 minutos para archivos medianos (24-100MB) */
  SERVER_SIDE_MINUTES: { min: 5, max: 10 },
  /** Server-side: ~15-30 minutos para archivos grandes (>100MB) */
  SERVER_SIDE_LARGE_MINUTES: { min: 15, max: 30 },
} as const;

/** Pomodoro timer default durations and round configuration. */
export const POMODORO = {
  FOCUS_MINUTES: 25,
  SHORT_BREAK_MINUTES: 5,
  LONG_BREAK_MINUTES: 15,
  ROUNDS_BEFORE_LONG_BREAK: 4,
} as const;

/**
 * Resolved backend URL.
 * Checks NEXT_PUBLIC_BACKEND_URL, then NEXT_PUBLIC_API_URL, then falls back
 * to http://localhost:7071 for local development.
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:7071";
