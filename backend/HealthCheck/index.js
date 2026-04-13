/**
 * HealthCheck Endpoint
 * Permite verificar el estado del backend y sus dependencias
 */

const { isConfigured } = require("../shared/openai-client");
const cache = require("../shared/cache");
const { jsonResponse, getRequestId } = require("../shared/utils");

module.exports = async function (context, req) {
  const requestId = getRequestId(req);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    jsonResponse(context, 204, "", requestId);
    return;
  }

  const startTime = Date.now();

  // Check OpenAI configuration
  const openaiConfigured = isConfigured();

  // Check cache stats
  const cacheStats = cache.getStats();

  // Calculate uptime (approximate)
  const uptime = process.uptime();

  // Memory usage
  const memUsage = process.memoryUsage();

  const health = {
    status: openaiConfigured ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    version: "0.2.0",
    checks: {
      openai: {
        configured: openaiConfigured,
        status: openaiConfigured ? "ok" : "error",
      },
      cache: {
        status: "ok",
        stats: {
          transcription: {
            keys: cacheStats.transcription.keys,
            hits: cacheStats.transcription.hits,
            misses: cacheStats.transcription.misses,
            hitRate: cacheStats.transcription.hits + cacheStats.transcription.misses > 0
              ? (cacheStats.transcription.hits / (cacheStats.transcription.hits + cacheStats.transcription.misses) * 100).toFixed(2) + "%"
              : "0%",
          },
          generation: {
            keys: cacheStats.generation.keys,
            hits: cacheStats.generation.hits,
            misses: cacheStats.generation.misses,
            hitRate: cacheStats.generation.hits + cacheStats.generation.misses > 0
              ? (cacheStats.generation.hits / (cacheStats.generation.hits + cacheStats.generation.misses) * 100).toFixed(2) + "%"
              : "0%",
          },
          chat: {
            keys: cacheStats.chat.keys,
            hits: cacheStats.chat.hits,
            misses: cacheStats.chat.misses,
            hitRate: cacheStats.chat.hits + cacheStats.chat.misses > 0
              ? (cacheStats.chat.hits / (cacheStats.chat.hits + cacheStats.chat.misses) * 100).toFixed(2) + "%"
              : "0%",
          },
        },
      },
      memory: {
        status: memUsage.heapUsed < memUsage.heapTotal * 0.9 ? "ok" : "warning",
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        usage: `${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)}%`,
      },
    },
    responseTime: `${Date.now() - startTime}ms`,
  };

  const statusCode = health.status === "healthy" ? 200 : 503;
  jsonResponse(context, statusCode, health, requestId);
};
