<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/GSAP-3.14-88CE02?logo=greensock&logoColor=white" alt="GSAP" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
  <img src="https://img.shields.io/badge/tests-311%20unit%20%2B%2021%20E2E-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/a11y-WCAG%20AA-success" alt="WCAG AA" />
</p>

<div align="center">
  <h1>📚 Studere</h1>
  <p><strong>Turn class recordings into complete study packages — automatically.</strong></p>
  <p>
    <a href="https://studere-wn.netlify.app">🌐 Live Demo</a> ·
    <a href="https://github.com/Juanzaan/studere">📦 GitHub</a> ·
    <a href="CHANGELOG.md">📋 Changelog</a> ·
    <a href="CODING_STANDARDS.md">📐 Coding Standards</a>
  </p>
</div>

<br/>

Studere transcribes your lectures and generates summaries, flashcards, quizzes, mind maps, and action items using AI — **all client-side, no account required.**

---

## 📑 Table of Contents

- [What it does](#-what-it-does)
- [Features at a glance](#-features-at-a-glance)
- [Stack](#-stack)
- [Architecture highlights](#-architecture-highlights)
- [Getting started](#-getting-started)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Project structure](#-project-structure)
- [Performance](#-performance)
- [Browser support](#-browser-support)
- [License](#-license)

---

## 🎯 What it does

Upload an audio recording, paste your notes, or drop a transcript. Studere sends it through Azure OpenAI and returns a full study package in minutes.

| Input | Output |
|-------|--------|
| 🎤 Audio file (up to 2+ hours) | 📝 AI summary with headings and explanations |
| 🎬 Video recording | 🃏 Flashcard deck with spaced repetition |
| 📋 Pasted text or transcript | ✍️ Multiple-choice quiz with explanations |
| 📄 Class notes (.txt, .md) | 🧠 Mind map of key concepts |
| 📸 Photo of whiteboard/exercise | ✅ Action items, exercises, and AI grading |
| | 🤖 Stude — AI tutor for follow-up questions |

---

## ✨ Features at a glance

<div align="center">

| Category | Features |
|:---|---|
| **🎓 Study Tools** | AI summaries, flashcards (spaced repetition), quizzes, mind maps, exercises — all auto-generated |
| **🎙️ Audio Pipeline** | Real-time transcription, auto-chunking for 2h+ recordings, screen capture |
| **🤖 AI Assistant** | Stude Chat (contextual tutor), exercise evaluation with vision API, quality-enforced generation |
| **📊 Analytics** | Study metrics, Recharts visualizations (bar, line, pie), quiz/flashcard progress tracking |
| **🎨 UI/UX** | GSAP stagger animations, dark/light mode, skeleton loading, interactive guided tour |
| **📱 Responsive** | Mobile hamburger sidebar, stacked layouts, collapsible tables, touch-friendly targets |
| **♿ Accessibility** | WCAG AA contrast, semantic `<dl>`/`<table>`/`<nav>`, ARIA roles, keyboard nav, screen reader tested |
| **🌍 i18n** | Full Spanish localization |
| **📦 Export** | Markdown and CSV export for all study materials |

</div>

---

## 🛠️ Stack

<div align="center">

| Layer | Technology |
|:---|---:|
| **Frontend** | Next.js 14 (App Router), TypeScript (strict), Tailwind CSS 3.4, GSAP 3.14, React Flow (xyflow), Recharts, Lucide Icons, KaTeX |
| **Backend** | Azure Functions (Node.js 18), Azure OpenAI (GPT-4o-mini + GPT-4.1-mini + Whisper), Azure Blob Storage, FFmpeg |
| **Testing** | Vitest (311 unit tests, 14 suites), Playwright (8 E2E specs, 21 critical-flow tests), axe-core (a11y) |
| **Dev tools** | MSW (API mocking), happy-dom, Vite, PostCSS |

</div>

---

## 🏗️ Architecture highlights

### Dual audio pipeline

Files **under 10 MB** are transcribed client-side via base64 + Whisper. Larger files are split into 5 MB chunks, uploaded to Azure Blob Storage, reassembled server-side, and processed with FFmpeg before transcription. Handles 2‑hour recordings without crashing the browser.

### Automatic quality enforcement

After AI generation, a second pass evaluates the output (summary word count, bullet ratio, concept depth, quiz explanation length). If thresholds aren't met, targeted enrichment calls fix only the weak sections before the response is cached.

### Local-first architecture

All session data lives in **localStorage** — no user accounts, no database. Azure Functions handle only AI processing. The app works entirely offline once the AI response is cached.

### Animation system

GSAP animations are centralized in reusable hooks (`useFadeInStagger`) with configurable stagger, duration, scale, and easing. Apple/Framer-style transitions (scale `0.96 → 1`, cubic-bezier easing, 500–600 ms). Respects `prefers-reduced-motion`.

### Accessibility architecture

- Semantic HTML: `<dl>` for stat cards, `<table>` for session lists, `<nav>` for sidebar
- `aria-live` regions, `role` attributes, `aria-label` on all interactive elements
- Focus management: `SkipLinks` component, focus trap in modals, keyboard navigation in tour
- WCAG AA color contrast verified across light/dark modes

---

## 🚀 Getting started

### Prerequisites

| Tool | Version | Purpose |
|:---|---:|:---|
| Node.js | ≥18 | Runtime |
| Azure Functions Core Tools | v4 | Local backend emulation |
| Azure OpenAI | GPT-4o-mini + Whisper | AI generation |
| Azure Storage / Azurite | — | Blob storage emulation |

### Install

```bash
git clone https://github.com/Juanzaan/studere.git
cd studere

# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install
```

### Configure

**`frontend/.env.local`**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:7071
```

**`backend/local.settings.json`**
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_OPENAI_ENDPOINT": "https://your-resource.openai.azure.com/",
    "AZURE_OPENAI_KEY": "your-key",
    "AZURE_OPENAI_DEPLOYMENT": "gpt-4o-mini",
    "AZURE_OPENAI_WHISPER_DEPLOYMENT": "whisper",
    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "ALLOWED_ORIGIN": "*"
  }
}
```

> ⚠️ `local.settings.json` is gitignored. Never commit it.

### Run locally

```bash
# Terminal 1 — Storage emulator
azurite --silent --location ./azurite

# Terminal 2 — Backend
cd backend && func start

# Terminal 3 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:3000** 🎉

---

## 🧪 Testing

```bash
cd frontend

# Unit tests (311 tests, 14 suites)
npm test

# Coverage report
npm run test:coverage

# E2E (all browsers)
npm run test:e2e

# E2E (Chromium only, faster)
npx playwright test --project=chromium

# Specific test
npx playwright test critical-flows
```

### Coverage areas

| Type | Scope |
|:---|---:|
| **Unit** | SessionSkeleton (13), TutorialOverlay (22), SessionComposerCard (16), storage, audio, API mocking, utils, normalizers |
| **E2E** | Navigation, theme toggle, session CRUD, search, library filters, StudeChat, mobile, integrations, dark mode persistence, audio transcription, AI generation, flashcard/quiz flow, session detail |

---

## 📦 Deployment

### Frontend → Vercel

Set `NEXT_PUBLIC_BACKEND_URL` to your Azure Functions URL and connect the repo. Deploys on push to `main`.

```bash
# Or manually:
cd frontend
npx vercel --prod
```

### Backend → Azure Functions

```bash
cd backend
func azure functionapp publish your-function-app-name
```

Required **Application Settings** in Azure Portal:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_WHISPER_DEPLOYMENT=whisper
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=...
ALLOWED_ORIGIN=https://your-app.vercel.app
```

---

## 📁 Project structure

```
studere/
├── frontend/                        # Next.js 14 app
│   ├── app/(app)/                   # App Router pages
│   │   ├── dashboard/               # Home, stats, quick actions
│   │   ├── library/                 # All sessions with filters
│   │   ├── starred/                 # Bookmarked sessions
│   │   ├── upcoming/               # Calendar / planned events
│   │   ├── sessions/[id]/          # Session detail (7 panels)
│   │   ├── analytics/              # Charts & study metrics
│   │   └── integrations/           # External service cards
│   ├── components/                  # 32 React components
│   │   ├── session-panels/         # Summary, Notes, Insights, MindMap, etc.
│   │   ├── dashboard-home.tsx      # Dashboard shell
│   │   ├── tutorial-overlay.tsx    # Guided tour (18 JSDoc blocks)
│   │   └── ...                     # Skeleton, Toast, Modals, etc.
│   ├── lib/                         # 19 modules (API, storage, types, audio)
│   ├── src/
│   │   ├── domains/                # Domain-specific modules
│   │   ├── shared/                 # Hooks: useAnimations, useFadeInStagger
│   │   └── tests/                  # 14 Vitest suites (311 tests)
│   ├── e2e/                        # 8 Playwright specs (21 tests)
│   └── scripts/                    # Doc-coverage script
│
└── backend/                         # Azure Functions (Node.js 18)
    ├── GenerateStudySession/        # Study package + quality check
    ├── TranscribeAudio/             # Client-side Whisper proxy
    ├── ProcessAudio/                # Server-side FFmpeg + transcription
    ├── UploadAudioChunk/            # Chunked upload to Blob Storage
    ├── StudeChat/                   # AI tutor with session context
    ├── EvaluateExercise/            # Exercise grading (vision API)
    ├── HealthCheck/                 # Health + cache stats
    └── shared/                      # OpenAI client, cache, utils, audio pipeline
```

---

## 📊 Performance

| Metric | Value |
|:---|---:|
| JavaScript bundle (gzip) | ~890 KB |
| Unit tests | 311 passing (14 suites) |
| E2E tests | 21 passing (8 specs) |
| JSDoc coverage | 71% (269 blocks, 62 files) |
| Accessibility | WCAG AA (verified) |

---

## 🌐 Browser support

| Browser | Support |
|:---|---:|
| Chrome / Edge | ✅ Fully tested (Playwright) |
| Firefox | ✅ Fully tested |
| Safari | ✅ Manual testing |
| Mobile Chrome/Safari | ✅ Responsive design verified |

---

## 🤝 Contributing

1. Read [CODING_STANDARDS.md](CODING_STANDARDS.md) for conventions
2. Check [CHANGELOG.md](CHANGELOG.md) for recent changes
3. Run `npm test` and `npx playwright test --project=chromium` before opening a PR
4. Ensure JSDoc coverage for new exports (`node scripts/doc-coverage.mjs`)
5. Verify a11y: keyboard navigation, contrast, `aria-label` on interactive elements

---

## 📄 License

MIT © [Juan Pablo Zanolli](https://github.com/Juanzaan)

<p align="center">
  <sub>Built with ❤️ for students who want to study smarter.</sub>
</p>
