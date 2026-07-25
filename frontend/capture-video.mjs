/**
 * Playwright video capture of Dashboard animation.
 * Records the stat cards entering with scale(0.96->1) + fade over 600ms.
 *
 * Run from frontend/: node capture-video.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE_URL = "http://localhost:3000";
const CAPTURE_DIR = "../preview-captures";

mkdirSync(CAPTURE_DIR, { recursive: true });

async function capture() {
  const browser = await chromium.launch({ headless: true });

  // ─── Dashboard animation video ──────────────────────────────────
  console.log("🎬 Recording Dashboard animation...");

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
    recordVideo: { dir: CAPTURE_DIR, size: { width: 1440, height: 900 } },
  });
  const page = await ctx.newPage();

  // Go to dashboard to init the app once, then reload fresh
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape"); // dismiss tutorial
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // Now reload with a clean localStorage (no tutorial)
  await page.evaluate(() => {
    localStorage.setItem("studere.tutorial.completed", "true");
  });

  // Reload — recording captures the full mount sequence
  await page.reload({ waitUntil: "domcontentloaded" });
  // Wait for the animation to complete (600ms + buffer)
  await page.waitForTimeout(1200);

  await ctx.close();
  console.log("  ✅ dashboard-animation video saved");

  // ─── Tutorial flow video ────────────────────────────────────────
  console.log("🎬 Recording Tutorial flow...");

  const tourCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
    recordVideo: { dir: CAPTURE_DIR, size: { width: 1440, height: 900 } },
  });
  const tourPage = await tourCtx.newPage();

  // Clear localStorage to force tutorial
  await tourPage.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await tourPage.evaluate(() => localStorage.clear());
  await tourPage.reload({ waitUntil: "domcontentloaded" });
  await tourPage.waitForTimeout(500);

  // Step 1: Welcome (wait for animation)
  await tourPage.waitForTimeout(800);
  // Navigate through all steps
  for (let i = 0; i < 4; i++) {
    await tourPage.keyboard.press("ArrowRight");
    await tourPage.waitForTimeout(800);
  }

  await tourCtx.close();
  console.log("  ✅ tutorial-flow video saved");

  await browser.close();
  console.log("\n✅ Videos captured in", CAPTURE_DIR);
}

capture().catch((err) => {
  console.error("❌ Capture failed:", err);
  process.exit(1);
});
