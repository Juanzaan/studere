# E2E Tests - Playwright

## Requisitos previos

Los tests E2E requieren que el servidor de desarrollo esté corriendo.

## Ejecutar tests E2E

### 1. Iniciar el servidor de desarrollo

En una terminal:

```bash
npm run dev
```

Espera a que el servidor esté disponible en `http://localhost:3000`

### 2. Ejecutar los tests

En otra terminal:

```bash
# Ejecutar todos los tests E2E
npm run test:e2e

# Ejecutar un spec específico
npx playwright test session-create-flow.spec.ts

# Ejecutar con UI interactiva
npm run test:e2e:ui

# Ejecutar solo en Chromium (más rápido para desarrollo)
npx playwright test --project=chromium
```

## Tests disponibles

### `session-create-flow.spec.ts` (NUEVO)
**Flujo crítico de usuario**:
- ✅ Crear sesión → Ver en biblioteca → Abrir detalle
- ✅ Estado vacío cuando no hay sesiones
- ✅ Persistencia de sesiones en localStorage

### `library.spec.ts`
Tests de la página de biblioteca:
- Visualización de sesiones
- Navegación a detalle
- Quick actions

### `session-detail.spec.ts`
Tests de la página de detalle:
- Visualización de metadata
- Cambio entre paneles (Flashcards/Quiz)
- Exportación

## Notas

- Los tests usan `data-testid` cuando están disponibles para mayor estabilidad
- Se implementan timeouts y esperas razonables para evitar flakiness
- Los E2E tests no requieren backend corriendo (usan localStorage mock)
