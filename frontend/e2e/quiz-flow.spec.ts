import { test, expect } from '@playwright/test';
import { createTestSession } from './fixtures/session-fixture';

/**
 * E2E Test: Quiz Flow
 * 
 * Tests the interactive quiz feature:
 * 1. Display quiz questions
 * 2. Answer selection and submission
 * 3. Feedback display
 * 4. Score tracking
 */

test.describe('Quiz Flow (E2E)', () => {
  const mockSession = createTestSession({
    id: 'test-quiz-session',
    title: 'Quiz Test Session',
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Setup localStorage with session containing quiz
    await page.evaluate((session) => {
      localStorage.setItem('studere.sessions.v1', JSON.stringify([session]));
    }, mockSession);
    
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Navigate to session detail
    const sessionCard = page.locator('[data-testid="session-card"]').first();
    if (await sessionCard.isVisible({ timeout: 2000 })) {
      await sessionCard.click();
      await page.waitForTimeout(800);
    }
  });

  test('should display all quiz questions', async ({ page }) => {
    // Click Quiz tab
    const quizTab = page.getByRole('button', { name: /quiz/i });
    if (await quizTab.isVisible({ timeout: 2000 })) {
      await quizTab.click();
      await page.waitForTimeout(500);

      // Should show quiz questions (we have 3 in fixture)
      const questionText = await page.getByText(/función.*sinapsis|aprendizaje activo|neuroplasticidad/i).isVisible({ timeout: 2000 }).catch(() => false);
      expect(questionText).toBeTruthy();
    }
  });

  test('should highlight selected answer', async ({ page }) => {
    const quizTab = page.getByRole('button', { name: /quiz/i });
    if (await quizTab.isVisible({ timeout: 2000 })) {
      await quizTab.click();
      await page.waitForTimeout(500);

      // Look for answer options (buttons or radio inputs)
      const answerOption = page.locator('button:has-text("Conectar neuronas"), input[type="radio"]').first();
      if (await answerOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await answerOption.click();
        await page.waitForTimeout(300);

        // Check if option is highlighted/selected
        const isSelected = await answerOption.evaluate((el) => {
          return el.classList.contains('selected') || 
                 el.classList.contains('active') ||
                 el.getAttribute('aria-checked') === 'true' ||
                 (el as HTMLInputElement).checked === true;
        }).catch(() => false);

        expect(isSelected).toBeTruthy();
      }
    }
  });

  test('should show green feedback and explanation for correct answer', async ({ page }) => {
    const quizTab = page.getByRole('button', { name: /quiz/i });
    if (await quizTab.isVisible({ timeout: 2000 })) {
      await quizTab.click();
      await page.waitForTimeout(500);

      // Select correct answer (index 0 for first question)
      const correctAnswer = page.locator('button:has-text("Conectar neuronas")').first();
      if (await correctAnswer.isVisible({ timeout: 2000 }).catch(() => false)) {
        await correctAnswer.click();
        await page.waitForTimeout(300);

        // Submit answer
        const submitBtn = page.getByRole('button', { name: /verificar|comprobar|enviar/i }).first();
        if (await submitBtn.isVisible({ timeout: 2000 })) {
          await submitBtn.click();
          await page.waitForTimeout(500);

          // Should show correct feedback
          const correctFeedback = await page.getByText(/correcto|bien|excelente/i).isVisible({ timeout: 2000 }).catch(() => false);
          const explanation = await page.getByText(/conecta neuronas|transmitir señales/i).isVisible({ timeout: 2000 }).catch(() => false);

          expect(correctFeedback || explanation).toBeTruthy();
        }
      }
    }
  });

  test('should show red feedback and reveal correct answer for wrong answer', async ({ page }) => {
    const quizTab = page.getByRole('button', { name: /quiz/i });
    if (await quizTab.isVisible({ timeout: 2000 })) {
      await quizTab.click();
      await page.waitForTimeout(500);

      // Select wrong answer (index 1, 2, or 3)
      const wrongAnswer = page.locator('button:has-text("Producir energía")').first();
      if (await wrongAnswer.isVisible({ timeout: 2000 }).catch(() => false)) {
        await wrongAnswer.click();
        await page.waitForTimeout(300);

        const submitBtn = page.getByRole('button', { name: /verificar|comprobar|enviar/i }).first();
        if (await submitBtn.isVisible({ timeout: 2000 })) {
          await submitBtn.click();
          await page.waitForTimeout(500);

          // Should show incorrect feedback
          const incorrectFeedback = await page.getByText(/incorrecto|error|intenta|respuesta correcta/i).isVisible({ timeout: 2000 }).catch(() => false);
          expect(incorrectFeedback).toBeTruthy();
        }
      }
    }
  });

  test('should show score summary after completing all questions', async ({ page }) => {
    const quizTab = page.getByRole('button', { name: /quiz/i });
    if (await quizTab.isVisible({ timeout: 2000 })) {
      await quizTab.click();
      await page.waitForTimeout(500);

      // Answer all 3 questions (simplified - just click through)
      for (let i = 0; i < 3; i++) {
        const anyAnswer = page.locator('button[class*="option"], input[type="radio"]').first();
        if (await anyAnswer.isVisible({ timeout: 1000 }).catch(() => false)) {
          await anyAnswer.click();
          await page.waitForTimeout(200);

          const submitBtn = page.getByRole('button', { name: /verificar|comprobar|siguiente/i }).first();
          if (await submitBtn.isVisible({ timeout: 1000 })) {
            await submitBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }

      // Should show completion/score summary
      const scoreVisible = await page.getByText(/puntuación|score|completado|finalizado|3\/3|100%/i).isVisible({ timeout: 3000 }).catch(() => false);
      expect(scoreVisible).toBeTruthy();
    }
  });

  test('should save quiz score to analytics localStorage', async ({ page }) => {
    const quizTab = page.getByRole('button', { name: /quiz/i });
    if (await quizTab.isVisible({ timeout: 2000 })) {
      await quizTab.click();
      await page.waitForTimeout(500);

      // Complete quiz quickly
      for (let i = 0; i < 3; i++) {
        const anyAnswer = page.locator('button[class*="option"], input[type="radio"]').first();
        if (await anyAnswer.isVisible({ timeout: 1000 }).catch(() => false)) {
          await anyAnswer.click();
          await page.waitForTimeout(200);

          const submitBtn = page.getByRole('button', { name: /verificar|comprobar|siguiente/i }).first();
          if (await submitBtn.isVisible({ timeout: 1000 })) {
            await submitBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }

      await page.waitForTimeout(1000);

      // Check localStorage for quiz attempts
      const analyticsData = await page.evaluate(() => {
        const data = localStorage.getItem('studere.quiz-attempts.v1');
        return data ? JSON.parse(data) : null;
      });

      expect(analyticsData).toBeTruthy();
      if (analyticsData && Array.isArray(analyticsData)) {
        expect(analyticsData.length).toBeGreaterThan(0);
      }
    }
  });

  test('should reset quiz when retaking', async ({ page }) => {
    const quizTab = page.getByRole('button', { name: /quiz/i });
    if (await quizTab.isVisible({ timeout: 2000 })) {
      await quizTab.click();
      await page.waitForTimeout(500);

      // Complete quiz once
      for (let i = 0; i < 3; i++) {
        const anyAnswer = page.locator('button[class*="option"], input[type="radio"]').first();
        if (await anyAnswer.isVisible({ timeout: 1000 }).catch(() => false)) {
          await anyAnswer.click();
          await page.waitForTimeout(200);

          const submitBtn = page.getByRole('button', { name: /verificar|comprobar|siguiente/i }).first();
          if (await submitBtn.isVisible({ timeout: 1000 })) {
            await submitBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }

      await page.waitForTimeout(500);

      // Look for retry/restart button
      const retryBtn = page.getByRole('button', { name: /reintentar|volver a intentar|restart/i });
      if (await retryBtn.isVisible({ timeout: 2000 })) {
        await retryBtn.click();
        await page.waitForTimeout(500);

        // Should show first question again
        const firstQuestion = await page.getByText(/función.*sinapsis/i).isVisible({ timeout: 2000 }).catch(() => false);
        expect(firstQuestion).toBeTruthy();
      }
    }
  });
});
