/**
 * Web Worker for converting files to base64 without blocking the main thread.
 * Processes files in chunks and reports progress.
 */

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

self.onmessage = async (event: MessageEvent<{ file: File }>) => {
  const { file } = event.data;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const total = bytes.length;
    let binary = "";

    for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
      const end = Math.min(offset + CHUNK_SIZE, total);
      const chunk = bytes.slice(offset, end);

      for (let i = 0; i < chunk.length; i++) {
        binary += String.fromCharCode(chunk[i]);
      }

      const progress = Math.round((end / total) * 100);
      self.postMessage({ type: "progress", progress });
    }

    const base64 = btoa(binary);
    self.postMessage({ type: "success", base64 });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export {};
