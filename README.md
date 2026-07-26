# Studere

**Turn class recordings into complete study packages — automatically.**

Studere transcribes your lectures and generates summaries, flashcards, quizzes, mind maps, and action items using AI. Built for university and high school students who want to study smarter after class.

→ **[Live Demo](https://studere-wn.netlify.app)** · [GitHub](https://github.com/Juanzaan/studere)

---

## What it does

Upload an audio recording, paste your notes, or drop a transcript. Studere sends it through Azure OpenAI and returns a full study package in minutes.

| Input | Output |
|-------|--------|
| Audio file (up to 2+ hours) | AI summary with headings and explanations |
| Video recording | Flashcard deck with difficulty levels |
| Pasted text or transcript | Multiple-choice quiz with explanations |
| Class notes (.txt, .md) | Mind map of key concepts |
| | Action items and exercises |
| | AI tutor (Stude) for follow-up questions |

---

## Stack

**Frontend** — Next.js 14, TypeScript (strict mode), Tailwind CSS, GSAP, React Flow, Recharts

**Backend** — Azure Functions (Node.js 18), Azure OpenAI (GPT-4o-mini + Whisper), Azure Blob Storage, FFmpeg

**Testing** — Playwright (8 E2E suites, 21 critical-flow tests), Vitest (311 unit tests, 14 suites)

**Accessibility** — WCAG AA contrast, semantic HTML (table, dl), aria roles/labels, keyboard navigation, screen reader tested

---

## Architecture highlights

- **Dual audio pipeline** — files under 10MB are transcribed client-side via base64 + Whisper; larger files are split into 5MB chunks, uploaded to Azure Blob Storage, reassembled server-side, and processed with FFmpeg before transcription. Handles 2-hour recordings without crashing the browser.

- **Automatic quality check** — after AI generation, a second pass evaluates the output (summary word count, bullet ratio, concept depth, quiz explanation length). If quality thresholds aren't met, targeted enrichment calls fix only the weak sections before the response is cached and returned.

- **Local-first** — all session data lives in localStorage. No user accounts, no database. Azure Functions handle only AI processing.

- **Unified animation system** — GSAP animations centralized in reusable hooks (`useFadeInStagger`) with configurable stagger, duration, scale, and easing. Apple/Framer-style transitions (scale 0.96→1, smooth cubic-bezier easing, 500-600ms duration). Respects `prefers-reduced-motion`.

- **Mobile-responsive** — all pages adapt to narrow viewports: sidebar hamburger drawer, stacked layouts, collapsible tables, touch-friendly targets.

- **Accessibility-first** — semantic HTML elements, WCAG AA color contrast, `aria-live` regions, `role` attributes, keyboard navigation, focus management.

- **Structured backend** — each Azure Function stays thin (CORS + validation + orchestration). Shared logic lives in `backend/shared/`: OpenAI client, cache, utils, audio pipeline, blob storage, study session config.

---

## Features

- **Dashboard** with stat cards, quick actions, filter tabs, and stagger-entry animations
- **Audio recording** (microphone) and **screen capture** directly from the browser
- **Real transcription** with Azure OpenAI Whisper (auto-chunking for large files)
- **AI generation** of Markdown summaries, key concepts, flashcards, multiple-choice quizzes, mind maps, exercises, and insights
- **Stude Chat** — contextual AI tutor per session (Azure OpenAI GPT-4.1-mini)
- **Exercise evaluation** — AI grading of text and photo responses
- **Spaced repetition** flashcards (De nuevo / Difícil / Bien / Fácil)
- **Interactive quizzes** with A/B/C/D, scoring, and explanations
- **Mind maps** with ReactFlow
- **Analytics** with study metrics, charts (bar, line, pie), and progress tracking
- **Interactive guided tour** — TutorialOverlay with spotlight, character animation, and keyboard navigation
- **Skeleton loading screens** for AI generation (2s+ operations)
- **Export** to Markdown and CSV
- **Library**, **starred sessions**, and **upcoming events**
- **Dark mode** with system preference detection
- **Full i18n** in Spanish

---

## Getting started

### Requirements

- Node.js 18+
- Azure Functions Core Tools v4
- Azure OpenAI resource (GPT-4o-mini + Whisper deployments)
- Azure Storage account (or Azurite for local emulation)

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
```
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

> `local.settings.json` is gitignored. Never commit it.

### Run

```bash
# Terminal 1
azurite --silent --location ./azurite

# Terminal 2
cd backend && func start

# Terminal 3
cd frontend && npm run dev
```

Open `http://localhost:3000`.

---

## Testing

```bash
cd frontend

# Unit tests (311 tests, 14 files)
npm run test

# E2E (all browsers)
npm run test:e2e

# E2E (Chromium only, faster)
npx playwright test --project=chromium

# Specific test file
npx playwright test critical-flows
```

**Coverage highlights:**
- **Unit:** SessionSkeleton (13), TutorialOverlay (22), SessionComposerCard (16), + storage, audio, utils
- **E2E:** Navigation, theme toggle, session CRUD, search, library filters, StudeChat, mobile, integrations, dark mode persistence, audio transcription, AI generation, flashcard flow, quiz flow, session detail

---

## Deployment

**Frontend → Vercel**

Set `NEXT_PUBLIC_BACKEND_URL` to your Azure Functions URL and connect the repo. Deploys on push to `main`.

**Backend → Azure Functions**

```bash
cd backend
func azure functionapp publish your-function-app-name
```

Required Application Settings in Azure Portal:

```
AZURE_OPENAI_ENDPOINT
AZURE_OPENAI_KEY
AZURE_OPENAI_DEPLOYMENT
AZURE_OPENAI_WHISPER_DEPLOYMENT
AZURE_STORAGE_CONNECTION_STRING
ALLOWED_ORIGIN=https://your-app.vercel.app
```

---

## Project structure

```
studere/
├── frontend/
│   ├── app/(app)/          # Routes: dashboard, library, sessions, analytics
│   ├── components/         # 32 UI components and session panels
│   ├── lib/                # API client, storage, audio pipeline, types
│   ├── src/
│   │   ├── domains/        # Domain-specific modules
│   │   ├── shared/         # Shared hooks & utilities (useAnimations, useFadeInStagger)
│   │   └── tests/          # 14 test suites, 311 unit tests
│   └── e2e/                # 8 Playwright spec files
│
└── backend/
    ├── GenerateStudySession/   # Study package generation + quality check
    ├── TranscribeAudio/        # Client-side Whisper transcription
    ├── ProcessAudio/           # Server-side FFmpeg + transcription
    ├── UploadAudioChunk/       # Chunked upload to Azure Blob Storage
    ├── StudeChat/              # AI tutor with session context
    ├── EvaluateExercise/       # Exercise grading with vision API support
    ├── HealthCheck/            # Health + cache stats endpoint
    └── shared/                 # OpenAI client, cache, utils, audio pipeline
```

---

## License

MIT © [Juan Pablo Zanolli](https://github.com/Juanzaan)
