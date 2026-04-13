/**
 * Shared OpenAI Client Singleton
 * Optimización: Evita crear múltiples instancias del cliente
 */

const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_KEY;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
const whisperDeployment = process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT;

// Validación al inicio
if (!endpoint || !apiKey) {
  console.warn("⚠️  Azure OpenAI credentials not configured. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY.");
}

// Singleton instance
let clientInstance = null;

/**
 * Get or create OpenAI client instance
 * @returns {OpenAIClient | null}
 */
function getClient() {
  if (!endpoint || !apiKey) {
    return null;
  }
  
  if (!clientInstance) {
    clientInstance = new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
    console.log("✅ OpenAI client initialized");
  }
  
  return clientInstance;
}

/**
 * Get deployment name for chat completions
 * @returns {string}
 */
function getDeployment() {
  return deployment;
}

/**
 * Get deployment name for Whisper transcription
 * @returns {string}
 */
function getWhisperDeployment() {
  return whisperDeployment;
}

/**
 * Check if client is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!(endpoint && apiKey && deployment);
}

module.exports = {
  getClient,
  getDeployment,
  getWhisperDeployment,
  isConfigured,
};
