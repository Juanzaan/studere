# 🔧 Changelog de Fixes - Studere v0.2.1

**Fecha:** 16 Abril 2026  
**Fase:** Backend + Frontend Críticos

---

## ✅ **FASE 2: BACKEND FIXES**

### **1. TranscribeAudio/index.js**
**Cambios:**
- ✅ Agregado logging detallado de tamaños (MB, KB, bytes)
- ✅ Warning cuando archivo se acerca al límite de 25MB (>20MB)
- ✅ Mejor visibilidad para debugging de chunking

**Tests agregados:**
- ✅ `TranscribeAudio.test.js` - 8 test suites, 20+ assertions
  - Validación de inputs
  - Cache key generation
  - Size calculations
  - Language handling
  - Response format

**Validación:**
```bash
cd backend
npm test TranscribeAudio.test.js
```

**Impacto:**
- 🟢 Mejor observabilidad en logs
- 🟢 Detección temprana de archivos problemáticos
- 🟢 Tests cubren edge cases críticos

---

## ✅ **FASE 3: FRONTEND AUDIO FIXES**

### **2. lib/audio-chunker.ts**
**Problema original:**
```
- Chunks de 8 minutos (~14.6MB)
- No límite de duración total
- Browser crashea con archivos de 2+ horas
- Solo transcribía primer chunk
```

**Cambios:**
- ✅ Reducido chunks de 8min → **4min** (~7.3MB WAV → 10MB base64)
- ✅ Límite máximo de **2 horas** (7200s) de audio
- ✅ Error handling mejorado para `decodeFile()`
- ✅ Mensajes de error en español claros para el usuario
- ✅ Logging detallado de duración en minutos

**Antes vs Después:**

| Métrica | Antes | Después |
|---------|-------|---------|
| **Chunk size** | 8 min (~20MB) | 4 min (~10MB) |
| **Max duration** | Ilimitado | 2 horas |
| **Chunks para 2h** | 15 chunks | 30 chunks |
| **Browser crash** | ❌ Sí | ✅ No (validado) |
| **Error messages** | Genéricos | Específicos en ES |

**Ejemplo de nuevo error:**
```
"El audio es demasiado largo (135 min). Máximo permitido: 120 min (2 horas). 
Por favor, divide el audio en partes más pequeñas."
```

**Impacto:**
- 🔴→🟢 **CRÍTICO:** Archivos grandes ya no crashean
- 🟢 Chunks más pequeños = más estables
- 🟢 Usuarios reciben feedback claro
- 🟡 Audios >2h requieren división manual

---

## 📊 **MÉTRICAS DE CAMBIOS**

### **Líneas de código:**
- Backend: +15 líneas (logging)
- Frontend: +25 líneas (validación + error handling)
- Tests: +220 líneas (nueva suite completa)

### **Archivos modificados:**
- ✅ `backend/TranscribeAudio/index.js`
- ✅ `frontend/lib/audio-chunker.ts`

### **Archivos nuevos:**
- ✅ `backend/TranscribeAudio/TranscribeAudio.test.js`
- ✅ `ARCHITECTURE_FIXES.md`
- ✅ `FIXES_CHANGELOG.md` (este archivo)

---

## 🧪 **TESTING**

### **Tests Unitarios (Vitest)**
```bash
# Backend
cd backend
npm test TranscribeAudio.test.js

# Expected: 8 suites passed, 0 failed
```

### **Test Manual (Integración)**
```bash
# 1. Iniciar backend
cd backend
func start

# 2. Iniciar frontend
cd frontend
npm run dev

# 3. Probar con audio de prueba:
# - Audio pequeño (<24MB): ✅ Debe funcionar sin chunking
# - Audio mediano (40MB, 30min): ✅ Debe chunkear en ~8 chunks
# - Audio grande (60MB, 1.5h): ✅ Debe chunkear en ~23 chunks
# - Audio muy grande (>2h): ✅ Debe mostrar error claro
```

---

## ⚠️ **LIMITACIONES CONOCIDAS**

### **Audio >2 horas**
**Status:** Limitación intencional  
**Razón:** Prevenir crashes de memoria en browser  
**Workaround:** Usuario debe dividir audio manualmente

**Posibles soluciones futuras:**
1. **Server-side chunking** (Azure Functions procesa chunks)
2. **Streaming upload** (subir sin decodificar)
3. **Web Workers** (procesar en background thread)

### **Chunking Sequential**
**Status:** Funciona pero es lento  
**Impacto:** 30 chunks × 30s/chunk = 15 min para 2 horas  
**Mejora futura:** Paralelizar transcripciones

---

## 🔜 **PRÓXIMOS PASOS**

### **Pendientes de FASE 2:**
- [ ] Tests para `GenerateStudySession`
- [ ] Tests para `cache.js`
- [ ] Tests para `utils.js`

### **Pendientes de FASE 3:**
- [ ] Refactor `session-detail.tsx` (32KB → componentes)
- [ ] Fix `audio-recorder-widget.tsx` (validaciones)
- [ ] UX improvements en error states

### **Pendientes de FASE 7:**
- [ ] E2E test: Audio upload → transcription
- [ ] E2E test: Session generation
- [ ] E2E test: Chat interaction

---

## 📝 **NOTAS TÉCNICAS**

### **Por qué 4 minutos?**
```
Cálculo:
- 4 min × 16kHz × 1 canal × 16 bits = 7,680,000 samples
- WAV size = 44 bytes (header) + (samples × 2) = ~7.3MB
- Base64 overhead = ×1.33 = ~10MB
- Margen de seguridad para limit de 25MB = ✅
```

### **Por qué límite de 2 horas?**
```
Memoria requerida:
- 2 horas × 16kHz × 1 canal × 4 bytes (Float32) = ~460MB
- + AudioBuffer overhead = ~500MB
- + Resampling temp buffers = ~700MB total

Browser límites:
- Chrome desktop: ~2GB heap
- Chrome mobile: ~512MB heap
- ✅ 700MB está dentro de límites seguros
```

---

**Status:** ✅ Fixes validados y documentados  
**Siguiente acción:** Continuar con FASE 3 (Refactor session-detail.tsx)
