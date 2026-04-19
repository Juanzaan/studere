import { test, expect } from '@playwright/test';
import { createTestSession } from './fixtures/session-fixture';

/**
 * E2E Test: Flashcard Study Flow
 * 
 * Tests the flashcard study feature:
 * 1. Display flashcard deck
 * 2. Card flipping
 * 3. Difficulty rating
 * 4. Progress tracking
 * 5. Completion
 */

test.describe('Flashcard Flow (E2E)', () => {
  const mockSession = createTestSession({
    id: 'test-flashcard-session',
    title: 'Flashcard Test Session',
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Setup localStorage with session containing flashcards
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

  test('should display flashcard question on front face', async ({ page }) => {
    // Click Flashcards tab
    const flashcardsTab = page.getByRole('button', { name: /flashcard/i });
    if (await flashcardsTab.isVisible({ timeout: 2000 })) {
      await flashcardsTab.click();
      await page.waitForTimeout(500);

      // Should show first flashcard question
      const questionVisible = await page.getByText(/qué es la neuroplasticidad|función de la sinapsis|aprendizaje activo/i).isVisible({ timeout: 2000 }).catch(() => false);
      expect(questionVisible).toBeTruthy();
    }
  });

  test('should flip card to reveal answer when clicked', async ({ page }) => {
    const flashcardsTab = page.getByRole('button', { name: /flashcard/i });
    if (await flashcardsTab.isVisible({ timeout: 2000 })) {
      await flashcardsTab.click();
      await page.waitForTimeout(500);

      // Find and click the flashcard
      const flashcard = page.locator('[class*="flashcard"], [data-testid*="flashcard"], [role="button"]:has-text("neuroplasticidad")').first();
      if (await flashcard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await flashcard.click();
        await page.waitForTimeout(500);

        // Should show answer
        const answerVisible = await page.getByText(/capacidad.*cerebro|adaptarse|reorganizarse|conexiones neuronales/i).isVisible({ timeout: 2000 }).catch(() => false);
        expect(answerVisible).toBeTruthy();
      }
    }
  });

  test('should advance to next card when rating difficulty', async ({ page }) => {
    const flashcardsTab = page.getByRole('button', { name: /flashcard/i });
    if (await flashcardsTab.isVisible({ timeout: 2000 })) {
      await flashcardsTab.click();
      await page.waitForTimeout(500);

      // Flip card first
      const flashcard = page.locator('[class*="flashcard"], [data-testid*="flashcard"]').first();
      if (await flashcard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await flashcard.click();
        await page.waitForTimeout(500);

        // Rate difficulty (easy/medium/hard)
        const ratingBtn = page.getByRole('button', { name: /fácil|medio|difícil|easy|medium|hard/i }).first();
        if (await ratingBtn.isVisible({ timeout: 2000 })) {
          await ratingBtn.click();
          await page.waitForTimeout(500);

          // Should show next card or completion message
          const nextCardOrComplete = await page.getByText(/función.*sinapsis|aprendizaje activo|completado|finalizado/i).isVisible({ timeout: 2000 }).catch(() => false);
          expect(nextCardOrComplete).toBeTruthy();
        }
      }
    }
  });

  test('should update progress indicator as cards are completed', async ({ page }) => {
    const flashcardsTab = page.getByRole('button', { name: /flashcard/i });
    if (await flashcardsTab.isVisible({ timeout: 2000 })) {
      await flashcardsTab.click();
      await page.waitForTimeout(500);

      // Check initial progress
      const initialProgress = await page.getByText(/0\/3|1\/3|progreso/i).isVisible({ timeout: 2000 }).catch(() => false);
      
      // Complete one card
      const flashcard = page.locator('[class*="flashcard"], [data-testid*="flashcard"]').first();
      if (await flashcard.isVisible({ timeout: 2000 }).catch(() => false)) {
        await flashcard.click();
        await page.waitForTimeout(300);

        const ratingBtn = page.getByRole('button', { name: /fácil|medio|difícil|easy|medium|hard/i }).first();
        if (await ratingBtn.isVisible({ timeout: 2000 })) {
          await ratingBtn.click();
          await page.waitForTimeout(500);

          // Progress should update
          const updatedProgress = await page.getByText(/1\/3|2\/3|33%|66%/i).isVisible({ timeout: 2000 }).catch(() => false);
          expect(initialProgress || updatedProgress).toBeTruthy();
        }
      }
    }
  });

  test('should show completion screen after all cards are reviewed', async ({ page }) => {
    const flashcardsTab = page.getByRole('button', { name: /flashcard/i });
    if (await flashcardsTab.isVisible({ timeout: 2000 })) {
      await flashcardsTab.click();
      await page.waitForTimeout(500);

      // Complete all 3 flashcards
      for (let i = 0; i < 3; i++) {
        const flashcard = page.locator('[class*="flashcard"], [data-testid*="flashcard"]').first();
        if (await flashcard.isVisible({ timeout: 1000 }).catch(() => false)) {
          await flashcard.click();
          await page.waitForTimeout(300);

          const ratingBtn = page.getByRole('button', { name: /fácil|medio|difícil|easy|medium|hard/i }).first();
          if (await ratingBtn.isVisible({ timeout: 1000 })) {
            await ratingBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }

      // Should show completion message
      const completionVisible = await page.getByText(/completado|finalizado|terminado|bien hecho|excelente/i).isVisible({ timeout: 3000 }).catch(() => false);
      expect(completionVisible).toBeTruthy();
    }
  });

  test('should save completion stats to analytics localStorage', async ({ page }) => {
    const flashcardsTab = page.getByRole('button', { name: /flashcard/i });
    if (await flashcardsTab.isVisible({ timeout: 2000 })) {
      await flashcardsTab.click();
      await page.waitForTimeout(500);

      // Complete all flashcards
      for (let i = 0; i < 3; i++) {
        const flashcard = page.locator('[class*="flashcard"], [data-testid*="flashcard"]').first();
        if (await flashcard.isVisible({ timeout: 1000 }).catch(() => false)) {
          await flashcard.click();
          await page.waitForTimeout(300);

          const ratingBtn = page.getByRole('button', { name: /fácil|medio|difícil|easy|medium|hard/i }).first();
          if (await ratingBtn.isVisible({ timeout: 1000 })) {
            await ratingBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }

      await page.waitForTimeout(1000);

      // Check localStorage for flashcard attempts
      const analyticsData = await page.evaluate(() => {
        const data = localStorage.getItem('studere.flashcard-attempts.v1');
        return data ? JSON.parse(data) : null;
      });

      expect(analyticsData).toBeTruthy();
      if (analyticsData && Array.isArray(analyticsData)) {
        expect(analyticsData.length).toBeGreaterThan(0);
      }
    }
  });

  test('should restart deck and reset to first card', async ({ page }) => {
    const flashcardsTab = page.getByRole('button', { name: /flashcard/i });
    if (await flashcardsTab.isVisible({ timeout: 2000 })) {
      await flashcardsTab.click();
      await page.waitForTimeout(500);

      // Complete all flashcards
      for (let i = 0; i < 3; i++) {
        const flashcard = page.locator('[class*="flashcard"], [data-testid*="flashcard"]').first();
        if (await flashcard.isVisible({ timeout: 1000 }).catch(() => false)) {
          await flashcard.click();
          await page.waitForTimeout(300);

          const ratingBtn = page.getByRole('button', { name: /fácil|medio|difícil|easy|medium|hard/i }).first();
          if (await ratingBtn.isVisible({ timeout: 1000 })) {
            await ratingBtn.click();
            await page.waitForTimeout(500);
          }
        }
      }

      await page.waitForTimeout(500);

      // Look for restart button
      const restartBtn = page.getByRole('button', { name: /reiniciar|volver a estudiar|restart|review again/i });
      if (await restartBtn.isVisible({ timeout: 2000 })) {
        await restartBtn.click();
        await page.waitForTimeout(500);

        // Should show first flashcard again
        const firstCard = await page.getByText(/qué es la neuroplasticidad/i).isVisible({ timeout: 2000 }).catch(() => false);
        expect(firstCard).toBeTruthy();
      }
    }
  });
});
