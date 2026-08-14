# Contributing to Studere

Thanks for helping! This document defines the workflow, coding standards, and
release process for the Studere monorepo. Keep it in sync when the process
changes.

## Repository layout

- `frontend/` — Next.js 14 (App Router), TypeScript strict, Tailwind, Clerk, Vitest + Playwright.
- `backend/` — Azure Functions v4 (Node 18), Azure OpenAI, Blob Storage.
- `.github/workflows/ci.yml` — CI pipeline (GitHub only reads the root, so the
  workflow lives there, not under `frontend/`).
- `AGENTS.md` — conventions for AI agents working in this repo.

## Branch workflow

`main` is the protected branch. The workflow is:

1. Create a branch (`git checkout -b feat/...`).
2. Make changes. Commits use [Conventional Commits](https://www.conventionalcommits.org/):
   `feat|fix|docs|chore|ci|refactor|security(scope): message`.
3. Open a PR against `main`. CI must pass before merge (enforced by branch
   protection, see below).
4. Merge the PR. No force-push, no `--amend` of pushed commits, no direct
   pushes to `main` (the owner may bypass temporarily).

Before opening the PR, run the frontend quality gates — the same ones CI enforces:

```bash
npm run typecheck        # tsc --noEmit — must be clean
npm run test -- --run    # full Vitest suite — must be green
npm run build            # production build — must succeed
```

Never commit `node_modules/`, real `.env*` files, build artifacts, or
screenshots/captures. Stage files explicitly (`git add path/a path/b`) and
review `git status` before committing.

## CHANGELOG policy

- Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
- Versioning follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).
- Every user-visible change gets an entry in the matching category of the
  version section it ships in: **Added / Changed / Fixed / Deprecated /
  Removed / Security**.
- Changes are grouped per PR/batch — a PR that only adds tests or docs for an
  already-listed change does not need its own entry.
- Entries can reference issues/commits for traceability.
- The `Unreleased` section is renamed to `[X.Y.Z] - YYYY-MM-DD` at release time;
  a new `Unreleased` section is then opened.

## Releases

A release happens when `main` has accumulated changes worth shipping:

1. Bump the frontend version in the app that owns the change (`frontend/package.json`).
2. Rename `Unreleased` in `CHANGELOG.md` to the version + date, and add any
   missing entries.
3. Commit the version bump as `chore(release): X.Y.Z`.
4. Tag `vX.Y.Z` and create a GitHub Release with the changes from that CHANGELOG section.

CI (typecheck + tests + build) must be green before releasing. Backend deploys
remain manual (owner).

## CI

- The workflow lives at `.github/workflows/ci.yml` (root) and runs on every push/PR.
- Jobs: TypeScript check, unit tests (Vitest), production build, and the Chromium
  E2E suite (`setup` project signs in with Clerk test credentials, then runs
  `--project=chromium`). The E2E job needs the `CLERK_PUBLISHABLE_KEY`,
  `CLERK_SECRET_KEY` and `E2E_CLERK_USER_EMAIL` secrets to exist.
- Branch protection on `main` requires the `Test & Build (20.x)` check to pass
  before merging.