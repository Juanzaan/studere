# 🚀 Cómo Iniciar el Backend Optimizado

## ✅ Migración Completada

Los archivos optimizados ya han sido migrados:
- ✅ GenerateStudySession/index.js → Optimizado
- ✅ TranscribeAudio/index.js → Optimizado
- ✅ StudeChat/index.js → Optimizado
- ✅ EvaluateExercise/index.js → Optimizado
- ✅ Backups guardados como index-original.js

---

## 📦 Dependencias Instaladas

✅ node-cache, axios-retry, joi, opossum, uuid

---

## 🔧 Azure Functions Core Tools

### Si la instalación automática falló:

**Opción 1: Instalación con npm (más rápida)**
```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

**Opción 2: Instalación con Chocolatey**
```bash
choco install azure-functions-core-tools-4
```

**Opción 3: Instalación con winget**
```bash
winget install Microsoft.Azure.FunctionsCoreTools
```

**Opción 4: Instalación manual (MSI)**
1. Descarga: https://github.com/Azure/azure-functions-core-tools/releases
2. Instala el archivo .msi
3. Reinicia la terminal

---

## ▶️ Iniciar el Backend

```bash
# Desde el directorio backend
cd c:\Users\jpzan\Desktop\Studere (WN Edition)\backend

# Iniciar Azure Functions
func start
```

O simplemente:
```bash
npm start
```

---

## 🧪 Verificar que Funciona

### 1. Health Check
```bash
curl http://localhost:7071/api/HealthCheck
```

**Respuesta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-09T...",
  "uptime": 123,
  "version": "0.2.0",
  "checks": {
    "openai": { "configured": true, "status": "ok" },
    "cache": { "status": "ok", "stats": {...} }
  }
}
```

### 2. Test de un Endpoint
```bash
curl -X POST http://localhost:7071/api/GenerateStudySession \
  -H "Content-Type: application/json" \
  -d "{\"transcript\":\"Matemáticas: derivadas básicas\"}"
```

---

## ⚙️ Variables de Entorno

Asegúrate de tener configurado `local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AZURE_OPENAI_ENDPOINT": "https://studere-ai.openai.azure.com/",
    "AZURE_OPENAI_KEY": "tu-api-key",
    "AZURE_OPENAI_DEPLOYMENT": "stude-gpt4omini",
    "AZURE_OPENAI_WHISPER_DEPLOYMENT": "whisper",
    "ALLOWED_ORIGIN": "*",
    "AzureWebJobsStorage": ""
  }
}
```

---

## 🎯 Endpoints Disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/HealthCheck` | GET | Verifica estado del backend |
| `/api/GenerateStudySession` | POST | Genera sesión de estudio |
| `/api/TranscribeAudio` | POST | Transcribe audio con Whisper |
| `/api/StudeChat` | POST | Chat con contexto de sesión |
| `/api/EvaluateExercise` | POST | Evalúa respuestas de estudiantes |

---

## 🐛 Troubleshooting

### Error: "func no se reconoce"
**Solución:** Instala Azure Functions Core Tools (ver opciones arriba)

### Error: "Cannot find module 'node-cache'"
**Solución:** 
```bash
npm install
```

### Error: "Azure OpenAI client is not configured"
**Solución:** Verifica que `local.settings.json` tenga las variables correctas

### Puerto 7071 ya está en uso
**Solución:**
```bash
# Windows - Mata el proceso en el puerto 7071
netstat -ano | findstr :7071
taskkill /PID <PID> /F

# O usa otro puerto
func start --port 7072
```

---

## 📊 Monitorear Performance

Una vez iniciado, verás en la consola:
- ✅ Logs estructurados con timestamps
- 🎯 Cache HIT/MISS notifications
- 📝 Request IDs para tracking
- ⚡ Tiempos de respuesta

Ejemplo de log:
```json
{
  "timestamp": "2026-04-09T18:40:00.000Z",
  "level": "info",
  "message": "Cache HIT: generation",
  "requestId": "abc-123-def"
}
```

---

## 🚀 Próximos Pasos

1. ✅ Verificar que todos los endpoints funcionan
2. ✅ Hacer requests de prueba
3. ✅ Monitorear cache hit rate
4. ⏳ Deploy a Azure (cuando estés listo)

---

**Status:** ✅ Listo para usar  
**Documentación completa:** Ver MIGRATION_GUIDE.md y OPTIMIZATION_SUMMARY.md
