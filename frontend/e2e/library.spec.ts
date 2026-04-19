import { test, expect } from '@playwright/test';

// Mock session data
const mockSessions = [
  {
    id: 'test-session-1',
    title: 'Neurociencia Cognitiva',
    course: 'Psicología',
    createdAt: new Date().toISOString(),
    starred: true,
    sourceFileName: 'test1.mp3',
    sourceFileType: 'audio/mp3',
    sourceKind: 'audio' as const,
    templateId: 'class-summary' as const,
    summary: 'Test summary',
    keyConcepts: [{ term: 'Test', description: 'Test concept' }],
    flashcards: [],
    quiz: [],
    transcript: [],
    actionItems: [],
    mindMap: { id: 'root', label: 'Test' },
    bookmarks: [],
    comments: [],
    insights: [],
    chatHistory: [],
    stats: { wordCount: 100, segmentCount: 1, estimatedDurationMinutes: 5 },
    studyMetrics: { completionRate: 0, quizAccuracy: 0, reviewCount: 0 },
  },
  {
    id: 'test-session-2',
    title: 'Marketing Digital',
    course: 'Negocios',
    createdAt: new Date().toISOString(),
    starred: false,
    sourceFileName: 'test2.mp3',
    sourceFileType: 'audio/mp3',
    sourceKind: 'audio' as const,
    templateId: 'class-summary' as const,
    summary: 'Test summary 2',
    keyConcepts: [],
    flashcards: [],
    quiz: [],
    transcript: [],
    actionItems: [],
    mindMap: { id: 'root', label: 'Test' },
    bookmarks: [],
    comments: [],
    insights: [],
    chatHistory: [],
    stats: { wordCount: 150, segmentCount: 2, estimatedDurationMinutes: 8 },
    studyMetrics: { completionRate: 0, quizAccuracy: 0, reviewCount: 0 },
  },
];

test.describe('Library Page', () => {
  test.beforeEach(async ({ page }) => {
    // Setup localStorage with sessions
    await page.goto('http://localhost:3000/library');
    
    // Set localStorage before page loads
    await page.evaluate((sessions) => {
      localStorage.setItem('studere.sessions.v1', JSON.stringify(sessions));
    }, mockSessions);
    
    // Reload to load sessions
    await page.reload();
    
    // Wait for sessions to load
    await page.waitForTimeout(1000);
  });

  test('should display library page with sessions', async ({ page }) => {
    // Check for main heading (actual UI has "Biblioteca")
    await expect(page.getByRole('heading', { name: /biblioteca/i })).toBeVisible();
    
    // Check for search input
    await expect(page.getByPlaceholder(/buscar sesiones/i)).toBeVisible();
  });

  test('should display sessions from localStorage', async ({ page }) => {
    // Should show session cards (mock data loaded)
    await page.waitForTimeout(300);
    
    // Check for session rows using data-session-row attribute
    const sessionRows = page.locator('[data-session-row]');
    await expect(sessionRows.first()).toBeVisible();
    
    // Verify we have at least 2 sessions
    const count = await sessionRows.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should navigate to session detail', async ({ page }) => {
    // Click on first session link
    const firstSessionLink = page.locator('a[href^="/sessions/"]').first();
    await firstSessionLink.click();
    
    // Should navigate to session detail
    await expect(page).toHaveURL(/\/sessions\/.+/);
  });

  test('should toggle star on session', async ({ page }) => {
    // Find star button for first session
    const starButton = page.locator('button[aria-label*="destacar"], button[aria-label*="Destacar"]').first();
    
    if (await starButton.isVisible()) {
      await starButton.click();
      await page.waitForTimeout(300);
      
      // Star button should now have "Quitar" label
      const updatedButton = page.locator('button[aria-label*="Quitar"]').first();
      await expect(updatedButton).toBeVisible();
    }
  });

  test('should show session table headers', async ({ page }) => {
    // Table headers should be visible
    await expect(page.getByText('Sesión')).toBeVisible();
    await expect(page.getByText('Fav')).toBeVisible();
  });

  test('should display session metadata', async ({ page }) => {
    // Session should show title and course (use first() to avoid strict mode)
    await expect(page.getByText('Neurociencia Cognitiva').first()).toBeVisible();
    await expect(page.getByText('Psicología').first()).toBeVisible();
  });
});
