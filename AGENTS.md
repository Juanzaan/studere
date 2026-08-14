# AGENTS.md — Guía para agentes de IA trabajando en Studere

**Studere** es una plataforma SaaS que convierte grabaciones, transcripciones y notas de clase en material de estudio completo (resúmenes AI, flashcards, quizzes, mapas mentales) + **Stude**, un tutor AI con contexto de sesión.

## Stack y estructura

- **`frontend/`** — Next.js 14 (App Router), TypeScript strict, Tailwind 3.4, GSAP, Clerk, Vitest + Playwright
- **`backend/`** — Azure Functions v4 (Node 18), Azure OpenAI (GPT-4o-mini + Whisper), node-cache, Azure Blob Storage
- UI en español (es-AR); código y commits en inglés. No agregar emojis a archivos salvo que el usuario lo pida.

## Dos clones, un repo (leer antes de tocar nada)

Hay **dos clones del mismo repo** en esta máquina. Confundirlos ya costó una sesión entera.

| Clon | Ruta | Rol |
|---|---|---|
| **Canónico** | `OneDrive\Documentos\Default Project` | Desde acá se verifica, commitea y pushea. Tiene el `.env.local` real. |
| **De trabajo** | `Projects\studere` | Donde Claude edita. |

Reglas:

1. **Claude edita en `Projects\studere`.** opencode verifica y commitea desde el canónico.
2. **Sincronizar solo con `git pull --ff-only`.** Si el fast-forward falla, alguien divergió: resolver a mano, no forzar.
3. **`.env.local` vive únicamente en el canónico.** Copiarlo al clon de trabajo antes de empezar, o el build revienta con `@clerk/nextjs: Missing publishableKey` y falla el prerender de las rutas estáticas.
4. **Los worktrees no heredan nada ignorado.** Un worktree nuevo arranca sin `node_modules` y sin `.env.local`: `npm install` + copiar el env antes de verificar.

**Trampa de OneDrive:** OneDrive re-escribe mtimes, así que `git status` puede mostrar ~146 archivos como `M` sin un solo cambio real (stat-dirty). **Verificar siempre con `git diff` antes de descartar algo** — un `git checkout .` a ciegas ahí borra trabajo de verdad.

## Handoff entre agentes

El ciclo que funciona:

1. **Claude** propone e implementa el fix en `Projects\studere`.
2. **opencode** lo revisa y verifica en el canónico: `typecheck` + `build` + suite de tests.
3. **opencode** commitea con Conventional Commits.
4. El clon de Claude se pone al día con `git pull --ff-only`.

**Nunca dos agentes editando los mismos archivos a la vez.** Dividir el trabajo por archivo, no por "área" — dos agentes en la misma área terminan en el mismo archivo. Si hace falta trabajo en paralelo, decir explícitamente qué archivos toca cada uno.

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
3. **Los agentes no generan ni rotan keys.** `CLERK_SECRET_KEY` la rota el owner desde el dashboard de Clerk. Un agente nunca inventa una key, nunca la commitea y no imprime su valor completo en logs ni en respuestas.
4. **Commits estilo Conventional Commits** (`fix(frontend): ...`, `feat(backend): ...`). Sin amend, sin force-push.
5. **Antes de usar una librería nueva, verificar que no exista ya en `package.json`.** Seguir los patrones existentes (contexts, hooks, componentes).
6. **Landing cerrada:** el swap ya está hecho (commit `88263fe`) — `/` sirve `public/landing-prototype.html` vía middleware rewrite; `app/page.tsx` solo redirige. `components/landing-page.tsx` quedó como código muerto (nadie lo importa): no resucitarlo para nuevos cambios.
7. **Presupuesto:** las sesiones de desarrollo tienen presupuesto en USD. Parar y reportar al llegar al límite, no seguir silenciosamente.
8. **Docs a fecha en el mismo commit:** todo cambio de comportamiento o estructura actualiza en el MISMO commit los docs que lo referencian (`README.md`, `CHANGELOG.md`, `AGENTS.md`, `CODING_STANDARDS.md`, `frontend/README.md`, `frontend/e2e/README.md`). Antes de dar una tarea por terminada, grepear `*.md` por el archivo/feature tocada y verificar que nada quedó desactualizado — no copiar texto de docs viejos sin contrastarlo contra el código actual.

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
- El workflow de CI vive en `.github/workflows/ci.yml` (GitHub solo lee la raíz, no `frontend/.github/`) — CI corre tsc + vitest + build + E2E.

## Issues abiertas

Dos en cola en el milestone `v0.2`. **Una por sesión de Claude, sin mezclar** — cada una toca archivos distintos y combinarlas hace el review imposible.

| # | Tema | Prioridad |
|---|---|---|
| #6 | Calendario | `priority: low` |
| #4 | Limpiar git history | `priority: medium` |

Cerradas: #7 (integración framework, PR #20) y #3 (E2E con login de Clerk, PR #12) — el milestone v0.2 las tiene en `Done`.

El `config.yml` (`ISSUE_TEMPLATE/config.yml`) y los templates de issues ya existen: usarlos en lugar de abrir issues a mano. Al crear/editar issues: label de tipo (`enhancement`/`bug`/`ci`/`chore`/`docs`/`security`) + label de prioridad (`priority: high`/`medium`/`low`) + milestone `v0.2`, y cuerpo con checklist de objetivos y criterios de aceptación.
