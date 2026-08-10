import { test, expect } from '@playwright/test';
import { createTestSession } from './fixtures/session-fixture';
import { openPanel, openSession, readStoredJson } from './fixtures/seed';

/**
 * E2E: session detail — `components/session-detail.tsx` and the panels it hosts.
 *
 * Covers the header (title, metadata, starring, exports, delete), the concepts
 * sidebar, the panel switcher, and the collapsible transcript.
 *
 * Expected strings are read off the fixture rather than written out, so the spec
 * cannot drift from the data it seeds.
 */

const SESSION = createTestSession({
  id: 'test-session-detail',
  title: 'Neurociencia Cognitiva - Clase 1',
});

test.describe('Session Detail Page', () => {
  test('renders the header with title and source metadata', async ({ page }) => {
    await openSession(page, SESSION);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(SESSION.title);
    await expect(
      page.getByText(
        `${SESSION.course} · ${SESSION.sourceFileName} · ${SESSION.stats.estimatedDurationMinutes} min · ${SESSION.stats.wordCount} palabras`,
      ),
    ).toBeVisible();
  });

  test('starring the session persists', async ({ page }) => {
    await openSession(page, SESSION);

    await page.getByRole('button', { name: 'Marcar' }).click();

    await expect(page.getByRole('button', { name: 'Destacada' })).toBeVisible();
    const stored = await readStoredJson<Array<{ starred: boolean }>>(
      page,
      'studere.sessions.v1',
      (value) => value?.[0]?.starred === true,
    );
    expect(stored[0].starred).toBe(true);
  });

  test('lists the key concepts in the sidebar', async ({ page }) => {
    await openSession(page, SESSION);

    await expect(page.getByText('Conceptos', { exact: true })).toBeVisible();
    for (const concept of SESSION.keyConcepts) {
      // Exact match on purpose: the summary prose mentions the same words in
      // running text, and only the sidebar renders a term on its own.
      await expect(page.getByText(concept.term, { exact: true })).toBeVisible();
    }
  });

  test('switches between every focus panel', async ({ page }) => {
    await openSession(page, SESSION);

    // Summary is the default, so it is a region before anything is clicked.
    await expect(page.getByRole('region', { name: 'Resumen IA' })).toBeVisible();

    for (const label of ['Flashcards', 'Quiz', 'Mapa Mental', 'Tareas', 'Insights', 'Mis Notas']) {
      await openPanel(page, label);
      // One panel at a time: the previous region is unmounted, not just hidden.
      await expect(page.getByRole('region', { name: 'Resumen IA' })).toBeHidden();
    }

    await openPanel(page, 'Resumen IA');
    await expect(page.getByRole('region', { name: 'Mis Notas' })).toBeHidden();
  });

  test('renders the summary markdown in the default panel', async ({ page }) => {
    await openSession(page, SESSION);
    const panel = page.getByRole('region', { name: 'Resumen IA' });

    // The fixture's summary is Markdown; the renderer should turn its `#` and
    // `##` lines into real headings rather than print the hashes.
    await expect(panel.getByRole('heading', { name: 'Resumen de la Clase' })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'Puntos Clave' })).toBeVisible();
    await expect(panel.getByText(SESSION.sourceFileName!)).toBeVisible();
  });

  test('transcript is collapsed until opened, then shows every segment', async ({ page }) => {
    await openSession(page, SESSION);
    const panel = page.getByRole('region', { name: 'Resumen IA' });
    const first = SESSION.transcript[0];

    await expect(panel.getByText(first.text)).toBeHidden();

    await panel
      .getByRole('button', { name: `Transcripción (${SESSION.transcript.length} bloques)` })
      .click();

    for (const segment of SESSION.transcript) {
      await expect(panel.getByText(segment.text)).toBeVisible();
    }
  });

  test('filters the transcript by search', async ({ page }) => {
    await openSession(page, SESSION);
    const panel = page.getByRole('region', { name: 'Resumen IA' });
    const [first, second] = SESSION.transcript;

    await panel
      .getByRole('button', { name: `Transcripción (${SESSION.transcript.length} bloques)` })
      .click();
    await panel.getByPlaceholder('Buscar en la transcripción...').fill(first.text.slice(0, 20));

    await expect(panel.getByText(first.text)).toBeVisible();
    await expect(panel.getByText(second.text)).toBeHidden();
  });

  test('exports the session as Markdown', async ({ page }) => {
    await openSession(page, SESSION);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Markdown' }).click();

    expect((await download).suggestedFilename()).toBe(`${SESSION.id}.md`);
  });

  test('exports the flashcards as CSV', async ({ page }) => {
    await openSession(page, SESSION);

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'CSV' }).click();

    expect((await download).suggestedFilename()).toBe(`${SESSION.id}-flashcards.csv`);
  });

  test('delete asks for confirmation before removing the session', async ({ page }) => {
    await openSession(page, SESSION);

    await page.getByRole('button', { name: 'Eliminar' }).click();

    // First click only arms the action.
    await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible();
    await expect(page).toHaveURL(/\/sessions\/test-session-detail/);

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('button', { name: 'Eliminar' })).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    const stored = await readStoredJson<unknown[]>(
      page,
      'studere.sessions.v1',
      (value) => Array.isArray(value) && value.length === 0,
    );
    expect(stored).toHaveLength(0);
  });
});
