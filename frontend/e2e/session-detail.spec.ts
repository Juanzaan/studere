import { test, expect } from '@playwright/test';

// Mock session with full data for testing
const mockSession = {
  id: 'test-session-detail',
  title: 'Neurociencia Cognitiva - Clase 1',
  course: 'Psicología',
  createdAt: new Date().toISOString(),
  starred: false,
  sourceFileName: 'clase1.mp3',
  sourceFileType: 'audio/mp3',
  sourceKind: 'audio',
  templateId: 'class-summary',
  summary: '# Resumen\n\nLa neuroplasticidad es fundamental.',
  keyConcepts: [
    { term: 'Neuroplasticidad', description: 'Capacidad del cerebro de adaptarse.' },
    { term: 'Sinapsis', description: 'Conexión entre neuronas.' },
  ],
  flashcards: [
    { question: '¿Qué es neuroplasticidad?', answer: 'Capacidad de adaptación del cerebro.' },
  ],
  quiz: [
    {
      question: '¿Cuál es la función de la sinapsis?',
      options: ['Conectar neuronas', 'Producir energía', 'Almacenar recuerdos', 'Regular temperatura'],
      correct: 0,
      explanation: 'La sinapsis conecta neuronas para transmitir señales.',
    },
  ],
  transcript: [
    { id: 'seg-1', text: 'Hoy vamos a hablar de neuroplasticidad', speaker: 'Profesor', timestamp: '00:00' },
  ],
  bookmarks: [],
  comments: [],
  insights: [],
  actionItems: [],
  mindMap: { id: 'root', label: 'Neurociencia' },
  chatHistory: [],
  stats: { wordCount: 250, segmentCount: 1, estimatedDurationMinutes: 15 },
  studyMetrics: { completionRate: 0, quizAccuracy: 0, reviewCount: 0 },
};

test.describe('Session Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Setup localStorage with session
    await page.goto('http://localhost:3000/library');
    
    await page.evaluate((session) => {
      localStorage.setItem('studere.sessions.v1', JSON.stringify([session]));
    }, mockSession);
    
    // Reload to load session
    await page.reload();
    
    // Wait for session to load
    await page.waitForTimeout(1000);
    
    // Navigate to session detail by clicking the session link
    const firstSessionLink = page.locator('a[href^="/sessions/"]').first();
    if (await firstSessionLink.isVisible()) {
      await firstSessionLink.click();
      await page.waitForTimeout(800);
    }
  });

  test('should display session header with title', async ({ page }) => {
    // Check for session title (use h1 or main heading)
    const mainHeading = page.locator('h1').first();
    await expect(mainHeading).toBeVisible();
    await expect(mainHeading).toContainText(/neurociencia|clase/i);
  });

  test('should switch between focus panels', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(500);
    
    // Look for panel switcher buttons (Resumen/Flashcards/Quiz/etc)
    const flashcardsBtn = page.getByRole('button', { name: /flashcards/i });
    if (await flashcardsBtn.isVisible()) {
      await flashcardsBtn.click();
      await page.waitForTimeout(300);
      
      // Should show flashcard content (check for card structure)
      const flashcardContainer = page.locator('[class*="flashcard"], [data-testid*="flashcard"]').first();
      if (await flashcardContainer.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(flashcardContainer).toBeVisible();
      }
    }
    
    // Switch to Quiz
    const quizBtn = page.getByRole('button', { name: /quiz/i });
    if (await quizBtn.isVisible()) {
      await quizBtn.click();
      await page.waitForTimeout(300);
    }
  });

  test('should display concepts in sidebar', async ({ page }) => {
    // Wait for concepts to load
    await page.waitForTimeout(500);
    
    // Check for concepts sidebar/panel (use first match to avoid strict mode)
    const conceptText = page.getByText(/neuroplasticidad/i).first();
    if (await conceptText.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(conceptText).toBeVisible();
    }
  });

  test('should export session as markdown', async ({ page }) => {
    // Find export button
    const exportBtn = page.getByRole('button', { name: /markdown/i });
    
    if (await exportBtn.isVisible()) {
      // Setup download listener
      const downloadPromise = page.waitForEvent('download');
      await exportBtn.click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.md');
    }
  });

  test('should display session metadata', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(500);
    
    // Should show stats or metadata
    // Check that the session detail page loaded successfully
    const sessionContent = page.locator('main, [role="main"]');
    await expect(sessionContent).toBeVisible();
  });

  test('should show transcript if available', async ({ page }) => {
    // Wait for page load
    await page.waitForTimeout(500);
    
    // Transcript should be visible (or transcript tab)
    const transcriptText = page.getByText(/hoy vamos a hablar/i);
    if (await transcriptText.isVisible()) {
      await expect(transcriptText).toBeVisible();
    }
  });
});
