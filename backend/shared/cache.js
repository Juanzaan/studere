/**
 * Caching Module
 * Optimización: Reduce costos y latencia cacheando respuestas de OpenAI
 */

const NodeCache = require("node-cache");
const crypto = require("crypto");

// Cache configuration
const CACHE_CONFIG = {
  // TTL (Time To Live) en segundos por tipo de operación
  TRANSCRIPTION: 3600 * 24, // 24 horas (transcripts no cambian)
  GENERATION: 3600 * 2,      // 2 horas (study sessions pueden cambiar ligeramente)
  CHAT: 3600,                // 1 hora (respuestas de chat)
  EVALUATION: 1800,          // 30 minutos (evaluaciones)
  
  // Configuración general
  stdTTL: 3600,              // Default: 1 hora
  checkperiod: 600,          // Check cada 10 minutos para expired keys
  maxKeys: 1000,             // Máximo 1000 items en cache
};

// Initialize cache instances
const transcriptionCache = new NodeCache({
  stdTTL: CACHE_CONFIG.TRANSCRIPTION,
  checkperiod: CACHE_CONFIG.checkperiod,
  maxKeys: 500,
});

const generationCache = new NodeCache({
  stdTTL: CACHE_CONFIG.GENERATION,
  checkperiod: CACHE_CONFIG.checkperiod,
  maxKeys: 300,
});

const chatCache = new NodeCache({
  stdTTL: CACHE_CONFIG.CHAT,
  checkperiod: CACHE_CONFIG.checkperiod,
  maxKeys: 500,
});

const evaluationCache = new NodeCache({
  stdTTL: CACHE_CONFIG.EVALUATION,
  checkperiod: CACHE_CONFIG.checkperiod,
  maxKeys: 200,
});

/**
 * Generate cache key from input data
 * @param {string} type - Cache type (transcription, generation, chat, evaluation)
 * @param {any} data - Data to hash
 * @returns {string} - Cache key
 */
function generateKey(type, data) {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(data));
  return `${type}:${hash.digest("hex").slice(0, 16)}`;
}

/**
 * Get cache instance by type
 * @param {string} type
 * @returns {NodeCache}
 */
function getCacheInstance(type) {
  switch (type) {
    case "transcription":
      return transcriptionCache;
    case "generation":
      return generationCache;
    case "chat":
      return chatCache;
    case "evaluation":
      return evaluationCache;
    default:
      return generationCache;
  }
}

/**
 * Get item from cache
 * @param {string} type - Cache type
 * @param {any} key - Key data to hash
 * @returns {any | null} - Cached value or null
 */
function get(type, key) {
  const cacheKey = generateKey(type, key);
  const cache = getCacheInstance(type);
  const value = cache.get(cacheKey);
  
  if (value !== undefined) {
    console.log(`🎯 Cache HIT: ${type} (${cacheKey})`);
    return value;
  }
  
  console.log(`❌ Cache MISS: ${type} (${cacheKey})`);
  return null;
}

/**
 * Set item in cache
 * @param {string} type - Cache type
 * @param {any} key - Key data to hash
 * @param {any} value - Value to cache
 * @param {number} [ttl] - Optional custom TTL in seconds
 */
function set(type, key, value, ttl) {
  const cacheKey = generateKey(type, key);
  const cache = getCacheInstance(type);
  
  if (ttl) {
    cache.set(cacheKey, value, ttl);
  } else {
    cache.set(cacheKey, value);
  }
  
  console.log(`💾 Cache SET: ${type} (${cacheKey})`);
}

/**
 * Delete item from cache
 * @param {string} type - Cache type
 * @param {any} key - Key data to hash
 */
function del(type, key) {
  const cacheKey = generateKey(type, key);
  const cache = getCacheInstance(type);
  cache.del(cacheKey);
  console.log(`🗑️  Cache DELETE: ${type} (${cacheKey})`);
}

/**
 * Clear all caches
 */
function clearAll() {
  transcriptionCache.flushAll();
  generationCache.flushAll();
  chatCache.flushAll();
  evaluationCache.flushAll();
  console.log("🧹 All caches cleared");
}

/**
 * Get cache statistics
 * @returns {object} - Stats for all caches
 */
function getStats() {
  return {
    transcription: transcriptionCache.getStats(),
    generation: generationCache.getStats(),
    chat: chatCache.getStats(),
    evaluation: evaluationCache.getStats(),
  };
}

module.exports = {
  get,
  set,
  del,
  clearAll,
  getStats,
  CACHE_CONFIG,
};
