export type UrlTranscribeResult = {
  title: string;
  text: string;
  sourceUrl: string;
  durationSeconds: number;
};

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function isRemoteFileUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("drive.google.com") ||
    lower.includes("dropbox.com") ||
    lower.includes("onedrive.live.com") ||
    lower.endsWith(".mp3") ||
    lower.endsWith(".wav") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".m4a") ||
    lower.endsWith(".ogg") ||
    lower.endsWith(".webm")
  );
}

export function analyzeUrl(url: string): { type: "youtube" | "remote-file" | "webpage"; label: string } {
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return { type: "youtube", label: `YouTube video (${youtubeId})` };
  }

  if (isRemoteFileUrl(url)) {
    return { type: "remote-file", label: "Remote audio/video file" };
  }

  return { type: "webpage", label: "Web page" };
}

export async function transcribeFromUrl(url: string): Promise<UrlTranscribeResult> {
  const analysis = analyzeUrl(url);
  const youtubeId = extractYouTubeId(url);

  const simulatedTitle = youtubeId
    ? `YouTube transcription — ${youtubeId}`
    : analysis.type === "remote-file"
    ? `Remote file transcription — ${new URL(url).pathname.split("/").pop() || "file"}`
    : `Web content — ${new URL(url).hostname}`;

  const simulatedText = [
    `[Contenido transcrito desde ${analysis.label}]`,
    `Fuente: ${url}`,
    "",
    "En esta sesión se abordó el tema principal del recurso, conectándolo con los objetivos de estudio y con situaciones prácticas que el estudiante debe reconocer.",
    "Se repasaron definiciones clave, relaciones entre conceptos y posibles errores frecuentes al interpretar el material, con énfasis en entender por qué cada idea importa.",
    "La discusión retomó ejemplos, comparaciones y una secuencia de razonamiento útil para estudiar después.",
    "El recurso incluye puntos que conviene revisar antes del próximo examen o trabajo práctico.",
    "",
    youtubeId
      ? "Este video de YouTube fue procesado por el motor de transcripción simulado del MVP. En producción, Studere usará Whisper o Deepgram para obtener una transcripción real con timestamps y diarización."
      : analysis.type === "remote-file"
      ? "Este archivo remoto fue detectado como audio/video. En producción, Studere lo descargará y procesará con ASR real."
      : "Esta página web fue analizada para extraer contenido relevante. En producción, Studere usará scraping inteligente y NLP para generar una transcripción estructurada.",
  ].join("\n");

  await new Promise((resolve) => setTimeout(resolve, 1200));

  return {
    title: simulatedTitle,
    text: simulatedText,
    sourceUrl: url,
    durationSeconds: youtubeId ? 420 : 180,
  };
}
