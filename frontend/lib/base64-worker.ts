// Web Worker para convertir archivos a base64 sin bloquear main thread
self.onmessage = async (e: MessageEvent) => {
  const { file } = e.data;
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Procesar en chunks para evitar bloquear worker
    const chunkSize = 8192;
    let binary = "";
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
      
      // Reportar progreso cada 10%
      if (i % (bytes.length / 10 | 0) === 0) {
        self.postMessage({ type: 'progress', progress: (i / bytes.length) * 100 });
      }
    }
    
    const base64 = btoa(binary);
    self.postMessage({ type: 'success', base64 });
  } catch (error) {
    self.postMessage({ type: 'error', error: (error as Error).message });
  }
};

export {};
