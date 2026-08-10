import { test, expect, type Page } from '@playwright/test';
import { createTestSession, mockGenerationResponse } from './fixtures/session-fixture';
import {
  aiToggle,
  courseField,
  fileField,
  notesField,
  openComposer,
  stubBackend,
  submitButton,
  titleField,
  toggleAI,
} from './fixtures/composer';
import { readStoredJson } from './fixtures/seed';

/**
 * E2E: session creation — the composer card, from an empty form to a saved
 * session and the redirect into it.
 *
 * The AI merge and the audio pipeline have their own specs; this one is about
 * the form itself: what is required, what the switch changes, what reaches the
 * backend, and what ends up in storage.
 *
 * The previous version drove `/library` looking for a "Crear sesión" button and
 * `input[name="title"]`. The composer is on `/dashboard` and its inputs carry no
 * `name`, so every selector missed, every `isVisible()` guard was false, the
 * bodies never ran, and the one assertion left standing was `expect(true).toBe(true)`.
 */

/** Long enough to clear the `rawText.length > 30` gate that enables generation. */
const NOTES =
  'La neuroplasticidad es la capacidad del cerebro de reorganizar sus conexiones. ' +
  'Las sinapsis son las uniones entre neuronas que transmiten señales. ' +
  'El aprendizaje activo fortalece esas conexiones mediante la práctica deliberada.';

/** Only there to give the hydration barrier something to wait for. */
const SEED = createTestSession({ id: 'create-seed', title: 'Sesión previa', course: 'Historia' });

/** Request body the composer posts to the generation endpoint. */
type GenerateRequest = { transcript: string; language: string; summaryFocus: string };

const stubGeneration = (page: Page) =>
  stubBackend<GenerateRequest, typeof mockGenerationResponse>(
    page,
    '**/api/generate-study-session',
    () => ({ body: mockGenerationResponse }),
  );

test.describe('Creación de sesión', () => {
  test('creates a session from pasted notes and opens its detail page', async ({ page }) => {
    const sent = await stubGeneration(page);
    const card = await openComposer(page, SEED);

    // The title is the only required field, and the button reflects that before
    // anything is typed.
    await expect(submitButton(card)).toBeDisabled();

    await titleField(card).fill('Neuroplasticidad');
    await courseField(card).fill('Psicología');
    await notesField(card).fill(NOTES);

    // "Crear con IA" rather than "Crear sesión" — the switch is on and there is
    // material, so the click below is the AI path and not the local one.
    await expect(submitButton(card)).toHaveText('Crear con IA');
    await submitButton(card).click();

    // Client-side navigation under `next dev` waits on an on-demand compile of
    // `/sessions/[id]`, which outruns the global expect cap when cold.
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: 'Neuroplasticidad', level: 1 })).toBeVisible();

    // What the app sent, not just what it rendered: a generation failure still
    // produces a complete session from local heuristics, so asserting on the
    // page alone would pass with the endpoint never called.
    expect(sent).toHaveLength(1);
    expect(sent[0].transcript).toBe(NOTES);
    expect(sent[0].summaryFocus).toBe('Neuroplasticidad');

    const stored = await readStoredJson<Array<{ title: string; course: string }>>(
      page,
      'studere.sessions.v1',
      (value) => value?.some((s) => s.title === 'Neuroplasticidad') ?? false,
    );
    expect(stored.find((s) => s.title === 'Neuroplasticidad')?.course).toBe('Psicología');
  });

  test('a created session survives a reload and is listed in the library', async ({ page }) => {
    await stubGeneration(page);
    const card = await openComposer(page, SEED);

    await titleField(card).fill('Sesión persistida');
    await notesField(card).fill(NOTES);
    await submitButton(card).click();
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });

    // A reload re-reads localStorage from scratch, so this is the check that the
    // session was written and not merely held in React state.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Sesión persistida', level: 1 })).toBeVisible({
      timeout: 60_000,
    });

    await page.goto('/library');
    await expect(
      page.locator('[data-session-row]').filter({ hasText: 'Sesión persistida' }),
    ).toBeVisible({ timeout: 60_000 });
  });

  test('a text file supplies the transcript when the notes are empty', async ({ page }) => {
    const sent = await stubGeneration(page);
    const card = await openComposer(page, SEED);

    await titleField(card).fill('Apuntes de clase');
    await fileField(card).setInputFiles({
      name: 'apuntes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(NOTES, 'utf8'),
    });

    await expect(card.getByText('Archivo listo')).toBeVisible();
    await expect(card.getByText('apuntes.txt')).toBeVisible();
    // A file counts as material too, so the label flips without any notes.
    await expect(submitButton(card)).toHaveText('Crear con IA');

    await submitButton(card).click();

    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });
    // The notes box was never touched, so the transcript can only have come from
    // reading the attachment.
    expect(sent).toHaveLength(1);
    expect(sent[0].transcript).toBe(NOTES);
  });

  test('an attached file can be removed again', async ({ page }) => {
    const card = await openComposer(page, SEED);

    await fileField(card).setInputFiles({
      name: 'apuntes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(NOTES, 'utf8'),
    });
    await expect(card.getByText('Archivo listo')).toBeVisible();

    await card.getByRole('button', { name: 'Quitar archivo' }).click();

    await expect(card.getByText('Archivo listo')).toBeHidden();
    await expect(card.getByText('Arrastrá un archivo o hacé click para subir')).toBeVisible();
  });

  test('turning the AI switch off creates the session without calling the backend', async ({
    page,
  }) => {
    const sent = await stubGeneration(page);
    const card = await openComposer(page, SEED);

    await titleField(card).fill('Sesión local');
    await notesField(card).fill(NOTES);
    await expect(submitButton(card)).toHaveText('Crear con IA');

    await toggleAI(card);

    await expect(aiToggle(card)).not.toBeChecked();
    await expect(submitButton(card)).toHaveText('Crear sesión');
    await submitButton(card).click();

    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });
    // The session still exists — it is built locally either way — but nothing
    // was asked of the backend.
    await expect(page.getByRole('heading', { name: 'Sesión local', level: 1 })).toBeVisible();
    expect(sent).toEqual([]);
  });

  test('warns that the AI has nothing to work with until notes or a file arrive', async ({
    page,
  }) => {
    const card = await openComposer(page, SEED);
    const warning = card.getByText(
      'Subí un audio/video o pegá apuntes para que la IA genere contenido de calidad.',
    );

    await expect(warning).toBeVisible();
    await expect(submitButton(card)).toHaveText('Crear sesión');

    await notesField(card).fill(NOTES);

    await expect(warning).toBeHidden();
    await expect(submitButton(card)).toHaveText('Crear con IA');
  });
});
