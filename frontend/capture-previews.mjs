/**
 * Playwright screenshot script for visual verification of animations.
 * Run from frontend/: node capture-previews.mjs
 *
 * Captures:
 * 1. Dashboard stat cards at animation time points (0ms, 100ms, 200ms, 400ms, 600ms)
 * 2. Dark mode toggle
 * 3. Empty states with IllustrationScene
 * 4. Tutorial flow
 */

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE_URL = "http://localhost:3000";
const CAPTURE_DIR = "../preview-captures";

mkdirSync(CAPTURE_DIR, { recursive: true });

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    // Emulate light mode by default
    colorScheme: "light",
  });
  const page = await context.newPage();

  // Clear localStorage to trigger first-visit tutorial
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());

  // ============================================================
  // 1. DASHBOARD STAT CARDS — animation entry timing
  // ============================================================
  console.log("📸 Capturing Dashboard stat card animation...");

  // Reload to trigger fresh animations
  await page.reload({ waitUntil: "domcontentloaded" });

  // Wait for page to be interactive
  await page.waitForSelector("body", { state: "visible" });

  // Dismiss tutorial if it appeared (press Escape)
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // Now reload once more to get clean animation from mount
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(100);

  // Dismiss tutorial immediately
  await page.keyboard.press("Escape");
  await page.waitForTimeout(50);

  // Capture at specific time points
  const timePoints = [0, 100, 200, 400, 600];
  for (const ms of timePoints) {
    const t0 = Date.now();
    // Wait until the right moment from page load
    const elapsed = Date.now() - t0;
    if (elapsed < ms) {
      await page.waitForTimeout(ms - elapsed);
    }
    await page.screenshot({
      path: `${CAPTURE_DIR}/dashboard-statcards-${ms}ms.png`,
      fullPage: false,
    });
    console.log(`  ✅ dashboard-statcards-${ms}ms.png`);
  }

  // Final settled state
  await page.waitForTimeout(200);
  await page.screenshot({
    path: `${CAPTURE_DIR}/dashboard-full-page.png`,
    fullPage: true,
  });
  console.log("  ✅ dashboard-full-page.png");

  // ============================================================
  // 2. DARK MODE TOGGLE
  // ============================================================
  console.log("📸 Capturing dark mode toggle...");

  // Find and click the theme toggle button (sun/moon icon)
  const themeToggle = page.locator(
    'button[aria-label*="theme"], button[aria-label*="dark"], button[aria-label*="oscuro"], button[aria-label*="light"], button[aria-label*="claro"], button[data-theme-toggle], button:has(svg.lucide-sun), button:has(svg.lucide-moon)'
  );

  const toggleCount = await themeToggle.count();
  console.log(`  Found ${toggleCount} theme toggle candidates`);

  if (toggleCount > 0) {
    // Screenshot light mode
    await page.screenshot({
      path: `${CAPTURE_DIR}/theme-light-mode.png`,
      fullPage: false,
    });
    console.log("  ✅ theme-light-mode.png");

    // Click toggle
    await themeToggle.first().click();
    await page.waitForTimeout(500);

    // Screenshot dark mode
    await page.screenshot({
      path: `${CAPTURE_DIR}/theme-dark-mode.png`,
      fullPage: false,
    });
    console.log("  ✅ theme-dark-mode.png");
  } else {
    console.log("  ⚠️ No theme toggle found, taking current state");
    await page.screenshot({
      path: `${CAPTURE_DIR}/theme-current.png`,
      fullPage: false,
    });
  }

  // ============================================================
  // 3. EMPTY STATES (Library page)
  // ============================================================
  console.log("📸 Capturing empty states...");

  // Navigate to library (should show empty state if no sessions)
  await page.goto(`${BASE_URL}/library`);
  await page.waitForTimeout(100);
  // Dismiss tutorial
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  await page.screenshot({
    path: `${CAPTURE_DIR}/empty-state-library.png`,
    fullPage: false,
  });
  console.log("  ✅ empty-state-library.png");

  // Starred page
  await page.goto(`${BASE_URL}/starred`);
  await page.waitForTimeout(100);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  await page.screenshot({
    path: `${CAPTURE_DIR}/empty-state-starred.png`,
    fullPage: false,
  });
  console.log("  ✅ empty-state-starred.png");

  // Upcoming page
  await page.goto(`${BASE_URL}/upcoming`);
  await page.waitForTimeout(100);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  await page.screenshot({
    path: `${CAPTURE_DIR}/empty-state-upcoming.png`,
    fullPage: false,
  });
  console.log("  ✅ empty-state-upcoming.png");

  // ============================================================
  // 4. TUTORIAL FLOW
  // ============================================================
  console.log("📸 Capturing tutorial flow...");

  // Clear localStorage to force tutorial on next visit
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE_URL);
  await page.waitForTimeout(800);

  // Step 1: Welcome
  await page.screenshot({
    path: `${CAPTURE_DIR}/tutorial-step1-welcome.png`,
    fullPage: false,
  });
  console.log("  ✅ tutorial-step1-welcome.png");

  // Step 2: Navigate to next
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);

  await page.screenshot({
    path: `${CAPTURE_DIR}/tutorial-step2-sidebar.png`,
    fullPage: false,
  });
  console.log("  ✅ tutorial-step2-sidebar.png");

  // Step 3
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);

  await page.screenshot({
    path: `${CAPTURE_DIR}/tutorial-step3-topbar.png`,
    fullPage: false,
  });
  console.log("  ✅ tutorial-step3-topbar.png");

  // Step 4
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);

  await page.screenshot({
    path: `${CAPTURE_DIR}/tutorial-step4-composer.png`,
    fullPage: false,
  });
  console.log("  ✅ tutorial-step4-composer.png");

  // Step 5
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);

  await page.screenshot({
    path: `${CAPTURE_DIR}/tutorial-step5-wrapup.png`,
    fullPage: false,
  });
  console.log("  ✅ tutorial-step5-wrapup.png");

  // Close tutorial
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);

  // ============================================================
  // 5. MOBILE VIEWPORT
  // ============================================================
  console.log("📸 Capturing mobile views...");

  await page.setViewportSize({ width: 375, height: 812 }); // iPhone-ish
  await page.goto(BASE_URL);
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  await page.screenshot({
    path: `${CAPTURE_DIR}/mobile-dashboard.png`,
    fullPage: false,
  });
  console.log("  ✅ mobile-dashboard.png");

  // Mobile tutorial
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE_URL);
  await page.waitForTimeout(800);

  await page.screenshot({
    path: `${CAPTURE_DIR}/mobile-tutorial-step1.png`,
    fullPage: false,
  });
  console.log("  ✅ mobile-tutorial-step1.png");

  // Step 2 on mobile (should target hamburger button)
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);

  await page.screenshot({
    path: `${CAPTURE_DIR}/mobile-tutorial-step2.png`,
    fullPage: false,
  });
  console.log("  ✅ mobile-tutorial-step2.png");

  // ============================================================
  // DONE
  // ============================================================
  await browser.close();
  console.log(`\n✅ Done! ${timePoints.length + 10} screenshots saved to ${CAPTURE_DIR}/`);
}

capture().catch((err) => {
  console.error("❌ Capture failed:", err);
  process.exit(1);
});
