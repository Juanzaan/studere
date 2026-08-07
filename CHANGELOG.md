# Changelog

All notable changes to the Studere project will be documented in this file.

## [1.5.0] - 2026-08-07

### Added
- **E2E authentication via Clerk test login** (`frontend/e2e/auth.setup.ts`): a Playwright `setup` project signs in with `@clerk/testing` (`clerkSetup` + `setupClerkTestingToken` + `clerk.signIn()`) and saves the session to `playwright/.clerk/user.json`. Every browser project declares `dependencies: ['setup']` and reuses that `storageState`, so the suite runs signed-in without touching the sign-in form per spec. The saved state also marks the first-run tutorial as completed, which otherwise mounts a full-screen backdrop that swallows the specs' clicks.
- **`@clerk/testing` and `dotenv` as devDependencies**; `playwright.config.ts` loads `.env.local` explicitly (Playwright does not read it the way `next dev` does).
- **`.env.example` entries** for `E2E_CLERK_USER_EMAIL` and `CLERK_PUBLISHABLE_KEY`; `playwright/.clerk/` added to `.gitignore` so the saved session never reaches git.
- **`backend/local.settings.example.json`** with the eight settings the Functions app actually reads, so `cp local.settings.example.json local.settings.json` is a real first step instead of a README instruction pointing at a file that was never committed. `E2E_CLERK_USER_EMAIL` added to `frontend/.env.local.example`, which had drifted from `.env.example`.
- **`docs/assets/hero-light.svg` / `hero-dark.svg`** — a typographic README hero built from the app's own CSS custom properties, served through `<picture>` so it follows the reader's color scheme.

### Changed
- **README rewritten** around what the project is and why it is built the way it is, replacing the badge wall, emoji table of contents, two Mermaid diagrams and feature-matrix tables. The rewrite also drops claims that had gone stale or were never true: hardcoded test counts (three of them, all wrong), React Flow in the stack (the mind map is ECharts; `@xyflow/react` is an unused dependency), Node 18 as the prerequisite (CI is on Node 20 and Vitest 4 requires >= 20.12), "the E2E job is disabled in CI" (it runs as of this release), `GET /api/health` (the function declares no route, so it answers on `/api/HealthCheck`), and "transcripts, packages and chat answers are keyed so responses do not leak across accounts" — only the chat cache is identity-scoped, the other two are content-addressed by design.
- **CI `e2e` job re-enabled** (`.github/workflows/ci.yml`): runs `--project=setup --project=chromium` on Node 20 after `Test & Build`, installs Chromium only, and uploads the Playwright report as an artifact. Clerk keys come from repo secrets.
- **Playwright base URL is now `http://127.0.0.1:3000`, not `localhost`.** On a dual-stack host `localhost` resolves to `::1` first, and over IPv6 the Next dev server accepts the connection and sends response headers but never flushes the body — every dynamic route hangs until the client gives up, while the server log reports `200 in 52ms`. The same request over IPv4 returns in ~1s. Spec `page.goto` calls are now relative so they inherit the base URL.
- **Test timeout raised to 90s and expect timeout to 15s.** The suite runs against `next dev`, so the first request to each route pays for an on-demand webpack compile (10–45s); the defaults turned that into spurious `page.goto` and `toHaveURL` failures under parallel load.
- **CI reporting and cost guards:** the `github` reporter is added alongside the HTML one under `CI`, so a failure is annotated on the diff instead of being buried in an artifact, and the `e2e` job carries `timeout-minutes: 30` — with `workers: 1` against `next dev` the job is slow by design, and without a cap a hung dev server would sit on GitHub's 360-minute default.

### Fixed
- **Vacuous assertion in the E2E setup.** `auth.setup.ts` proved the sign-in had taken by waiting for `<main>` on `/dashboard`, but the page the middleware bounces an anonymous visitor to renders a `<main>` too — measured: anonymous hit on `/dashboard` yields `main=1`, user-menu=`0`. The check passed while signed out and would have saved a useless session file for the whole suite to inherit. It now asserts the URL is still `/dashboard` and that Clerk's `<UserButton>` is visible, which only mounts for a signed-in user.
- **Stale E2E selectors** that had gone unnoticed while the suite was disabled: the profile control is now Clerk's `<UserButton>` (`Open user menu`), not the old `Perfil de usuario` button; the mind map is an ECharts graph (`#mindmap-container`), not ReactFlow (`.react-flow`); the mobile hamburger is matched by `aria-expanded` since its `aria-label` flips on open; and strict-mode violations in the library table headers, `dl`/`dt`/`dd` stat cards, library search input, and the empty-state assertion.

## [1.4.0] - 2026-08-06

### Added
- **Custom Clerk auth UI:** the sign-in/sign-up pages now use the studere-auth.html design ported to React (`components/auth/`: AuthShell, AuthCard, auth-fields, auth-errors) replacing the prebuilt Clerk `<SignIn/>`/`<SignUp/>`. Flows: signup with email code verification, login, Google OAuth, and full password reset (email code + new password). 18 Clerk error codes mapped to es-AR with fallback to Clerk's message.
- **`/sso-callback` route:** public OAuth return leg so Google redirects complete without being bounced by `auth.protect()`.
- **PR template** (`.github/pull_request_template.md`) with quality-gate checklist.

### Changed
- **Landing swap:** `/` now serves the fixed standalone landing (`public/landing-prototype.html`) via middleware rewrite for anonymous visitors, and redirects signed-in users to `/dashboard` (`middleware.ts`). The React landing is dead code kept as fallback. Landing CTAs point to the real `/sign-up` and `/sign-in` routes.
- **Auth middleware:** only `/sign-in`, `/sign-up` and `/sso-callback` are public; everything else stays behind `auth.protect()`.
- `CODING_STANDARDS.md` updated: auth is Clerk-based (no longer "no user auth / single-user").
- `netlify.toml` bumped to Node 20 (matching CI, Vitest 4 requires >= 20.12).

### Fixed
- **Landing demo bugs** (in `landing-prototype.html`): card collapse/jump during tab transitions, toggle overlapping the label, touch targets below 44px, value props hidden on mobile, low placeholder contrast (2.78:1 -> 4.91:1), 100dvh support, and 320-900px breakpoint handling (820 -> 900).
- **Hero demo pause:** the auto-cycling hero demo now pauses when out of viewport and restarts from the beginning when scrolled back.

## [1.3.0] - 2026-08-05

### Added
- **Trial enforcement:** AI features (transcription + generation) are now blocked once the 120-minute trial is used up — `isTrialExhausted` / `calculateTrialMinutesUsed` in `lib/session-utils.ts`, enforced in the session composer and the audio recorder with a "Trial finalizado" toast. Local-only creation (no AI) stays available. 10 unit tests.
- **CONTRIBUTING.md:** documented branch workflow, Conventional Commits, CHANGELOG policy (Keep a Changelog + semver) and the release process — see [issue #9](https://github.com/Juanzaan/studere/issues/9).

### Changed
- `FREE_PLAN_MINUTES` renamed to `TRIAL_MINUTES` (the app is trial-based, not free) and the dashboard "Plan gratuito" label now reads "Trial".
- **Branch protection hardened:** `main` now requires the `Test & Build (20.x)` status check to pass (strict, up-to-date branch) before merging — see [issue #11](https://github.com/Juanzaan/studere/issues/11).

## [1.2.0] - 2026-08-05

### Added
- **Study streak (real):** `calculateStreak` in `lib/session-utils.ts` — consecutive days with sessions (UTC); the streak stays alive until the end of the day (a session yesterday keeps it when today is empty). 8 unit tests.
- **AGENTS.md:** conventions for AI agents — commands, golden rules (typecheck + green suite before done), code conventions, git workflow.
- **GitHub issue templates:** form-based bug report and feature request.
- **Labels:** `ci`, `docs`, `chore`, `security` added to the default set.
- **Backend `.gitignore`** and Playwright artifact ignores (`test-results/`, `playwright-report/`).

### Fixed
- **Auth 401 on every backend request:** Clerk verification now uses `Clerk.verifyToken(token, { secretKey })` (the object-form `verifySession` call returned 401 in production).
- **Session data loss:** session IDs were derived from title + timestamp — two sessions with the same title created within the same millisecond overwrote each other. IDs now append a random suffix.
- **XSS vectors:** mind-map tooltip and exporters now escape user-provided text; `md-renderer` sanitizes `href` (blocks `javascript:`).
- **Hydration flash:** theme applied after mount with a mount-effect, matching the inline layout script.
- **Cross-tab session overwrite:** session detail only persists when its own props changed (600 ms guard) instead of clobbering other tabs' writes.
- **File-to-base64 hang:** the Web Worker path now has a 30 s timeout and terminates the worker on failure.
- **Quota failures surfaced:** storage-full errors now show a toast and abort navigation instead of silently losing the session.
- **Flashcard viewer side effects:** analytics/completion/progress moved out of the state updater into effects with dedupe refs (no double counting, no completion on backward wrap).
- **Dashboard streak:** replaced the fake `sessions.length / 2` formula with the real consecutive-days calculation.
- **README/CODING_STANDARDS:** stale test counts refreshed (320 unit tests · 15 suites · 9 E2E specs).

### Changed
- **Repository cleanup:** untracked `backend/node_modules` (~3500 files), personal AI tooling (`.claude`, `.claude-flow`, `.swarm`, `.windsurf`, `.mcp.json`, `.windsurfrules`, `frontend/.agents`, `frontend/.windsurf`), `preview-captures`, and Playwright `test-results/`. Obsolete capture scripts deleted. Files stay on disk locally.
- **CI now runs:** workflow moved from `frontend/.github/` (GitHub only reads the root) to `.github/workflows/`; passes Clerk env vars from repository secrets.
- **CI E2E job disabled** until specs get Clerk test-user auth — tracked in [issue #3](https://github.com/Juanzaan/studere/issues/3).
- **Issue tracker:** 10 backlog issues created covering the landing swap, E2E auth, git history cleanup, calendar/integrations placeholders, free-plan enforcement, CHANGELOG policy, and branch protection.

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
