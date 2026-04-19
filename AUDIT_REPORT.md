# Studere — Audit Report

**Date:** 2026-04-19  
**Mode:** Read-only audit  
**Scope:** Frontend (`/frontend`) + Backend (`/backend`)  
**Baseline:** `.windsurfrules` sections 3–7

---

## 1. DEAD CODE & UNUSED FILES

| File / Symbol | What's unused | Confidence |
|---|---|---|
| `backend/test-audio-debug.js` | Standalone manual debug script; not an Azure Function (no `function.json`). Never imported. | **High** |
| `backend/TranscribeAudio/TranscribeAudio.test.js` | Test file in backend root but backend has no test runner configured (`package.json` says `"test": "echo 'Tests pending'"`). | **High** |
| `backend/*/index-original.js` (4 files) | Backup copies of pre-optimization handlers. Gitignored (`.gitignore:70`) but still sit on disk. | **High** |
| `backend/*/index-optimized.js` (2 files: `GenerateStudySession`, `EvaluateExercise`) | Intermediate optimization drafts. Gitignored (`.gitignore:71`) but still on disk. | **High** |
| `frontend/src/shared/hooks/useSessionStorage.ts` | Exported in barrel `src/shared/hooks/index.ts:1` but never imported by any component or page. | **High** |
| `frontend/src/shared/hooks/useDebounce.ts` | Only reference is the barrel export; zero consumers. | **High** |
| `frontend/src/shared/hooks/useClickOutside.ts` | Only reference is the barrel export; zero consumers. | **High** |
| `frontend/src/domains/recordings/hooks/useAudioRecording.ts` | Defined & exported but no component imports it. Components use `lib/audio-capture.ts` directly. | **High** |
| `frontend/src/domains/recordings/hooks/useScreenRecording.ts` | Same: defined, exported, never consumed. | **High** |
| `frontend/src/domains/sessions/components/TasksPanel.tsx` | Explicitly commented-out in `src/domains/sessions/components/index.ts:5-6`: *"TasksPanel exists but not yet integrated into session-detail.tsx"*. Session-detail re-implements tasks inline. | **High** |
| `frontend/src/store/` (entire Zustand store) | `useStore` is imported **only** by tests (`store.test.ts`) and `useSessionStorage.ts` (which is itself dead). No component or page uses it. App uses `lib/storage.ts` localStorage layer directly. | **High** |
| `frontend/lib/theme.ts` → `initTheme()` | Function exported but never called. Theme is initialized inline in `app/layout.tsx:42` via an embedded script. | **High** |
| `frontend/lib/url-transcriber.ts` → `transcribeFromUrl()` | Used by `url-transcriber-widget.tsx` but the function returns **hardcoded simulated text** (`url-transcriber.ts:60-74`). The "transcription" is fake — production comment says *"En producción, Studere usará Whisper o Deepgram"*. | **Medium** (code runs but is fake) |
| `frontend/components/screen-recorder-widget.tsx` | `FEATURE_ENABLED = false` constant at line 11 gates the entire feature ("Próximamente"). Component renders but does nothing. Still importing `lib/screen-capture.ts` + heavy logic. | **High** |
| Backend deps: `joi`, `opossum`, `axios-retry` | Listed in `backend/package.json:14-16` but `require(...)` for any of them returns **zero matches** across `/backend`. | **High** |
| Frontend deps (suspected unused): `@react-three/drei`, `@react-three/fiber`, `three`, `three-stdlib` | Only referenced in `404-scene.tsx` and `not-found-scene.tsx`. If 404 page is simplified, this is ~1MB of dead weight. | **Low** (currently used) |
| `frontend/lib/session-utils.ts` → `createMindMap`, `createInsights`, `createActionItems`, `createWelcomeChat` | Still referenced, **but** the AI backend (`GenerateStudySession/index.js`) now produces these directly. The local generators are only a fallback used when AI fails or in `study-generator.ts`. | **Low** (legitimate fallback) |

---

## 2. DUPLICATE & REDUNDANT CODE (DRY VIOLATIONS)

| Locations | What's duplicated | Merge recommendation |
|---|---|---|
| `frontend/lib/storage.ts:7-9` + `frontend/lib/analytics-storage.ts:7-9` | Identical `canUseStorage()` function (3 lines, verbatim). | Extract to a `lib/storage-utils.ts` or inline guard. |
| `frontend/lib/audio-capture.ts:13-21` + `frontend/lib/screen-capture.ts:11-19` | `pickMimeType()` function — same structure, only the `candidates` array differs. Both also share module-level `mediaRecorder`, `chunks`, `startTime` globals and near-identical `start/stop/cancel/isRecording` shapes. | Create a single `createMediaRecorder({ kind, candidates })` factory or a `useRecorder(mediaType)` hook. |
| `frontend/components/audio-recorder-widget.tsx:13-217` + `frontend/components/screen-recorder-widget.tsx:10-213` | Near-identical component structure: same state machine (`idle/recording/transcribing/generating/error`), same timer refs, same cleanup effects, same UI patterns. | Extract a `useMediaRecorderWidget()` hook or a generic `RecorderWidget` with `kind` prop. |
| `frontend/components/library-page.tsx:31-65`, `starred-page.tsx:25-45`, `upcoming-page.tsx:18-43` | Same card shell: rounded-[24px] border + icon badge + h1 + subtitle. Same `SessionRecordsTable` empty-state pattern in library + starred. | Extract `<PageShell icon title description>` component (note: `session-page-shell.tsx` exists but covers a different case). |
| `frontend/src/store/slices/sessions-slice.ts:51-63` | `toggleStar()` and `toggleStarred()` are **literally the same implementation** — duplicate exported for *"Alias for tests"* (line 17 comment). | Remove `toggleStarred`, update tests. |
| `frontend/src/store/slices/ui-slice.ts:6-47` | Two parallel toast systems: array-based (`toasts`, `addToast`, `removeToast`) + singleton (`toast`, `showToast`, `hideToast`). Comment: *"For tests"* (line 16-17). | Pick one API. The array-based one is the real implementation. |
| `backend/ProcessAudio/index.js:252-265` | Hand-rolls CORS headers directly on `context.res`, bypassing the shared `jsonResponse()` helper used by every other function. | Replace with `jsonResponse(context, 204, '', requestId)` on preflight. |
| `backend/HealthCheck/index.js:46-69` | Three near-identical `{ keys, hits, misses, hitRate: ... }` blocks for transcription/generation/chat caches. | Extract helper `formatCacheStats(stats)` once, map over cache names. |
| `backend/StudeChat/index.js:30-32` + `backend/EvaluateExercise/index.js:32` + `backend/TranscribeAudio/index.js:18` | Each function redefines its own `REQUEST_TIMEOUT_MS` constant (60000/60000/300000). | Centralize in `shared/utils.js` as named export. |
| `backend/*/index.js` (OPTIONS handling) | Every function repeats the same `if (req.method === "OPTIONS") { jsonResponse(context, 204, "", requestId); return; }` preamble. | Wrap handlers in `withCORS(handler)` decorator in `shared/utils.js`. |
| `frontend/components/audio-recorder-widget.tsx:60-80` + `session-composer-card.tsx` upload flow | Both call `transcribeAudio` → `createStudySession` → `generateStudySession` → `upsertSession` → `router.push`. Same pipeline duplicated. | Extract `createSessionFromAudio(file, meta)` in `lib/`. |

---

## 3. FILES THAT SHOULD BE MERGED

| Files involved | Reason | Proposed merged filename |
|---|---|---|
| `frontend/lib/audio-capture.ts` (76 LOC) + `frontend/lib/screen-capture.ts` (104 LOC) | ~80% duplicated MediaRecorder wrapper. Both share the same global singleton bug. | `frontend/lib/media-recorder.ts` with `kind: "audio" \| "screen"` param. |
| `frontend/lib/storage.ts` + `frontend/lib/analytics-storage.ts` + `frontend/lib/theme.ts` | All three are thin localStorage wrappers with the same `canUseStorage()` guard. Theme adds 27 LOC. | Keep them separate but share `lib/local-storage-guard.ts`. Do **not** merge the files themselves — domains are distinct. |
| `frontend/components/library-page.tsx` + `frontend/components/starred-page.tsx` | `StarredPage` is just `LibraryPage` with `sessions.filter(s => s.starred)` and different copy. | Parameterize `LibraryPage` with a `filter` and `copy` prop; delete `starred-page.tsx`. |
| `frontend/src/domains/recordings/hooks/useAudioRecording.ts` + `useScreenRecording.ts` | Both are dead (section 1), but if revived they should be one generic hook. | Merge into `useMediaRecorder(kind)` or delete both. |
| `frontend/components/audio-recorder-widget.tsx` + `frontend/components/screen-recorder-widget.tsx` | See section 2. | `RecorderWidget` with variant prop (or delete screen variant since `FEATURE_ENABLED = false`). |
| `backend/GenerateStudySession/index.js` + `ProcessAudio/index.js` helpers | Both reimplement their own `OUTPUT_SCHEMA` / segment-splitting helpers inline. Not critical but should live in `shared/`. | Leave files separate; move prompts/schemas to `shared/prompts.js`. |

---

## 4. OVERSIZED COMPONENTS / FUNCTIONS (>200 LOC)

| File | Line count | Split strategy |
|---|---|---|
| `frontend/components/session-detail.tsx` | **684** | Already planned in `ARCHITECTURE_FIXES.md`. Extract `<SessionTabs>`, `<SummaryPanel>`, `<TasksPanel>` (already exists in `src/domains/sessions/components/TasksPanel.tsx` — just wire it up), `<InsightsPanel>`, `<NotesPanel>`. Target <200 LOC. |
| `frontend/lib/session-utils.ts` | **557** | Split into `session-normalizer.ts` (lines 169–245), `brain-reply.ts` (lines 247–528 — the `buildBrainReply` + all `buildXxx` helpers), and keep creators in `session-utils.ts` (lines 38–167, 531–557). |
| `frontend/components/session-composer-card.tsx` | **417** | Extract `<UploadMode>`, `<UrlMode>`, `<RecordMode>`, `<OnlineMode>` sub-components driven by `mode` prop. Move `MODE_COPY` + `readOptionalText` to a helper file. |
| `frontend/components/stude-chat-popup.tsx` | **353** | Extract `<ChatDragHandle>`, `<ChatMessageList>`, `<ChatInput>`, and `useChatResize()` hook. Chart-detection logic (`detectChartRequest` + `CHART_KEYWORDS`) can move to `lib/`. |
| `frontend/components/analytics-dashboard.tsx` | **340** | Split per chart: `<QuizProgressChart>`, `<FlashcardChart>`, `<SessionTrendChart>`, `<KpiCards>`. Share via `charts/` subfolder. |
| `frontend/lib/study-generator.ts` | **324** | Extract `extractConcepts`, `generateSummary`, `generateQuiz`, `generateFlashcards` into separate files under `lib/generators/`. The stopwords array (46 entries) should live in its own `stopwords.ts`. |
| `frontend/components/dashboard-home.tsx` | **320** | Extract `<DashboardHero>`, `<QuickActions>`, `<RecentSessions>`, `<UsageStats>`. |
| `backend/GenerateStudySession/index.js` | **309** | Move `OUTPUT_SCHEMA`, `SYSTEM_PROMPT`, `FALLBACK_SYSTEM`, `normalizeOutput` into `shared/study-session-config.js`. Handler should orchestrate only. |
| `backend/ProcessAudio/index.js` | **290** | Extract `concatenateChunks`, `splitAudioWithFFmpeg`, `transcribeSegment`, `processAudio` into `shared/audio-pipeline.js`. Handler becomes ~30 LOC. |
| `backend/UploadAudioChunk/index.js` | 218 | Borderline. Extract session registry (`sessions` Map + `cleanOldSessions`) to `shared/chunk-session-store.js` — also helps with testing. |

---

## 5. ARCHITECTURAL INCONSISTENCIES

| File | What's inconsistent | What it should be (per `.windsurfrules`) |
|---|---|---|
| `frontend/src/store/index.ts` + components | **Major:** Section 4 says *"Global State: Zustand store"*, but no component uses `useStore()`. All components read via `getSessions()` from `lib/storage.ts` and update via `upsertSession/patchSession`. The Zustand store is effectively test-only. | Either adopt Zustand everywhere (preferred per docs) **or** delete `src/store/` and update `.windsurfrules` section 4. |
| `frontend/lib/storage.ts` | Section 4 says *"LocalStorage + IndexedDB (via lib/storage.ts)"*. File uses **only localStorage**. IndexedDB is never touched anywhere in the codebase. | Update the architecture doc or implement the IndexedDB layer. |
| `backend/ProcessAudio/index.js:252-265` | Manual CORS headers + `context.res.status = 204` pattern, instead of `jsonResponse()` used by every other function (section 5 backend patterns). | Use `jsonResponse(context, 204, '', requestId)`. |
| `frontend/lib/url-transcriber.ts:50-83` | Returns hardcoded simulated text. Section 7 lists URL transcription among working features, but it's a stub. | Either implement real transcription or remove the widget + mark feature as "Planned" in section 7. |
| `backend/UploadAudioChunk/index.js:20-21` | In-memory `sessions = new Map()` for chunk tracking. Comment admits *"TODO: usar Redis/Cosmos para producción"*. On Azure Functions Consumption Plan, cold starts wipe this map — any in-progress upload dies. | Persist session metadata in Azure Blob Storage or table storage. |
| `frontend/src/store/slices/ui-slice.ts` | Two toast systems: `toasts[]` array vs `toast` singleton. Meanwhile, the real app uses a completely different toast system in `components/toast-provider.tsx` + `toast.tsx`. Three competing toast implementations. | Pick one. `toast-provider.tsx` is the active one. |
| `frontend/src/domains/sessions/components/TasksPanel.tsx` | Section 3 lists this as part of DDD structure, but it's commented out and unused — session-detail.tsx reimplements tasks inline (lines 480–583). | Wire it up or delete it. |
| `backend/StudeChat/index.js:58-67` + `TranscribeAudio/index.js:51-58` | Caching uses weak keys (lowercase message + session title; first 100 chars of base64). Per section 6 "Cache AI responses" — yes, but collisions are likely. | Use SHA-256 hash of full normalized input. |
| `frontend/components/session-detail.tsx:99` | Module-level `completionRateCache = new Map<string, number>()` — unbounded, never cleared. Violates "don't break dark mode" / general pattern of React-local caching via `useMemo`. | Use `useMemo` scoped to the component. |
| `frontend/lib/api.ts:92` | Magic number `DIRECT_UPLOAD_LIMIT = 24 * 1024 * 1024`. Section 6 says "Respect limits". `constants.ts` already defines `AUDIO_LIMITS.CLIENT_SIDE_MAX_MB = 24`. | Import from `constants.ts`. |

---

## 6. BUG RISK ZONES

| File | Risk | Severity |
|---|---|---|
| `frontend/lib/audio-chunker.ts:94` | Documented P0 (section 7). `decodeFile(file)` loads the entire file into memory via `arrayBuffer()` + `decodeAudioData()`. Crashes on files >60MB. Workaround exists (server-side) but client-side is still reachable for 24–60MB files. | **Critical** |
| `frontend/lib/audio-capture.ts:9-11` + `screen-capture.ts:7-9` | Module-level singletons (`mediaRecorder`, `chunks`, `startTime`). If two widgets mount in parallel (e.g., dashboard + composer modal), state corruption. Cleanup functions compete. | **High** |
| `backend/UploadAudioChunk/index.js:20-21, 64-76` | In-memory session tracking on a stateless Consumption Plan → cold start = total loss. Risk spreads into `ProcessAudio/index.js:143-148` which trusts the `.temp/audio-chunks/sessionId` directory to exist. | **Critical** |
| `backend/ProcessAudio/index.js:238` | Cleanup is commented out (`// await fs.rm(sessionDir, { recursive: true, force: true });`). `.temp/` will grow unboundedly. Disk quota exhaustion risk. | **High** |
| `frontend/components/session-detail.tsx:99-118` | `completionRateCache` is a module-level Map growing without eviction. Keys include computed hashes of session state → hundreds of entries per long session. Memory leak across navigations. | **Medium** |
| `backend/TranscribeAudio/index.js:52` | Cache key uses only `audioBase64.substring(0, 100)` + language. Two different audio files starting with the same WebM/MP3 headers will collide. | **High** |
| `frontend/lib/api.ts:27-48` | `fileToBase64` spawns a Web Worker but never awaits `worker.terminate()` on progress messages. If `base64-worker.ts:19` fires a progress message after success, it's silently dropped but worker stays alive briefly. | **Low** |
| `frontend/lib/api-server-side.ts:118-146` | `processAudio` fetch has **no AbortController/timeout** (unlike `uploadAudioChunks` at line 70 which has 60s timeout). A 30-minute backend hang leaves the UI in infinite "Procesando..." state. | **High** |
| `frontend/components/session-detail.tsx:260-268` | `reader.onload` / `reader.onerror` race: if `handleImageUpload` fallback fires twice (compress fails + FileReader also fails), both error toasts could surface. | **Low** |
| `backend/GenerateStudySession/index.js:259-279` | Content-filter fallback retry uses different prompt but does **not** re-check cache → wasted OpenAI call if fallback succeeds on identical retry. | **Low** |
| `frontend/lib/session-utils.ts:181-183` | `normalizeSession` uses `(raw as any).summary` double cast to handle legacy string[] format. No type guard; silently returns empty string if shape is neither. | **Medium** |
| `frontend/components/stude-chat-popup.tsx:37-49` | `detectChartRequest` keyword-based heuristic; false positives on any message containing "mapa" (e.g., "mapa de Europa") trigger chart rendering. | **Low** |
| `frontend/lib/storage.ts:38-45` | `saveSessions` blocks on synchronous `JSON.stringify` of potentially 50MB+ of session data → main thread jank on large libraries. | **Medium** |

---

## 7. MISSING ERROR HANDLING

| Location | Missing |
|---|---|
| `frontend/lib/api.ts:169-185` | `generateStudySession` does `const data = await res.json()` then `data.output` access — no catch for malformed JSON. If backend returns HTML error page, throws generic `SyntaxError`. |
| `frontend/lib/api-server-side.ts:133-140` | `processAudio()` fetch has no try-catch + no timeout + no AbortController. See section 6. |
| `frontend/lib/audio-capture.ts:41-61` | `stopAudioCapture` — `MediaRecorder.stop()` can throw InvalidStateError if state changed between check and call. Not caught. |
| `frontend/lib/screen-capture.ts:57-63` | `displayStream.getVideoTracks()[0].addEventListener("ended", ...)` — the `.then().catch(() => {})` swallows errors silently. Should at least log. |
| `frontend/lib/exporters.ts:33-41` | `triggerDownload` — `URL.createObjectURL` can throw in Safari private mode. No catch. |
| `frontend/lib/analytics-storage.ts:32, 52` | `window.localStorage.setItem(..., JSON.stringify(...))` — can throw `QuotaExceededError`. Silently swallowed. User attempts are lost. |
| `frontend/lib/storage.ts:43` | Same: `localStorage.setItem` with no quota handling. For sessions >5MB, save fails silently. |
| `frontend/components/session-composer-card.tsx` (various) | Several `await` calls inside the submit flow don't have granular error messages — any failure in the chain shows the same toast. |
| `backend/shared/openai-client.js:31` | `new OpenAIClient(...)` — if endpoint is malformed, throws at first `getClient()` call, crashes the function. No fallback. |
| `backend/UploadAudioChunk/index.js:58-62` | `cleanSessionFiles(sessionId).catch(...)` — error is logged via `console.error` instead of `structuredLog`. Inconsistent with the rest of the backend. |
| `backend/ProcessAudio/index.js:40-43` | `writeStream.on('finish' / 'error')` — if `writeStream.end()` throws synchronously (full disk), the promise never resolves. |
| `backend/ProcessAudio/index.js:143-148` | `await fs.access(sessionDir)` throws EACCES / ENOENT with generic Node error; wrapped into `"Session not found"` which is misleading for permission errors. |
| `frontend/components/flashcard-viewer.tsx` + `quiz-viewer.tsx` | Call `saveQuizAttempt/saveFlashcardAttempt` without awaiting or catching. (Confirmed by grep; they're sync but localStorage can throw.) |
| `frontend/components/audio-recorder-widget.tsx:57-76` | Transcription error path exists, but no retry UI — user must cancel + restart full recording. |

---

## 8. REFACTOR CANDIDATES (TOP 10 BY IMPACT/RISK RATIO)

Ordered **high impact / low risk first**.

1. **Delete gitignored backup files on disk** (`backend/*/index-original.js`, `index-optimized.js`, `backend/test-audio-debug.js`). Zero risk, removes ~6 files of confusion. *(Impact: Low but free; Risk: None)*

2. **Delete dead hooks** (`useSessionStorage`, `useDebounce`, `useClickOutside`, `useAudioRecording`, `useScreenRecording`) + their barrel exports. Also delete `TasksPanel.tsx` or wire it up. *(Impact: Medium; Risk: Low — verify with grep first)*

3. **Remove unused backend deps** (`joi`, `opossum`, `axios-retry`). Reduces install time & attack surface. *(Impact: Low; Risk: None — grep confirms zero usage)*

4. **Consolidate `canUseStorage()`** into a single helper shared by `storage.ts`, `analytics-storage.ts`, `theme.ts`. Trivial. *(Impact: Low; Risk: None)*

5. **Decide on Zustand vs localStorage** and commit to one. Either delete `src/store/` or migrate components. Update `.windsurfrules` section 4 accordingly. *(Impact: High; Risk: Medium — tests reference store)*

6. **Split `session-utils.ts` → `brain-reply.ts` + `session-normalizer.ts`**. Existing tests already split by topic (`brain-reply.test.ts` vs `session-utils.test.ts`). Pure refactor, no logic change. *(Impact: High; Risk: Low)*

7. **Fix `ProcessAudio/index.js` cleanup** (uncomment the `fs.rm` on success path, line 238). Prevents disk exhaustion in production. *(Impact: High; Risk: Low)*

8. **Migrate `UploadAudioChunk` session Map to Azure Blob or Table Storage**. Documented TODO, critical for Consumption Plan. *(Impact: Critical; Risk: Medium — touches audio flow)*

9. **Refactor `session-detail.tsx` per `ARCHITECTURE_FIXES.md` plan**. Wire up the already-existing `TasksPanel.tsx`. *(Impact: High; Risk: Medium — 684 lines of UI surface area)*

10. **Add AbortController/timeout to `api-server-side.ts:processAudio`**. One-line fix, prevents infinite UI hang. *(Impact: High; Risk: None)*

---

## 9. WHAT TO DELETE

**Safe to delete with zero functional impact:**

### Files
- `backend/test-audio-debug.js` (standalone debug script, not a Function)
- `backend/TranscribeAudio/TranscribeAudio.test.js` (no test runner configured)
- `backend/TranscribeAudio/index-original.js` (gitignored backup on disk)
- `backend/GenerateStudySession/index-original.js` (gitignored backup)
- `backend/GenerateStudySession/index-optimized.js` (gitignored intermediate)
- `backend/EvaluateExercise/index-original.js` (gitignored backup)
- `backend/EvaluateExercise/index-optimized.js` (gitignored intermediate)
- `backend/StudeChat/index-original.js` (gitignored backup)
- `frontend/src/shared/hooks/useSessionStorage.ts` (dead)
- `frontend/src/shared/hooks/useDebounce.ts` (dead)
- `frontend/src/shared/hooks/useClickOutside.ts` (dead)
- `frontend/src/domains/recordings/hooks/useAudioRecording.ts` (dead)
- `frontend/src/domains/recordings/hooks/useScreenRecording.ts` (dead)
- `frontend/src/domains/recordings/hooks/index.ts` (barrel for dead hooks)
- `frontend/src/shared/hooks/index.ts` (barrel for dead hooks — unless kept for future)

### Code blocks (safe deletion)
- `frontend/src/store/slices/sessions-slice.ts:58-63` — `toggleStarred` (duplicate of `toggleStar`)
- `frontend/src/store/slices/ui-slice.ts:7, 16-17, 44-46` — singleton toast system (`toast`, `showToast`, `hideToast`); keep array-based
- `frontend/lib/theme.ts:22-26` — `initTheme()` (never called; root layout uses inline script)
- `frontend/src/domains/sessions/components/index.ts:5-6` — commented-out `TasksPanel` export (either uncomment + use, or delete the file entirely)
- `frontend/components/session-detail.tsx:99` — module-level `completionRateCache` Map (replace with `useMemo`)
- `backend/package.json:14-16` — `joi`, `opossum`, `axios-retry` entries

### Conditional deletion (needs decision)
- `frontend/components/screen-recorder-widget.tsx` + `frontend/lib/screen-capture.ts` — gated by `FEATURE_ENABLED = false`. If "coming soon" is honest, keep. If it's been false for months, delete.
- `frontend/lib/url-transcriber.ts` + `frontend/components/url-transcriber-widget.tsx` — returns simulated content. Either implement real transcription or remove the "Transcribir desde URL" quick action (`dashboard-home.tsx:43`).
- Entire `frontend/src/store/` directory — if Zustand migration isn't happening, delete. If it is, schedule the migration.

### Estimated cleanup impact
- ~15 files removable immediately
- ~3 dependencies removable
- ~200 LOC of dead code removable with zero risk
- Clarifies intent for ~800 LOC of maybe-dead code (screen recorder, url transcriber, Zustand store)

---

**Report generated on:** 2026-04-19  
**Files inspected:** ~60 (all non-node_modules production source)  
**Findings are based strictly on static analysis of the current codebase; no changes were made.**
