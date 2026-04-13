# Studere

Plataforma de estudio post-clase que transforma grabaciones, notas y transcripciones en material de estudio interactivo con IA.

## Funcionalidades

- **Dashboard** con acciones rápidas, onboarding y sesiones recientes
- **Grabación de audio** (micrófono) y **captura de pantalla** directo desde el navegador
- **Transcripción real** con Azure OpenAI Whisper (chunking automático para archivos grandes)
- **Generación con IA** de resumen Markdown, conceptos clave, flashcards, quiz múltiple opción, mapa mental, tareas con ejercicios e insights
- **Chat Stude** — tutor IA contextual por sesión (Azure OpenAI GPT-4.1-mini)
- **Evaluación de ejercicios** — corrección IA de respuestas de texto o foto
- **Spaced repetition** en flashcards (De nuevo / Difícil / Bien / Fácil)
- **Quiz interactivo** con A/B/C/D, scoring y explicaciones
- **Mapa mental** interactivo con ReactFlow
- **Gráficos** (bar, line, pie) generados desde el chat
- **Analytics** con métricas de estudio, quizzes y flashcards
- **Exportación** a Markdown y CSV
- **Biblioteca**, **sesiones destacadas** y **próximos eventos**
- **i18n completo** en español

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts, ReactFlow |
| Backend | Azure Functions (Node.js) |
| IA | Azure OpenAI — GPT-4.1-mini (generación, chat, evaluación) + Whisper (transcripción) |
| Storage | localStorage (sesiones), analytics custom |

## Cómo ejecutarlo

```bash
# Frontend
cd frontend
npm install
npm run dev
```

```bash
# Backend (Azure Functions)
cd backend
npm install
func start
```

Frontend en `http://localhost:3000` · Backend en `http://localhost:7080`

## Variables de entorno

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:7080
```

### Backend (`backend/local.settings.json`)
```
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_KEY=...
AZURE_OPENAI_DEPLOYMENT=...
AZURE_OPENAI_WHISPER_DEPLOYMENT=...
```

## Estructura

```
frontend/
  app/           → Rutas Next.js (dashboard, library, sessions, analytics, etc.)
  components/    → 21 componentes React
  lib/           → Utilidades, tipos, API client, storage, generadores
backend/
  GenerateStudySession/  → Genera paquete de estudio con IA
  StudeChat/             → Chat contextual con IA
  TranscribeAudio/       → Transcripción Whisper
  EvaluateExercise/      → Corrección de ejercicios con IA
```
