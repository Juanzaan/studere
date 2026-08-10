<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.svg">
    <img src="docs/assets/hero-light.svg" alt="Studere — record the class, leave with a study pack" width="860">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/Juanzaan/studere/actions/workflows/ci.yml"><img src="https://github.com/Juanzaan/studere/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-proprietary-b36205" alt="Proprietary license"></a>
</p>

Studere turns a class recording into a study pack: a structured summary, flashcards, a
quiz with explanations, a mind map, action items, and exercises it can grade. It also
ships Stude, a tutor that answers follow-up questions with that session as context.

Bring a two-hour lecture, a pasted transcript, or a photo of the whiteboard. Accounts
are Clerk-backed, so every library is private to whoever recorded it.

> Proprietary, source-available for evaluation only. Commercial use, redistribution,
> and reuse in other projects are not permitted — see [LICENSE](LICENSE).

## Why it is built this way

**A long recording cannot be handed to Whisper as-is.** The transcription endpoint caps
at 25 MB, which a phone recording of a single class blows past. So there are two paths,
picked by size rather than by user choice: files under the cap go straight through, and
anything larger is uploaded in 10 MB chunks to Blob Storage, reassembled server-side,
split with FFmpeg, and transcribed in parallel batches of five. The cost is a second
pipeline to maintain. The alternative was refusing the recordings people actually make.

**Generated material is worth nothing if it is thin.** Every study pack is scored after
generation — summary depth, concept count, explanation length — and sections that come
back weak get a targeted second pass before anything is cached. A quiz whose answer
explanations are one line each is technically a quiz and practically useless, and the
model produces those often enough that trusting the first response is not an option.

**Sessions live in the browser first.** Study data is persisted client-side and the
backend stays stateless, which keeps the Functions app cheap and makes the app usable
while the API is down. The tradeoff is real and known: a library does not follow you to
another device yet.

## How it works

```
audio ─┬─ under 25 MB ─→ TranscribeAudio ───────────────────┐
       │                                                    ├─→ transcript
       └─ over 25 MB ──→ UploadAudioChunk ─→ ProcessAudio ──┘
                         (10 MB chunks,      (FFmpeg split,
                          Blob Storage)       Whisper ×5 in parallel)

transcript ─→ GenerateStudySession ─→ quality gate ─┬─ passes ──────→ study pack
                                          ▲         └─ weak sections ─┐
                                          └───────── enrichment pass ─┘

study pack ─→ summary · flashcards · quiz · mind map · action items · exercises
              Stude answers follow-ups · EvaluateExercise grades photographed work
```

Transcription and generation results are content-addressed in an in-process cache, so
re-submitting the same audio or transcript is free. Chat is cached per user, since the
same question against the same session is still a different answer for a different
person.

## Running it locally

You need Node 20 or newer (Vitest 4 requires >= 20.12), [Azure Functions Core Tools
v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local), and
[Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite) for the
blob emulator. The AI features need a Clerk application and an Azure OpenAI resource
with a chat deployment and a Whisper deployment; without them the UI runs and sessions
can be created by hand, but nothing is generated.

```bash
git clone https://github.com/Juanzaan/studere.git
cd studere

cd frontend && npm install
cd ../backend && npm install
cp local.settings.example.json local.settings.json   # then fill in the keys
```

Three terminals:

```bash
azurite --silent --location ./azurite   # blob emulator
cd backend  && func start               # localhost:7071
cd frontend && npm run dev              # open http://127.0.0.1:3000
```

Open the app at `127.0.0.1:3000`, not `localhost:3000`. On a dual-stack host `localhost`
resolves to `::1` first, and over IPv6 the Next dev server sends response headers but
never flushes the body — the request hangs while the server log cheerfully reports `200`.
Playwright's base URL is pinned to the IPv4 address for the same reason.

## Configuration

`frontend/.env.local` (copy `.env.local.example`):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | yes | `http://localhost:7071` for the local Functions host |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | `pk_test_...` from the Clerk dashboard |
| `CLERK_SECRET_KEY` | yes | `sk_test_...`; server-side only |
| `NEXT_PUBLIC_CLERK_*_URL` | no | sign-in/sign-up route overrides |
| `E2E_CLERK_USER_EMAIL` | E2E only | Clerk test user, e.g. `e2e+clerk_test@example.com` |

`backend/local.settings.json` (copy `local.settings.example.json`):

| Variable | Required | Notes |
|---|---|---|
| `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_KEY` | yes | Azure OpenAI resource |
| `AZURE_OPENAI_DEPLOYMENT` | yes | chat deployment name |
| `AZURE_OPENAI_WHISPER_DEPLOYMENT` | yes | transcription deployment name |
| `AZURE_STORAGE_CONNECTION_STRING` | yes | `UseDevelopmentStorage=true` with Azurite |
| `ALLOWED_ORIGIN` | yes | exact frontend origin for CORS |
| `CLERK_SECRET_KEY` | prod | **unset means auth is disabled** — see [Security](#security) |
| `FFMPEG_PATH` | no | falls back to the bundled binary |

Both files are gitignored. Keys belong in the Clerk and Azure dashboards, in Vercel
project settings, and in GitHub Actions secrets — never in a commit.

## Stack

| Layer | What |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript strict, Tailwind 3.4, GSAP, ECharts (mind map), Recharts (analytics), KaTeX |
| Auth | Clerk (`@clerk/nextjs` v6) with custom sign-in/sign-up UI |
| Backend | Azure Functions v4 (Node, CommonJS), Azure OpenAI (chat + Whisper), Azure Blob Storage, FFmpeg |
| Testing | Vitest + Testing Library, Playwright (Chromium), axe-core |
| CI | GitHub Actions — typecheck, unit tests, production build, E2E; CodeQL on a separate workflow |

## API surface

All routes are `POST` under the Functions `api` prefix unless noted. Each one verifies
the caller's Clerk token when `CLERK_SECRET_KEY` is configured.

| Route | Purpose |
|---|---|
| `/api/generate-study-session` | Transcript to study pack, with the quality gate |
| `/api/transcribe-audio` | Whisper transcription for files under 25 MB |
| `/api/upload-audio-chunk` | Chunked upload to Blob Storage for larger files |
| `/api/process-audio` | Server-side FFmpeg split plus batched transcription |
| `/api/stude-chat` | Session-aware tutor |
| `/api/evaluate-exercise` | Exercise grading, vision-enabled for photographed answers |
| `GET /api/HealthCheck` | Liveness and cache statistics |

## Layout

```
frontend/
  app/           (app)/ dashboard, library, sessions/[id], analytics, upcoming
                 sign-in/, sign-up/, sso-callback/, api/, dev/
  components/    UI, session panels, auth screens, mind-map-graph.tsx
  lib/           API client, local storage, audio pipeline, types
  src/tests/     Vitest unit suites
  e2e/           Playwright specs plus the Clerk sign-in setup project
backend/
  GenerateStudySession/  TranscribeAudio/  ProcessAudio/  UploadAudioChunk/
  StudeChat/  EvaluateExercise/  HealthCheck/
  shared/        OpenAI client, cache, validation, audio pipeline, auth.js
```

## Tests

```bash
cd frontend
npm run typecheck        # tsc --noEmit
npm test                 # Vitest
npm run test:coverage
npm run test:e2e         # Playwright; needs the Clerk test-user vars
npm run test:e2e:ui
```

The E2E suite signs in once in a `setup` project using `@clerk/testing`, saves the
session to `playwright/.clerk/user.json` (gitignored), and every spec inherits it. The
setup asserts on Clerk's user menu rather than on generic page structure — the page an
anonymous visitor gets bounced to renders the same landmarks, so a looser check would
pass while signed out and hand the whole suite a useless session.

CI runs typecheck, unit tests and a production build on Node 20, then the Chromium E2E
suite. CodeQL runs on its own workflow.

## Deploying

The frontend targets Vercel: connect the repo, copy the `.env.local` variables into the
project settings, and it deploys on push to `main`. The backend goes out with
`func azure functionapp publish <app-name>` from `backend/`; the keys from
`local.settings.json` become Application Settings in the Function App, with
`ALLOWED_ORIGIN` pointing at the deployed frontend and `CLERK_SECRET_KEY` set — see
below for why that last one is not optional in production.

## Security

Backend authentication is **fail-closed only when `CLERK_SECRET_KEY` is set**. With the
key present, every endpoint requires `Authorization: Bearer <token>` and verifies it
through `@clerk/backend`. With it absent, the backend logs a warning and serves requests
unauthenticated — that is deliberate for local development and dangerous anywhere else,
so set it in the Function App settings before deploying.

- Session identifiers are validated against `^[A-Za-z0-9_-]{1,64}$` before they reach
  the filesystem or blob storage, which is what keeps path traversal out.
- Exercise images must be `data:image/...;base64` URLs; remote URLs are rejected, so the
  grading endpoint cannot be turned into an SSRF probe.
- Chat cache keys include the user identity. Transcription and generation caches are
  content-addressed and carry no identity, which is safe precisely because their inputs
  are supplied by the caller and their outputs derive from nothing else.
- Chunk uploads are idempotent and failed jobs keep their chunks, so a retry resumes
  instead of restarting.
- 500 responses carry generic messages; details stay in the structured logs.

Found something? Open a private security advisory rather than a public issue.

## Docs

- [CONTRIBUTING.md](CONTRIBUTING.md) — branch workflow, commit conventions, release process
- [CODING_STANDARDS.md](CODING_STANDARDS.md) — conventions this codebase actually follows
- [CHANGELOG.md](CHANGELOG.md) — Keep a Changelog, semver
- [AGENTS.md](AGENTS.md) — ground rules for AI agents working in this repo

## License

Proprietary, all rights reserved. You may read and evaluate the code. You may not use
it commercially, run a service with it, redistribute it, modify it, or reuse any part of
it elsewhere. See [LICENSE](LICENSE) for the binding terms; contact the author for
anything beyond evaluation.

Copyright 2026 [Juan Pablo Zanolli](https://github.com/Juanzaan).
