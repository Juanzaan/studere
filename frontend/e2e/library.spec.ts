import { test, expect, type Page } from '@playwright/test';
import { createTestSession } from './fixtures/session-fixture';
import { gotoEmpty, readStoredJson, seedAndGoto } from './fixtures/seed';

/**
 * E2E: library page — `components/library-page.tsx` plus the table it renders
 * through `components/session-records-table.tsx`.
 *
 * Covers the three filters, the text search, the row links, the star toggle and
 * all three empty states. Each test seeds its own sessions, because the empty
 * states depend on what is in storage and a shared `beforeEach` could not
 * produce them.
 */

const DAY = 24 * 60 * 60 * 1000;

const STARRED = createTestSession({
  id: 'lib-starred',
  title: 'Neurociencia Cognitiva',
  course: 'Psicología',
  starred: true,
});

/** Older than the 7-day window the "Esta semana" filter applies. */
const ARCHIVED = createTestSession({
  id: 'lib-archived',
  title: 'Marketing Digital',
  course: 'Negocios',
  starred: false,
  createdAt: new Date(Date.now() - 30 * DAY).toISOString(),
});

const SESSIONS = [STARRED, ARCHIVED];

const rows = (page: Page) => page.locator('[data-session-row]');

/** A single table row, picked by the title it renders. */
function row(page: Page, title: string) {
  return rows(page).filter({ hasText: title });
}

async function applyFilter(page: Page, label: string) {
  const button = page.getByRole('button', { name: label, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
}

/**
 * Seed, open `/library`, and wait until the seeded rows are on screen.
 *
 * The wait is not cosmetic. The filter buttons and the search box are in the
 * server-rendered HTML, but the list itself only appears after the mount effect
 * reads localStorage. Clicking a filter before React hydrates is a silent no-op
 * — the event has nowhere to go, the component never re-renders, and the
 * assertion that follows waits out its whole timeout against unchanged markup.
 * Rows exist only post-hydration, so they are the signal that handlers are live.
 */
async function openLibrary(page: Page, sessions = SESSIONS) {
  await seedAndGoto(page, sessions, '/library');
  await expect(rows(page)).toHaveCount(sessions.length);
}

test.describe('Library Page', () => {
  test('renders the header, filters and search box', async ({ page }) => {
    await openLibrary(page);

    await expect(page.getByRole('heading', { name: 'Biblioteca' })).toBeVisible();
    // A link, not a button: composing happens on the dashboard.
    await expect(page.getByRole('link', { name: 'Nueva sesión' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    await expect(page.getByLabel('Buscar sesiones en la biblioteca')).toBeVisible();

    // "Recientes" is the mount default, so the pressed state is meaningful
    // before anything is clicked.
    await expect(page.getByRole('button', { name: 'Recientes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    for (const label of ['Destacadas', 'Esta semana']) {
      await expect(page.getByRole('button', { name: label })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    }
  });

  test('lists every stored session with its course', async ({ page }) => {
    await openLibrary(page);

    await expect(rows(page)).toHaveCount(SESSIONS.length);
    for (const session of SESSIONS) {
      const line = row(page, session.title);
      await expect(line).toBeVisible();
      await expect(line.getByText(session.course!)).toBeVisible();
    }
  });

  test('renders the table headers for the current viewport', async ({ page }) => {
    await openLibrary(page);

    await expect(page.getByRole('columnheader', { name: 'Sesión' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Fav' })).toBeVisible();

    // Duración, Fecha and Creador are `md:table-cell` — present on the desktop
    // projects, dropped on the two mobile ones. Assert whichever the viewport
    // this test is running under should produce, so neither is left untested.
    const isWide = (page.viewportSize()?.width ?? 0) >= 768;
    for (const name of ['Duración', 'Fecha', 'Creador']) {
      const header = page.getByRole('columnheader', { name });
      if (isWide) await expect(header).toBeVisible();
      else await expect(header).toBeHidden();
    }
  });

  test('opens a session from its row', async ({ page }) => {
    await openLibrary(page);

    await row(page, ARCHIVED.title).getByRole('link').click();

    // Longer than the global expect cap on purpose: this is a client-side
    // navigation, so under `next dev` the URL does not change until the target
    // route has finished its on-demand compile, and a cold `/sessions/[id]`
    // takes longer than 15s often enough to flake.
    await expect(page).toHaveURL(new RegExp(`/sessions/${ARCHIVED.id}$`), { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: ARCHIVED.title, level: 1 })).toBeVisible();
  });

  test('the Destacadas filter keeps only starred sessions', async ({ page }) => {
    await openLibrary(page);

    await applyFilter(page, 'Destacadas');

    await expect(rows(page)).toHaveCount(1);
    await expect(row(page, STARRED.title)).toBeVisible();
  });

  test('the Esta semana filter drops anything older than seven days', async ({ page }) => {
    await openLibrary(page);

    await applyFilter(page, 'Esta semana');

    await expect(rows(page)).toHaveCount(1);
    await expect(row(page, STARRED.title)).toBeVisible();
  });

  test('search matches on title and on course', async ({ page }) => {
    await openLibrary(page);
    const search = page.getByLabel('Buscar sesiones en la biblioteca');

    await search.fill('marketing');
    await expect(rows(page)).toHaveCount(1);
    await expect(row(page, ARCHIVED.title)).toBeVisible();

    // Course is part of the same haystack as the title, and only this session
    // carries it.
    await search.fill('Negocios');
    await expect(rows(page)).toHaveCount(1);
    await expect(row(page, ARCHIVED.title)).toBeVisible();

    await search.fill('');
    await expect(rows(page)).toHaveCount(SESSIONS.length);
  });

  test('starring a session from the table persists', async ({ page }) => {
    await openLibrary(page);
    const target = row(page, ARCHIVED.title);

    await target.getByRole('button', { name: 'Destacar sesión' }).click();

    await expect(target.getByRole('button', { name: 'Quitar de destacados' })).toBeVisible();
    const stored = await readStoredJson<Array<{ id: string; starred: boolean }>>(
      page,
      'studere.sessions.v1',
      (value) => value?.find((s) => s.id === ARCHIVED.id)?.starred === true,
    );
    expect(stored.find((s) => s.id === ARCHIVED.id)!.starred).toBe(true);
    // The other row is untouched by the toggle.
    expect(stored.find((s) => s.id === STARRED.id)!.starred).toBe(true);
  });

  test('empty state when there are no sessions at all', async ({ page }) => {
    await gotoEmpty(page, '/library');

    await expect(page.getByRole('heading', { name: 'Sin sesiones todavía' })).toBeVisible();
    await expect(
      page.getByText('Todas tus sesiones de estudio aparecen acá. Creá una desde Inicio para empezar.'),
    ).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
  });

  test('empty state when the search matches nothing', async ({ page }) => {
    await openLibrary(page);

    await page.getByLabel('Buscar sesiones en la biblioteca').fill('termodinámica');

    await expect(page.getByRole('heading', { name: 'Sin resultados' })).toBeVisible();
    await expect(page.getByText('Probá con otra búsqueda o filtro.')).toBeVisible();
  });

  test('empty state when a filter excludes every session', async ({ page }) => {
    // Nothing starred here, so "Destacadas" empties the table without a query —
    // which is the third, distinct empty title.
    await openLibrary(page, [{ ...STARRED, starred: false }, ARCHIVED]);

    await applyFilter(page, 'Destacadas');

    await expect(page.getByRole('heading', { name: 'Nada por aquí' })).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
  });
});
