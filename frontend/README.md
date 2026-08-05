<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/tests-311-22c55e" alt="311 unit tests" />
  <img src="https://img.shields.io/badge/E2E-21%20critical-3b82f6" alt="21 E2E tests" />
  <img src="https://img.shields.io/badge/docs-71%25-8b5cf6" alt="JSDoc 71%" />
</p>

<div align="center">
  <h1>📚 Studere — Frontend</h1>
  <p><strong>Plataforma de estudio post-clase con IA — 100 % client-side</strong></p>
  <p>
    <a href="https://studere-wn.netlify.app">🌐 Demo</a> ·
    <a href="#-funcionalidades">✨ Features</a> ·
    <a href="#-stack">🛠️ Stack</a> ·
    <a href="#-ejecutar">🚀 Ejecutar</a> ·
    <a href="#-testing">🧪 Testing</a> ·
    <a href="e2e/README.md">🎭 E2E Docs</a>
  </p>
</div>

<br/>

Studere transforma grabaciones de clases, notas y transcripciones en material de estudio interactivo usando Azure OpenAI. **Cuenta con autenticación Clerk, landing page temática 'papel añejo' con animaciones scroll-driven, y 5 herramientas de estudio: transcripción, resumen, flashcards, mapas mentales y tutor IA.**

---

## ✨ Funcionalidades

<div align="center">

| Categoría | Funcionalidades |
|:---|---|
| **🎓 Herramientas de estudio** | Resúmenes Markdown, flashcards con spaced repetition (De nuevo / Difícil / Bien / Fácil), quizzes A/B/C/D con scoring, mapas mentales interactivos, ejercicios con corrección IA |
| **🎙️ Captura de audio** | Grabación por micrófono + captura de pantalla, transcripción en tiempo real con Whisper, chunking automático para archivos de 2h+ |
| **🤖 Stude Chat** | Tutor IA contextual por sesión (GPT-4.1-mini). Soporta detección automática de consultas de gráficos (barras, líneas, torta) |
| **📊 Analytics** | Dashboard con métricas de estudio, gráficos Recharts (bar, line, pie), historial de quizzes y flashcards |
| **🎨 UI/UX** | Animaciones GSAP unificadas (`useFadeInStagger`), skeleton screens para cargas >2s, tour interactivo con spotlight y personaje animado |
| **📱 Responsive** | Sidebar hamburguesa en mobile, layouts apilados, tablas colapsables, targets táctiles de 44px+ |
| **♿ Accesibilidad** | WCAG AA, `<dl>` semántico, roles ARIA, `aria-live`, SkipLinks, focus trap, navegación por teclado |
| **🌐 i18n** | Español completo |
| **📦 Exportación** | Markdown y CSV |

</div>

---

## 🏠 Landing Page

La landing page utiliza una **paleta temática 'papel añejo'** con tonos cálidos (\`#C9B99A\`, \`#D8C9AD\`, \`#2C1810\`) y tipografía serif (Fraunces + Space Mono).

- **Scroll storytelling** — 5 herramientas que aparecen como papeles sobre un escritorio, cada una con entrada animada (scale + translate3d + rotate)
- **Elementos decorativos** — cinta washi, clips metálicos, esquinas dobladas, sombras de papel
- **Auth pages** — sign-in/sign-up con Clerk usando la misma paleta
- **Hero animado** — waveform de transcripción + flashcard preview con stack shadows
- **Stats animados** — contadores con IntersectionObserver
- **Testimonios** — sticky notes estilo papel con estrellas

---

## 🛠️ Stack

| Capa | Tecnología |
|:---|---:|
| **Framework** | Next.js 14 (App Router), TypeScript strict |
| **Estilos** | Tailwind CSS 3.4, CSS custom properties (`--c-primary`, `--c-surface`, etc.) |
| **Animaciones** | GSAP 3.14 + `@gsap/react` |
| **Gráficos** | Recharts 3.8 (dashboard), React Flow / xyflow 12 (mind maps) |
| **Visualización** | KaTeX (fórmulas matemáticas), react-markdown + remark-math + rehype-katex |
| **Iconos** | Lucide React 0.408 |
| **3D** | Three.js, @react-three/fiber, @react-three/drei (illustration scenes) |
| **Testing unitario** | Vitest 4.1 + @testing-library/react + happy-dom + MSW |
| **Testing E2E** | Playwright 1.58 + @axe-core/playwright (a11y) |
| **Auth** | Clerk (Google OAuth, email, Sesiones protegidas) |
| **Backend** | Azure Functions (Node.js 18) — solo para procesamiento IA |

---

## 📁 Componentes principales

```
components/
├── session-detail.tsx           # Vista de sesión (7 paneles con drag-resize)
├── session-composer-card.tsx    # Composer con 5 modos (audio/text/AI/screen/exercise)
├── session-panels/              # SummaryPanel, NotesPanel, InsightsPanel, Flashcards, Quiz, MindMap, Chat
├── dashboard-home.tsx           # Hero, stat cards, quick actions, tabla de sesiones
├── analytics-dashboard.tsx      # 5 charts with stagger animation
├── sidebar.tsx                  # Desktop collapsible + mobile drawer
├── app-topbar.tsx               # Search (Ctrl+K), theme toggle, Stude badge, profile
├── tutorial-overlay.tsx         # Tour interactivo (spotlight, teclado, persistencia)
├── flashcard-viewer.tsx         # Spaced repetition con 4 niveles de confianza
├── quiz-viewer.tsx              # A/B/C/D con feedback instantáneo
├── mind-map-graph.tsx             # Mind map con ECharts (theme-aware)
├── stude-chat-popup.tsx           # Chat con focus trap, drag/resize, chart detection
├── audio-recorder-widget.tsx      # Grabación con visualización y chunking
├── session-skeleton.tsx           # Skeleton para estados transcribing/generating
├── empty-state.tsx                # GSAP particles + bounce icon
├── toast.tsx / toast-provider.tsx # Sistema de notificaciones slide-in
├── confirmation-dialog.tsx        # Modal de confirmación reutilizable
├── error-boundary.tsx             # React error boundary con themed fallback
├── skip-links.tsx                 # Skip-to-content para teclado
├── md-renderer.tsx                # Markdown con LaTeX, syntax highlight, tablas
├── stude-chart-window.tsx         # Ventana de gráficos desde el chat
├── session-records-table.tsx      # Tabla responsive con columnas colapsables
├── not-found-scene.tsx            # Ilustración 404
└── illustration-scene.tsx         # Escenas decorativas con GSAP
```

---

## 🧪 Testing

```bash
# Unit tests (311 tests, 14 suites)
npm test

# UI interactivo
npm run test:ui

# Coverage
npm run test:coverage

# E2E (ver frontend/e2e/README.md)
npm run test:e2e
```

### Suites unitarias

| Suite | Tests | Cobertura |
|:---|---:|:---|
| `session-skeleton.test.tsx` | 13 | transcribing, generating, children slots |
| `tutorial-overlay.test.tsx` | 22 | keyboard, blocking, persistencia |
| `session-composer-card.test.tsx` | 16 | idle/generating/transcribing, submit IA |
| storage tests | — | CRUD, normalización, eventos |
| audio tests | — | validación, chunking, formatos |
| utils tests | — | session-utils, normalizers, analytics |

### Cobertura de documentación

```bash
node scripts/doc-coverage.mjs      # Tabla completa
node scripts/doc-coverage.mjs -m   # Solo archivos <100%
node scripts/doc-coverage.mjs -j   # JSON
```

---

## 🚀 Ejecutar

```bash
cd frontend
npm install
npm run dev
```

Abierto en **http://localhost:3000** · Backend esperado en **http://localhost:7071**

### Variables de entorno

```env
# frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:7071
```

---

## 📦 Scripts disponibles

| Comando | Descripción |
|:---|---|
| `npm run dev` | Dev server con HMR |
| `npm run build` | Producción build |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Unit tests (Vitest) |
| `npm run test:ui` | Vitest UI dashboard |
| `npm run test:coverage` | Reporte de cobertura |
| `npm run test:e2e` | Playwright E2E |

---

## 📐 Convenciones

Ver [CODING_STANDARDS.md](../CODING_STANDARDS.md) para:

- Reglas de componentes y naming
- Animation standards (`useFadeInStagger`, eased transitions)
- Accessibility standards (10 reglas obligatorias)
- Mobile responsiveness (breakpoints, reglas)
- JSDoc requirements

---

## 📄 Licencia

**Software propietario — todos los derechos reservados.** Parte del monorepo [Studere](https://github.com/Juanzaan/studere). Uso comercial, redistribución o reutilización en otras aplicaciones está estrictamente prohibido. Ver [LICENSE](../LICENSE).
