# ✅ Checklist de Deploy - Studere

## 🎯 Objetivo

Este checklist asegura que Studere esté listo para deploy a staging/producción sin sorpresas.

**Tiempo estimado:** 30-45 minutos  
**Pre-requisito:** Integración local funcionando

---

## 🔧 PRE-DEPLOY: Verificación Local

### **Backend (Azure Functions)**

- [ ] **Backend inicia sin errores**
  ```bash
  cd backend
  func start
  ```
  - Esperar: "Functions: ... http://localhost:7071/api/..."
  - Sin errores de carga de módulos
  - Sin errores de configuración

- [ ] **HealthCheck responde correctamente**
  ```bash
  curl http://localhost:7071/api/HealthCheck
  ```
  - Esperado: `{"status": "healthy", ...}`
  - Verificar que `openai.status` sea `"ok"`

- [ ] **GenerateStudySession funciona**
  ```bash
  curl -X POST http://localhost:7071/api/generate-study-session \
    -H "Content-Type: application/json" \
    -d '{"transcript":"Matemáticas básicas. La suma de 2 + 2 es 4."}'
  ```
  - Esperado: JSON con `summary`, `keyConcepts`, `quiz`, `flashcards`, etc.
  - Sin errores de timeout o content filter

- [ ] **TranscribeAudio funciona (archivo pequeño)**
  - Subir audio <1MB desde frontend
  - Verificar que devuelva texto transcrito
  - Logs del backend sin errores

- [ ] **ProcessAudio funciona (archivo grande, opcional)**
  - Subir audio >24MB desde frontend
  - Verificar upload de chunks exitoso
  - Verificar procesamiento completo (puede tardar 5-10 min)
  - Logs del backend muestran: "FFmpeg command", "Transcribing segment", "Processing complete"

### **Frontend (Next.js)**

- [ ] **Frontend inicia sin errores**
  ```bash
  cd frontend
  npm run dev
  ```
  - Esperar: "Local: http://localhost:3000"
  - Sin errores de TypeScript
  - Sin errores 404 de chunks CSS/JS

- [ ] **Build funciona sin errores**
  ```bash
  npm run build
  ```
  - Esperar: "Compiled successfully"
  - Sin errores de tipos
  - Sin warnings críticos
  - Tamaño de bundles razonable (<1MB total recomendado)

- [ ] **Flujo E2E funciona localmente**
  1. Abrir `http://localhost:3000`
  2. Click "Nueva Sesión"
  3. Subir un audio pequeño (~30 segundos) o pegar texto
  4. Generar sesión
  5. Verificar que se muestre:
     - Resumen con markdown
     - Conceptos
     - Flashcards
     - Quiz interactivo
     - Mapa mental
  6. Probar chat con Stude AI
  7. Completar un ejercicio del quiz

### **Variables de Entorno**

- [ ] **Backend: `local.settings.json` completo**
  - `AZURE_OPENAI_ENDPOINT` configurado
  - `AZURE_OPENAI_KEY` configurado
  - `AZURE_OPENAI_DEPLOYMENT` configurado
  - `AZURE_OPENAI_WHISPER_DEPLOYMENT` configurado
  - `ALLOWED_ORIGIN` configurado (`*` para local)

- [ ] **Frontend: `.env.local` completo**
  - `NEXT_PUBLIC_BACKEND_URL=http://localhost:7071` configurado

- [ ] **Verificar que `.gitignore` excluya secretos**
  - `local.settings.json` no debe subirse a Git
  - `.env.local` no debe subirse a Git

---

## 🚀 DEPLOY: Backend a Azure

### **Paso 1: Preparación**

- [ ] **Function App existe en Azure**
  - Nombre: `studere-backend` (o similar)
  - Runtime: Node.js 18
  - Plan: Consumption (o Premium si audio largo)
  - Region: East US (o más cercana)

- [ ] **Storage Account configurado**
  - Nombre: `studerestorage` (o similar)
  - Tipo: General Purpose v2
  - Connection string copiado

### **Paso 2: Deploy**

- [ ] **Deploy desde VS Code (Opción 1)**
  1. Extensión "Azure Functions" instalada
  2. Click derecho en carpeta `backend`
  3. "Deploy to Function App"
  4. Seleccionar Function App existente
  5. Esperar deploy completo

- [ ] **Deploy con CLI (Opción 2)**
  ```bash
  cd backend
  func azure functionapp publish studere-backend
  ```
  - Esperar: "Deployment successful"
  - Sin errores de build o publish

### **Paso 3: Configurar Variables en Azure**

- [ ] **Variables configuradas en Azure Portal**
  1. Ir a: `https://portal.azure.com`
  2. Navegar a: Function App → Configuration → Application settings
  3. Agregar cada variable (ver `ENV_VARIABLES.md`):
     - `AZURE_OPENAI_ENDPOINT`
     - `AZURE_OPENAI_KEY` ⚠️ 
     - `AZURE_OPENAI_DEPLOYMENT`
     - `AZURE_OPENAI_WHISPER_DEPLOYMENT`
     - `ALLOWED_ORIGIN` (URL de Vercel, sin trailing slash)
     - `WEBSITE_RUN_FROM_PACKAGE=1`
  4. Click "Save" y esperar restart automático

### **Paso 4: Verificar Backend en Producción**

- [ ] **HealthCheck responde**
  ```bash
  curl https://studere-backend.azurewebsites.net/api/HealthCheck
  ```
  - Esperado: `{"status": "healthy", ...}`
  - Sin errores 500 o timeout

- [ ] **GenerateStudySession responde**
  ```bash
  curl -X POST https://studere-backend.azurewebsites.net/api/generate-study-session \
    -H "Content-Type: application/json" \
    -d '{"transcript":"Test básico de deploy."}'
  ```
  - Esperado: JSON con contenido generado
  - Tiempo de respuesta <10 segundos

- [ ] **Logs sin errores críticos**
  - Ir a: Azure Portal → Function App → Log stream
  - Verificar que no haya errores de API key o deployment

---

## 🌐 DEPLOY: Frontend a Vercel

### **Paso 1: Preparación**

- [ ] **Vercel CLI instalado**
  ```bash
  npm install -g vercel
  vercel login
  ```

- [ ] **Proyecto conectado a Git (opcional pero recomendado)**
  - Repositorio en GitHub/GitLab
  - Vercel puede auto-deployar en cada push

### **Paso 2: Primer Deploy**

- [ ] **Deploy desde CLI**
  ```bash
  cd frontend
  vercel
  ```
  - Seguir wizard (nuevo proyecto, scope personal, nombre `studere`)
  - Esperar: "Production: https://studere-xyz.vercel.app"

### **Paso 3: Configurar Variables en Vercel**

- [ ] **Variable configurada en Vercel Dashboard**
  1. Ir a: `https://vercel.com/tu-usuario/studere/settings/environment-variables`
  2. Agregar variable:
     ```
     NEXT_PUBLIC_BACKEND_URL = https://studere-backend.azurewebsites.net
     ```
  3. Seleccionar **todos** los environments (Production, Preview, Development)
  4. Click "Save"

### **Paso 4: Re-deploy con Variables**

- [ ] **Re-deploy para aplicar variables**
  ```bash
  vercel --prod
  ```
  - Esperar nuevo deploy completo
  - URL final: `https://studere.vercel.app` (o similar)

### **Paso 5: Verificar Frontend en Producción**

- [ ] **Página carga sin errores**
  - Abrir: `https://studere.vercel.app`
  - No hay errores 404 de chunks
  - CSS y JS cargan correctamente
  - No hay errores de console (F12)

- [ ] **Conexión con backend funciona**
  - Crear nueva sesión
  - Pegar texto de prueba
  - Click "Generar Sesión"
  - Verificar que se genere contenido
  - Sin errores de CORS o fetch

---

## 🧪 POST-DEPLOY: Validación End-to-End

### **Test Básico**

- [ ] **Flujo completo de texto → sesión**
  1. Abrir `https://studere.vercel.app`
  2. Nueva Sesión
  3. Pegar texto: "Física básica. La gravedad es 9.8 m/s²."
  4. Generar sesión
  5. Verificar:
     - Resumen se renderiza correctamente
     - Conceptos visibles
     - Flashcards funcionan
     - Quiz tiene opciones y respuestas
     - Chat responde al escribir

### **Test Audio Pequeño (<24MB)**

- [ ] **Flujo completo de audio → sesión**
  1. Nueva Sesión
  2. Subir audio de ~1-5 minutos
  3. Esperar transcripción (1-3 minutos)
  4. Generar sesión
  5. Verificar contenido completo

### **Test Audio Grande (>24MB, opcional)**

- [ ] **Flujo server-side funciona**
  1. Nueva Sesión
  2. Subir audio de ~40-50 minutos
  3. Verificar mensajes de progreso:
     - "Subiendo X/Y..."
     - "Procesando audio en servidor..."
     - "Transcripción completa"
  4. Esperar procesamiento (5-10 minutos)
  5. Generar sesión
  6. Verificar que transcript sea completo (no cortado)

### **Test de Errores**

- [ ] **Manejo de errores funciona**
  - Subir archivo inválido (no audio) → Error claro
  - Generar sesión sin texto → Error claro
  - Timeout de backend → Mensaje de reintentar
  - Sin errores 500 no manejados

---

## 📊 MONITOREO: Post-Deploy

### **Inmediato (Primeros 10 minutos)**

- [ ] **No hay errores en logs de Azure**
  - Azure Portal → Function App → Log stream
  - Sin errores 500
  - Sin timeouts
  - Sin errores de API key

- [ ] **No hay errores en Vercel**
  - Vercel Dashboard → Logs
  - Sin builds fallidos
  - Sin errores de runtime

### **Corto Plazo (Primera hora)**

- [ ] **Pruebas con usuarios reales (opcional)**
  - Invitar 2-3 usuarios beta
  - Pedirles que prueben flujo completo
  - Recoger feedback sobre errores

- [ ] **Verificar costos iniciales**
  - Azure Portal → Cost Management
  - Verificar que esté dentro de lo estimado (~$1-2 por día)

### **Largo Plazo (Primera semana)**

- [ ] **Configurar Application Insights (recomendado)**
  - Azure Portal → Application Insights
  - Conectar con Function App
  - Configurar alertas de errores

- [ ] **Configurar Vercel Analytics (opcional)**
  - Vercel Dashboard → Analytics
  - Activar Web Vitals monitoring

---

## 🐛 Troubleshooting Común

### **Error: "CORS policy" en producción**
**Causa:** `ALLOWED_ORIGIN` mal configurado  
**Solución:**
1. Ir a Azure Portal → Function App → Configuration
2. Verificar que `ALLOWED_ORIGIN` sea: `https://studere.vercel.app`
3. Sin `http://`, sin trailing slash, exacto match con URL de Vercel
4. Guardar y reiniciar Function App

### **Error: Frontend no se conecta al backend**
**Causa:** `NEXT_PUBLIC_BACKEND_URL` incorrecta o no aplicada  
**Solución:**
1. Verificar variable en Vercel Dashboard
2. Re-deploy con `vercel --prod`
3. Verificar en logs de Vercel que la variable esté presente

### **Error: "401 Unauthorized" en GenerateStudySession**
**Causa:** `AZURE_OPENAI_KEY` incorrecta en Azure  
**Solución:**
1. Azure Portal → Function App → Configuration
2. Verificar `AZURE_OPENAI_KEY` es correcta
3. Copiar de Azure OpenAI Service → Keys and Endpoint

### **Error: Timeout en ProcessAudio**
**Causa:** Audio demasiado largo o timeout mal configurado  
**Solución:**
1. Verificar que `host.json` tenga `"functionTimeout": "00:30:00"`
2. Considerar limitar tamaño de audio en frontend
3. O migrar a Plan Premium para más tiempo

---

## ✅ Sign-Off Final

- [ ] **Backend funciona en producción** (HealthCheck + GenerateStudySession OK)
- [ ] **Frontend funciona en producción** (Carga sin errores + se conecta al backend)
- [ ] **Flujo E2E funciona** (Texto/audio → sesión → UI completa)
- [ ] **Variables de entorno configuradas correctamente**
- [ ] **Sin errores en logs de Azure o Vercel**
- [ ] **Costos dentro de lo estimado**

**🎉 ¡Studere está en producción!**

---

**Última actualización:** Abril 2026  
**Tiempo estimado total:** 30-45 minutos (sin contar tiempos de procesamiento)  
**Próximo paso:** Configurar monitoring con Application Insights
