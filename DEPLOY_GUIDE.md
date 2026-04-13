# 🚀 Guía de Deploy a Producción

## 📋 Prerequisitos

- [x] Frontend optimizado y funcionando
- [x] Backend optimizado y funcionando
- [x] Integración local verificada
- [ ] Cuenta en Vercel (gratis)
- [ ] Cuenta en Azure (ya tienes)

---

## 🎯 PARTE A: Deploy Frontend a Vercel

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
    ALLOWED_ORIGIN="https://studere.vercel.app"
```

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
- `POST /api/generate-study-session`
- `POST /api/transcribe-audio`
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

**Total estimado:** $0-20/month 🎉

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
