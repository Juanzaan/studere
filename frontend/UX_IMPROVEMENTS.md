# 🎨 Mejoras de UX - Audio y Sesiones

## 📊 Análisis Actual

### **Problemas Identificados:**

1. **Sin límites claros de audio**
   - No hay advertencia cuando el usuario sube audio >50 minutos
   - No se explica que audio >24MB usa pipeline server-side (más lento)
   - Riesgo: Usuario espera 30 minutos para audio de 3 horas sin aviso previo

2. **Estados de carga poco informativos**
   - "Transcribiendo audio..." es genérico
   - No se muestra progreso durante server-side processing
   - Usuario no sabe si el proceso está avanzando o trabado

3. **Manejo de errores básico**
   - Error "Audio transcription failed" sin contexto
   - No se sugiere solución (ej. reintentar, dividir audio, etc.)
   - Timeout errors no explican que el audio es demasiado largo

4. **Falta contexto de procesamiento**
   - No se explica diferencia entre client-side vs server-side
   - No hay estimación de tiempo según tamaño de archivo
   - Usuario no sabe qué esperar

---

## ✅ Mejoras Propuestas

### **1. Validación y Límites Proactivos**

**Implementar en:** `session-composer-card.tsx` + `audio-recorder-widget.tsx`

**Cambios:**
```typescript
// Antes de subir/procesar, validar tamaño
const MAX_RECOMMENDED_SIZE = 50 * 1024 * 1024; // 50MB (~45-50 min)
const MAX_ALLOWED_SIZE = 200 * 1024 * 1024; // 200MB (límite absoluto)

if (file.size > MAX_ALLOWED_SIZE) {
  // Error: rechazar
  setErrorMsg("Audio demasiado grande (>200MB). Considera dividirlo en partes.");
  return;
}

if (file.size > MAX_RECOMMENDED_SIZE) {
  // Warning: preguntar confirmación
  const confirmed = window.confirm(
    `Este audio es grande (${(file.size / 1024 / 1024).toFixed(0)}MB).\n\n` +
    `Procesamiento estimado: ~${Math.ceil(file.size / (1024 * 1024 * 5))} minutos.\n\n` +
    `¿Continuar?`
  );
  if (!confirmed) return;
}
```

**UI Addition:**
- Mostrar badge con tamaño cuando file > 24MB
- Agregar tooltip explicando "Server-side processing (más lento pero soporta archivos grandes)"

---

### **2. Estados de Carga Detallados**

**Implementar en:** `api-server-side.ts` callbacks + `session-composer-card.tsx`

**Cambios:**
```typescript
// Ampliar aiStatus para incluir sub-estados
type AIStatus = 
  | "idle"
  | "transcribing-client" // <24MB, rápido
  | "uploading-chunks"     // >24MB, paso 1
  | "processing-server"    // >24MB, paso 2 (FFmpeg + Whisper)
  | "generating"
  | "success"
  | "fallback"
  | "error";

// Mensajes específicos por estado
const STATUS_MESSAGES = {
  "transcribing-client": "Transcribiendo audio...",
  "uploading-chunks": (progress) => `Subiendo archivo (${progress}%)...`,
  "processing-server": "Procesando en servidor (puede tardar varios minutos)...",
  "generating": "Generando contenido con IA...",
};
```

**UI Addition:**
- Progress bar para uploads >24MB
- Spinner animado con mensaje contextual
- Estimación de tiempo restante (opcional)

---

### **3. Mensajes de Error Informativos**

**Implementar en:** Wrappers de `transcribeAudio()` y `generateStudySession()`

**Cambios:**
```typescript
// Clasificar errores y dar mensajes útiles
function getErrorMessage(error: Error): { title: string; message: string; action?: string } {
  const msg = error.message.toLowerCase();
  
  if (msg.includes("timeout") || msg.includes("timed out")) {
    return {
      title: "Tiempo de procesamiento excedido",
      message: "El audio es demasiado largo para procesarse en una sola sesión.",
      action: "Intenta dividir el audio en partes de ~45 minutos o menos."
    };
  }
  
  if (msg.includes("network") || msg.includes("fetch")) {
    return {
      title: "Error de conexión",
      message: "No se pudo conectar con el servidor.",
      action: "Verifica tu conexión a internet e intenta nuevamente."
    };
  }
  
  if (msg.includes("too large") || msg.includes("exceeds")) {
    return {
      title: "Archivo demasiado grande",
      message: "El archivo excede el límite de tamaño permitido.",
      action: "Considera usar un audio más corto o comprimido."
    };
  }
  
  // Error genérico
  return {
    title: "Error al procesar audio",
    message: error.message,
    action: "Si el problema persiste, contacta soporte."
  };
}
```

**UI Addition:**
- Alert component con título, mensaje y acción sugerida
- Botón "Reintentar" cuando sea aplicable
- Link a docs/FAQ si es error común

---

### **4. Información Contextual Pre-Upload**

**Implementar en:** `session-composer-card.tsx` (UI addition)

**Cambios:**
- Agregar sección colapsable "ℹ️ Límites recomendados" en el formulario
- Mostrar al detectar file:

```tsx
{file && (
  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs dark:border-blue-800 dark:bg-blue-900/20">
    <p className="font-semibold text-blue-900 dark:text-blue-100">
      📊 Archivo detectado: {(file.size / 1024 / 1024).toFixed(1)}MB
    </p>
    {file.size < 24 * 1024 * 1024 ? (
      <p className="mt-1 text-blue-700 dark:text-blue-300">
        ✅ Procesamiento rápido (1-3 minutos estimados)
      </p>
    ) : file.size < 100 * 1024 * 1024 ? (
      <p className="mt-1 text-amber-700 dark:text-amber-300">
        ⚠️ Archivo grande. Procesamiento server-side (~5-10 minutos estimados)
      </p>
    ) : (
      <p className="mt-1 text-red-700 dark:text-red-300">
        🔴 Archivo muy grande. Considera dividirlo para mejor experiencia.
      </p>
    )}
  </div>
)}
```

---

## 📋 Plan de Implementación

### **Fase 1: Validación y Límites (30 min)**
- [ ] Agregar constantes de límites en `lib/constants.ts`
- [ ] Implementar validación pre-upload en `session-composer-card.tsx`
- [ ] Agregar confirmación para archivos >50MB
- [ ] Mostrar info card con tamaño y estimación

### **Fase 2: Estados Detallados (45 min)**
- [ ] Ampliar type `AIStatus` con sub-estados
- [ ] Actualizar callbacks en `transcribeAudio()` y `transcribeAudioServerSide()`
- [ ] Implementar progress reporting en `session-composer-card.tsx`
- [ ] Agregar progress bar component para uploads

### **Fase 3: Mensajes de Error (30 min)**
- [ ] Crear `getErrorMessage()` helper en `lib/error-utils.ts`
- [ ] Implementar ErrorAlert component
- [ ] Integrar en `session-composer-card.tsx` y `audio-recorder-widget.tsx`
- [ ] Agregar botón "Reintentar" cuando aplique

### **Fase 4: Testing Manual (15 min)**
- [ ] Test con archivo <24MB → verificar UI rápida
- [ ] Test con archivo >50MB → verificar confirmación
- [ ] Test con archivo >200MB → verificar rechazo
- [ ] Test error de red → verificar mensaje útil

**Total estimado:** ~2 horas

---

## 🎯 Métricas de Éxito

### **Antes:**
- Usuario confundido cuando audio tarda >10 minutos
- Tasa de abandono alta en audios grandes
- Tickets de soporte sobre "app trabada"

### **Después:**
- Usuario sabe qué esperar antes de subir
- Mensajes claros durante procesamiento
- Sugerencias accionables en caso de error
- Menor tasa de abandono y tickets

---

**Estado:** ✅ Documento de diseño completo  
**Próximo:** Implementar Fase 1
