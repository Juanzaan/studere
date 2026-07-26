# E2E Tests - Playwright

## Requisitos previos

Los tests E2E requieren que el servidor de desarrollo esté corriendo.

```bash
npm run dev
# Espera a que el servidor esté disponible en http://localhost:3000
```

## Ejecutar tests

```bash
# Todos los tests E2E (multi-browser)
npm run test:e2e

# Solo Chromium (más rápido para desarrollo)
npx playwright test --project=chromium

# Un spec específico
npx playwright test critical-flows.spec.ts

# Con UI interactiva
npm run test:e2e:ui
```

## Tests disponibles (8 spec files)

### `critical-flows.spec.ts`
**21 tests — flujos críticos del usuario:**
- ✅ Navegación completa por sidebar (Inicio, Biblioteca, Próximos, Destacados, Estadísticas, Integraciones)
- ✅ Theme toggle (dark mode, persistencia entre páginas y recarga)
- ✅ Session table (data-session-row, star toggle, navegación, column headers)
- ✅ Library filters (aria-pressed, filtro Destacadas)
- ✅ Session detail panels (Resumen → Flashcards → Quiz, MindMap, aria-live)
- ✅ StudeChat (abrir/cerrar dialog, enviar mensaje, quick prompts)
- ✅ Mobile sidebar (hamburguesa en viewport 375px)
- ✅ Search (input aria-label, filtrado textual, empty state)
- ✅ Integrations (6 cards, botones Próximamente)
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

- Los tests usan `data-testid` cuando están disponibles para mayor estabilidad
- Se implementan timeouts y esperas razonables para evitar flakiness
- Los E2E tests no requieren backend corriendo (usan localStorage mock)
- Los tests de critical-flows usan `addInitScript` para evitar el tutorial overlay en la primera carga
