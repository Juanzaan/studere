# Studere — Coding Standards & Architecture Guide

**Project:** Studere - AI-Powered Study Assistant  
**Updated:** 2026-07-03  
**Maintainer:** [@Juanzaan](https://github.com/Juanzaan)

---

## 1. PROJECT OVERVIEW

**Studere** is an educational platform that transforms class recordings and notes into interactive study materials using AI. Students can:
- Upload audio/video recordings or paste text/URLs
- Get automatic transcription (Azure OpenAI Whisper)
- Generate comprehensive study packages: summaries, flashcards, quizzes, mind maps, action items
- Chat with an AI tutor (Stude) for contextual help
- Practice with exercises and get AI-powered feedback
- Export materials to PDF/Markdown/CSV

**Target users:** University and high-school students reviewing post-class content.

**Current state:** Production-ready MVP with optimizations completed.

---

## 2. TECH STACK

### Frontend
- **Framework:** Next.js 14.2.5 (App Router)
- **Language:** TypeScript 5.5.4 (strict mode)
- **UI:** React 18.3.1, TailwindCSS 3.4.7
- **Animations:** GSAP 3.14.2
- **Visualizations:** React Flow, Recharts, KaTeX
- **Testing:** Vitest, Playwright (39 E2E tests)

### Backend
- **Runtime:** Node.js 18 LTS
- **Platform:** Azure Functions v4
- **AI Services:** Azure OpenAI (GPT-4o-mini + Whisper)
- **Caching:** node-cache 5.1.2
- **Storage:** Azure Blob Storage

### Infrastructure
- **Frontend Deploy:** Vercel
- **Backend Deploy:** Azure Functions
- **Monitoring:** Application Insights

---

## 3. CODING CONVENTIONS

### Naming
- **Files:** kebab-case (`session-detail.tsx`)
- **Components:** PascalCase (`SessionDetail`)
- **Functions/Variables:** camelCase (`transcribeAudio`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_AUDIO_SIZE_MB`)
- **Types:** PascalCase (`StudySession`)

### Frontend Structure
```
frontend/
├── app/                  # Next.js routes
├── components/           # React components (~30)
├── lib/                  # Utilities, API, storage
├── src/
│   ├── domains/         # Domain-specific modules
│   ├── shared/          # Shared hooks & utilities
│   └── tests/           # Test suites
└── e2e/                 # Playwright tests
```

### Backend Structure
```
backend/
├── GenerateStudySession/    # Study package generation
├── TranscribeAudio/         # Whisper transcription
├── ProcessAudio/            # Server-side audio processing
├── StudeChat/               # AI chat endpoint
├── EvaluateExercise/        # Exercise grading
├── HealthCheck/             # Monitoring
└── shared/                  # Shared modules
```

---

## 4. ARCHITECTURE PATTERNS

### Frontend-Backend Communication
- **Protocol:** REST API over HTTPS
- **Format:** JSON request/response
- **Base URL:** `NEXT_PUBLIC_BACKEND_URL` env var
- **Error Handling:** Consistent `{ error: string }` format
- **Caching:** Backend uses node-cache (TTL: 1-24 hours)

### Audio Processing Pipeline
- **Client-Side (<10MB):** Web Audio API → base64 chunks → Whisper
- **Server-Side (>10MB):** Binary upload → FFmpeg → Parallel Whisper
- **Max file:** 200MB (~2-3 hours)

### State Management
- **Storage:** localStorage (lib/storage.ts)
- **No user auth** — single-user local-first app
- **Emit SESSIONS_UPDATED_EVENT** after storage changes

### AI Integration
- **Provider:** Azure OpenAI Service
- **Models:** GPT-4o-mini (generation, chat), Whisper (transcription)
- **Caching:** Response caching with SHA-256 keys
- **Timeouts:** 90s for generation, 5min for transcription

---

## 5. KEY RULES

### ALWAYS DO
1. Read before editing — understand context first
2. Preserve existing patterns — match surrounding code style
3. Use existing utilities — check `lib/`, `shared/` before creating new helpers
4. Test critical paths — audio, AI generation, storage
5. Update types — modify `lib/types.ts` when changing data structures
6. Handle SSR — check `typeof window !== "undefined"`
7. Validate inputs — Joi backend, TypeScript frontend
8. Log errors — `structuredLog()` backend, `console.error()` frontend
9. Cache AI responses — use `cache.get()/set()`
10. Respect limits — Audio 200MB max, Transcript 200k chars

### NEVER DO
1. Don't break API contracts — frontend expects specific response shapes
2. Don't add dependencies without asking — packages are optimized
3. Don't remove error handling — all API calls must have try-catch
4. Don't disable strict mode — keep `strict: true`
5. Don't hardcode API keys — use environment variables
6. Don't break dark mode — test both light/dark
7. Don't repeat logic — search before creating new utilities
8. Don't use module-level mutable singletons — use React state/refs
9. Don't write localStorage without quota handling — use `canUseStorage()`
10. Don't use decodeAudioData() for routing — check size/duration first

---

## 6. DESIGN SYSTEM

### Typography Scale
- **10px** — labels, badges, timestamps
- **11px** — secondary text, table cells
- **12px** — body, nav items
- **13px** — primary body text
- **14px** — card titles, headers
- **16px** — page titles
- **22px** — hero headings

### Spacing
Use only: 4, 8, 10, 12, 14, 16, 20, 24px

### Border Radius
- **6px** — buttons/badges
- **8px** — inputs/items
- **10px** — cards
- **12px** — panels
- **20px** — pills

### Colors
Use CSS variables (defined in globals.css):
- `--color-bg`, `--color-surface`, `--color-text`
- `--color-blue` (primary), `--color-teal` (success)
- `--color-violet` (secondary), `--color-amber` (warnings)

---

## 7. PERFORMANCE TARGETS

| Metric | Current | Target |
|--------|---------|--------|
| Bundle size | 890 KB | <1 MB |
| First Contentful Paint | 1.4s | <2s |
| Backend latency | 2s | <3s |
| Error rate | 0.5% | <1% |

---

## 8. TESTING

### E2E Coverage (Playwright)
- Audio transcription flow
- AI generation flow
- Quiz interaction
- Flashcard spaced repetition
- Library & search
- Session detail views

**Target:** 90%+ critical flow coverage

### Unit Tests (Vitest)
- Utilities & pure functions
- API interactions (with MSW mocks)
- Storage operations

---

## 9. DEPLOYMENT

### Frontend (Vercel)
```bash
# Auto-deploys on push to main
# Set NEXT_PUBLIC_BACKEND_URL env var
```

### Backend (Azure Functions)
```bash
cd backend
func azure functionapp publish your-function-app-name
```

**Required Application Settings:**
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_KEY`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_WHISPER_DEPLOYMENT`
- `AZURE_STORAGE_CONNECTION_STRING`
- `ALLOWED_ORIGIN`

---

## 10. CURRENT STATUS

### ✅ Complete
- Audio/video transcription (dual pipeline)
- AI study session generation
- Interactive quiz & flashcards
- Mind map editor
- Contextual AI chat (Stude)
- Exercise evaluation with AI feedback
- Export to PDF/Markdown/CSV
- Dark mode
- LocalStorage persistence
- 39 E2E tests passing

### Known Issues
None — all critical issues resolved.

### Planned (Long-term)
- Authentication & cloud sync
- Mobile app
- Live class integration
- URL transcription

---

## 11. GETTING HELP

**Architecture questions?** → See section 4  
**Code style?** → See section 3  
**Performance issues?** → Check section 7  
**Testing?** → See section 8  
**Deployment?** → See section 9

---

## 12. QUICK START FOR DEVELOPERS

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && npm install && func start

# Tests
cd frontend && npm run test:e2e

# TypeScript check
npm run typecheck
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:7071`

---

**Last Updated:** 2026-07-03  
**License:** MIT © [Juan Pablo Zanolli](https://github.com/Juanzaan)
