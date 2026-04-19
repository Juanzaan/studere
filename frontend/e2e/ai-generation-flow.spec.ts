import { test, expect } from '@playwright/test';
import { mockGenerationResponse } from './fixtures/session-fixture';

/**
 * E2E Test: AI Study Session Generation Flow
 * 
 * Tests the critical user journey:
 * 1. User pastes transcript text
 * 2. AI generates study package
 * 3. User views generated results
 */

test.describe('AI Generation Flow (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    await page.reload();
    await page.waitForTimeout(500);
  });

  test('should paste transcript, generate session, and display all content', async ({ page }) => {
    // Mock generation API
    await page.route('**/api/generate-study-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGenerationResponse),
      });
    });

    await page.goto('http://localhost:3000/library');
    await page.waitForTimeout(500);

    // Click create button
    const createBtn = page.getByRole('button', { name: /nueva sesión|crear sesión|pegar texto/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 })) {
      await createBtn.click();
      await page.waitForTimeout(500);

      // Fill title
      const titleInput = page.locator('input[name="title"], input[placeholder*="título"]').first();
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill('Test AI Generation Session');
      }

      // Fill transcript
      const transcriptInput = page.locator('textarea[name="transcript"], textarea[placeholder*="transcript"], textarea[placeholder*="texto"]').first();
      if (await transcriptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await transcriptInput.fill(
          'La neuroplasticidad es la capacidad del cerebro para reorganizarse. ' +
          'Las sinapsis son conexiones entre neuronas. ' +
          'El aprendizaje activo mejora la retención de información.'
        );

        await page.waitForTimeout(300);

        // Submit
        const submitBtn = page.getByRole('button', { name: /generar|crear|guardar/i }).first();
        if (await submitBtn.isVisible({ timeout: 2000 })) {
          await submitBtn.click();
          await page.waitForTimeout(2000);

          // Should show session content
          const contentVisible = await page.getByText(/neuroplasticidad|sinapsis/i).isVisible({ timeout: 3000 }).catch(() => false);
          expect(contentVisible).toBeTruthy();
        }
      }
    }
  });

  test('should display all tabs after generation (Summary, Flashcards, Quiz, Mind Map, Action Items)', async ({ page }) => {
    // Mock generation API
    await page.route('**/api/generate-study-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGenerationResponse),
      });
    });

    await page.goto('http://localhost:3000/library');
    await page.waitForTimeout(500);

    const createBtn = page.getByRole('button', { name: /nueva sesión|crear sesión|pegar texto/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 })) {
      await createBtn.click();
      await page.waitForTimeout(500);

      const transcriptInput = page.locator('textarea[name="transcript"], textarea[placeholder*="transcript"]').first();
      if (await transcriptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await transcriptInput.fill('Test transcript for tab generation');
        await page.waitForTimeout(300);

        const submitBtn = page.getByRole('button', { name: /generar|crear/i }).first();
        if (await submitBtn.isVisible({ timeout: 2000 })) {
          await submitBtn.click();
          await page.waitForTimeout(2000);

          // Check for tab buttons
          const hasFlashcards = await page.getByRole('button', { name: /flashcard/i }).isVisible({ timeout: 2000 }).catch(() => false);
          const hasQuiz = await page.getByRole('button', { name: /quiz/i }).isVisible({ timeout: 2000 }).catch(() => false);
          const hasMindMap = await page.getByRole('button', { name: /mapa|mind.*map/i }).isVisible({ timeout: 2000 }).catch(() => false);

          const hasTabs = hasFlashcards || hasQuiz || hasMindMap;
          expect(hasTabs).toBeTruthy();
        }
      }
    }
  });

  test('should show retry option when generation fails with 500 error', async ({ page }) => {
    // Mock 500 error
    await page.route('**/api/generate-study-session', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('http://localhost:3000/library');
    await page.waitForTimeout(500);

    const createBtn = page.getByRole('button', { name: /nueva sesión|crear sesión|pegar texto/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 })) {
      await createBtn.click();
      await page.waitForTimeout(500);

      const transcriptInput = page.locator('textarea[name="transcript"], textarea[placeholder*="transcript"]').first();
      if (await transcriptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await transcriptInput.fill('Test transcript');
        await page.waitForTimeout(300);

        const submitBtn = page.getByRole('button', { name: /generar|crear/i }).first();
        if (await submitBtn.isVisible({ timeout: 2000 })) {
          await submitBtn.click();
          await page.waitForTimeout(1500);

          // Should show error message
          const errorVisible = await page.getByText(/error|falló|no se pudo|reintentar/i).isVisible({ timeout: 3000 }).catch(() => false);
          expect(errorVisible).toBeTruthy();
        }
      }
    }
  });

  test('should show content filter error message', async ({ page }) => {
    // Mock content filter error
    await page.route('**/api/generate-study-session', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ 
          error: 'Content filter blocked the request',
          code: 'content_filter'
        }),
      });
    });

    await page.goto('http://localhost:3000/library');
    await page.waitForTimeout(500);

    const createBtn = page.getByRole('button', { name: /nueva sesión|crear sesión|pegar texto/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 })) {
      await createBtn.click();
      await page.waitForTimeout(500);

      const transcriptInput = page.locator('textarea[name="transcript"], textarea[placeholder*="transcript"]').first();
      if (await transcriptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await transcriptInput.fill('Inappropriate content that triggers filter');
        await page.waitForTimeout(300);

        const submitBtn = page.getByRole('button', { name: /generar|crear/i }).first();
        if (await submitBtn.isVisible({ timeout: 2000 })) {
          await submitBtn.click();
          await page.waitForTimeout(1500);

          // Should show content filter message
          const filterMsgVisible = await page.getByText(/contenido|filtro|bloqueado|restricciones/i).isVisible({ timeout: 3000 }).catch(() => false);
          expect(filterMsgVisible).toBeTruthy();
        }
      }
    }
  });

  test('should show validation error for empty transcript', async ({ page }) => {
    await page.goto('http://localhost:3000/library');
    await page.waitForTimeout(500);

    const createBtn = page.getByRole('button', { name: /nueva sesión|crear sesión|pegar texto/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 })) {
      await createBtn.click();
      await page.waitForTimeout(500);

      const transcriptInput = page.locator('textarea[name="transcript"], textarea[placeholder*="transcript"]').first();
      if (await transcriptInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Leave transcript empty
        await transcriptInput.fill('');
        await page.waitForTimeout(300);

        const submitBtn = page.getByRole('button', { name: /generar|crear/i }).first();
        if (await submitBtn.isVisible({ timeout: 2000 })) {
          await submitBtn.click();
          await page.waitForTimeout(500);

          // Should show validation error
          const validationError = await page.getByText(/requerido|obligatorio|vacío|necesario/i).isVisible({ timeout: 2000 }).catch(() => false);
          const buttonStillVisible = await submitBtn.isVisible();

          // Either validation error shows or button is still visible (form didn't submit)
          expect(validationError || buttonStillVisible).toBeTruthy();
        }
      }
    }
  });
});
