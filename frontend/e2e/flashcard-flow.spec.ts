import { test, expect, type Locator, type Page } from '@playwright/test';
import { createTestSession } from './fixtures/session-fixture';
import { openPanel, openSession, readStoredJson } from './fixtures/seed';

/**
 * E2E: flashcard study flow — `components/flashcard-viewer.tsx`.
 *
 * Covers the front/back faces, confidence rating, progress, deck completion,
 * the analytics write, and restart.
 *
 * Every assertion is scoped to the Flashcards region. Unscoped text matching is
 * ambiguous here: the concepts sidebar renders "Neuroplasticidad" and
 * "Sinapsis" too, so a bare `getByText(/neuroplasticidad/i)` is a strict-mode
 * violation rather than a check on the card.
 */

const SESSION = createTestSession({
  id: 'test-flashcard-session',
  title: 'Flashcard Test Session',
});

const CARDS = SESSION.flashcards;

/** Flip the current card and rate it, which advances to the next one. */
async function reviewCard(panel: Locator, confidence = 'Bien') {
  await panel.getByRole('button', { name: 'Ver respuesta' }).click();
  await panel.getByRole('button', { name: confidence, exact: true }).click();
}

/** Rate every card in the deck, ending on the completion state. */
async function reviewWholeDeck(panel: Locator) {
  for (let i = 0; i < CARDS.length; i++) {
    await reviewCard(panel);
  }
  await expect(panel.getByText('¡Deck completo!')).toBeVisible();
}

async function openFlashcards(page: Page): Promise<Locator> {
  await openSession(page, SESSION);
  await openPanel(page, 'Flashcards');
  return page.getByRole('region', { name: 'Flashcards' });
}

test.describe('Flashcard Flow (E2E)', () => {
  test('shows the first question on the front face', async ({ page }) => {
    const panel = await openFlashcards(page);

    await expect(panel.getByText(CARDS[0].question)).toBeVisible();
    await expect(panel.getByText('PREGUNTA')).toBeVisible();
    await expect(panel.getByText('1 de 3')).toBeVisible();
    // The answer stays hidden until the card is flipped.
    await expect(panel.getByText(CARDS[0].answer)).toBeHidden();
  });

  test('flips to reveal the answer', async ({ page }) => {
    const panel = await openFlashcards(page);

    await panel.getByRole('button', { name: 'Ver respuesta' }).click();

    await expect(panel.getByText(CARDS[0].answer)).toBeVisible();
    await expect(panel.getByText('RESPUESTA')).toBeVisible();
    // The flip target's own label is the state: it now offers the way back.
    await expect(panel.getByRole('button', { name: 'Ver pregunta' })).toBeVisible();
  });

  test('rating a card advances to the next one', async ({ page }) => {
    const panel = await openFlashcards(page);

    await reviewCard(panel);

    await expect(panel.getByText(CARDS[1].question)).toBeVisible();
    await expect(panel.getByText('2 de 3')).toBeVisible();
    // Advancing resets the face, so the rating buttons are gone again.
    await expect(panel.getByRole('button', { name: 'Bien', exact: true })).toBeHidden();
  });

  test('progress tracks the furthest card reached', async ({ page }) => {
    const panel = await openFlashcards(page);
    const bar = panel.getByRole('progressbar', { name: 'Progreso de flashcards' });

    await expect(bar).toHaveAttribute('aria-valuenow', '33');
    await expect(panel.getByText('33%')).toBeVisible();

    await reviewCard(panel);
    await expect(bar).toHaveAttribute('aria-valuenow', '67');

    await reviewCard(panel);
    await expect(bar).toHaveAttribute('aria-valuenow', '100');
  });

  test('shows the completion summary once the deck is rated', async ({ page }) => {
    const panel = await openFlashcards(page);

    await reviewWholeDeck(panel);

    await expect(panel.getByText('3 flashcards repasadas.')).toBeVisible();
    // Completion fires on wrapping past the last card, so the deck is back on
    // card 1 while the progress bar stays at 100%.
    await expect(panel.getByText(CARDS[0].question)).toBeVisible();
    await expect(
      panel.getByRole('progressbar', { name: 'Progreso de flashcards' }),
    ).toHaveAttribute('aria-valuenow', '100');
  });

  test('records the finished deck in analytics storage', async ({ page }) => {
    const panel = await openFlashcards(page);

    await reviewWholeDeck(panel);

    const attempts = await readStoredJson<Array<Record<string, unknown>>>(
      page,
      'studere.flashcard-attempts.v1',
      (value) => Array.isArray(value) && value.length > 0,
    );

    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      sessionId: SESSION.id,
      reviewed: CARDS.length,
    });
    expect(typeof attempts[0].timestamp).toBe('string');
  });

  test('persists the confidence rating onto the card', async ({ page }) => {
    const panel = await openFlashcards(page);

    await reviewCard(panel, 'Fácil');

    const stored = await readStoredJson<Array<{ flashcards: Array<Record<string, unknown>> }>>(
      page,
      'studere.sessions.v1',
      (value) => Boolean(value?.[0]?.flashcards?.[0]?.confidence),
    );

    expect(stored[0].flashcards[0]).toMatchObject({ confidence: 'easy' });
    expect(stored[0].flashcards[0].nextReview).toBeTruthy();
    expect(stored[0].flashcards[1].confidence).toBeUndefined();
  });

  test('restart returns the deck to the first card', async ({ page }) => {
    const panel = await openFlashcards(page);

    await reviewWholeDeck(panel);
    await panel.getByRole('button', { name: 'Reiniciar' }).click();

    await expect(panel.getByText('¡Deck completo!')).toBeHidden();
    await expect(panel.getByText(CARDS[0].question)).toBeVisible();
    await expect(
      panel.getByRole('progressbar', { name: 'Progreso de flashcards' }),
    ).toHaveAttribute('aria-valuenow', '33');
  });
});
