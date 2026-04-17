/**
 * Audio Validation and UX Helpers
 * Provides file validation, size checks, and user-friendly messages
 */

import { AUDIO_LIMITS, PROCESSING_TIME_ESTIMATES } from "./constants";

export type AudioSizeCategory = "small" | "medium" | "large" | "too-large";

export type AudioValidationResult = {
  valid: boolean;
  category: AudioSizeCategory;
  sizeMB: number;
  estimatedMinutes: number;
  processingType: "client" | "server";
  estimatedProcessingTime: { min: number; max: number };
  message: string;
  requiresConfirmation: boolean;
};

/**
 * Validate audio file and return detailed info
 */
export function validateAudioFile(file: File): AudioValidationResult {
  const sizeMB = file.size / (1024 * 1024);
  const estimatedMinutes = Math.round(sizeMB / AUDIO_LIMITS.MB_PER_MINUTE_ESTIMATE);

  // Too large - reject
  if (sizeMB > AUDIO_LIMITS.ABSOLUTE_MAX_MB) {
    return {
      valid: false,
      category: "too-large",
      sizeMB,
      estimatedMinutes,
      processingType: "server",
      estimatedProcessingTime: PROCESSING_TIME_ESTIMATES.SERVER_SIDE_LARGE_MINUTES,
      message: `Archivo demasiado grande (${sizeMB.toFixed(0)}MB). El límite es ${AUDIO_LIMITS.ABSOLUTE_MAX_MB}MB. Considera dividir el audio en partes más pequeñas.`,
      requiresConfirmation: false,
    };
  }

  // Large - requires confirmation
  if (sizeMB > AUDIO_LIMITS.RECOMMENDED_MAX_MB) {
    return {
      valid: true,
      category: "large",
      sizeMB,
      estimatedMinutes,
      processingType: "server",
      estimatedProcessingTime: sizeMB > 100 
        ? PROCESSING_TIME_ESTIMATES.SERVER_SIDE_LARGE_MINUTES 
        : PROCESSING_TIME_ESTIMATES.SERVER_SIDE_MINUTES,
      message: `Archivo grande (${sizeMB.toFixed(0)}MB, ~${estimatedMinutes} min). El procesamiento puede tardar ${sizeMB > 100 ? '15-30' : '5-10'} minutos.`,
      requiresConfirmation: true,
    };
  }

  // Medium - server-side but OK
  if (sizeMB > AUDIO_LIMITS.CLIENT_SIDE_MAX_MB) {
    return {
      valid: true,
      category: "medium",
      sizeMB,
      estimatedMinutes,
      processingType: "server",
      estimatedProcessingTime: PROCESSING_TIME_ESTIMATES.SERVER_SIDE_MINUTES,
      message: `Archivo mediano (${sizeMB.toFixed(1)}MB). Procesamiento server-side (~5-10 minutos).`,
      requiresConfirmation: false,
    };
  }

  // Small - client-side, fast
  return {
    valid: true,
    category: "small",
    sizeMB,
    estimatedMinutes,
    processingType: "client",
    estimatedProcessingTime: PROCESSING_TIME_ESTIMATES.CLIENT_SIDE_MINUTES,
    message: `Archivo pequeño (${sizeMB.toFixed(1)}MB). Procesamiento rápido (~1-3 minutos).`,
    requiresConfirmation: false,
  };
}

/**
 * Get user-friendly size description
 */
export function getAudioSizeLabel(sizeMB: number): string {
  if (sizeMB < 1) return `${(sizeMB * 1024).toFixed(0)}KB`;
  if (sizeMB < 100) return `${sizeMB.toFixed(1)}MB`;
  return `${sizeMB.toFixed(0)}MB`;
}

/**
 * Get emoji for category
 */
export function getAudioCategoryEmoji(category: AudioSizeCategory): string {
  switch (category) {
    case "small": return "✅";
    case "medium": return "⚠️";
    case "large": return "🔴";
    case "too-large": return "⛔";
  }
}

/**
 * Get processing method description
 */
export function getProcessingDescription(category: AudioSizeCategory): string {
  switch (category) {
    case "small":
      return "Procesamiento rápido en tu navegador";
    case "medium":
      return "Procesamiento en servidor (dividido en segmentos)";
    case "large":
      return "Procesamiento largo en servidor. Considera dividir el audio.";
    case "too-large":
      return "Archivo excede límite máximo";
  }
}
