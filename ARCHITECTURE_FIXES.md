# 🏗️ Architecture Fixes & Refactors

## 📋 Resumen Ejecutivo

**Auditoría completa del proyecto Studere realizada el 16/04/2026**

### Áreas Críticas Identificadas:
1. **Audio Chunking** - Crashea con archivos >60MB
2. **TranscribeAudio Backend** - Solo procesa primer chunk
3. **session-detail.tsx** - 32KB, necesita refactor
4. **Tests E2E** - Cobertura insuficiente

---

## 🔴 **FIX PRIORITARIO 1: Audio Chunking**

### Problema
```typescript
// audio-chunker.ts línea 90
const audioBuffer = await decodeFile(file);  // ← CRASHEA con 61MB
const durationSec = audioBuffer.duration;    // 2 horas = 7200s
const monoSamples = await resampleToMono16k(audioBuffer);  // ← OUT OF MEMORY
```

### Solución Propuesta
**Opción A: Server-Side Chunking (Recomendada)**
- Frontend sube archivo completo sin procesar
- Backend hace chunking usando FFmpeg/fluent-ffmpeg
- Pros: Soporta archivos infinitos, no satura browser
- Contras: Requiere dependencias nuevas en Azure Functions

**Opción B: Streaming Upload + Web Workers**
- Frontend divide archivo sin decodificar (por bytes, no por audio)
- Cada chunk se sube al backend
- Backend concatena chunks y luego transcribe
- Pros: Más control, no requiere nuevas deps
- Contras: Más complejo, posible desincronización

**Opción C: Límite de 30 minutos**
- Chunks de 4 min (240s) cada uno
- Máximo 7-8 chunks
- Pros: Funciona estable ahora
- Contras: No soporta clases de 2-3 horas

---

## 🟡 **FIX 2: session-detail.tsx Refactor**

### Problema
- 32KB en un solo archivo
- 800+ líneas de código
- Múltiples responsabilidades

### Plan de Refactor
```
session-detail.tsx (actual 800 líneas)
↓
SessionDetailContainer.tsx (150 líneas)
  ├── SessionHeader.tsx (ya existe)
  ├── SessionTabs.tsx (nuevo - 100 líneas)
  ├── SessionContent.tsx (nuevo - 200 líneas)
  │   ├── ConceptsSidebar.tsx (ya existe)
  │   ├── TranscriptPanel.tsx (ya existe)
  │   └── FocusPanelSwitcher.tsx (ya existe)
  └── SessionActions.tsx (nuevo - 80 líneas)
```

---

## 🟢 **FIX 3: Tests E2E con Playwright**

### Specs Faltantes
```typescript
// e2e/audio-transcription.spec.ts (NUEVO)
test('Upload audio and transcribe end-to-end')
test('Handle large audio files with chunking')
test('Show progress during transcription')

// e2e/session-generation.spec.ts (NUEVO)
test('Generate session from transcript')
test('Display all content types (quiz, flashcards, mindmap)')
test('Navigate between session tabs')

// e2e/chat.spec.ts (NUEVO)
test('Open chat popup from session')
test('Send message and receive AI response')
test('Display chat history')
```

---

## 📊 **Métricas de Cobertura**

### Actual
- **Vitest:** 9 archivos de tests
- **Playwright:** 2 specs
- **Cobertura estimada:** ~40%

### Objetivo
- **Vitest:** +5 archivos (audio, chunking, store)
- **Playwright:** +3 specs (audio, generation, chat)
- **Cobertura objetivo:** ~70%

---

## 🎯 **Priorización de Trabajo**

| Fase | Tarea | Esfuerzo | Impacto | Prioridad |
|------|-------|----------|---------|-----------|
| 2 | Fix TranscribeAudio chunking | 3h | 🔴 Alto | **P0** |
| 2 | Tests Vitest para backend | 2h | 🟡 Medio | **P1** |
| 3 | Fix audio-chunker.ts | 4h | 🔴 Alto | **P0** |
| 3 | Refactor session-detail | 6h | 🟡 Medio | **P1** |
| 4 | Fix lib/api.ts sequential | 2h | 🟡 Medio | **P1** |
| 5 | Mind-map drag&drop bugs | 2h | 🟢 Bajo | **P2** |
| 6 | GSAP centralization | 3h | 🟢 Bajo | **P2** |
| 7 | E2E Playwright specs | 5h | 🟡 Medio | **P1** |

**Total estimado:** ~27 horas de trabajo

---

## 🔧 **Siguientes Pasos Inmediatos**

1. **Implementar server-side chunking** para audio
2. **Refactor session-detail.tsx** en componentes más pequeños
3. **Agregar 3 specs E2E** críticos
4. **Validar en producción** (deploy a staging)

---

**Fecha:** 16 Abril 2026  
**Status:** Plan aprobado, iniciando fixes
