# E2E Tests - Playwright

## Requisitos previos

El dev server se levanta solo: `playwright.config.ts` declara un `webServer` que corre
`npm run dev` (reusa uno existente si ya está en `127.0.0.1:3000`). El setup de auth
necesita las claves de Clerk y el usuario de test en `frontend/.env.local`
(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `E2E_CLERK_USER_EMAIL`).

## Ejecutar tests

```bash
# Todos los tests E2E (multi-browser: chromium, firefox, webkit, mobile)
npm run test:e2e

# Solo Chromium (más rápido para desarrollo)
npx playwright test --project=setup --project=chromium

# Un spec específico
npx playwright test critical-flows.spec.ts

# Con UI interactiva
npm run test:e2e:ui
```

CI corre `--project=setup --project=chromium` con las claves como secrets del repo
(`Test & Build (20.x)` y `E2E Tests` son checks requeridos para mergear).

## Tests disponibles (9 spec files, 92 tests en Chromium)

### `critical-flows.spec.ts`
**Flujos críticos del usuario:**
- ✅ Navegación completa por sidebar (Inicio, Biblioteca, Próximos, Destacados, Estadísticas, Integraciones)
- ✅ Theme toggle (dark mode, persistencia entre páginas y recarga)
- ✅ Session table (session rows, star toggle, navegación, column headers)
- ✅ Library filters (aria-pressed, filtro Destacadas)
- ✅ Session detail panels (Resumen → Flashcards → Quiz, MindMap, aria-live)
- ✅ StudeChat (abrir/cerrar dialog, enviar mensaje, quick prompts)
- ✅ Mobile sidebar (hamburguesa en viewport 375px)
- ✅ Search (input aria-label, filtrado textual, empty state)
- ✅ Integraciones (6 providers, estados reales Conectada/Desconectada, persistencia)
- ✅ Upcoming (eventos, calendario links Google/Outlook)
- ✅ Dark mode persistencia entre páginas

### `session-create-flow.spec.ts`
**Flujo completo de creación de sesión:**
- ✅ Crear sesión → Ver en biblioteca → Abrir detalle
- ✅ Estado vacío cuando no hay sesiones
- ✅ Persistencia de sesiones en localStorage

### `audio-transcription-flow.spec.ts`
Flujo de transcripción de audio:
- ✅ Grabación y procesamiento de audio
- ✅ Transcripción con Whisper (mock)

### `ai-generation-flow.spec.ts`
Flujo de generación con IA:
- ✅ Generación de resumen, flashcards, quiz
- ✅ Quality check automático

### `flashcard-flow.spec.ts`
Flujo de flashcards:
- ✅ Spaced repetition (De nuevo / Difícil / Bien / Fácil)
- ✅ Flip animation

### `quiz-flow.spec.ts`
Flujo de quiz:
- ✅ Selección de respuesta A/B/C/D
- ✅ Scoring y explicaciones

### `session-detail.spec.ts`
Flujo de detalle de sesión:
- ✅ Metadata de sesión
- ✅ Cambio entre paneles (Flashcards/Quiz)
- ✅ Exportación

### `library.spec.ts`
Tests de la página de biblioteca:
- ✅ Visualización de sesiones
- ✅ Navegación a detalle
- ✅ Quick actions

## Notas

- La app no tiene `data-testid` en ningún lado: los specs usan locators por `role`, `label` y `placeholder` leídos de los componentes reales.
- Los tests no requieren backend corriendo: las llamadas se stubean con `page.route` cuando hace falta (CORS + preflight `OPTIONS` incluidos).
- El tutorial overlay se neutraliza sembrando su flag de localStorage en `fixtures/seed.ts`; el storageState del setup de auth también lo marca como completado.
- El spec de integraciones (y cualquier click temprano) espera la hidratación de React: `gotoThroughHandshake` resuelve en `domcontentloaded`, y React monta recién con el evento `load` — usar `openShell`/`waitForHydration` antes de interactuar.
