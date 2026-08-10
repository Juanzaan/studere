import { expect, type Locator, type Page } from '@playwright/test';
import type { StudySession } from '@/lib/types';
import { seedAndGoto } from './seed';

/**
 * Locators and stubs for `components/session-composer-card.tsx`.
 *
 * Shared by the three specs that drive it — session creation, AI generation and
 * audio transcription — because all three need the same three facts about it:
 * it lives on `/dashboard`, its fields have no `name` or `id` to select on, and
 * its file input is `sr-only`.
 */

/**
 * The composer card.
 *
 * `data-tutorial="composer"` is the anchor the tutorial overlay already uses, so
 * it is a real attribute of the component rather than a hook added for tests.
 * The card is rendered by `DashboardHome` whenever `composerMode` is `"upload"`,
 * which is the mount default — no click is needed to reach it.
 */
export const composer = (page: Page) => page.locator('[data-tutorial="composer"]');

/**
 * The form fields, by placeholder.
 *
 * Their labels are plain `<span>`s inside a wrapping `<label>`, so they do give
 * each control an accessible name, but the placeholders are the more literal
 * read of the component and survive a label reword. None of these inputs has a
 * `name` or an `id` — the previous version of these specs looked for
 * `input[name="title"]` and `textarea[name="transcript"]`, matched nothing, and
 * skipped its own body.
 */
export const titleField = (card: Locator) => card.getByPlaceholder('Ej. Marketing digital — clase 3');
export const courseField = (card: Locator) => card.getByPlaceholder('Ej. Historia económica');
export const notesField = (card: Locator) => card.getByPlaceholder(/^Pegá apuntes/);

/**
 * The file input.
 *
 * `sr-only`, and the visible dropzone is the `<label>` wrapping it, so it is
 * driven directly. `setInputFiles` does not require the input to be clickable,
 * which is what makes this work where a click on the input would not.
 */
export const fileField = (card: Locator) => card.locator('input[type="file"]');

/**
 * The submit button.
 *
 * Its label is state-dependent — "Crear sesión" with AI off or no material,
 * "Crear con IA" with both, "Creando..." mid-flight — so the locator matches the
 * common prefix and the tests assert the exact text where it is the point.
 */
export const submitButton = (card: Locator) => card.getByRole('button', { name: /^Crea/ });

/** The "Con IA" switch, an `sr-only` checkbox named by the `<span>` beside it. */
export const aiToggle = (card: Locator) => card.getByRole('checkbox', { name: 'Con IA' });

/**
 * Flip the "Con IA" switch by clicking its label.
 *
 * The checkbox itself is `sr-only` and its visible track is a sibling `<div>`
 * painted over it, so a click on the input fails the hit-target check. Clicking
 * the text is both what a user does and what the implicit label association is
 * for. Exact matching keeps it off the "Crear con IA" button.
 */
export async function toggleAI(card: Locator) {
  await card.getByText('Con IA', { exact: true }).click();
}

/**
 * Seed one session, open `/dashboard`, and wait for React to hydrate.
 *
 * The barrier is not cosmetic. Every field in the composer is server-rendered
 * but inert until hydration attaches the delegated listeners, so a `fill` that
 * lands first updates the DOM value and nothing else: React never sees the
 * text, `title` stays empty, and the submit button stays disabled forever.
 *
 * The sidebar's "Recientes" list is the signal — it renders empty on the server
 * and only fills once the mount effect has read localStorage. Counted rather
 * than asserted visible, because its entry animation starts the links at zero
 * opacity and below `lg` the whole aside is translated off-canvas.
 *
 * The seeded session is incidental to the composer; it exists to give that
 * barrier something to wait for.
 */
export async function openComposer(page: Page, seed: StudySession) {
  await seedAndGoto(page, [seed], '/dashboard');
  await expect(
    page
      .getByRole('complementary', { name: 'Navegación principal' })
      .getByRole('link', { name: seed.title }),
  ).toHaveCount(1, { timeout: 60_000 });
  return composer(page);
}

/**
 * Headers every stub needs.
 *
 * The backend is on `localhost:7071` — a different origin from the app — so a
 * fulfilled response without these is blocked by the browser before the app can
 * read it, and the test ends up exercising the failure path it was not written
 * for.
 */
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
};

/** What a stub should answer with. */
export type StubResponse<T> = { status?: number; body: T };

/**
 * Answer a backend endpoint, recording every request body it received.
 *
 * The returned array is the assertion surface: it is what proves the app called
 * the endpoint, how many times, and with what payload. Asserting only on what
 * rendered cannot tell a real response apart from the composer's local
 * fallback, which produces a perfectly plausible session with the network dead.
 *
 * `respond` is async so a test can hold the response open and observe the
 * in-flight UI before releasing it.
 */
export async function stubBackend<TRequest, TResponse>(
  page: Page,
  url: string,
  respond: (body: TRequest) => StubResponse<TResponse> | Promise<StubResponse<TResponse>>,
): Promise<TRequest[]> {
  const sent: TRequest[] = [];

  await page.route(url, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }

    const body = route.request().postDataJSON() as TRequest;
    sent.push(body);

    const { status = 200, body: payload } = await respond(body);
    await route.fulfill({
      status,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  return sent;
}
