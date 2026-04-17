# 🎯 Server-Side Audio Chunking - Diseño Arquitectural

## 📋 Objetivo

Soportar audios de 2-3 horas (60MB+) sin crashear el navegador, usando chunking y procesamiento server-side.

---

## 🏗️ Arquitectura Propuesta

### **Flujo Actual (Problemático)**
```
┌─────────┐  1. Upload 61MB    ┌──────────────┐
│ Browser │ ─────────────────> │ Azure Func   │
│         │                    │              │
│         │  2. Decode CRASH   │ TranscribeAI │
│         │  ❌ OUT OF MEMORY  │              │
└─────────┘                    └──────────────┘
```

### **Flujo Nuevo (Server-Side)**
```
┌─────────┐  1. Upload chunks   ┌──────────────┐  3. Process chunks
│ Browser │  (bytes, sin decode)│ UploadAudio  │ ───────────────────>
│         │ ──────────────────> │ Function     │                     
│         │                     │              │  4. Concatenate     
│         │  2. Track progress  │              │ ───────────────────>
│         │ <────────────────── │              │
└─────────┘                     └──────────────┘
                                       │
                                       v
                                ┌──────────────┐  5. Split with FFmpeg
                                │ ProcessAudio │ ───────────────────>
                                │ Function     │
                                │              │  6. Transcribe chunks
                                │              │ ───────────────────>
                                └──────────────┘
                                       │
                                       v
                                ┌──────────────┐  7. Reconstruct text
                                │ TranscribeAI │ ───────────────────>
                                │ (optimized)  │
                                └──────────────┘
                                       │
                                       v
                                ┌──────────────┐  8. Return result
                                │   Response   │
                                └──────────────┘
```

---

## 🔧 Componentes Nuevos

### **1. UploadAudio Function (Nuevo)**
**Responsabilidad:** Recibir chunks del frontend y almacenarlos temporalmente

```javascript
// POST /api/upload-audio-chunk
{
  sessionId: "abc-123",        // ID único de la sesión de upload
  chunkIndex: 0,                // Índice del chunk (0, 1, 2...)
  totalChunks: 15,              // Total de chunks esperados
  chunkData: "base64...",       // Chunk en base64
  fileName: "clase.mp3"
}

// Response
{
  sessionId: "abc-123",
  uploaded: [0, 1, 2],          // Chunks recibidos
  pending: [3, 4, 5, ...],      // Chunks faltantes
  complete: false
}
```

**Almacenamiento:**
- Azure Blob Storage (temporal, TTL 24h)
- O filesystem local (si es development)

### **2. ProcessAudio Function (Nuevo)**
**Responsabilidad:** Procesar archivo completo una vez que todos los chunks están

```javascript
// Triggered por UploadAudio cuando complete = true
// O llamado explícitamente por frontend

Input:
{
  sessionId: "abc-123",
  language: "es"
}

Process:
1. Concatenar todos los chunks
2. Detectar formato (mp3, wav, webm, etc)
3. Usar FFmpeg para dividir en segmentos de ~4 min
4. Enviar cada segmento a Whisper
5. Reconstruir transcripción completa
6. Limpiar archivos temporales

Output:
{
  sessionId: "abc-123",
  text: "Transcripción completa...",
  language: "es",
  duration: 7200,
  segments: 30
}
```

### **3. TranscribeAudio (Modificado)**
**Cambios:**
- Acepta tanto requests directos como segmentos de ProcessAudio
- Sigue manteniendo límite de 25MB
- Cache optimizado para segmentos

---

## 💾 Almacenamiento Temporal

### **Opción A: Azure Blob Storage (Producción)**
```javascript
const { BlobServiceClient } = require("@azure/storage-blob");

// Configuración
AZURE_STORAGE_CONNECTION_STRING
TEMP_CONTAINER = "audio-upload-temp"
TTL = 24 horas
```

**Pros:**
- ✅ Escalable
- ✅ Funciona en Azure Functions
- ✅ TTL automático

**Contras:**
- ⚠️ Requiere storage account
- ⚠️ Costos adicionales (mínimos)

### **Opción B: Filesystem Local (Development)**
```javascript
const fs = require('fs');
const path = require('path');

// Carpeta temporal
TEMP_DIR = /tmp/audio-chunks/
```

**Pros:**
- ✅ Simple para desarrollo
- ✅ Sin configuración adicional

**Contras:**
- ❌ No funciona en Azure Consumption Plan
- ❌ Solo para local

**DECISIÓN:** Usar **Azure Blob Storage** con fallback a filesystem en local.

---

## 🎬 Procesamiento con FFmpeg

### **Instalación en Azure Functions**
```json
// package.json
{
  "dependencies": {
    "fluent-ffmpeg": "^2.1.2",
    "@ffmpeg-installer/ffmpeg": "^1.1.0"
  }
}
```

### **Uso para Chunking**
```javascript
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

// Dividir audio en segmentos de 4 minutos
function splitAudio(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-f segment',           // Segment muxer
        '-segment_time 240',    // 4 minutos por segmento
        '-c copy'               // Copy codec (rápido)
      ])
      .output(`${outputDir}/chunk_%03d.mp3`)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}
```

---

## 📡 Frontend - Nuevo Flujo

### **Detección de Tamaño**
```typescript
// lib/api.ts

export async function transcribeAudio(file: File, ...): Promise<...> {
  const DIRECT_UPLOAD_LIMIT = 24 * 1024 * 1024; // 24MB
  
  if (file.size <= DIRECT_UPLOAD_LIMIT) {
    // Flujo actual (funciona bien)
    return transcribeAudioDirect(file, language, onProgress);
  } else {
    // Nuevo flujo server-side
    return transcribeAudioServerSide(file, language, onProgress);
  }
}
```

### **Upload por Chunks (Bytes)**
```typescript
async function transcribeAudioServerSide(
  file: File,
  language?: string,
  onProgress?: (msg: string) => void
): Promise<TranscriptionResult> {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks (bytes)
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const sessionId = generateSessionId();
  
  // 1. Upload chunks
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const base64 = await fileToBase64(chunk);
    
    onProgress?.(`Subiendo ${i+1}/${totalChunks}...`);
    
    await fetch(`${BACKEND_URL}/api/upload-audio-chunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        chunkIndex: i,
        totalChunks,
        chunkData: base64,
        fileName: file.name
      })
    });
  }
  
  // 2. Iniciar procesamiento
  onProgress?.('Procesando audio en servidor...');
  const response = await fetch(`${BACKEND_URL}/api/process-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, language })
  });
  
  // 3. Poll por resultado (puede tardar)
  return pollForTranscription(sessionId, onProgress);
}
```

---

## 📊 Estimaciones

### **Para audio de 2 horas (120 min)**
```
Tamaño archivo: 60MB
Chunks upload: 60MB / 5MB = 12 chunks
Tiempo upload: ~30 segundos (buena conexión)

Procesamiento server-side:
- Concatenación: ~5s
- FFmpeg split: ~10s (copy codec)
- Segmentos audio: 120min / 4min = 30 segmentos
- Whisper por segmento: ~30s cada uno
- Total Whisper: 30 × 30s = 15 minutos
- Reconstrucción: ~2s

TOTAL: ~16 minutos
```

### **Ventajas vs Actual**
| Métrica | Actual | Server-Side |
|---------|--------|-------------|
| **Browser memory** | 700MB+ | <50MB |
| **Crash risk** | ❌ Alto | ✅ Ninguno |
| **Tiempo total** | N/A (crashea) | ~16 min |
| **Max audio** | 2 horas | Ilimitado |

---

## 🔐 Seguridad

### **Validaciones**
```javascript
// 1. Tamaño máximo de archivo
MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// 2. Rate limiting
MAX_SESSIONS_PER_IP = 5;
SESSION_TIMEOUT = 1 hora;

// 3. Validación de formato
ALLOWED_FORMATS = ['.mp3', '.wav', '.webm', '.m4a', '.ogg'];

// 4. Cleanup automático
TTL_TEMP_FILES = 24 horas;
```

---

## 🧪 Plan de Testing

### **1. Unit Tests**
- ✅ Upload chunk validation
- ✅ Chunk concatenation
- ✅ FFmpeg splitting
- ✅ Text reconstruction

### **2. Integration Tests**
- ✅ Upload completo de archivo pequeño (30MB)
- ✅ Upload completo de archivo grande (100MB)
- ✅ Manejo de chunks faltantes
- ✅ Timeout de sesiones

### **3. E2E Tests (Playwright)**
- ✅ User sube audio 60MB
- ✅ Progress bar actualiza correctamente
- ✅ Transcripción se muestra al finalizar

---

## 📝 Implementación Step-by-Step

### **Fase 1: Backend Core (3h)**
- [ ] Crear `UploadAudioChunk` function
- [ ] Implementar almacenamiento en Blob Storage
- [ ] Tests unitarios de upload

### **Fase 2: Procesamiento (3h)**
- [ ] Crear `ProcessAudio` function
- [ ] Integrar FFmpeg
- [ ] Tests de splitting

### **Fase 3: Frontend (2h)**
- [ ] Implementar `transcribeAudioServerSide`
- [ ] Agregar progress tracking
- [ ] Tests de integración

### **Fase 4: Testing & Validación (2h)**
- [ ] E2E test con audio real de 2h
- [ ] Optimizaciones de performance
- [ ] Cleanup y documentación

**TOTAL ESTIMADO: 10 horas**

---

## ✅ Criterios de Éxito

- ✅ Audio de 60MB (2h) se transcribe sin crashear browser
- ✅ Audio de 150MB (3h+) se transcribe correctamente
- ✅ Progress bar funcional durante upload y procesamiento
- ✅ Tiempo total <20 minutos para 2h de audio
- ✅ Cleanup automático de archivos temporales
- ✅ Tests E2E pasando

---

**Status:** Diseño completado, listo para implementación  
**Próximo paso:** Implementar Fase 1 (Backend Core)
