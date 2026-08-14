# Studere — Coding Standards & Architecture Guide

**Project:** Studere - AI-Powered Study Assistant  
**Updated:** 2026-08-11  
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

**Current state:** Production-ready MVP with accessibility audit completed, mobile responsiveness, and comprehensive test suite.

---

## 2. TECH STACK

### Frontend
- **Framework:** Next.js 14.2.5 (App Router)
- **Language:** TypeScript 5.5.4 (strict mode)
- **UI:** React 18.3.1, TailwindCSS 3.4.7
- **Animations:** GSAP 3.14.2
- **Visualizations:** ECharts 6.1 (mind map), Recharts 3.8, KaTeX
- **Testing:** Vitest (369 tests, 17 suites), Playwright (9 E2E specs)

### Backend
- **Runtime:** Node.js 18 LTS
- **Platform:** Azure Functions v4
- **AI Services:** Azure OpenAI (GPT-4o-mini + Whisper)
- **Caching:** node-cache 5.1.2
- **Storage:** Azure Blob Storage

### Infrastructure
- **Frontend Deploy:** Netlify (`frontend/netlify.toml`, Node 20)
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
├── components/           # React components
├── lib/                  # Utilities, API, storage
├── src/
│   ├── domains/         # Domain-specific modules
│   ├── shared/          # Shared hooks & utilities (useAnimations, useFadeInStagger)
│   └── tests/           # 17 test files, 369 tests
└── e2e/                 # 9 Playwright spec files
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
- **Client-Side (≤25MB):** audio → Whisper transcription endpoint (capped at 25 MB)
- **Server-Side (>25MB):** 10 MB chunks to Blob Storage → FFmpeg split → parallel Whisper
- **Max file:** 200MB (~2-3 hours)

### State Management
- **Storage:** localStorage (lib/storage.ts)
- **Auth:** Clerk (custom UI in components/auth/, sign-in/sign-up public routes; backend verifies with `Clerk.verifyToken(token, { secretKey })`)
- **Emit SESSIONS_UPDATED_EVENT / INTEGRATIONS_UPDATED_EVENT** after storage changes

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
11. **Use CSS variables** — never hardcode colors (use `--c-text`, `--c-bg`, `--c-surface`, etc.)
12. **Check contrast** — all new color combinations must pass WCAG AA (≥4.5:1 for text, ≥3:1 for large text)
13. **Add aria-labels** — every interactive element without visible text needs `aria-label`
14. **Test mobile first** — check 375px viewport before implementing desktop layout
15. **Wrap `useFadeInStagger`** — use the shared hook for component entry animations

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
11. Don't hardcode colors — use CSS variables from globals.css
12. Don't skip mobile breakpoints — all layouts must work at 375px
13. Don't ignore `prefers-reduced-motion` — wrap GSAP animations with `!prefersReducedMotion`
14. Don't use `<div>` for tabular data — use semantic `<table>` with `<th>`/`<td>`

---

## 6. DESIGN SYSTEM

### Colors
Use CSS variables (defined in `globals.css`):
- `--c-bg`, `--c-surface`, `--c-surface-2`, `--c-text`, `--c-muted`
- `--c-blue` (primary), `--c-teal` (success), `--c-violet` (secondary), `--c-amber` (warnings)
- `--c-red`, `--c-green`, `--c-border`, `--c-ring`

All combinations pass WCAG AA (≥4.5:1) in both light and dark modes.

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

---

## 7. ANIMATION STANDARDS

### Shared Hook: `useFadeInStagger`
All component entry animations should use `useFadeInStagger` from `src/shared/hooks/useAnimations.ts`:

```typescript
const { scope, enter } = useFadeInStagger({
  stagger: 0.08,          // delay between each element (seconds)
  duration: 0.5,          // animation duration (seconds)
  scale: 0.96,            // initial scale (0.96→1 for Apple-style feel)
  ease: "power2.out"      // easing function
  // OR use the custom cubic-bezier for smoother feel:
  // ease: "cubic-bezier(0.22, 1, 0.36, 1)"
});
```

- Always respect `prefers-reduced-motion` (hook handles this automatically)
- Duration: 500-600ms for fluid feel (not the default 300ms)
- Scale: 0.95-0.96 → 1 combined with fade for "zoom-in" sensation

---

## 8. ACCESSIBILITY STANDARDS

### Mandatory for every component
1. **Semantic HTML** — use `<nav>`, `<main>`, `<aside>`, `<button>`, `<table>`, `<dl>`, etc.
2. **Color contrast** — all text/background combos ≥4.5:1 (AA)
3. **ARIA labels** — `aria-label` on all icon-only buttons
4. **Focus indicators** — visible focus rings (Tailwind's `focus-visible:ring-2`)
5. **Keyboard navigation** — all interactive elements reachable by Tab
6. `aria-pressed` — toggle buttons (filters, theme) must indicate state
7. `aria-live` — dynamic content regions (chat messages, loading states)
8. `role="progressbar"` — progress indicators with `aria-valuenow/min/max`
9. `role="img" + aria-label` — chart containers (Recharts)
10. `prefers-reduced-motion` — all GSAP animations must respect this

### Testing a11y
- Run `npx playwright test accessibility-audit --project=chromium`
- Verify keyboard nav: Tab through all interactive elements
- Check contrast with browser DevTools

---

## 9. PERFORMANCE TARGETS

| Metric | Current | Target |
|--------|---------|--------|
| Bundle size | <1 MB | <1 MB |
| First Contentful Paint | 1.4s | <2s |
| Backend latency | 2s | <3s |
| Error rate | 0.5% | <1% |

---

## 10. TESTING

### Unit Tests (Vitest — 369 tests, 17 files)
- **SessionSkeleton:** 13 tests — render modes (transcribing/generating/idle), a11y, responsive, progress phases
- **TutorialOverlay:** 22 tests — keyboard nav, blocking, aria-modal, mobile, aria-live, persistence
- **SessionComposerCard:** 16 tests — form validation, AI toggle, submit flows, error handling, callbacks
- **Integrations:** 18 tests — connect/disconnect, persistence, SSR without storage
- **Storage:** localStorage quota, read/write, error recovery
- **Audio chunker:** Chunk size, format, edge cases
- **Session normalizer:** Data transformation, version migration, field defaults
- **API client:** Request building, error handling, timeout
- **Local storage guard:** Quota detection, safe fallbacks

### E2E Tests (Playwright — 9 spec files)
- **Critical flows (92 tests across Chromium):** Navigation, theme toggle, session table, library filters, session detail panels, StudeChat, mobile hamburger, search, integrations, upcoming, dark persistence
- **Audio transcription flow**
- **AI generation flow**
- **Flashcard spaced repetition**
- **Quiz interaction**
- **Session detail views**
- **Session CRUD flow**

**Target:** 90%+ critical flow coverage

---

## 11. MOBILE RESPONSIVENESS

### Breakpoints
- **375px** — minimum supported (iPhone SE)
- **640px** — sm (large phones)
- **768px** — md (tablets)
- **1024px** — lg (desktop)

### Rules
- Sidebar collapses to hamburger drawer below 768px
- Session table converts to horizontal scroll on <768px
- Analytics charts stack vertically on mobile
- Topbar collapses to compact layout (icon + title)
- All touch targets ≥44x44px
- Tutorial overlay uses `mobileTarget`/`mobilePlacement` overrides

---

## 12. DEPLOYMENT

### Frontend (Netlify)
```bash
# Auto-deploys on push to main (netlify.toml uses Node 20)
# Set NEXT_PUBLIC_BACKEND_URL env var in the site settings
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
- `CLERK_SECRET_KEY` (fail-closed auth; unset means unauthenticated requests are served)

---

## 13. CURRENT STATUS

### ✅ Complete
- Audio/video transcription (dual pipeline)
- AI study session generation with quality check
- Interactive quiz & flashcards with spaced repetition
- Mind map editor
- Contextual AI chat (Stude)
- Exercise evaluation with AI feedback
- Export to PDF/Markdown/CSV
- Dark mode with system preference
- localStorage persistence with quota handling
- **Unified GSAP animation system** (Phases 1-5)
- **Interactive tutorial overlay** with spotlight + keyboard
- **Skeleton loading screens** for AI generation
- **Mobile-responsive layout** across all pages
- **Accessibility audit** — WCAG AA contrast, semantic HTML, ARIA roles/attributes
- **Color contrast WCAG AA** — all text/background combinations pass ≥4.5:1
- **369 unit tests + 92 E2E tests per browser (9 specs)** passing

### Known Issues
None — all critical issues resolved.

### Planned (Long-term)
- Cloud sync (sessions across devices)
- Real OAuth integrations (Google Calendar, Outlook, ...) — framework shipped, connections pending owner keys
- Mobile app (React Native)
- Live class integration
- URL transcription
- Additional i18n languages

---

## 14. GETTING HELP

**Architecture questions?** → See section 4  
**Code style?** → See section 3  
**Animation standards?** → See section 7  
**Accessibility?** → See section 8  
**Performance issues?** → Check section 9  
**Testing?** → See section 10  
**Mobile?** → See section 11  
**Deployment?** → See section 12

---

## 15. QUICK START FOR DEVELOPERS

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && npm install && func start

# Unit tests
cd frontend && npm run test

# E2E tests
cd frontend && npm run test:e2e

# TypeScript check
cd frontend && npx tsc --noEmit
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:7071`

---

**Last Updated:** 2026-08-11  
**License:** Proprietary © [Juan Pablo Zanolli](https://github.com/Juanzaan)
