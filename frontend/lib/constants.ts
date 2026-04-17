// Constantes de la aplicación para evitar magic numbers

// Plan de minutos gratis
export const FREE_PLAN_MINUTES = 120;

// Intervalo de spaced repetition para flashcards (días)
export const FLASHCARD_INTERVALS = {
  again: 0,
  hard: 1,
  good: 3,
  easy: 7,
} as const;

// Umbrales de accuracy para quiz
export const QUIZ_ACCURACY_THRESHOLDS = {
  excellent: 70,
  good: 50,
} as const;

// Límites de localStorage
export const STORAGE_LIMITS = {
  maxImageSizeMB: 5,
  maxTotalSizeMB: 10,
} as const;

// Configuración de throttling
export const PERSIST_THROTTLE_MS = 500;

// Configuración de chunking de audio
export const AUDIO_CHUNK_SIZE_MB = 25;

// Límites de tamaño de audio
export const AUDIO_LIMITS = {
  /** Archivos <24MB: procesamiento client-side rápido */
  CLIENT_SIDE_MAX_MB: 24,
  /** Tamaño recomendado para mejor experiencia (~45-50 min de audio) */
  RECOMMENDED_MAX_MB: 50,
  /** Límite absoluto (>200MB rechazado) */
  ABSOLUTE_MAX_MB: 200,
  /** Estimación: ~1MB por minuto de audio promedio */
  MB_PER_MINUTE_ESTIMATE: 1,
} as const;

// Estimaciones de tiempo de procesamiento
export const PROCESSING_TIME_ESTIMATES = {
  /** Client-side: ~1-3 minutos para archivos <24MB */
  CLIENT_SIDE_MINUTES: { min: 1, max: 3 },
  /** Server-side: ~5-10 minutos para archivos medianos (24-100MB) */
  SERVER_SIDE_MINUTES: { min: 5, max: 10 },
  /** Server-side: ~15-30 minutos para archivos grandes (>100MB) */
  SERVER_SIDE_LARGE_MINUTES: { min: 15, max: 30 },
} as const;

// Backend URL - Force correct port
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:7071";
