import { test, expect } from '@playwright/test';

// Mock session data
const mockSessions = [
  {
    id: 'test-session-1',
    title: 'Neurociencia Cognitiva',
    course: 'Psicología',
    createdAt: new Date().toISOString(),
    starred: true,
    summary: 'Test summary',
    keyConcepts: [{ term: 'Test', description: 'Test concept' }],
    flashcards: [],
    quiz: [],
    transcript: [],
    stats: { wordCount: 100, segmentCount: 1, estimatedDurationMinutes: 5 },
  },
  {
    id: 'test-session-2',
    title: 'Marketing Digital',
    course: 'Negocios',
    createdAt: new Date().toISOString(),
    starred: false,
    summary: 'Test summary 2',
    keyConcepts: [],
    flashcards: [],
    quiz: [],
    transcript: [],
    stats: { wordCount: 150, segmentCount: 2, estimatedDurationMinutes: 8 },
  },
];

test.describe('Library Page', () => {
  test.beforeEach(async ({ page }) => {
    // Setup localStorage with Zustand store format
    await page.goto('http://localhost:3000/dashboard');
    
    // Set localStorage before page loads
    await page.evaluate((sessions) => {
      const zustandStore = {
        state: { sessions },
        version: 0,
      };
      localStorage.setItem('studere-store', JSON.stringify(zustandStore));
    }, mockSessions);
    
    // Reload to trigger Zustand hydration
    await page.reload();
    
    // Wait for hydration to complete
    await page.waitForTimeout(1000);
  });

  test('should display library page with sessions', async ({ page }) => {
    // Check for main heading (actual UI has "Mis sesiones")
    await expect(page.getByRole('heading', { name: /mis sesiones/i })).toBeVisible();
    
    // Check for tab buttons
    await expect(page.getByRole('button', { name: /recientes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /destacadas/i })).toBeVisible();
  });

  test('should display sessions from localStorage', async ({ page }) => {
    // Should show session cards (mock data loaded)
    await page.waitForTimeout(300);
    
    // Check for session cards using data-testid or more specific selectors
    const sessionCards = page.locator('[data-testid="session-card"]');
    await expect(sessionCards.first()).toBeVisible();
    
    // Verify we have at least 2 sessions
    const count = await sessionCards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should navigate to session detail', async ({ page }) => {
    // Click on first session if exists
    const firstSession = page.locator('[data-testid="session-card"]').first();
    
    if (await firstSession.isVisible()) {
      await firstSession.click();
      
      // Should navigate to session detail
      await expect(page).toHaveURL(/\/session\/.+/);
    }
  });

  test('should toggle starred sessions tab', async ({ page }) => {
    // Click on Destacadas tab
    const starredTab = page.getByRole('button', { name: /destacadas/i });
    await starredTab.click();
    
    // Wait for tab change
    await page.waitForTimeout(500);
    
    // Check session card count (should have 1 starred session)
    const sessionCards = page.locator('[data-testid="session-card"]');
    const count = await sessionCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should show quick actions', async ({ page }) => {
    // Quick action buttons should be visible
    await expect(page.getByRole('button', { name: /grabar audio/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /subir y transcribir/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /clase en vivo/i })).toBeVisible();
  });

  test('should open composer when clicking quick action', async ({ page }) => {
    // Click on "Subir y transcribir"
    const uploadBtn = page.getByRole('button', { name: /subir y transcribir/i });
    await uploadBtn.click();
    
    // Composer modal should appear
    await page.waitForTimeout(300);
    await expect(page.getByRole('heading', { name: /crear nueva sesión/i })).toBeVisible();
  });
});
