# 🚀 Deploy Rápido - Studere

## ✅ Estado Actual
- [x] Frontend optimizado
- [x] Backend optimizado  
- [x] Integración verificada
- [x] Git inicializado
- [ ] Deploy frontend
- [ ] Deploy backend

---

## 📦 Opción 1: Deploy Manual (5 minutos)

### **Frontend a Vercel:**

```bash
# 1. Instalar Vercel CLI (si no lo tenés)
npm install -g vercel

# 2. Deploy desde frontend
cd frontend
vercel login
vercel

# 3. Deploy a producción
vercel --prod
```

### **Backend a Azure:**

**Opción A - VS Code (más fácil):**
1. Instala extensión "Azure Functions"
2. Click derecho en `backend` → Deploy to Function App
3. Sigue el wizard

**Opción B - Azure CLI:**
```bash
cd backend
func azure functionapp publish studere-backend
```

---

## 🎯 Configuración Post-Deploy

### **1. Variables de Entorno en Vercel**

Ve a: `https://vercel.com/tu-usuario/studere/settings/environment-variables`

Agrega:
```
NEXT_PUBLIC_BACKEND_URL = https://studere-backend.azurewebsites.net
```

### **2. Variables de Entorno en Azure**

Ve a Azure Portal → Function App → Configuration

Agrega:
```
AZURE_OPENAI_ENDPOINT = https://studere-ai.openai.azure.com/
AZURE_OPENAI_KEY = [tu-key]
AZURE_OPENAI_DEPLOYMENT = stude-gpt4omini
AZURE_OPENAI_WHISPER_DEPLOYMENT = whisper
ALLOWED_ORIGIN = https://studere.vercel.app
```

### **3. Re-deploy Frontend**

```bash
cd frontend
vercel --prod
```

---

## ✅ Verificación

**Backend:**
```bash
curl https://studere-backend.azurewebsites.net/api/HealthCheck
```

**Frontend:**
Abre: `https://studere.vercel.app`

---

## 🎉 ¡Listo!

Tu app está online en:
- Frontend: `https://studere.vercel.app`
- Backend: `https://studere-backend.azurewebsites.net`

---

## 📊 Resumen de la Secuencia Completada

### ✅ **C - Integración Frontend-Backend**
- Puerto backend corregido (7071)
- API Key configurada
- Test exitoso de generación
- Ambos servicios corriendo localmente

### 🚀 **A - Deploy a Producción** (EN PROCESO)
- Git inicializado ✅
- Vercel CLI instalándose...
- Siguiente: Deploy frontend
- Siguiente: Deploy backend

### ⏳ **Pendiente:**
- F: Monitoring & Analytics
- B: Testing completo
- D/E: Features adicionales o PWA

---

**Tiempo estimado restante:** 10-15 minutos para completar el deploy 🚀
