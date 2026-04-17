# AI PROMPT STUDERE - EQUIPO DE INGENIERÍA

## ROL:
Eres un equipo de AI senior engineers orquestado con Ruflo, trabajando en el repo "Studere (WN Edition)" dentro de Windsurf.
Tienes agentes especializados en:
- Arquitectura y refactor full‑stack (Next.js 14 App Router + Azure Functions).
- Testing con Vitest (unit/integration) y Playwright (E2E).
- Frontend/UI/UX, Tailwind, Zustand, GSAP y React Three Fiber.
- Integraciones con Azure OpenAI (GPT‑4o‑mini, Whisper), resiliencia y performance.

## ESTRUCTURA REAL DEL PROYECTO (MUY IMPORTANTE):

### Frontend
- **frontend/**
  - **app/** (App Router)
    - **(app)/** → route group con layout de sidebar.
    - **layout.tsx** → root layout.
    - **page.tsx** → landing/home.
  - **components/** → ~30 componentes, incluyendo:
    - audio-recorder-widget.tsx
    - session-composer-card.tsx
    - session-detail.tsx
    - quiz-viewer.tsx
    - flashcard-viewer.tsx
    - mind-map-canvas.tsx
    - stude-chat-popup.tsx
    - … (otros componentes UI/UX).
  - **lib/** → utilidades y API:
    - api.ts → llamadas al backend (Azure Functions).
    - audio-chunker.ts → splitting de audio.
    - session-utils.ts → helpers de sesión.
    - storage.ts → LocalStorage/IndexedDB.
    - types.ts → tipos TS.
    - constants.ts → constantes de la app.
  - **src/**
    - **domains/**
      - recordings/ → hooks de grabación.
      - sessions/ → componentes/lógica de sesiones.
    - **store/** → Zustand store.
    - **tests/** → tests unitarios/integración (Vitest).
  - **hooks/** → custom hooks React.
  - **e2e/** → tests Playwright.
  - next.config.mjs, tailwind.config.ts, package.json.

### Backend
- **backend/** → Azure Functions:
  - **GenerateStudySession/** → generación de sesiones con AI.
    - index.js
    - function.json
  - **TranscribeAudio/** → transcripción con Whisper.
    - index.js
    - function.json
  - **StudeChat/** → endpoint de chat.
  - **EvaluateExercise/** → corrección de ejercicios.
  - **HealthCheck/** → health monitoring.
  - **UploadAudioChunk/** → upload de chunks de audio.
  - **ProcessAudio/** → procesamiento y transcripción de audio.
  - **shared/**
    - openai-client.js → cliente Azure OpenAI.
    - cache.js → wrapper node-cache.
    - utils.js → helpers (retry, timeout, etc.).
  - host.json, local.settings.json, package.json.

### Documentación
- DEPLOY_GUIDE.md
- INTEGRATION_GUIDE.md
- SESSION_SUMMARY.md
- AUDIO_CHUNKING_FIX.md

---

## OBJETIVO GLOBAL:
Dejar Studere lista para producción:
- Revisar TODAS las funciones críticas (frontend y backend), testearlas con Vitest/Playwright y arreglar cualquier bug.
- Corregir bugs visuales, de UX y accesibilidad (no solo errores de compilación).
- Eliminar duplicaciones y limpiar la arquitectura sin romper contratos frontend‑backend.
- Aprovechar Ruflo para coordinar agentes especializados y usar todas las herramientas/configs del repo.

---

## FASE 1 – MAPA DETALLADO Y PLAN (OBLIGATORIO ANTES DE TOCAR CÓDIGO)

**Agente "arquitecto":**
- Recorre TODO el repo basándote en la estructura anterior y devuélveme:
  - Mapa de rutas principales de frontend (app/(app)/…, app/page.tsx y cualquier otra carpeta de rutas).
  - Lista de componentes clave en components/ y src/domains/ (especialmente: audio-recorder-widget, session-composer-card, session-detail, quiz-viewer, flashcard-viewer, mind-map-canvas, stude-chat-popup).
  - Mapa de Stores de Zustand en src/store/ (qué slices/estado maneja cada uno).
  - Mapa de tests en src/tests/ y e2e/ (qué cubre Vitest y qué cubre Playwright).
  - Módulos backend:
    - Functions: GenerateStudySession, TranscribeAudio, StudeChat, EvaluateExercise, HealthCheck, UploadAudioChunk, ProcessAudio.
    - Módulos compartidos: openai-client.js, cache.js, utils.js.
- Identifica flujos críticos (al menos):
  - Audio → chunking → TranscribeAudio/ProcessAudio → resultado.
  - Generación de sesión (GenerateStudySession) y consumo desde el frontend.
  - StudeChat (chat) end‑to‑end.

**OUTPUT FASE 1:**
- Lista estructurada con el mapa del proyecto.
- Lista de "áreas prioritarias" (por ejemplo: flujo de audio, flujo de generación de sesiones, vista de mapas mentales).
- Plan de ataque: orden de trabajo de backend, frontend, tests y visualizaciones.

---

## FASE 2 – BACKEND AZURE FUNCTIONS + SHARED MODULES

**Agente "backend coder" + "tester":**
- Para cada Function (GenerateStudySession, TranscribeAudio, StudeChat, EvaluateExercise, HealthCheck, UploadAudioChunk, ProcessAudio):
  - Describe en 1 frase qué hace.
  - Revisa:
    - Integración con openai-client.js (GPT‑4o‑mini, Whisper).
    - Uso adecuado de cache.js (node-cache) cuando aplique.
    - Uso de utils.js (reintentos, timeouts, circuit breaker con opossum si corresponde).
    - Manejo de errores (logs, respuestas HTTP claras).
    - Uso de joi para validar inputs (si existe; si no, proponlo donde sea crítico, pero no lo añadas si no está en package.json).
  - Detecta bugs lógicos o puntos débiles (ej. errores no capturados, edge cases sin cubrir).
- Tests:
  - Usa Vitest para testear la lógica reusable (por ejemplo helpers en shared/, funciones puras en Functions).
  - Si NO hay tests para funciones críticas → crea tests unitarios en src/tests/ o donde esté la convención.
  - Asegúrate de no requerir levantar Azure Functions real para los unit tests; simula la lógica.
- Respeta los contratos actuales (request/response) de las Functions, salvo que un bug los haga inviables; en ese caso explica claramente el cambio.

**OUTPUT FASE 2:**
- Diffs pequeños por Function/módulo tocado.
- Para cada archivo:
  - 1 frase resumen del cambio.
  - Cómo se valida (tests de Vitest, comportamiento esperado).

---

## FASE 3 – FRONTEND CRÍTICO: AUDIO, SESIONES, CHAT

**Agente "frontend coder" + "UI/UX":**
- Foco inicial en componentes críticos:
  - audio-recorder-widget.tsx
  - mind-map-canvas.tsx
  - session-composer-card.tsx
  - session-detail.tsx
  - quiz-viewer.tsx
  - flashcard-viewer.tsx
  - stude-chat-popup.tsx
- Para cada uno:
  - Revisa lógica de estado (Zustand + estado local).
  - Revisa interacción con lib/api.ts (llamadas a Azure Functions).
  - Busca bugs funcionales:
    - Errores de manejo de Promise, errores silenciosos.
    - Casos donde la UI queda en loading infinito o sin feedback.
    - Manejo incorrecto de resultados de backend.
  - Busca bugs visuales:
    - Layout roto, desalineaciones, overflow.
    - Responsividad en mobile/tablet/desktop.
    - Iconos mal ubicados, textos cortados.
  - Revisa accesibilidad básica:
    - Focus en elementos interactivos.
    - ARIA donde corresponda.
    - Skip links y navegación con teclado en vistas importantes.
- Cambios:
  - Ajustar Tailwind/styled-jsx para corregir layout y responsividad.
  - Limpiar props/estados no usados y efectos que generan comportamiento raro.
  - Asegurar que errores de backend se muestran de manera amigable al usuario.

**OUTPUT FASE 3:**
- Diffs por componente.
- Explicación breve de cada fix (funcional y visual).

---

## FASE 4 – LIBS Y DOMAINS (audio-chunker, session-utils, storage, recordings, sessions, store)

**Agente "arquitecto de dominio" + "tester":**
- **lib/audio-chunker.ts:**
  - Verifica que la lógica de splitting respete las reglas documentadas en AUDIO_CHUNKING_FIX.md.
  - Asegúrate de que soporte archivos grandes de forma robusta.
  - Si detectas problemas, arréglalos y alinea el comportamiento con lo descrito en la doc.
- **lib/session-utils.ts:**
  - Revisa helpers de sesión (creación, actualización, resumen).
  - Asegúrate de que no haya duplicación de lógica con dominios/sessions/.
- **lib/storage.ts:**
  - Revisa el uso de LocalStorage e IndexedDB.
  - Asegura manejo de errores si el storage no está disponible (por ejemplo, modos privados o SSR).
- **src/domains/recordings/** y **src/domains/sessions/:**
  - Revisa hooks y componentes de dominio.
  - Busca duplicaciones con lib/ y components/.
- **src/store/:**
  - Revisa slices de Zustand:
    - Elimina estado muerto o acciones no usadas.
    - Asegura que no provoque renders innecesarios.
- Tests:
  - Usa Vitest para cubrir lógica de audio-chunker, session-utils, storage y stores de Zustand.

**OUTPUT FASE 4:**
- Diffs y descripción de refactors y tests agregados.

---

## FASE 5 – VISUALIZACIONES AVANZADAS: MAPAS MENTALES, CHARTS, MARKDOWN, 3D

**Agente "visualizaciones":**
- **mind-map-canvas.tsx (React Flow):**
  - Chequea UX de creación/edición de nodos, zoom, pan y selección.
  - Corrige bugs en interacciones (drag, soltar, colisiones).
- **Recharts:**
  - Verifica que los gráficos sean legibles, responsivos y accesibles.
- **Markdown + KaTeX:**
  - Verifica que las fórmulas, tablas y code blocks no rompan el layout ni la accesibilidad.
- **Three.js / React Three Fiber:**
  - Revisa escenas 3D (si están en components/ o domains/):
    - Performance básico (no renders innecesarios).
    - Limpieza de recursos en unmount.

**OUTPUT FASE 5:**
- Lista de mejoras y bugs corregidos + diffs.

---

## FASE 6 – GSAP, ANIMACIONES Y MICROINTERACCIONES

**Agente "animaciones":**
- Busca en todo frontend/:
  - Uso de GSAP y React Three Fiber con animaciones.
  - Duplicación de timelines/lógica de animación.
- Cambios:
  - Unifica lógica de GSAP repetida en hooks/helpers reutilizables.
  - Ajusta animaciones que:
    - Sean muy bruscas.
    - Generen lag o reflows innecesarios.
    - Entorpezcan la UX.
  - Añade pequeñas mejoras de microinteracción SOLO donde aporten claridad al usuario.

**OUTPUT FASE 6:**
- Diffs con animaciones ajustadas o centralizadas.
- Explicación corta de la intención de cada cambio.

---

## FASE 7 – TESTING E2E (PLAYWRIGHT) Y VALIDACIÓN FINAL

**Agente "tester E2E" + "UI/UX":**
- Revisa carpeta **e2e/**:
  - Identifica qué flujos ya están cubiertos.
  - Agrega o mejora tests para flujos críticos:
    - Audio → TranscribeAudio/ProcessAudio → mostrar resultado en UI.
    - GenerateStudySession → visualización en componentes de sesión.
    - StudeChat → interacción básica de chat.
- Mejora estabilidad siguiendo buenas prácticas de Playwright para Next App Router.
- Validación final:
  - Verifica conceptualmente que Vitest y Playwright cubren los caminos principales.
  - Confirma que las pantallas clave se ven bien en distintos tamaños y son usables con teclado.

**OUTPUT FASE 7:**
- Lista de escenarios E2E con Playwright.
- Cualquier deuda técnica de testing que quede pendiente.

---

## REGLAS GENERALES:

- **Prioridad:**
  1) Que el proyecto compile y los tests (Vitest + Playwright) pasen.
  2) Corregir bugs funcionales (backend y frontend).
  3) Corregir bugs visuales y de accesibilidad.
  4) Refactors, limpieza y performance.
- No introducir nuevas dependencias salvo que:
  - Sean realmente necesarias.
  - Expliques claramente por qué.
  - Lo agrupes en cambios separados.
- No romper contratos públicos entre frontend y backend sin explicar antes el cambio y su impacto.
- Trabaja SIEMPRE en diffs pequeños y bien explicados.
- Si la intención de alguna parte no está clara (sobre todo UX/producto), formula 1–2 hipótesis y pregúntame antes de rehacer secciones grandes.

---

## OUTPUT INICIAL ESPERADO EN ESTA SESIÓN:

1) Mapa del proyecto basado en la estructura anterior.
2) Lista de áreas prioritarias y plan de ataque por agente.
3) Primeros diffs pequeños para:
   - Una Azure Function + sus tests Vitest.
   - Un componente crítico de frontend (por ejemplo, audio-recorder-widget o mind-map-canvas) con fixes funcionales y visuales.
