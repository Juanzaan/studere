# AGENTS.md — Guía para agentes de IA trabajando en Studere

**Studere** es una plataforma SaaS que convierte grabaciones, transcripciones y notas de clase en material de estudio completo (resúmenes AI, flashcards, quizzes, mapas mentales) + **Stude**, un tutor AI con contexto de sesión.

## Stack y estructura

- **`frontend/`** — Next.js 14 (App Router), TypeScript strict, Tailwind 3.4, GSAP, Clerk, Vitest + Playwright
- **`backend/`** — Azure Functions v4 (Node 18), Azure OpenAI (GPT-4o-mini + Whisper), node-cache, Azure Blob Storage
- UI en español (es-AR); código y commits en inglés. No agregar emojis a archivos salvo que el usuario lo pida.

## Comandos (siempre desde `frontend/`)

```bash
npm run typecheck        # tsc --noEmit (OBLIGATORIO tras tocar código)
npm run test -- --run    # suite unit (Vitest, fileParallelism=false)
npx vitest run src/tests/unit/<file>   # correr un archivo puntual
npm run test:e2e         # Playwright E2E
npm run build            # build de producción
```

- **Backend:** no hay lint funcional; verificar sintaxis con `node --check <archivo>`.
- En Windows, git requiere `$env:Path += ";C:\Program Files\Git\cmd"` antes de usar.
- Vitest es pesado en memoria: usar `npm run test` (ya incluye `NODE_OPTIONS=--max-old-space-size=6144`). No correr `npx vitest` directo sin esas flags.

## Reglas de oro

1. **`tsc --noEmit` limpio + suite verde ANTES de dar una tarea por terminada.** Nunca reportar "listo" sin verificar.
2. **Nunca commitear `node_modules/`, `.env*` reales, artefactos ni capturas.** `git add` con rutas explícitas; revisar `git status` antes de commitear.
3. **Commits estilo Conventional Commits** (`fix(frontend): ...`, `feat(backend): ...`). Sin amend, sin force-push.
4. **Antes de usar una librería nueva, verificar que no exista ya en `package.json`.** Seguir los patrones existentes (contexts, hooks, componentes).
5. **No tocar `components/landing-page.tsx` ni `app/page.tsx`** — el swap de landing está pendiente como tarea aparte.
6. **Presupuesto:** las sesiones de desarrollo tienen presupuesto en USD. Parar y reportar al llegar al límite, no seguir silenciosamente.

## Convenciones de código

- **Storage:** patrón normalize-on-read — los datos se normalizan al LEER (`session-normalizer.ts`), `undefined` → backfill, `[]` intencional se respeta. No normalizar al escribir.
- **Persistence:** `useThrottledPersist` para writes frecuentes; `upsertSession` devuelve `boolean` (quota); surface fallos al usuario con `useToastContext`.
- **Temas:** colores vía CSS vars (`--c-blue`, `--c-surface`...). ECharts lee vars con `getComputedStyle` + MutationObserver en `<html>`.
- **Seguridad:** nunca `innerHTML` con datos de usuario (usar `md-renderer.tsx`, ya sanitiza hrefs); escapar en tooltips/exporters.
- **Side effects:** no poner efectos secundarios dentro de updaters de estado (`setState(fn)`) — usar `useEffect` con refs de dedupe.
- **Tests unitarios** en `frontend/src/tests/unit/` con Vitest; tests E2E en `frontend/e2e/` con Playwright.

## Arquitectura clave

- **Frontend:** `app/` (páginas), `components/` (UI), `lib/` (lógica: storage, api, generadores, analytics), `src/shared/` (hooks y componentes compartidos)
- **Backend:** un módulo por función Azure (`TranscribeAudio/`, `GenerateStudySession/`, `ProcessAudio/`, `StudeChat/`, `UploadAudioChunk/`, `EvaluateExercise/`, `HealthCheck/`) + `shared/` (auth, cache, blob-storage, openai-client, audio-pipeline)
- **Auth:** Clerk en frontend; backend verifica con `Clerk.verifyToken(token, { secretKey })` (nunca el objeto-form `verifySession`).
- **Flujo de audio:** >2h → rutas server-side; límite de transcripción `MAX_TRANSCRIPT_LENGTH` = 200000 chars en `GenerateStudySession`.

## Git y ramas

- Rama principal: `main` (regla remota: cambios vía PR; el owner puede bypassear). Workflow: rama propia → PR → merge.
- `frontend/.github/workflows/ci.yml` está en la raíz `.github/workflows/ci.yml` (GitHub solo lee la raíz) — CI corre tsc + vitest + build + E2E.
