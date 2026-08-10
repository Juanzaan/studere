import { test, expect, type Locator, type Page } from '@playwright/test';
import { createTestSession, mockGenerationResponse } from './fixtures/session-fixture';
import { notesField, openComposer, stubBackend, submitButton, titleField } from './fixtures/composer';
import { openPanel } from './fixtures/seed';

/**
 * E2E: AI generation — what the composer does with the response from
 * `/api/generate-study-session`.
 *
 * `session-create-flow.spec.ts` covers the form; this one covers the merge in
 * `handleSubmit` step 3: which fields of the generated package replace the ones
 * `createStudySession` derived locally, and what happens when the call fails.
 *
 * Every test here has to distinguish AI content from local content, because the
 * composer builds a complete, plausible session from heuristics before it ever
 * calls the backend. A session that renders a summary, a deck and a quiz proves
 * nothing on its own — it looks identical with the network dead. So the
 * assertions are on strings only the stub can produce.
 *
 * The previous version drove `/library` looking for `input[name="title"]` and
 * `textarea[name="transcript"]`, none of which exist, so all sixteen
 * `isVisible()` guards were false and all five bodies were skipped. Two of those
 * tests were also unfixable as written: they asserted a "Reintentar" button and a
 * content-filter message, and neither exists anywhere in the composer —
 * "Reintentar" appears only in `audio-recorder-widget.tsx` and
 * `error-boundary.tsx`, and there is no content-filter branch at all. What the
 * app actually does on a failed generation is warn and keep the local content,
 * which is what the two tests below assert instead.
 */

/** Clears the `rawText.length > 30` gate that enables generation. */
const NOTES =
  'La neuroplasticidad es la capacidad del cerebro de reorganizar sus conexiones. ' +
  'Las sinapsis son las uniones entre neuronas que transmiten señales. ' +
  'El aprendizaje activo fortalece esas conexiones mediante la práctica deliberada.';

/** Only there to give the hydration barrier something to wait for. */
const SEED = createTestSession({ id: 'ai-seed', title: 'Sesión previa', course: 'Historia' });

const GENERATE_URL = '**/api/generate-study-session';

/** The package the stub returns, and the source of every expected string below. */
const AI = mockGenerationResponse.output;

type GenerateRequest = { transcript: string; language: string; summaryFocus: string };

const stubGeneration = (page: Page) =>
  stubBackend<GenerateRequest, typeof mockGenerationResponse>(page, GENERATE_URL, () => ({
    body: mockGenerationResponse,
  }));

/** Fill the composer and submit it. Returns the card, which the skeleton replaces. */
async function compose(page: Page, title: string, notes = NOTES): Promise<Locator> {
  const card = await openComposer(page, SEED);
  await titleField(card).fill(title);
  await notesField(card).fill(notes);
  await submitButton(card).click();
  return card;
}

test.describe('Generación con IA', () => {
  test('the generated package replaces the local content in every panel', async ({ page }) => {
    const sent = await stubGeneration(page);
    await compose(page, 'Neuroplasticidad');

    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      transcript: NOTES,
      language: 'auto',
      summaryFocus: 'Neuroplasticidad',
    });

    // The generated summary is Markdown with an `#` heading; the local one is
    // just the first sentences of the notes joined by blank lines. So a real
    // heading in the panel can only have come from the response.
    const summary = page.getByRole('region', { name: 'Resumen IA' });
    await expect(summary.getByRole('heading', { name: 'Resumen de la Clase' })).toBeVisible();

    // Counts as well as text: the local generator produces up to 18 cards and up
    // to 12 quiz items from these notes, so "de 2" and "/ 1" are themselves proof
    // that the AI arrays replaced them rather than being appended to them.
    await openPanel(page, 'Flashcards');
    const flashcards = page.getByRole('region', { name: 'Flashcards' });
    await expect(flashcards.getByText(AI.flashcards[0].question)).toBeVisible();
    await expect(flashcards.getByText(`1 de ${AI.flashcards.length}`)).toBeVisible();

    await openPanel(page, 'Quiz');
    const quiz = page.getByRole('region', { name: 'Quiz' });
    await expect(quiz.getByText(`1. ${AI.quiz[0].question}`)).toBeVisible();
    await expect(quiz.getByText(`0 / ${AI.quiz.length} respondidas`)).toBeVisible();

    await openPanel(page, 'Tareas');
    await expect(
      page.getByRole('region', { name: 'Tareas' }).getByText(AI.actionItems[0].title),
    ).toBeVisible();
  });

  test('the skeleton reports progress while the request is in flight', async ({ page }) => {
    // The stub holds the response open, so the in-flight UI is observable instead
    // of being a frame between the click and the redirect.
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await stubBackend<GenerateRequest, typeof mockGenerationResponse>(
      page,
      GENERATE_URL,
      async () => {
        await held;
        return { body: mockGenerationResponse };
      },
    );

    const card = await compose(page, 'Sesión en vuelo');

    await expect(card.getByText('Generando con IA...')).toBeVisible();
    await expect(
      card.getByText('Esto puede tardar unos segundos. No cerrés la página.'),
    ).toBeVisible();
    await expect(card.getByText('Generar resumen, flashcards y quiz')).toBeVisible();
    // The skeleton replaces the form outright, so a second submit is impossible
    // while a generation is running.
    await expect(submitButton(card)).toBeHidden();

    release();

    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });
  });

  /**
   * Assert the session was created from local content only.
   *
   * The positive half carries as much weight as the negative one: the deck
   * rendering at all is what separates "generation failed and the local package
   * stood in" from "nothing was created".
   */
  async function expectLocalFallback(page: Page, title: string) {
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();

    await expect(
      page.getByRole('region', { name: 'Resumen IA' }).getByRole('heading', {
        name: 'Resumen de la Clase',
      }),
    ).toBeHidden();

    await openPanel(page, 'Flashcards');
    const flashcards = page.getByRole('region', { name: 'Flashcards' });
    await expect(flashcards.getByText(AI.flashcards[0].question)).toBeHidden();
    await expect(flashcards.getByRole('button', { name: 'Ver respuesta' })).toBeVisible();
  }

  test('a server error warns and keeps the local content', async ({ page }) => {
    await stubBackend<GenerateRequest, { error: string }>(page, GENERATE_URL, () => ({
      status: 500,
      body: { error: 'El modelo no está disponible' },
    }));

    await compose(page, 'Sesión sin IA');

    // Asserted before the redirect on purpose: toasts auto-dismiss after 5 s and
    // a cold `/sessions/[id]` compile can take far longer than that.
    await expect(page.getByText('Generación con IA falló')).toBeVisible();
    await expect(
      page.getByText(
        'Error al generar sesión de estudio: El modelo no está disponible. Usando contenido local.',
      ),
    ).toBeVisible();

    await expectLocalFallback(page, 'Sesión sin IA');
  });

  test('a response with no usable output is treated as a failed generation', async ({ page }) => {
    // `generateStudySession` rejects anything whose `output` is missing or a
    // string, so this is the malformed-payload path rather than a transport one.
    await stubBackend<GenerateRequest, { output: string }>(page, GENERATE_URL, () => ({
      body: { output: 'La IA devolvió texto plano' },
    }));

    await compose(page, 'Sesión con respuesta inválida');

    await expect(page.getByText('Generación con IA falló')).toBeVisible();
    // The doubled period is the app's: it appends ". Usando contenido local." to
    // a message that already ends in one.
    await expect(
      page.getByText(
        'AI returned an unparseable response. Please try again.. Usando contenido local.',
      ),
    ).toBeVisible();

    await expectLocalFallback(page, 'Sesión con respuesta inválida');
  });

  test('generated content that fails the normalizer is dropped on read', async ({ page }) => {
    // `normalizeSession` re-validates every session as it comes back out of
    // localStorage: a quiz explanation under 8 words is rejected outright. So the
    // composer can merge, save and redirect successfully and the panel still ends
    // up empty — the merge is not the last word on what the user sees.
    await stubBackend<GenerateRequest, typeof mockGenerationResponse>(page, GENERATE_URL, () => ({
      body: {
        ...mockGenerationResponse,
        output: {
          ...AI,
          quiz: [{ ...AI.quiz[0], explanation: 'Conecta neuronas.' }],
        },
      },
    }));

    await compose(page, 'Sesión con quiz inválido');

    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });
    // The rest of the package survives, so this is the normalizer rejecting one
    // field rather than the whole generation having failed.
    await expect(
      page.getByRole('region', { name: 'Resumen IA' }).getByRole('heading', {
        name: 'Resumen de la Clase',
      }),
    ).toBeVisible();

    await openPanel(page, 'Quiz');
    await expect(
      page.getByRole('region', { name: 'Quiz' }).getByText('No hay preguntas para esta sesión.'),
    ).toBeVisible();
  });

  test('notes below the length gate never reach the generator', async ({ page }) => {
    const sent = await stubGeneration(page);
    await compose(page, 'Apunte breve', 'Repasar el capítulo 4.');

    // The button still promised AI — the label only looks at whether there is any
    // material, while `handleSubmit` requires more than 30 characters of it. The
    // session is created locally with no warning that the AI was skipped.
    await expect(page).toHaveURL(/\/sessions\/[^/]+$/, { timeout: 60_000 });
    expect(sent).toEqual([]);
    await expect(page.getByRole('heading', { name: 'Apunte breve', level: 1 })).toBeVisible();
  });
});
