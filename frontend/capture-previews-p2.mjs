/**
 * Playwright screenshot script — Part 2: remaining captures.
 * Runs after the first script captured dashboard animation timing.
 *
 * Captures:
 * 1. Dark mode toggle (light → dark)
 * 2. Empty states (library, starred, upcoming)
 * 3. Tutorial flow (all 5 steps)
 * 4. Mobile viewport
 */

import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE_URL = "http://localhost:3000";
const CAPTURE_DIR = "../preview-captures";

mkdirSync(CAPTURE_DIR, { recursive: true });

async function dismissTutorial(page) {
  // Press Escape to close tutorial if visible
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  // Press again in case it didn't close
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
}

async function waitForApp(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // ============================================================
  // 1. DARK MODE TOGGLE
  // ============================================================
  console.log("📸 Capturing dark mode toggle...");
  const lightCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const lightPage = await lightCtx.newPage();

  await lightPage.goto(BASE_URL);
  await waitForApp(lightPage);
  await dismissTutorial(lightPage);
  await waitForApp(lightPage);

  // Screenshot light mode
  await lightPage.screenshot({
    path: `${CAPTURE_DIR}/theme-light-mode.png`,
    fullPage: false,
  });
  console.log("  ✅ theme-light-mode.png");

  // Find theme toggle - try multiple selectors
  const toggleSelectors = [
    'button:has(.lucide-sun)',
    'button:has(.lucide-moon)',
    'button[aria-label*="theme"]',
    'button[aria-label*="Theme"]',
    'button[aria-label*="oscuro"]',
    'button[aria-label*="claro"]',
    'button[aria-label*="dark"]',
    'button[aria-label*="light"]',
  ];

  let toggleFound = false;
  for (const sel of toggleSelectors) {
    const count = await lightPage.locator(sel).count();
    if (count > 0) {
      console.log(`  Found toggle with selector: ${sel}`);
      await lightPage.locator(sel).first().click({ force: true });
      await lightPage.waitForTimeout(600);
      toggleFound = true;
      break;
    }
  }

  if (!toggleFound) {
    // Try clicking any button in the topbar area that has a sun/moon icon
    console.log("  Trying heuristic search for theme toggle...");
    const buttons = lightPage.locator("header button, nav button");
    const btnCount = await buttons.count();
    for (let i = 0; i < btnCount; i++) {
      const html = await buttons.nth(i).innerHTML();
      if (html.includes("sun") || html.includes("moon") || html.includes("Sun") || html.includes("Moon")) {
        await buttons.nth(i).click({ force: true });
        await lightPage.waitForTimeout(600);
        toggleFound = true;
        console.log(`  Found toggle by heuristic (button #${i})`);
        break;
      }
    }
  }

  if (!toggleFound) {
    // Just apply dark class via JS
    console.log("  ⚠️ No toggle found, applying dark via JS...");
    await lightPage.evaluate(() => {
      document.documentElement.classList.add("dark");
    });
    await lightPage.waitForTimeout(500);
  }

  await lightPage.screenshot({
    path: `${CAPTURE_DIR}/theme-dark-mode.png`,
    fullPage: false,
  });
  console.log("  ✅ theme-dark-mode.png");
  await lightCtx.close();

  // ============================================================
  // 2. EMPTY STATES
  // ============================================================
  console.log("📸 Capturing empty states...");

  const emptyCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const emptyPage = await emptyCtx.newPage();

  // Library
  await emptyPage.goto(`${BASE_URL}/library`);
  await waitForApp(emptyPage);
  await dismissTutorial(emptyPage);
  await waitForApp(emptyPage);

  await emptyPage.screenshot({
    path: `${CAPTURE_DIR}/empty-state-library.png`,
    fullPage: true,
  });
  console.log("  ✅ empty-state-library.png");

  // Starred
  await emptyPage.goto(`${BASE_URL}/starred`);
  await waitForApp(emptyPage);
  await dismissTutorial(emptyPage);
  await waitForApp(emptyPage);

  await emptyPage.screenshot({
    path: `${CAPTURE_DIR}/empty-state-starred.png`,
    fullPage: true,
  });
  console.log("  ✅ empty-state-starred.png");

  // Upcoming
  await emptyPage.goto(`${BASE_URL}/upcoming`);
  await waitForApp(emptyPage);
  await dismissTutorial(emptyPage);
  await waitForApp(emptyPage);

  await emptyPage.screenshot({
    path: `${CAPTURE_DIR}/empty-state-upcoming.png`,
    fullPage: true,
  });
  console.log("  ✅ empty-state-upcoming.png");

  await emptyCtx.close();

  // ============================================================
  // 3. TUTORIAL FLOW (fresh localStorage)
  // ============================================================
  console.log("📸 Capturing tutorial flow...");

  const tourCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const tourPage = await tourCtx.newPage();

  // Clear localStorage to force tutorial
  await tourPage.goto(BASE_URL);
  await tourPage.evaluate(() => localStorage.clear());
  await tourPage.reload();
  await waitForApp(tourPage);

  // Step 1: Welcome
  await tourPage.waitForTimeout(800);
  await tourPage.screenshot({
    path: `${CAPTURE_DIR}/tutorial-step1-welcome.png`,
    fullPage: false,
  });
  console.log("  ✅ tutorial-step1-welcome.png");

  // Step 2: Sidebar
  await tourPage.keyboard.press("ArrowRight");
  await tourPage.waitForTimeout(600);
  await tourPage.screenshot({
    path: `${CAPTURE_DIR}/tutorial-step2-sidebar.png`,
    fullPage: false,
  });
  console.log("  ✅ tutorial-step2-sidebar.png");

  // Step 3: Topbar
  await tourPage.keyboard.press("ArrowRight");
  await tourPage.waitForTimeout(600);
  await tourPage.screenshot({
    path: `${CAPTURE_DIR}/tutorial-step3-topbar.png`,
    fullPage: false,
  });
  console.log("  ✅ tutorial-step3-topbar.png");

  // Step 4: Composer
  await tourPage.keyboard.press("ArrowRight");
  await tourPage.waitForTimeout(600);
  await tourPage.screenshot({
    path: `${CAPTURE_DIR}/tutorial-step4-composer.png`,
    fullPage: false,
  });
  console.log("  ✅ tutorial-step4-composer.png");

  // Step 5: Wrap-up
  await tourPage.keyboard.press("ArrowRight");
  await tourPage.waitForTimeout(600);
  await tourPage.screenshot({
    path: `${CAPTURE_DIR}/tutorial-step5-wrapup.png`,
    fullPage: false,
  });
  console.log("  ✅ tutorial-step5-wrapup.png");

  // Close tutorial
  await tourPage.keyboard.press("Enter");
  await tourPage.waitForTimeout(500);

  await tourCtx.close();

  // ============================================================
  // 4. MOBILE VIEWPORT
  // ============================================================
  console.log("📸 Capturing mobile views...");

  const mobileCtx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    colorScheme: "light",
  });
  const mobilePage = await mobileCtx.newPage();

  // Dashboard
  await mobilePage.goto(BASE_URL);
  await waitForApp(mobilePage);
  await dismissTutorial(mobilePage);
  await waitForApp(mobilePage);

  await mobilePage.screenshot({
    path: `${CAPTURE_DIR}/mobile-dashboard.png`,
    fullPage: true,
  });
  console.log("  ✅ mobile-dashboard.png");

  // Mobile tutorial
  await mobilePage.evaluate(() => localStorage.clear());
  await mobilePage.reload();
  await waitForApp(mobilePage);
  await mobilePage.waitForTimeout(800);

  await mobilePage.screenshot({
    path: `${CAPTURE_DIR}/mobile-tutorial-step1.png`,
    fullPage: false,
  });
  console.log("  ✅ mobile-tutorial-step1.png");

  // Step 2 on mobile (should target hamburger button)
  await mobilePage.keyboard.press("ArrowRight");
  await mobilePage.waitForTimeout(600);
  await mobilePage.screenshot({
    path: `${CAPTURE_DIR}/mobile-tutorial-step2.png`,
    fullPage: false,
  });
  console.log("  ✅ mobile-tutorial-step2.png");

  await mobileCtx.close();

  // ============================================================
  // DONE
  // ============================================================
  await browser.close();
  console.log("\n✅ All captures complete!");
}

capture().catch((err) => {
  console.error("❌ Capture failed:", err);
  process.exit(1);
});
