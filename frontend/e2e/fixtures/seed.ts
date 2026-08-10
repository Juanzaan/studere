import { expect, type Page } from '@playwright/test';
import type { StudySession } from '@/lib/types';

/** Mirrors `STORAGE_KEY` in `lib/storage.ts`. */
const SESSIONS_KEY = 'studere.sessions.v1';
/** Mirrors the flag `TutorialOverlay` reads before mounting its backdrop. */
const TUTORIAL_KEY = 'studere.tutorial.completed';

/**
 * Write sessions into localStorage before the app's first render.
 *
 * `page.evaluate` + `page.reload` also works, but leaves a window where the app
 * mounts against empty storage and has to be re-navigated; `addInitScript` runs
 * on every document this page loads, including the first, so the very first
 * paint already sees the data.
 *
 * The tutorial flag goes in alongside it: without it `TutorialOverlay` mounts a
 * full-screen backdrop that swallows every click a spec makes.
 *
 * Seeds only when the key is absent. `addInitScript` runs on *every* document,
 * so writing unconditionally would restore the fixture on each reload and quietly
 * undo whatever the app had persisted — a test that creates a session and then
 * reloads would find it gone, and be reporting a bug that only its own fixture
 * caused. A context starts with empty storage, so the first document still seeds.
 */
export async function seedSessions(page: Page, sessions: StudySession[]) {
  await page.addInitScript(
    ([sessionsKey, tutorialKey, payload]) => {
      if (localStorage.getItem(sessionsKey) === null) localStorage.setItem(sessionsKey, payload);
      localStorage.setItem(tutorialKey, 'true');
    },
    [SESSIONS_KEY, TUTORIAL_KEY, JSON.stringify(sessions)] as const,
  );
}

/**
 * Seed one session and open its detail page by URL.
 *
 * Going through the dashboard would mean clicking a session card, and the
 * dashboard exposes no stable hook for one — the app has no `data-testid`
 * anywhere, which is why the older specs guarded that click and silently
 * skipped their own bodies when it never landed. `/sessions/<id>` reads the same
 * localStorage, so it reaches the panel under test without the detour.
 *
 * Resolves once the session header is on screen, i.e. the session really loaded
 * rather than the shell's "Sesión no encontrada" branch.
 */
export async function openSession(page: Page, session: StudySession) {
  await seedSessions(page, [session]);
  await gotoThroughHandshake(page, `/sessions/${session.id}`);
  await expect(page.getByRole('heading', { name: session.title, level: 1 })).toBeVisible();
}

/** Seed any number of sessions and open an arbitrary route. */
export async function seedAndGoto(page: Page, sessions: StudySession[], path: string) {
  await seedSessions(page, sessions);
  await gotoThroughHandshake(page, path);
}

/**
 * Open a route with no sessions in storage.
 *
 * Still seeds the tutorial flag — the overlay's backdrop is unrelated to whether
 * there is data, and it swallows clicks either way.
 */
export async function gotoEmpty(page: Page, path: string) {
  await seedSessions(page, []);
  await gotoThroughHandshake(page, path);
}

/**
 * Navigate, tolerating Clerk's dev-browser handshake.
 *
 * On a Clerk development instance a context's first navigation is answered with
 * `x-clerk-auth-reason: dev-browser-missing` and bounced through FAPI and back.
 * That aborts the original document request, so `page.goto` rejects with
 * ERR_ABORTED even though the page then loads fine. Waiting for
 * `domcontentloaded` rather than `load` also keeps the call from sitting on
 * late-arriving dev-server chunks. The assertion that follows is the real check
 * that we arrived, so swallowing the abort loses no coverage.
 */
async function gotoThroughHandshake(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  } catch (err) {
    if (!String(err).includes('ERR_ABORTED')) throw err;
  }
}

/**
 * Read a localStorage key as JSON, retrying until `check` passes.
 *
 * Session edits go through a 500 ms throttled write (`useThrottledPersist`), so
 * reading straight after the click that caused them races the write and reads
 * the pre-edit value. Returns the parsed value once it settles.
 */
export async function readStoredJson<T>(
  page: Page,
  key: string,
  check: (value: T | null) => boolean,
): Promise<T> {
  await expect
    .poll(() => page.evaluate((k) => localStorage.getItem(k), key).then((raw) => check(raw ? JSON.parse(raw) : null)))
    .toBe(true);
  const raw = await page.evaluate((k) => localStorage.getItem(k), key);
  return JSON.parse(raw!) as T;
}

/**
 * Switch the session-detail tab bar to one panel.
 *
 * `label` is both the tab's accessible name and the `aria-label` of the region
 * the panel renders into (`PANEL_LABELS` in `components/session-detail.tsx`),
 * so waiting on the region proves the switch took effect.
 */
export async function openPanel(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await expect(page.getByRole('region', { name: label })).toBeVisible();
}
