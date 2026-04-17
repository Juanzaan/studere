# 🔗 Guía de Integración Frontend-Backend

## 📊 Estado de Integración

### ✅ Configuración Actualizada

**Frontend:**
- Puerto backend corregido: `7071` (era 7080)
- Variable de entorno: `NEXT_PUBLIC_BACKEND_URL`
- Archivo: `frontend/lib/constants.ts`

**Backend:**
- Corriendo en: `http://localhost:7071`
- 5 endpoints optimizados listos
- CORS configurado: `*` (permite cualquier origen)

---

## 🎯 Endpoints Integrados

| Frontend API | Backend Endpoint | Status | Notas |
|--------------|------------------|--------|-------|
| `transcribeAudio()` | `POST /api/transcribe-audio` | ✅ Listo | Archivos <24MB, client-side |
| `transcribeAudioServerSide()` | `POST /api/upload-audio-chunk` | ✅ Listo | Archivos >24MB, paso 1: upload |
| `transcribeAudioServerSide()` | `POST /api/process-audio` | ✅ Listo | Archivos >24MB, paso 2: process |
| `generateStudySession()` | `POST /api/generate-study-session` | ✅ Listo | Max ~200k chars transcript |
| `evaluateExercise()` | `POST /api/evaluate-exercise` | ✅ Listo | - |
| `sendStudeChat()` | `POST /api/stude-chat` | ✅ Listo | - |
| - | `GET /api/HealthCheck` | ✅ Listo | Monitoring |

---

## 🚀 Cómo Probar la Integración

### 1. Iniciar Backend

```bash
cd backend
func start
```

Deberías ver:
```
Functions:
  HealthCheck: http://localhost:7071/api/HealthCheck
  GenerateStudySession: http://localhost:7071/api/generate-study-session
  ...
```

### 2. Iniciar Frontend

```bash
cd frontend
npm run dev
```

### 3. Test Completo End-to-End

#### **Opción A: UI Testing (Recomendado)**

1. Abre `http://localhost:3000`
2. Click en "Nueva Sesión"
3. Sube un audio o graba uno
4. Verifica que se transcribe (backend: `/transcribe-audio`)
5. Click en "Generar Sesión"
6. Verifica que se genera el contenido (backend: `/generate-study-session`)
7. Abre la sesión y usa el chat (backend: `/stude-chat`)
8. Completa un ejercicio (backend: `/evaluate-exercise`)

#### **Opción B: API Testing (Manual)**

```bash
# Test 1: Health Check
curl http://localhost:7071/api/HealthCheck

# Test 2: Generate Study Session
curl -X POST http://localhost:7071/api/generate-study-session \
  -H "Content-Type: application/json" \
  -d '{"transcript":"Matemáticas: derivadas básicas. La derivada de x^2 es 2x."}'

# Test 3: Stude Chat
curl -X POST http://localhost:7071/api/stude-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"¿Qué es una derivada?","sessionContext":{"title":"Cálculo"}}'
```

---

## 🔧 Configuración de Environment Variables

### Frontend (.env.local)

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:7071

# Para producción (después del deploy):
# NEXT_PUBLIC_BACKEND_URL=https://tu-backend.azurewebsites.net
```

### Backend (local.settings.json)

```json
{
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_OPENAI_ENDPOINT": "https://studere-ai.openai.azure.com/",
    "AZURE_OPENAI_KEY": "***",
    "AZURE_OPENAI_DEPLOYMENT": "stude-gpt4omini",
    "AZURE_OPENAI_WHISPER_DEPLOYMENT": "whisper",
    "ALLOWED_ORIGIN": "*"
  }
}
```

---

## 📊 Flujo de Datos Completo

### **Flujo 1: Audio Pequeño (<24MB)**
```
Usuario → Frontend (chunking en browser)
   ↓
   POST /api/transcribe-audio (chunks secuenciales)
   ↓
Backend → Azure OpenAI Whisper
   ↓
   Concatenar transcripts
   ↓
Frontend → POST /api/generate-study-session
   ↓
Backend → Azure OpenAI GPT-4o-mini (+ cache)
   ↓
Frontend → Renderiza sesión en UI
```

### **Flujo 2: Audio Grande (>24MB)**
```
Usuario → Frontend
   ↓
   POST /api/upload-audio-chunk × N (5MB chunks)
   ↓
Backend → Storage temporal (.temp/audio-chunks/sessionId/)
   ↓
   POST /api/process-audio
   ↓
Backend:
   - Concatenar chunks
   - FFmpeg split (4 min segments)
   - Whisper paralelo (5 a la vez)
   - Reconstruir transcript completo
   ↓
Frontend → POST /api/generate-study-session
   ↓
   (resto igual que Flujo 1)
```

---

## ⚠️ Límites y Recomendaciones

### **Audio Processing**

| Tamaño de Audio | Pipeline | Tiempo Estimado | Recomendación |
|----------------|----------|-----------------|---------------|
| <24MB (~45 min) | Client-side | 1-3 minutos | ✅ Uso recomendado para MVP |
| 24-100MB (~1.5 horas) | Server-side | 5-8 minutos | ⚠️ OK, pero más costoso |
| >100MB (~2-3 horas) | Server-side | 15-30 minutos | 🔴 Considerar Plan Premium |

**Consideraciones:**
- **Timeout:** ProcessAudio tiene 30 min de timeout configurado (`host.json`)
- **Memoria:** Audios grandes requieren ~1.5GB durante procesamiento
- **Storage:** Chunks temporales se guardan en `.temp/` (limpieza manual opcional)
- **Costos:** Audio server-side consume más execution time → +$5-15/month estimado

### **GenerateStudySession**

- **Max transcript length:** ~200,000 caracteres (~50,000 palabras)
- **Recomendado:** ~5,000-10,000 palabras para mejor calidad
- **Timeout:** 5 minutos
- **Retry:** Configurado con backoff automático

### **Para MVP (Fase Actual):**
1. Limitar upload a ~45-50 minutos de audio en frontend
2. Mostrar mensajes claros sobre límites
3. Manejar errores de timeout gracefully
4. Considerar audio largo como "feature Pro" para fase futura

---

## ✅ Checklist de Integración

- [x] Puerto backend corregido (7071)
- [x] CORS habilitado en backend
- [x] Environment variables configuradas
- [x] FFmpeg disponible en backend (incluido en Azure Functions runtime)
- [ ] Backend corriendo
- [ ] Frontend corriendo
- [ ] Test de transcripción (archivo pequeño <24MB)
- [ ] Test de transcripción (archivo grande >24MB, server-side)
- [ ] Test de generación de sesión
- [ ] Test de chat
- [ ] Test de evaluación de ejercicios

---

## 🐛 Troubleshooting

### Error: "Failed to fetch"
**Causa:** Backend no está corriendo  
**Solución:** 
```bash
cd backend
func start
```

### Error: "CORS policy"
**Causa:** CORS mal configurado  
**Solución:** Verificar que `ALLOWED_ORIGIN` esté en `*` o incluya `http://localhost:3000`

### Error: "Network error"
**Causa:** Puerto incorrecto  
**Solución:** Verificar que `BACKEND_URL` en constants.ts sea `http://localhost:7071`

### Backend responde pero datos vacíos
**Causa:** Azure OpenAI no configurado  
**Solución:** Verificar `AZURE_OPENAI_KEY` en `local.settings.json`

---

## 🎯 Próximo Paso

Una vez que verifiques que la integración funciona localmente:

**→ Proceder con Deploy a Producción (Opción A)**

- Frontend: Vercel
- Backend: Ya está en Azure (solo falta deploy)
- Variables de entorno en producción

---

**Status:** ✅ Integración configurada  
**Próximo:** Deploy a producción
