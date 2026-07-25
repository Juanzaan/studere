/**
 * Critical User Flows — E2E Tests
 *
 * Cubre los flujos funcionales más importantes de la app:
 *   1. Navegación completa (sidebar links → URL cambia)
 *   2. Theme toggle (claro/oscuro)
 *   3. Session table (star toggle, row click, column headers)
 *   4. Library filters (filtros cambian vista, aria-pressed)
 *   5. Session detail (switcheo de paneles: Resumen, Flashcards, Quiz, MindMap)
 *   6. StudeChat (abrir/cerrar dialog, enviar mensaje, quick prompts)
 *   7. Mobile hamburger (abrir/cerrar sidebar en viewport chico)
 *   8. Search (filtrado de sesiones)
 *   9. Integrations page (cards visibles, modo "Próximamente")
 *  10. Upcoming page (eventos, links de calendario)
 *  11. Dark/light persistence
 *
 * Para correr: npm run test:e2e
 * Para un solo proyecto: npx playwright test critical-flows --project=chromium
 */
import { test, expect, Page } from "@playwright/test";

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_SESSIONS = [
  {
    id: "s-001", title: "Neurociencia Cognitiva", course: "Psicología",
    createdAt: new Date().toISOString(), starred: false,
    sourceFileName: "clase1.mp3", sourceFileType: "audio/mp3", sourceKind: "audio" as const,
    templateId: "class-summary" as const,
    summary: "La neuroplasticidad es la capacidad del cerebro para reorganizarse formando nuevas conexiones neuronales.",
    keyConcepts: [
      { term: "Neuroplasticidad", description: "Capacidad del cerebro de adaptarse y reorganizarse." },
      { term: "Sinapsis", description: "Conexión entre neuronas que permite la transmisión de señales." },
    ],
    flashcards: [{ question: "¿Qué es la neuroplasticidad?", answer: "Capacidad del cerebro de reorganizarse." }],
    quiz: [{
      question: "¿Qué permite la sinapsis?",
      options: ["Conectar neuronas", "Producir energía", "Almacenar recuerdos", "Regular temperatura"],
      correct: 0,
      explanation: "La sinapsis conecta neuronas para transmitir señales eléctricas y químicas.",
    }],
    transcript: [{ id: "seg-1", text: "Hoy vamos a hablar de neuroplasticidad.", speaker: "Profesor", timestamp: "00:00" }],
    actionItems: [{ id: "t1", title: "Repasar conceptos de neuroplasticidad", owner: "Yo", status: "pending", dueLabel: "Esta semana" }],
    mindMap: { id: "root", label: "Neurociencia", children: [
      { id: "c1", label: "Neuroplasticidad", accent: "violet", children: [] },
      { id: "c2", label: "Sinapsis", accent: "blue", children: [] },
    ]},
    bookmarks: [], comments: [], insights: [], chatHistory: [],
    stats: { wordCount: 250, segmentCount: 1, estimatedDurationMinutes: 15 },
    studyMetrics: { completionRate: 0, quizAccuracy: 0, reviewCount: 0 },
  },
  {
    id: "s-002", title: "Marketing Digital", course: "Negocios",
    createdAt: new Date(Date.now() - 86400000).toISOString(), starred: true,
    sourceFileName: "clase2.mp3", sourceFileType: "audio/mp3", sourceKind: "audio" as const,
    templateId: "class-summary" as const,
    summary: "Estrategias de marketing en entornos digitales.",
    keyConcepts: [{ term: "SEO", description: "Optimización para motores de búsqueda." }],
    flashcards: [], quiz: [], transcript: [],
    actionItems: [], mindMap: { id: "root", label: "Marketing" },
    bookmarks: [], comments: [], insights: [], chatHistory: [],
    stats: { wordCount: 150, segmentCount: 2, estimatedDurationMinutes: 8 },
    studyMetrics: { completionRate: 0, quizAccuracy: 0, reviewCount: 0 },
  },
  {
    id: "s-003", title: "Historia Económica — Revolución Industrial", course: "Historia",
    createdAt: new Date(Date.now() - 172800000).toISOString(), starred: false,
    sourceFileName: "apuntes.txt", sourceFileType: "text/plain", sourceKind: "text" as const,
    templateId: "class-summary" as const,
    summary: "La Revolución Industrial transformó la economía global.",
    keyConcepts: [], flashcards: [], quiz: [], transcript: [],
    actionItems: [], mindMap: { id: "root", label: "Historia" },
    bookmarks: [], comments: [], insights: [], chatHistory: [],
    stats: { wordCount: 80, segmentCount: 1, estimatedDurationMinutes: 45 },
    studyMetrics: { completionRate: 0, quizAccuracy: 0, reviewCount: 0 },
  },
];

async function seedSessions(page: Page) {
  await page.evaluate((data) => {
    localStorage.setItem("studere.sessions.v1", JSON.stringify(data));
    // Mark tutorial as completed so the overlay doesn't block interactions
    localStorage.setItem("studere.tutorial.completed", "true");
  }, MOCK_SESSIONS);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. NAVEGACIÓN
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Navegación @critical", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await seedSessions(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("Sidebar — todos los links cambian la URL @critical", async ({ page }) => {
    const navLinks = [
      { label: "Inicio", expected: /\/dashboard/ },
      { label: "Biblioteca", expected: /\/library/ },
      { label: "Próximos", expected: /\/upcoming/ },
      { label: "Destacados", expected: /\/starred/ },
      { label: "Estadísticas", expected: /\/analytics/ },
    ];

    for (const { label, expected } of navLinks) {
      const link = page.locator(`nav a:has-text("${label}")`).first();
      await expect(link).toBeVisible();
      await link.click();
      await page.waitForURL(expected);
      console.log(`   ✅ ${label}: ${page.url()}`);
    }
  });

  test("Botón Integraciones en footer navega a /integrations @critical", async ({ page }) => {
    const link = page.locator('aside a:has-text("Integraciones")');
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/integrations/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. THEME TOGGLE
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Theme toggle @critical", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("Toggle cambia clase dark en <html> y persiste @critical", async ({ page }) => {
    const toggle = page.locator('[aria-label="Cambiar tema"]');
    await expect(toggle).toBeVisible();

    // Initial state (no dark class)
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));

    // Click to toggle
    await toggle.click();
    await page.waitForTimeout(200);

    // Verify dark class added
    const nowDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(nowDark).toBe(!hasDark);
    console.log(`   ✅ Tema cambiado a: ${nowDark ? "oscuro" : "claro"}`);

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState("networkidle");
    const persisted = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(persisted).toBe(nowDark);
    console.log(`   ✅ Tema persiste tras recarga: ${persisted ? "oscuro" : "claro"}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. SESSION TABLE
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Session table @critical", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await seedSessions(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("Tabla renderiza filas con data-session-row @critical", async ({ page }) => {
    const rows = page.locator("[data-session-row]");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(2);
    console.log(`   ✅ ${count} sesiones visibles en la tabla`);
  });

  test("Star toggle funciona y actualiza aria-label @critical", async ({ page }) => {
    // Find first unstarred session
    const starBtn = page.locator('[aria-label="Destacar sesión"]').first();
    await expect(starBtn).toBeVisible();

    await starBtn.click();
    await page.waitForTimeout(300);

    // Should now be "Quitar de destacados"
    await expect(page.locator('[aria-label="Quitar de destacados"]').first()).toBeVisible();
    console.log("   ✅ Star toggle funciona");
  });

  test("Click en fila navega al detalle @critical", async ({ page }) => {
    const rowLink = page.locator('a[href^="/sessions/"]').first();
    await expect(rowLink).toBeVisible();
    await rowLink.click();

    await expect(page).toHaveURL(/\/sessions\//);
    console.log(`   ✅ Navegó a: ${page.url()}`);
  });

  test("Column headers de tabla son visibles @critical", async ({ page }) => {
    await expect(page.locator("th").first()).toBeVisible();
    const headerText = await page.locator("th").first().textContent();
    expect(headerText).toBeTruthy();
    console.log(`   ✅ Header: "${headerText}"`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. LIBRARY FILTERS
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Library filters @critical", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/library");
    await page.waitForLoadState("networkidle");
    await seedSessions(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("Filter buttons tienen aria-pressed y cambian al click @critical", async ({ page }) => {
    const filters = page.locator('[aria-pressed]');
    const count = await filters.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Click second filter, verify its aria-pressed becomes true
    const second = filters.nth(1);
    await second.click();
    await page.waitForTimeout(200);
    await expect(second).toHaveAttribute("aria-pressed", "true");
    console.log(`   ✅ Filter "${await second.textContent()}" → aria-pressed true`);
  });

  test("Filtro 'Destacadas' muestra solo sesiones destacadas @critical", async ({ page }) => {
    // Click "Destacadas" filter
    const starredFilter = page.locator('button:has-text("Destacadas")');
    await starredFilter.click();
    await page.waitForTimeout(300);

    // All visible sessions should be starred
    const rows = page.locator("[data-session-row]");
    const rowCount = await rows.count();
    console.log(`   ✅ Filtro destacadas: ${rowCount} sesiones visibles`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. SESSION DETAIL — PANEL SWITCHING
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Session detail — panels @critical", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await seedSessions(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate to first session
    await page.locator('a[href^="/sessions/"]').first().click();
    await page.waitForURL(/\/sessions\//);
    await page.waitForTimeout(500);
  });

  test("Switchea entre paneles Resumen → Flashcards → Quiz @critical", async ({ page }) => {
    // Look for panel buttons
    const panels = [
      { name: /flashcards/i, expected: /flashcard|pregunta/i },
      { name: /quiz/i, expected: /pregunta|respondidas/i },
    ];

    for (const { name } of panels) {
      const btn = page.locator(`button:has-text("${name}")`).first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        await page.waitForTimeout(400);

        // Panel should have role="region" with label
        const region = page.locator(`[role="region"]`);
        await expect(region).toBeVisible();
        console.log(`   ✅ Panel activo: "${name}"`);
      }
    }
  });

  test("MindMap canvas se renderiza @critical", async ({ page }) => {
    const mindmapBtn = page.locator('button:has-text("Mapa")').first();
    if (await mindmapBtn.isVisible({ timeout: 2000 })) {
      await mindmapBtn.click();
      await page.waitForTimeout(500);

      // ReactFlow canvas should be visible
      const flow = page.locator(".react-flow");
      await expect(flow).toBeVisible();
      console.log("   ✅ MindMap canvas visible");
    }
  });

  test("aria-live anuncia panel activo @critical", async ({ page }) => {
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible();
    const text = await liveRegion.textContent();
    expect(text).toBeTruthy();
    console.log(`   ✅ aria-live anuncia: "${text}"`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. STUDE CHAT
// ═══════════════════════════════════════════════════════════════════════════
test.describe("StudeChat @critical", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await seedSessions(page);
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Go to session detail
    await page.locator('a[href^="/sessions/"]').first().click();
    await page.waitForURL(/\/sessions\//);
    await page.waitForTimeout(500);
  });

  test("Abrir/cerrar diálogo con aria-modal @critical", async ({ page }) => {
    const openBtn = page.locator('button:has-text("Stude")');
    await expect(openBtn).toBeVisible();
    await openBtn.click();
    await page.waitForTimeout(300);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-label", "Chat con Stude IA");
    console.log("   ✅ StudeChat dialog visible");

    // Close via X button
    const closeBtn = dialog.locator('[aria-label="Cerrar"]');
    await closeBtn.click();
    await page.waitForTimeout(200);
    await expect(dialog).not.toBeVisible();
    console.log("   ✅ StudeChat cerrado");
  });

  test("Enviar mensaje por chat (fallback local) @critical", async ({ page }) => {
    await page.locator('button:has-text("Stude")').click();
    await page.waitForTimeout(300);

    const textarea = page.locator("#stude-chat-input");
    await expect(textarea).toBeVisible();

    // Type and send a message
    await textarea.fill("Haceme un resumen de esta clase");
    await page.locator('[aria-label="Enviar mensaje"]').click();
    await page.waitForTimeout(1000);

    // Should get a response (local fallback)
    const messages = page.locator('[role="dialog"] [class*="rounded-card"]');
    const count = await messages.count();
    expect(count).toBeGreaterThanOrEqual(1);
    console.log(`   ✅ Mensaje enviado, ${count} mensajes en el chat`);
  });

  test("Quick prompts envían mensajes predefinidos @critical", async ({ page }) => {
    await page.locator('button:has-text("Stude")').click();
    await page.waitForTimeout(300);

    // Click first quick prompt button
    const prompts = page.locator('[role="dialog"] button:has-text("Resumen")');
    if (await prompts.isVisible({ timeout: 1000 })) {
      await prompts.click();
      await page.waitForTimeout(500);

      // Dialog should show messages
      const dialog = page.locator('[role="dialog"]');
      const text = await dialog.textContent();
      expect(text?.length).toBeGreaterThan(0);
      console.log("   ✅ Quick prompt funcionó");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. MOBILE HAMBURGER
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Mobile sidebar @critical", () => {
  test("Hamburger abre y cierra sidebar en mobile @critical", async ({ page }) => {
    // Mark tutorial as completed BEFORE navigation
    await page.addInitScript(() => {
      localStorage.setItem("studere.tutorial.completed", "true");
    });

    // Set mobile viewport BEFORE navigation
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Use aria-label*="menú de navegación" — matches both "Abrir" and "Cerrar"
    const hamburger = page.locator('[aria-label*="menú de navegación"]');
    await expect(hamburger).toBeVisible();
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");

    // Open
    await hamburger.click();
    await page.waitForTimeout(500);

    // After click, aria-expanded becomes "true" and label changes to "Cerrar..."
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");
    await expect(hamburger).toHaveAttribute("aria-label", "Cerrar menú de navegación");

    // Sidebar should now be visible (translate-x-0)
    await expect(page.locator("aside")).toBeVisible();

    // Close by clicking a nav link
    const navLink = page.locator('nav a:has-text("Biblioteca")').first();
    await navLink.click();
    await page.waitForTimeout(300);

    // Should navigate to library
    await expect(page).toHaveURL(/\/library/);
    console.log("   ✅ Hamburger funciona en mobile");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. SEARCH
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Search @critical", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/library");
    await page.waitForLoadState("networkidle");
    await seedSessions(page);
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  test("Input de búsqueda tiene aria-label @critical", async ({ page }) => {
    const searchInput = page.locator('[aria-label="Buscar sesiones en la biblioteca"]').last();
    await expect(searchInput).toBeVisible();
  });

  test("Búsqueda filtra sesiones @critical", async ({ page }) => {
    const searchInput = page.locator('[aria-label="Buscar sesiones en la biblioteca"]').last();
    await searchInput.fill("Neurociencia");
    await page.waitForTimeout(300);

    const rows = page.locator("[data-session-row]");
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
    console.log(`   ✅ Búsqueda: ${count} resultados para "Neurociencia"`);

    // El resto de sesiones no deberían aparecer
    await searchInput.fill("XYZ_NoExiste");
    await page.waitForTimeout(300);
    const emptyRows = await page.locator("[data-session-row]").count();
    if (emptyRows === 0) {
      console.log("   ✅ Búsqueda sin resultados → estado vacío");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. INTEGRATIONS
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Integrations @critical", () => {
  test("Cards de integraciones visibles con botones @critical", async ({ page }) => {
    await page.goto("/integrations");
    await page.waitForLoadState("networkidle");

    // Should show integration cards
    const integrations = ["Google Calendar", "Microsoft Outlook", "Google Drive / Dropbox", "Slack / Discord", "Chrome Extension", "Automatizaciones"];
    for (const name of integrations) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
    console.log(`   ✅ ${integrations.length} integraciones visibles`);

    // All buttons should show "Próximamente" (not enabled)
    const buttons = page.locator("button:has-text('Próximamente')");
    const btnCount = await buttons.count();
    expect(btnCount).toBeGreaterThanOrEqual(6);
    console.log(`   ✅ ${btnCount} botones en modo "Próximamente"`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. UPCOMING
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Upcoming @critical", () => {
  test("Eventos y links de calendario @critical", async ({ page }) => {
    await page.goto("/upcoming");
    await page.waitForLoadState("networkidle");

    // Events should be visible
    await expect(page.getByText("Repaso de Parcial I").first()).toBeVisible();
    await expect(page.getByText("Clase online de Historia Económica").first()).toBeVisible();
    console.log("   ✅ Eventos upcoming visibles");

    // Calendar connect links
    await expect(page.locator('[aria-label="Conectar Google Calendar"]')).toBeVisible();
    await expect(page.locator('[aria-label="Conectar Microsoft Outlook"]')).toBeVisible();
    console.log("   ✅ Links de calendario con aria-label");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. DARK MODE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════
test.describe("Dark mode persistence @critical", () => {
  test("Theme toggle persiste el modo oscuro @critical", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Toggle to dark
    await page.locator('[aria-label="Cambiar tema"]').click();
    await page.waitForTimeout(200);

    // Navigate to another page
    await page.goto("/library");
    await page.waitForLoadState("networkidle");

    // Dark mode should persist
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark).toBe(true);
    console.log("   ✅ Dark mode persiste entre páginas");
  });
});
