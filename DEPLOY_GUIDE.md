# 🚀 Guía de Deploy a Producción

## 📋 Prerequisitos

- [x] Frontend optimizado y funcionando
- [x] Backend optimizado y funcionando
- [x] Integración local verificada
- [ ] Cuenta en Vercel (gratis)
- [ ] Cuenta en Azure (ya tienes)

---

## �️ Arquitectura del Sistema

### **Flujo de Audio Dual**

Studere implementa **dos pipelines** de transcripción según el tamaño del archivo:

#### **Pipeline Client-Side (archivos <24MB)**
```
Usuario → Frontend (chunking en browser)
   ↓
   Upload chunks a /api/transcribe-audio
   ↓
   Whisper (Azure OpenAI) × N chunks
   ↓
   Concatenar resultados → Frontend
```

**Ventajas:** Rápido, sin storage server-side  
**Límite:** ~45-50 minutos de audio

#### **Pipeline Server-Side (archivos >24MB)**
```
Usuario → Frontend (upload chunks)
   ↓
   /api/upload-audio-chunk (5MB chunks)
   ↓
   Storage temporal en Azure (.temp/audio-chunks/)
   ↓
   /api/process-audio:
     - Concatenar chunks
     - FFmpeg split (4 min segments)
     - Whisper paralelo (5 segmentos a la vez)
     - Reconstruir texto completo
   ↓
   Frontend recibe transcript
```

**Ventajas:** Maneja archivos grandes (hasta ~2 horas testeado)  
**Consideración:** Requiere más execution time y storage

### **Componentes Backend Críticos**

| Endpoint | Función | Timeout | Memoria |
|----------|---------|---------|---------|
| `HealthCheck` | Monitoring | 10s | Mínima |
| `GenerateStudySession` | AI content (GPT-4o-mini) | 5 min | ~500MB |
| `TranscribeAudio` | Legacy transcription | 5 min | ~300MB |
| `UploadAudioChunk` | Recibir chunks | 1 min | ~100MB |
| **`ProcessAudio`** | **FFmpeg + Whisper pipeline** | **30 min** | **~1.5GB** |
| `StudeChat` | AI chat | 1 min | ~200MB |
| `EvaluateExercise` | Exercise grading | 1 min | ~200MB |

**Nota:** `ProcessAudio` es el endpoint más pesado. Configurar timeout de 30 min en `host.json`.

---

## �🎯 PARTE A: Deploy Frontend a Vercel

### **Paso 1: Instalar Vercel CLI**

```bash
npm install -g vercel
```

### **Paso 2: Login en Vercel**

```bash
vercel login
```

### **Paso 3: Deploy desde el Frontend**

```bash
cd frontend
vercel
```

**Sigue el wizard:**
- Set up and deploy? → **Yes**
- Which scope? → **Tu cuenta personal**
- Link to existing project? → **No**
- What's your project's name? → **studere** (o el que prefieras)
- In which directory is your code located? → **./** (default)
- Want to override settings? → **No**

**Vercel detectará automáticamente:**
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### **Paso 4: Configurar Variables de Entorno en Vercel**

Después del primer deploy, ve a:
```
https://vercel.com/tu-usuario/studere/settings/environment-variables
```

Agrega:
```
NEXT_PUBLIC_BACKEND_URL = https://TU-BACKEND.azurewebsites.net
```

(Por ahora dejalo apuntando a localhost:7071 para testing)

### **Paso 5: Re-deploy**

```bash
vercel --prod
```

**URL final:** `https://studere.vercel.app` (o similar)

---

## ⚙️ PARTE B: Deploy Backend a Azure

### **Opción 1: Deploy desde VS Code (Más fácil)**

1. Instala la extensión "Azure Functions" en VS Code
2. Abrí la carpeta `backend`
3. Click derecho en el proyecto → "Deploy to Function App"
4. Selecciona tu Azure subscription
5. Selecciona "Create new Function App in Azure"
6. Nombre: `studere-backend` (debe ser único globalmente)
7. Runtime: Node.js 18 LTS
8. Region: East US (o la más cercana)

**La extensión subirá automáticamente:**
- Código optimizado
- Dependencies
- Configuration

### **Opción 2: Deploy con Azure CLI**

```bash
# 1. Login en Azure
az login

# 2. Crear Function App (si no existe)
az functionapp create \
  --resource-group studere-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name studere-backend \
  --storage-account studerestorage

# 3. Deploy
cd backend
func azure functionapp publish studere-backend
```

### **Paso 3: Configurar Variables de Entorno en Azure**

```bash
# Via Azure CLI
az functionapp config appsettings set \
  --name studere-backend \
  --resource-group studere-rg \
  --settings \
    AZURE_OPENAI_ENDPOINT="https://studere-ai.openai.azure.com/" \
    AZURE_OPENAI_KEY="TU-API-KEY" \
    AZURE_OPENAI_DEPLOYMENT="stude-gpt4omini" \
    AZURE_OPENAI_WHISPER_DEPLOYMENT="whisper" \
    ALLOWED_ORIGIN="https://studere.vercel.app" \
    WEBSITE_RUN_FROM_PACKAGE="1"
```

**IMPORTANTE:** El backend usa FFmpeg para procesar audio grande. Azure Functions incluye FFmpeg en el runtime, pero verifica que:
- Function timeout esté configurado a 30 minutos (ver `host.json`)
- El plan de consumo permita suficiente memoria (~1.5GB recomendado)
- El storage account tenga suficiente espacio para archivos temporales

**O desde el Portal de Azure:**
1. Ve a tu Function App
2. Settings → Configuration
3. Application settings → New application setting
4. Agrega cada variable

### **Paso 4: Verificar Deploy**

```bash
curl https://studere-backend.azurewebsites.net/api/HealthCheck
```

---

## 🔗 PARTE C: Conectar Frontend con Backend

### **1. Actualizar Variable de Entorno en Vercel**

```
NEXT_PUBLIC_BACKEND_URL = https://studere-backend.azurewebsites.net
```

### **2. Re-deploy Frontend**

```bash
cd frontend
vercel --prod
```

### **3. Verificar CORS en Backend**

Asegúrate que `ALLOWED_ORIGIN` en Azure incluya tu dominio de Vercel:

```
ALLOWED_ORIGIN = https://studere.vercel.app
```

O usa `*` para permitir todos (solo para testing):

```
ALLOWED_ORIGIN = *
```

---

## ✅ Verificación Final

### **1. Health Check del Backend**

```bash
curl https://studere-backend.azurewebsites.net/api/HealthCheck
```

Deberías ver:
```json
{
  "status": "healthy",
  "version": "0.2.0",
  "checks": {
    "openai": { "status": "ok" },
    "cache": { "status": "ok" }
  }
}
```

### **2. Test del Frontend**

Abre: `https://studere.vercel.app`

1. Crea una sesión
2. Pega texto de prueba
3. Genera sesión
4. Verifica que funcione todo

---

## 🎯 URLs Finales

**Frontend (Vercel):**
```
https://studere.vercel.app
```

**Backend (Azure Functions):**
```
https://studere-backend.azurewebsites.net
```

**Endpoints disponibles:**
- `GET /api/HealthCheck`
- `POST /api/generate-study-session` (max ~200k caracteres de transcript)
- `POST /api/transcribe-audio` (legacy, archivos <24MB)
- **`POST /api/upload-audio-chunk`** (nuevo: upload chunked para archivos grandes)
- **`POST /api/process-audio`** (nuevo: pipeline server-side con FFmpeg + Whisper)
- `POST /api/stude-chat`
- `POST /api/evaluate-exercise`

---

## 📊 Costos Estimados

### **Vercel (Frontend)**
- **Free Tier:** Unlimited sites
- **Bandwidth:** 100 GB/month
- **Build Minutes:** 6000 min/month
- **Costo:** $0/month ✅

### **Azure Functions (Backend)**
- **Consumption Plan:**
  - 1M requests gratis/month
  - Después: $0.20 por millón
- **Con optimizaciones:** ~$10-20/month
- **Sin optimizaciones:** ~$100-200/month
- **Con audio server-side (ProcessAudio):** +$5-15/month por procesamiento FFmpeg

**Total estimado:** $10-35/month 🎉

**Nota:** Archivos de audio grandes (>40 min) consumen más execution time y storage. Considera:
- Configurar un límite de tamaño en frontend (~45-50 min recomendado para MVP)
- Plan Premium si necesitas procesar audios de 2-3 horas regularmente

---

## 🔄 CI/CD Automático

### **Vercel (Automático)**
- Cada `git push` a `main` → deploy automático
- Preview deployments en cada PR

### **Azure (Opcional)**
Configura GitHub Actions:

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend
on:
  push:
    branches: [ main ]
    paths: [ 'backend/**' ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: azure/functions-action@v1
        with:
          app-name: studere-backend
          package: backend
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

---

## 🐛 Troubleshooting

### **Error: "Function not found" en Azure**
- Verifica que `host.json` y `function.json` estén en cada carpeta
- Reinicia la Function App

### **Error: CORS en producción**
- Verifica `ALLOWED_ORIGIN` en Azure settings
- Asegúrate que coincida con tu dominio de Vercel

### **Error: 500 en generación de sesiones**
- Verifica `AZURE_OPENAI_KEY` en Azure settings
- Chequea los logs en Azure Portal → Function App → Log stream

### **Frontend no se conecta al backend**
- Verifica `NEXT_PUBLIC_BACKEND_URL` en Vercel
- Asegúrate que empiece con `https://`

---

## 📚 Recursos

- **Vercel Docs:** https://vercel.com/docs
- **Azure Functions Docs:** https://docs.microsoft.com/azure/azure-functions/
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Azure Portal:** https://portal.azure.com

---

**¿Listo para deployar?** 🚀

1. Instala Vercel CLI: `npm install -g vercel`
2. Corre `vercel` en la carpeta `frontend`
3. Deploy backend desde VS Code o Azure CLI
4. Conecta ambos servicios
5. ¡Studere está online! 🎉
