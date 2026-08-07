import { test as setup, expect, type Page } from '@playwright/test';
import { clerk, clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.clerk/user.json');

setup.describe.configure({ mode: 'serial' });

setup('global setup', async () => {
  // clerkSetup looks for CLERK_PUBLISHABLE_KEY, but this app stores it under
  // the NEXT_PUBLIC_ prefix Next.js requires. Pass it explicitly rather than
  // duplicating the value in two env vars.
  await clerkSetup({
    publishableKey:
      process.env.CLERK_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
});

/**
 * On a Clerk development instance the first navigation triggers the dev-browser
 * handshake: the middleware answers `x-clerk-auth-reason: dev-browser-missing`
 * and bounces through FAPI and back, which aborts the original document request
 * and makes `page.goto` reject with ERR_ABORTED even though the page then loads
 * fine. Wait for `domcontentloaded` rather than `load`, and treat an abort as
 * the handshake rather than a failure — the selector wait is the real assertion.
 */
async function gotoThroughHandshake(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  } catch (err) {
    if (!String(err).includes('ERR_ABORTED')) throw err;
  }
}

setup('authenticate and save storage state', async ({ page }) => {
  // The default 30s cap is not enough here: the first hit pays for Next's dev
  // compile of /sign-in (~30-45s from a cold .next) plus the Clerk dev-browser
  // handshake, and every spec depends on this one file existing.
  setup.setTimeout(180_000);

  // Attaches the testing token minted by clerkSetup() to this page's requests,
  // so Clerk's bot protection does not challenge the automated browser. Required
  // by @clerk/testing for any page that talks to Clerk.
  await setupClerkTestingToken({ page });

  // Not '/': for anonymous visitors the middleware rewrites the root to the
  // static landing-prototype.html, which never mounts ClerkProvider, so
  // clerk.signIn() would have no window.Clerk to talk to. /sign-in is the
  // unprotected route that does load clerk-js.
  await gotoThroughHandshake(page, '/sign-in');
  await page.waitForSelector('#panel-login', { timeout: 90_000 });

  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_CLERK_USER_EMAIL!,
  });

  // Land on a protected route to prove the session took. Assert on the URL and
  // on Clerk's <UserButton>, which only mounts for a signed-in user: the page
  // the middleware bounces us to also renders a <main> and an <aside>, so
  // waiting on those would pass while signed out and save a useless state file.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/, { timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Open user menu' })).toBeVisible({
    timeout: 30_000,
  });

  // First-run tutorial: without this flag TutorialOverlay mounts a full-screen
  // z-[60] backdrop on every protected page and swallows the clicks the specs
  // make. Marking it completed here puts it in the saved storageState, so every
  // spec inherits a dismissed tutorial instead of setting the flag itself.
  await page.evaluate(() => localStorage.setItem('studere.tutorial.completed', 'true'));

  await page.context().storageState({ path: authFile });
});
