const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_KEY;
const whisperDeployment = process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT;

// ---------------------------------------------------------------------------
// CORS + JSON response helpers
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonRes(context, status, body) {
  context.res = {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    body,
  };
}

const MAX_AUDIO_SIZE_MB = 25;
const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
if (!endpoint || !apiKey || !whisperDeployment) {
  console.warn("Azure OpenAI Whisper environment variables are not fully configured.");
}

const client = endpoint && apiKey ? new OpenAIClient(endpoint, new AzureKeyCredential(apiKey)) : null;

// ---------------------------------------------------------------------------
// Azure Function handler
// ---------------------------------------------------------------------------
module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    jsonRes(context, 204, "");
    return;
  }

  context.log("TranscribeAudio triggered");

  if (!client || !whisperDeployment) {
    jsonRes(context, 500, {
      error: "Azure OpenAI Whisper is not configured. Set AZURE_OPENAI_WHISPER_DEPLOYMENT in app settings.",
    });
    return;
  }

  // Expect JSON body with base64-encoded audio
  const audioBase64 = req.body?.audioBase64;
  const fileName = req.body?.fileName || "audio.webm";
  const language = req.body?.language || undefined; // let Whisper auto-detect if not specified

  if (!audioBase64 || typeof audioBase64 !== "string") {
    jsonRes(context, 400, { error: "Request body must include 'audioBase64' (base64-encoded audio)." });
    return;
  }

  // Decode base64 to buffer
  let audioBuffer;
  try {
    audioBuffer = Buffer.from(audioBase64, "base64");
  } catch (err) {
    jsonRes(context, 400, { error: "Invalid base64 encoding." });
    return;
  }

  if (audioBuffer.length > MAX_AUDIO_SIZE_BYTES) {
    jsonRes(context, 400, { error: `Audio file exceeds maximum size of ${MAX_AUDIO_SIZE_MB}MB.` });
    return;
  }

  if (audioBuffer.length < 100) {
    jsonRes(context, 400, { error: "Audio file is too small or empty." });
    return;
  }

  context.log(`Transcribing ${fileName} (${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);

  // Call Azure OpenAI Whisper
  try {
    const options = {};
    if (language && language !== "auto") {
      options.language = language;
    }

    const result = await client.getAudioTranscription(
      whisperDeployment,
      audioBuffer,
      options,
    );

    context.log(`Transcription complete: ${result.text?.length || 0} chars`);

    jsonRes(context, 200, {
      text: result.text || "",
      language: result.language || language || "unknown",
      duration: result.duration || null,
    });
  } catch (error) {
    context.log.error("Whisper transcription failed:", error.message);
    jsonRes(context, 500, {
      error: error.message || "Transcription failed.",
      code: error.code || "unknown",
    });
  }
};
