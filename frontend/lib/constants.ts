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

// Backend URL
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:7071";
