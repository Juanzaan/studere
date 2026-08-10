import { test, expect, type Locator, type Page } from '@playwright/test';
import { createTestSession } from './fixtures/session-fixture';
import { openPanel, openSession, readStoredJson } from './fixtures/seed';

/**
 * E2E: quiz flow — `components/quiz-viewer.tsx`.
 *
 * The viewer has no submit step and no per-question navigation: all questions
 * render at once, clicking an option answers it immediately and irreversibly
 * (every option in that question is then `disabled`), and the explanation plus
 * the score summary appear on their own.
 *
 * Assertions are scoped to the Quiz region — the concepts sidebar and the
 * summary panel repeat the same vocabulary, so unscoped text matching is
 * ambiguous.
 */

const SESSION = createTestSession({
  id: 'test-quiz-session',
  title: 'Quiz Test Session',
});

const QUIZ = SESSION.quiz;

/** The card wrapping one question, located by that question's own text. */
function questionCard(panel: Locator, index: number): Locator {
  return panel.locator('div').filter({ hasText: QUIZ[index].question }).last();
}

/** Answer one question by option index. */
async function answer(panel: Locator, questionIndex: number, optionIndex: number) {
  const option = QUIZ[questionIndex].options![optionIndex];
  await questionCard(panel, questionIndex).getByRole('button', { name: option }).click();
}

/** Answer every question correctly. */
async function answerAllCorrectly(panel: Locator) {
  for (let i = 0; i < QUIZ.length; i++) {
    await answer(panel, i, QUIZ[i].correct);
  }
}

async function openQuiz(page: Page): Promise<Locator> {
  await openSession(page, SESSION);
  await openPanel(page, 'Quiz');
  return page.getByRole('region', { name: 'Quiz' });
}

test.describe('Quiz Flow (E2E)', () => {
  test('renders every question with its options', async ({ page }) => {
    const panel = await openQuiz(page);

    for (const [i, item] of QUIZ.entries()) {
      await expect(panel.getByText(`${i + 1}. ${item.question}`)).toBeVisible();
      for (const option of item.options!) {
        await expect(panel.getByRole('button', { name: option })).toBeVisible();
      }
    }
    await expect(panel.getByText('0 / 3 respondidas')).toBeVisible();
  });

  test('answering locks the question and reveals the explanation', async ({ page }) => {
    const panel = await openQuiz(page);
    const card = questionCard(panel, 0);

    await expect(card.getByText('Explicación')).toBeHidden();

    await answer(panel, 0, 0);

    await expect(card.getByText('Explicación')).toBeVisible();
    await expect(card.getByText(QUIZ[0].explanation!)).toBeVisible();
    // Every option in the answered question is locked, right one included, so a
    // second click cannot change the score.
    for (const option of QUIZ[0].options!) {
      await expect(card.getByRole('button', { name: option })).toBeDisabled();
    }
  });

  test('counts a correct answer', async ({ page }) => {
    const panel = await openQuiz(page);

    await answer(panel, 0, QUIZ[0].correct);

    await expect(panel.getByText('1 / 3 respondidas')).toBeVisible();
    await expect(panel.getByText('1 correctas')).toBeVisible();
  });

  test('does not count a wrong answer', async ({ page }) => {
    const panel = await openQuiz(page);
    const wrong = QUIZ[0].correct === 0 ? 1 : 0;

    await answer(panel, 0, wrong);

    await expect(panel.getByText('1 / 3 respondidas')).toBeVisible();
    await expect(panel.getByText('0 correctas')).toBeVisible();
    // The explanation still names the right option, which is the point of
    // answering wrong.
    await expect(questionCard(panel, 0).getByText(QUIZ[0].explanation!)).toBeVisible();
  });

  test('shows the score summary once every question is answered', async ({ page }) => {
    const panel = await openQuiz(page);

    await answerAllCorrectly(panel);

    await expect(panel.getByText('3 de 3 correctas')).toBeVisible();
    await expect(panel.getByText('100%')).toBeVisible();
    await expect(panel.getByText('¡Excelente! Dominás el tema.')).toBeVisible();
    await expect(
      panel.getByRole('progressbar', { name: 'Quiz completado: 3 de 3 correctas' }),
    ).toBeVisible();
  });

  test('grades a partially correct run', async ({ page }) => {
    const panel = await openQuiz(page);

    await answer(panel, 0, QUIZ[0].correct);
    await answer(panel, 1, QUIZ[1].correct);
    await answer(panel, 2, QUIZ[2].correct === 0 ? 1 : 0);

    await expect(panel.getByText('2 de 3 correctas')).toBeVisible();
    await expect(panel.getByText('67%')).toBeVisible();
  });

  test('records the finished quiz in analytics storage', async ({ page }) => {
    const panel = await openQuiz(page);

    await answerAllCorrectly(panel);

    const attempts = await readStoredJson<Array<Record<string, unknown>>>(
      page,
      'studere.quiz-attempts.v1',
      (value) => Array.isArray(value) && value.length > 0,
    );

    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      sessionId: SESSION.id,
      correct: QUIZ.length,
      total: QUIZ.length,
    });
  });

  test('writes the accuracy back onto the session', async ({ page }) => {
    const panel = await openQuiz(page);

    await answerAllCorrectly(panel);

    const stored = await readStoredJson<Array<{ studyMetrics: Record<string, unknown> }>>(
      page,
      'studere.sessions.v1',
      (value) => value?.[0]?.studyMetrics?.quizAccuracy === 100,
    );

    expect(stored[0].studyMetrics).toMatchObject({ quizAccuracy: 100 });
  });

  test('reiniciar clears every answer', async ({ page }) => {
    const panel = await openQuiz(page);

    await answerAllCorrectly(panel);
    await panel.getByRole('button', { name: 'Reiniciar' }).click();

    await expect(panel.getByText('0 / 3 respondidas')).toBeVisible();
    await expect(panel.getByText('3 de 3 correctas')).toBeHidden();
    await expect(questionCard(panel, 0).getByText('Explicación')).toBeHidden();
    // Cleared, not merely hidden: the options accept input again.
    await expect(
      questionCard(panel, 0).getByRole('button', { name: QUIZ[0].options![0] }),
    ).toBeEnabled();
  });
});
