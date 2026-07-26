# Studere

Plataforma de estudio post-clase que transforma grabaciones, notas y transcripciones en material de estudio interactivo con IA.

## Funcionalidades

- **Dashboard** con acciones rápidas, onboarding, filtros y sesiones recientes
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
- **Tour interactivo** con spotlight, personaje animado y navegación por teclado
- **Skeleton screens** para estados de carga de IA (transcribiendo / generando)
- **Animaciones unificadas** con GSAP (entrada escalonada, fade + scale, easing suave)
- **Exportación** a Markdown y CSV
- **Biblioteca**, **sesiones destacadas** y **próximos eventos**
- **Modo oscuro** con detección de preferencia del sistema
- **Responsive design** — sidebar hamburguesa, layout adaptable, targets táctiles
- **Accesibilidad** — WCAG AA, HTML semántico, roles ARIA, navegación por teclado
- **i18n completo** en español

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14, TypeScript (strict), Tailwind CSS, GSAP, ReactFlow, Recharts |
| Backend | Azure Functions (Node.js) |
| IA | Azure OpenAI — GPT-4.1-mini (generación, chat, evaluación) + Whisper (transcripción) |
| Storage | localStorage (sesiones), analytics custom |

## Testing

| Tipo | Cantidad |
|---|---|
| Unit tests (Vitest) | 311 tests, 14 suites |
| E2E (Playwright) | 8 spec files, 21 critical-flow tests |
| Cobertura | Componentes, storage, audio, API, navegación, temas, mobile |

## Cómo ejecutarlo

```bash
cd frontend
npm install
npm run dev
```

Frontend en `http://localhost:3000` · Backend en `http://localhost:7071`

## Variables de entorno

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:7071
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
  components/    → 32 componentes React
  lib/           → Utilidades, tipos, API client, storage, generadores
  src/
    domains/     → Módulos de dominio específico
    shared/      → Hooks y utilidades compartidas (animaciones, etc.)
    tests/       → 14 suites de tests unitarios
  e2e/           → 8 specs de Playwright
backend/
  GenerateStudySession/  → Genera paquete de estudio con IA
  StudeChat/             → Chat contextual con IA
  TranscribeAudio/       → Transcripción Whisper
  EvaluateExercise/      → Corrección de ejercicios con IA
```
