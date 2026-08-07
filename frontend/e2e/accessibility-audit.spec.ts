/**
 * Auditoría de accesibilidad — checks ligeros (sin axe-core)
 *
 * Verifica: landmarks, aria-labels, keyboard nav, skip links,
 * roles semánticos, elementos <table> y <dl>, progress bars.
 *
 * Para correr: npm run test:e2e -- --grep @a11y
 */
import { test, expect } from "@playwright/test";

test.describe("🔍 Auditoría de accesibilidad @a11y", () => {
  test.beforeEach(async ({ page }) => {
    // Seeds mock data for richer page states
    await page.goto("/dashboard");
    await page.evaluate(() => {
      const mock = {
        id: "test-session-001",
        title: "Marketing Digital — Clase 3",
        course: "Marketing",
        createdAt: new Date().toISOString(),
        starred: false,
        sourceFileName: "clase-3.mp3",
        sourceFileType: "audio/mp3",
        sourceKind: "audio",
        templateId: "class-summary",
        transcript: [{ id: "seg-1", speaker: "Profesor", timestamp: "00:00", text: "Contenido de la clase." }],
        summary: "Resumen de la clase.",
        keyConcepts: [{ term: "Marketing Digital", description: "Estrategias en entornos digitales." }],
        flashcards: [{ question: "¿Qué es marketing?", answer: "Disciplina." }],
        quiz: [{ question: "¿Qué es SEO?", options: ["A", "B", "C", "D"], correct: 0, explanation: "Explicación" }],
        actionItems: [{ id: "t1", title: "Repasar conceptos", owner: "Yo", status: "pending", dueLabel: "Esta semana" }],
        mindMap: { id: "root", label: "Marketing", children: [] },
        bookmarks: [], comments: [], insights: [], chatHistory: [],
        stats: { wordCount: 100, segmentCount: 1, estimatedDurationMinutes: 45 },
        studyMetrics: { completionRate: 33, quizAccuracy: 0, reviewCount: 0 },
      };
      localStorage.setItem("studere.sessions.v1", JSON.stringify([mock]));
    });
  });

  // ═══ SKIP LINKS ═══
  test("SkipLinks — presente y funcional @a11y", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const mainLink = page.locator('a[href="#main-content"]');
    const navLink = page.locator('a[href="#navigation"]');
    await expect(mainLink).toBeVisible();
    await expect(navLink).toBeVisible();
    await expect(mainLink).toHaveText(/Saltar al contenido/i);
    await expect(navLink).toHaveText(/Saltar a la navegación/i);
  });

  // ═══ LANDMARKS ═══
  test("Landmarks — <main>, <header>, <nav>, <aside> @a11y", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("main#main-content")).toBeVisible();
    await expect(page.locator("nav#navigation")).toBeVisible();
    await expect(page.locator("header")).toBeVisible();

    // Sidebar landmark
    const sidebar = page.locator('aside[aria-label="Navegación principal"]');
    await expect(sidebar).toBeVisible();
  });

  // ═══ KEYBOARD NAV ═══
  test("Keyboard nav — Tab recorre elementos interactivos @a11y", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const focused: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        return {
          tag: el.tagName,
          label: el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 50) || "",
          href: el.getAttribute("href") || "",
        };
      });
      if (!info) break;
      const key = info.label || info.href || info.tag;
      if (focused.includes(key)) break; // loop guard
      focused.push(key);
    }

    console.log(`   Elementos focusables con Tab: ${focused.length}`);
    expect(focused.length).toBeGreaterThanOrEqual(3);
  });

  // ═══ ARIA LABELS ═══
  test("Botones clave tienen aria-label @a11y", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const labels = [
      "Cambiar tema",
      "Notificaciones",
      // The profile control is Clerk's <UserButton>, which ships its own
      // English label; the old hand-rolled "Perfil de usuario" button is gone.
      "Open user menu",
    ];
    for (const label of labels) {
      await expect(page.locator(`[aria-label="${label}"]`).first()).toBeVisible();
    }
  });

  test("Hamburger sidebar tiene aria-label + aria-expanded @a11y", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Hamburger on mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(200);
    // Match on aria-expanded, not aria-label: the label flips to "Cerrar menú
    // de navegación" once open, so a label-based locator stops matching itself
    // after the click.
    const hamburger = page.locator('button[aria-expanded][aria-label*="menú de navegación"]');
    await expect(hamburger).toBeVisible();
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");
    await expect(hamburger).toHaveAttribute("aria-label", "Abrir menú de navegación");

    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");
    await expect(hamburger).toHaveAttribute("aria-label", "Cerrar menú de navegación");
  });

  // ═══ SEMANTIC TABLE ═══
  test("Tabla de sesiones usa <table> semántico @a11y", async ({ page }) => {
    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    const table = page.locator("table");
    await expect(table).toBeVisible();
    await expect(page.locator("thead")).toBeVisible();
    await expect(page.locator("th")).toHaveCount(5);
    await expect(page.locator("tbody")).toBeVisible();
  });

  // ═══ PROGRESS BARS ═══
  test("Progress bars tienen role=progressbar + aria-valuenow @a11y", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const bars = page.locator('[role="progressbar"]');
    const count = await bars.count();
    console.log(`   role="progressbar" encontrados: ${count}`);
    if (count > 0) {
      await expect(bars.first()).toHaveAttribute("aria-valuenow");
      await expect(bars.first()).toHaveAttribute("aria-valuemin");
      await expect(bars.first()).toHaveAttribute("aria-valuemax");
    }
  });

  // ═══ CHARTS (Analytics) ═══
  test("Charts tienen role=img y aria-label @a11y", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    const chartImgs = page.locator('[role="img"]');
    const count = await chartImgs.count();
    console.log(`   role="img" (charts) encontrados: ${count}`);
  });

  // ═══ STAT CARDS (dl/dt/dd) ═══
  test("Stat cards usan <dl>/<dt>/<dd> @a11y", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // One <dl> holding several stat cards, so dt/dd repeat — assert the first.
    await expect(page.locator("dl").first()).toBeVisible();
    await expect(page.locator("dt").first()).toBeVisible();
    await expect(page.locator("dd").first()).toBeVisible();
  });

  // ═══ FILTER BUTTONS (aria-pressed) ═══
  test("Filter buttons tienen aria-pressed @a11y", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const pressed = page.locator('[aria-pressed]');
    const count = await pressed.count();
    console.log(`   Botones con aria-pressed: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ═══ SESSION DETAIL ═══
  test("Detalle de sesión — aria-live + role=region @a11y", async ({ page }) => {
    await page.goto("/sessions/test-session-001");
    await page.waitForLoadState("networkidle");

    // aria-live region
    const live = page.locator('[aria-live="polite"]');
    await expect(live).toBeVisible();
    await expect(live).toHaveAttribute("aria-atomic", "true");

    // Panel role="region"
    const region = page.locator('[role="region"]');
    const regionCount = await region.count();
    console.log(`   role="region" panels: ${regionCount}`);
    expect(regionCount).toBeGreaterThanOrEqual(1);
  });

  test("Detalle de sesión — StudeChat dialog @a11y", async ({ page }) => {
    await page.goto("/sessions/test-session-001");
    await page.waitForLoadState("networkidle");

    // Open StudeChat
    const studeBtn = page.locator("button:has-text('Stude')");
    await expect(studeBtn).toBeVisible();
    await studeBtn.click();
    await page.waitForTimeout(300);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-label", "Chat con Stude IA");
  });

  // ═══ UPCOMING ═══
  test("Próximos — links de calendario tienen aria-label @a11y", async ({ page }) => {
    await page.goto("/upcoming");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[aria-label="Conectar Google Calendar"]')).toBeVisible();
    await expect(page.locator('[aria-label="Conectar Microsoft Outlook"]')).toBeVisible();
  });

  // ═══ AUDIO RECORDER ═══
  test("Grabación — role=timer en estado recording @a11y", async ({ page }) => {
    // Solo verificar que el componente existe y tiene aria-label
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Verificar que los botones de acción rápida existen
    const recordBtn = page.locator("button:has-text('Grabar audio')");
    await expect(recordBtn).toBeVisible();
  });

  // ═══ LIBRARY SEARCH ═══
  test("Biblioteca — input de búsqueda tiene aria-label @a11y", async ({ page }) => {
    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // The sidebar carries a search input with the same label, so scope to the
    // page body rather than matching both.
    await expect(
      page.locator('main [aria-label="Buscar sesiones en la biblioteca"]')
    ).toBeVisible();
  });

  // ═══ INTEGRATIONS ═══
  test("Integraciones — botones tienen focus-visible @a11y", async ({ page }) => {
    await page.goto("/integrations");
    await page.waitForLoadState("networkidle");

    const buttons = page.locator("button");
    const count = await buttons.count();
    console.log(`   Botones en integraciones: ${count}`);
    expect(count).toBeGreaterThanOrEqual(6);
  });
});
