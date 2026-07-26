# Changelog

All notable changes to the Studere project will be documented in this file.

## [1.1.0] - 2026-07-25

### Added
- **Accessibility audit (Phase 1):** 11 components fixed — semantic `<table>` for session records, `role="img"` + `aria-label` on all Recharts charts, `role="progressbar"` on flashcards/quiz/dashboard progress, `aria-live="polite"` in StudeChat, `aria-pressed` on filter buttons, `aria-label` on sidebar landmark, `role="timer"` in audio recorder, `aria-label` on library search input, MindMap zoom controls, Upcoming calendar links, Topbar buttons
- **Semantic stat cards:** Dashboard and Analytics stat cards converted to `<dl>` / `<dt>` / `<dd>` for screen reader compatibility
- **CSS variable migration:** ErrorBoundary and SkipLinks migrated from hardcoded slate/violet colors to CSS variables (`--c-bg`, `--c-surface`, `--c-text`, `--c-blue`)
- **WCAG AA color contrast:** Fixed 5 failing combinations — muted text on light bg (4.44→4.63:1), teal on white (3.74→4.51:1), amber on white (3.19→4.50:1), white-on-blue button in dark mode (3.71→4.64:1), skeleton checkmark white-on-teal (1.89→4.5:1)
- **Skeleton screens:** `SessionSkeleton` component for AI generation loading states (transcribing/generating/idle phases)
- **Mobile responsiveness:**
  - Sidebar hamburger menu with drawer overlay for narrow viewports
  - Topbar layout stack with compact title and touch targets
  - Library session table: column collapse → card layout on mobile, horizontal scroll for wide tables
  - Analytics charts: stack vertically on mobile, smaller header typography
  - Upcoming page: calendar buttons stack below events
- **E2E critical flow tests:** 21 tests across 11 flows — navigation, theme toggle, session table, library filters, session detail panels, StudeChat, mobile hamburger, search, integrations, upcoming, dark mode persistence
- **Unit tests:**
  - `SessionSkeleton`: 13 tests covering render modes (transcribing/generating/idle), accessibility, responsive, progress phases
  - `TutorialOverlay`: 22 tests covering keyboard navigation (ArrowRight/Left/Escape), blocking vs click-through behavior, `aria-modal` toggles, mobile target overrides, `aria-live` announcements, `TutorialTrigger` reset, center step defaults
  - `SessionComposerCard`: 16 tests covering idle render, form validation, AI toggle, submit without/with AI, transcribe→generate flow, error handling (transcribe fail stops flow, generate fail falls back gracefully), `onCreated` callback, audio file upload, URL mode inputs
- **Interactive guided tour:** `TutorialOverlay` with spotlight, character animation, mobile target/placement overrides, safety guard for off-screen targets, keyboard navigation, localStorage persistence
- **Empty states (Phase 5):** `IllustrationScene` component with themed illustrations (dashboard, library, search, starred, upcoming, integrations) and contextual messages for each section of the app
- **Unified animation system (Phases 1-5):**
  - Phase 1: Foundation — `useFadeInStagger` hook with configurable stagger, duration, scale, easing
  - Phase 2: Dashboard + Library stagger entry animations with Apple/Framer-style scale (0.96→1) + fade + smooth cubic-bezier
  - Phase 3: Session Detail panel transitions with a11y `prefers-reduced-motion` support
  - Phase 4: Recharts mount-only entrance animations with configurable delay and duration
  - Phase 5: Empty states with illustration + animation

### Fixed
- **Color contrast WCAG AA:** 5 failing combinations fixed — muted, teal, amber, dark blue, skeleton checkmark
- **ErrorBoundary colors:** Hardcoded slate/violet → CSS variables for automatic dark mode support
- **SkipLinks colors:** Hardcoded violet → CSS variables
- **Stat cards non-semantic:** `<dl>` / `<dt>` / `<dd>` for screen readers
- **SessionRecordsTable layout:** CSS grid divs → semantic `<table>` with `<thead>`, `<tbody>`, `<th scope="col">`, `<td>`
- **Recharts accessibility:** All 5 chart containers (sessions, pie, quiz, concepts, mix) have `role="img"` + `aria-label`
- **Progress bars accessibility:** Flashcard, Quiz, Dashboard plan have `role="progressbar"` + `aria-valuenow/min/max`
- **StudeChat message announcements:** `aria-live="polite"` on message container, `role="status"` on thinking indicator
- **Filter buttons state:** `aria-pressed` on Dashboard and Library filter buttons
- **Sidebar landmark:** `aria-label="Navegación principal"` on `<aside>`
- **AudioRecorder timer:** `role="timer"` with `aria-label` during recording
- **Library search input:** Added `aria-label`
- **MindMap zoom controls:** MutationObserver adds `aria-label` to ReactFlow zoom buttons
- **Topbar buttons:** `aria-label` on "Iniciar prueba gratuita" button
- **Upcoming calendar links:** Distinctive `aria-label` for Google Calendar vs Outlook
- **Tutorial ArrowRight on last step:** Was no-op, now completes the tutorial
- **Skeleton step-1 done logic:** Fixed progress bar phase tracking
- **Build artifacts tracking:** Removed `.next-dev/` and `tsconfig.tsbuildinfo` from git tracking
- **Button collisions:** Removed duplicate sidebar collapse button, fixed cramped footer, mobile topbar overlaps

### Refactored
- **Integrations page:** Complete restyle with unified animation patterns
- **MindMapCanvas:** Replaced hardcoded slate colors with CSS variables (`--c-muted`, `--c-border`)
- **Quiz/Flashcard legacy classes:** `text-slate-*` → `text-c-muted` and `bg-slate-*` → `bg-c-surface-2`

## [1.0.0] - 2025-04-28

### Added
- Complete AI-powered study assistant with transcription, summarization, and quiz generation
- Dual audio processing pipeline (client-side for <24MB, server-side with FFmpeg for larger files)
- Interactive study tools: flashcards, quizzes, mind maps, and action items
- AI tutor chat (Stude) with contextual session awareness
- Exercise evaluation with detailed feedback
- Study analytics dashboard with visualizations
- Export functionality (PDF, Markdown, CSV)
- Dark mode support throughout the application
- Pomodoro timer with focus mode
- Comprehensive E2E test suite (39 tests)
- Error boundaries for graceful failure handling

### Fixed
- Audio routing crash — files now correctly routed to server-side before browser decoding
- ProcessAudio disk leak — temporary files properly cleaned up
- LocalStorage quota handling with safeSetItem utility
- SHA-256 cache keys for consistent backend caching
- Granular error boundaries to prevent full page crashes

### Refactored
- Session detail component split from 684 to 348 lines with extracted panels
- GSAP animations centralized in reusable hooks (128 lines removed)
- Audio pipeline optimized with proper AbortController timeouts
- Backend logging cleaned (removed redundant console.log statements)

## [0.9.0] - 2025-04-15

### Added
- Server-side audio processing for large files (>24MB)
- Azure Blob Storage integration for audio chunk uploads
- HealthCheck endpoint with cache statistics
- Rate limiting and circuit breaker patterns

### Fixed
- CORS handling for production deployments
- Memory leaks in audio processing functions
- Safari compatibility issues with MediaRecorder

## [0.8.0] - 2025-04-01

### Added
- Initial client-side audio chunking with Web Audio API
- Whisper transcription integration
- Study session generation with GPT-4o-mini
- Basic flashcard and quiz viewers

### Changed
- Migrated from Zustand to localStorage for session persistence
- Optimized bundle size (reduced from 1.2MB to 890KB)

## [0.1.0] - 2025-03-15

### Added
- Initial project setup with Next.js 14 and Azure Functions
- Basic session creation and management
- File upload and transcription prototype
- TailwindCSS design system

---

## Portfolio Note

This project is portfolio-ready as of July 25, 2026.
- All known bugs resolved
- TypeScript strict mode passing
- Unit tests: 311 passing (14 test files)
- E2E tests: 21 critical-flow tests + 8 suite files passing
- Code quality: No console.log in production, CSS variables only
- Accessibility: WCAG AA contrast, semantic HTML, aria roles, keyboard navigation
- Responsive: Mobile-adaptive layout across all pages
