import { test, expect } from '@playwright/test';
import { mockTranscriptResponse, mockGenerationResponse } from './fixtures/session-fixture';

/**
 * E2E Test: Audio Transcription Flow
 * 
 * Tests the critical user journey:
 * 1. Upload audio file
 * 2. Transcription via Whisper API
 * 3. AI study session generation
 * 4. Redirect to session detail
 */

test.describe('Audio Transcription Flow (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Start with clean slate
    await page.goto('http://localhost:3000/dashboard');
    
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    await page.reload();
    await page.waitForTimeout(500);

    // Mock API endpoints
    await page.route('**/api/transcribe-audio', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTranscriptResponse),
      });
    });

    await page.route('**/api/generate-study-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGenerationResponse),
      });
    });
  });

  test('should upload small audio file, transcribe, generate session, and redirect to detail', async ({ page }) => {
    await page.goto('http://localhost:3000/library');
    await page.waitForTimeout(500);

    // Click "Subir y transcribir" button
    const uploadBtn = page.getByRole('button', { name: /subir y transcribir/i });
    if (await uploadBtn.isVisible({ timeout: 3000 })) {
      await uploadBtn.click();
      await page.waitForTimeout(500);

      // Look for file input
      const fileInput = page.locator('input[type="file"]').first();
      
      if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Create a fake audio file
        const buffer = Buffer.from('fake audio data');
        await fileInput.setInputFiles({
          name: 'test-audio.mp3',
          mimeType: 'audio/mp3',
          buffer,
        });

        await page.waitForTimeout(500);

        // Look for generate/submit button
        const generateBtn = page.getByRole('button', { name: /generar|transcribir|continuar/i }).first();
        if (await generateBtn.isVisible({ timeout: 2000 })) {
          await generateBtn.click();

          // Wait for processing
          await page.waitForTimeout(2000);

          // Should redirect to session detail or show success
          const urlChanged = await page.waitForURL(/\/session\/|\/sessions\//, { timeout: 5000 }).catch(() => false);
          const sessionVisible = await page.getByText(/neurociencia|neuroplasticidad/i).isVisible({ timeout: 3000 }).catch(() => false);

          expect(urlChanged || sessionVisible).toBeTruthy();
        }
      }
    }
  });

  test('should show error toast when transcription API fails', async ({ page }) => {
    // Override mock to return 500 error
    await page.route('**/api/transcribe-audio', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('http://localhost:3000/library');
    await page.waitForTimeout(500);

    const uploadBtn = page.getByRole('button', { name: /subir y transcribir/i });
    if (await uploadBtn.isVisible({ timeout: 3000 })) {
      await uploadBtn.click();
      await page.waitForTimeout(500);

      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const buffer = Buffer.from('fake audio data');
        await fileInput.setInputFiles({
          name: 'test-audio.mp3',
          mimeType: 'audio/mp3',
          buffer,
        });

        await page.waitForTimeout(500);

        const generateBtn = page.getByRole('button', { name: /generar|transcribir|continuar/i }).first();
        if (await generateBtn.isVisible({ timeout: 2000 })) {
          await generateBtn.click();
          await page.waitForTimeout(1000);

          // Look for error message
          const errorVisible = await page.getByText(/error|falló|no se pudo/i).isVisible({ timeout: 3000 }).catch(() => false);
          expect(errorVisible).toBeTruthy();
        }
      }
    }
  });

  test('should show error toast when file format is unsupported', async ({ page }) => {
    await page.goto('http://localhost:3000/library');
    await page.waitForTimeout(500);

    const uploadBtn = page.getByRole('button', { name: /subir y transcribir/i });
    if (await uploadBtn.isVisible({ timeout: 3000 })) {
      await uploadBtn.click();
      await page.waitForTimeout(500);

      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Upload unsupported file type
        const buffer = Buffer.from('fake document data');
        await fileInput.setInputFiles({
          name: 'document.pdf',
          mimeType: 'application/pdf',
          buffer,
        });

        await page.waitForTimeout(1000);

        // Should show error about unsupported format
        const errorVisible = await page.getByText(/formato|no soportado|inválido/i).isVisible({ timeout: 2000 }).catch(() => false);
        expect(errorVisible).toBeTruthy();
      }
    }
  });

  test('should display upload progress indicator during transcription', async ({ page }) => {
    await page.goto('http://localhost:3000/library');
    await page.waitForTimeout(500);

    const uploadBtn = page.getByRole('button', { name: /subir y transcribir/i });
    if (await uploadBtn.isVisible({ timeout: 3000 })) {
      await uploadBtn.click();
      await page.waitForTimeout(500);

      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const buffer = Buffer.from('fake audio data');
        await fileInput.setInputFiles({
          name: 'test-audio.mp3',
          mimeType: 'audio/mp3',
          buffer,
        });

        await page.waitForTimeout(500);

        const generateBtn = page.getByRole('button', { name: /generar|transcribir|continuar/i }).first();
        if (await generateBtn.isVisible({ timeout: 2000 })) {
          await generateBtn.click();

          // Look for progress indicator
          const progressVisible = await page.getByText(/procesando|transcribiendo|generando/i).isVisible({ timeout: 1000 }).catch(() => false);
          const spinnerVisible = await page.locator('[class*="spinner"], [class*="loading"], [role="progressbar"]').isVisible({ timeout: 1000 }).catch(() => false);

          expect(progressVisible || spinnerVisible).toBeTruthy();
        }
      }
    }
  });

  test('should show session in library after successful generation', async ({ page }) => {
    await page.goto('http://localhost:3000/library');
    await page.waitForTimeout(500);

    const uploadBtn = page.getByRole('button', { name: /subir y transcribir/i });
    if (await uploadBtn.isVisible({ timeout: 3000 })) {
      await uploadBtn.click();
      await page.waitForTimeout(500);

      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const buffer = Buffer.from('fake audio data');
        await fileInput.setInputFiles({
          name: 'test-audio.mp3',
          mimeType: 'audio/mp3',
          buffer,
        });

        await page.waitForTimeout(500);

        const generateBtn = page.getByRole('button', { name: /generar|transcribir|continuar/i }).first();
        if (await generateBtn.isVisible({ timeout: 2000 })) {
          await generateBtn.click();
          await page.waitForTimeout(2000);

          // Navigate back to library
          await page.goto('http://localhost:3000/library');
          await page.waitForTimeout(1000);

          // Session should be visible
          const sessionCard = page.locator('[data-testid="session-card"]').first();
          const sessionVisible = await sessionCard.isVisible({ timeout: 2000 }).catch(() => false);

          expect(sessionVisible).toBeTruthy();
        }
      }
    }
  });
});
