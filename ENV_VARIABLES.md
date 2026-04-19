# 🔐 Variables de Entorno - Studere

## 📋 Resumen

Este documento lista **todas** las variables de entorno necesarias para ejecutar Studere en:
- **Local:** Desarrollo en tu máquina
- **Staging:** Entorno de pruebas (Azure + Vercel preview)
- **Production:** Deploy final

---

## 🎨 Frontend (Next.js 14)

### **Variables Requeridas**

| Variable | Descripción | Ejemplo Local | Ejemplo Producción |
|----------|-------------|---------------|-------------------|
| `NEXT_PUBLIC_BACKEND_URL` | URL del backend (Azure Functions) | `http://localhost:7071` | `https://studere-backend.azurewebsites.net` |

### **Archivos de Configuración**

#### **Local: `.env.local`**
```env
# Backend URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:7071
```

#### **Vercel: Environment Variables**
```
NEXT_PUBLIC_BACKEND_URL=https://studere-backend.azurewebsites.net
```

**⚠️ IMPORTANTE:** 
- Vercel necesita que configures esta variable en el dashboard antes del deploy
- Ir a: `https://vercel.com/tu-usuario/studere/settings/environment-variables`
- Agregar variable para **todos** los environments (Production, Preview, Development)

---

## ⚙️ Backend (Azure Functions)

### **Variables Requeridas**

| Variable | Descripción | ¿Secreto? | Ejemplo |
|----------|-------------|-----------|---------|
| `AZURE_OPENAI_ENDPOINT` | Endpoint de Azure OpenAI | No | `https://studere-ai.openai.azure.com/` |
| `AZURE_OPENAI_KEY` | API Key de Azure OpenAI | **SÍ** | `abc123...xyz` |
| `AZURE_OPENAI_DEPLOYMENT` | Deployment name para GPT-4o-mini | No | `stude-gpt4omini` |
| `AZURE_OPENAI_WHISPER_DEPLOYMENT` | Deployment name para Whisper | No | `whisper` |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage para audio chunks | **SÍ** | `DefaultEndpointsProtocol=https;...` |
| `ALLOWED_ORIGIN` | CORS - Origen permitido | No | `*` (local) / `https://studere.vercel.app` (prod) |
| `AzureWebJobsStorage` | Storage account (Azure Functions) | **SÍ** | `DefaultEndpointsProtocol=https;...` |
| `FUNCTIONS_WORKER_RUNTIME` | Runtime de Azure Functions | No | `node` |

### **Variables Opcionales (Recomendadas)**

| Variable | Descripción | Default | Recomendado Producción |
|----------|-------------|---------|----------------------|
| `WEBSITE_RUN_FROM_PACKAGE` | Deploy desde package | `0` | `1` (más rápido) |
| `APPINSIGHTS_INSTRUMENTATIONKEY` | Application Insights (monitoring) | - | Tu instrumentation key |

### **Archivos de Configuración**

#### **Local: `local.settings.json`**
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_OPENAI_ENDPOINT": "https://studere-ai.openai.azure.com/",
    "AZURE_OPENAI_KEY": "TU-API-KEY-AQUÍ",
    "AZURE_OPENAI_DEPLOYMENT": "stude-gpt4omini",
    "AZURE_OPENAI_WHISPER_DEPLOYMENT": "whisper",
    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "ALLOWED_ORIGIN": "*"
  }
}
```

**⚠️ IMPORTANTE:**
- Este archivo **NO** debe subirse a Git (está en `.gitignore`)
- Pedir el `AZURE_OPENAI_KEY` al administrador del proyecto

#### **Azure: Application Settings (Portal)**

**Opción 1: Azure Portal**
1. Ir a tu Function App: `https://portal.azure.com`
2. Navegar a: **Configuration** → **Application settings**
3. Agregar cada variable individualmente:
   ```
   AZURE_OPENAI_ENDPOINT = https://studere-ai.openai.azure.com/
   AZURE_OPENAI_KEY = [TU-API-KEY]
   AZURE_OPENAI_DEPLOYMENT = stude-gpt4omini
   AZURE_OPENAI_WHISPER_DEPLOYMENT = whisper
   AZURE_STORAGE_CONNECTION_STRING = [TU-STORAGE-CONNECTION-STRING]
   ALLOWED_ORIGIN = https://studere.vercel.app
   WEBSITE_RUN_FROM_PACKAGE = 1
   ```

**Opción 2: Azure CLI**
```bash
az functionapp config appsettings set \
  --name studere-backend \
  --resource-group studere-rg \
  --settings \
    AZURE_OPENAI_ENDPOINT="https://studere-ai.openai.azure.com/" \
    AZURE_OPENAI_KEY="TU-API-KEY" \
    AZURE_OPENAI_DEPLOYMENT="stude-gpt4omini" \
    AZURE_OPENAI_WHISPER_DEPLOYMENT="whisper" \
    AZURE_STORAGE_CONNECTION_STRING="TU-STORAGE-CONNECTION-STRING" \
    ALLOWED_ORIGIN="https://studere.vercel.app" \
    WEBSITE_RUN_FROM_PACKAGE="1"
```

---

## 🔍 Cómo Obtener las Claves

### **Azure OpenAI**

1. Ir a: `https://portal.azure.com`
2. Navegar a: **Azure OpenAI Service** → `studere-ai`
3. En el menú lateral: **Keys and Endpoint**
4. Copiar:
   - **Endpoint:** `https://studere-ai.openai.azure.com/`
   - **Key 1:** `[TU-API-KEY]`

5. Verificar deployments:
   - Ir a: **Azure AI Foundry Studio** (`https://ai.azure.com`)
   - Proyecto: `studere-ai`
   - Pestaña: **Deployments**
   - Verificar nombres:
     - GPT-4o-mini: `stude-gpt4omini`
     - Whisper: `whisper`

### **Azure Storage (AzureWebJobsStorage y AZURE_STORAGE_CONNECTION_STRING)**

1. Ir a: `https://portal.azure.com`
2. Navegar a: **Storage accounts** → `studerestorage` (o el nombre que usaste)
3. En el menú lateral: **Access keys**
4. Copiar la **Connection string** completa
5. Usar la misma connection string para ambas variables:
   - `AzureWebJobsStorage`: Requerido por Azure Functions runtime
   - `AZURE_STORAGE_CONNECTION_STRING`: Usado por blob-storage.js para audio chunks

**Nota:** Para desarrollo local, usar `"UseDevelopmentStorage=true"` requiere Azurite (emulador de Azure Storage).

---

## ✅ Checklist de Configuración

### **Local Development**
- [ ] `backend/local.settings.json` creado con todas las variables
- [ ] `AZURE_OPENAI_KEY` configurado correctamente
- [ ] `frontend/.env.local` creado con `NEXT_PUBLIC_BACKEND_URL`
- [ ] Backend inicia sin errores: `cd backend && func start`
- [ ] Frontend inicia sin errores: `cd frontend && npm run dev`
- [ ] Test: `curl http://localhost:7071/api/HealthCheck`

### **Azure Deploy (Backend)**
- [ ] Function App creado en Azure
- [ ] Storage account configurado
- [ ] Variables de entorno configuradas en Azure Portal o CLI
- [ ] `ALLOWED_ORIGIN` apunta a dominio de Vercel
- [ ] Test: `curl https://studere-backend.azurewebsites.net/api/HealthCheck`

### **Vercel Deploy (Frontend)**
- [ ] Proyecto conectado a Vercel
- [ ] `NEXT_PUBLIC_BACKEND_URL` configurado en Vercel dashboard
- [ ] Variable configurada para todos los environments
- [ ] Re-deploy después de configurar variable
- [ ] Test: Abrir `https://studere.vercel.app` y crear sesión de prueba

---

## 🐛 Troubleshooting

### **Error: "401 Unauthorized" en backend logs**
**Causa:** `AZURE_OPENAI_KEY` incorrecta o faltante  
**Solución:** Verificar que la key sea correcta en `local.settings.json` (local) o Azure settings (producción)

### **Error: "CORS policy" en frontend**
**Causa:** `ALLOWED_ORIGIN` mal configurado  
**Solución:** 
- Local: `ALLOWED_ORIGIN=*`
- Producción: `ALLOWED_ORIGIN=https://studere.vercel.app` (sin trailing slash)

### **Frontend no se conecta al backend**
**Causa:** `NEXT_PUBLIC_BACKEND_URL` incorrecta  
**Solución:** Verificar que la URL sea correcta:
- Local: `http://localhost:7071` (sin `/api`)
- Producción: `https://studere-backend.azurewebsites.net` (sin `/api`)

### **Error: "Deployment not found"**
**Causa:** Nombres de deployment incorrectos  
**Solución:** Verificar en Azure AI Foundry Studio que los nombres coincidan:
- `AZURE_OPENAI_DEPLOYMENT=stude-gpt4omini`
- `AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper`

---

## 📚 Referencias

- **Azure Functions Configuration:** https://learn.microsoft.com/azure/azure-functions/functions-app-settings
- **Vercel Environment Variables:** https://vercel.com/docs/projects/environment-variables
- **Next.js Environment Variables:** https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
- **Azure OpenAI:** https://learn.microsoft.com/azure/ai-services/openai/

---

**Última actualización:** Abril 2026  
**Estado:** ✅ Actualizado con arquitectura server-side (ProcessAudio)
