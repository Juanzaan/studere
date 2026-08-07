import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Playwright does not read .env.local the way `next dev` does, so the Clerk
// keys and the E2E user email have to be loaded explicitly. In CI the workflow
// sets them as real env vars and this is a no-op.
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  // The suite runs against `next dev`, so the first request to each route pays
  // for an on-demand webpack compile (10-45s). The default 30s cap turns that
  // into a page.goto timeout on whichever test happens to hit a route first.
  timeout: 90_000,
  // Same reason at the assertion level: the default 5s expect cap is shorter
  // than a first-hit route compile, so navigation assertions flake under
  // parallel load even though the app is fine.
  expect: { timeout: 15_000 },
  // 127.0.0.1, not localhost: on a dual-stack host `localhost` resolves to ::1
  // first, and the Next dev server accepts the connection and sends response
  // headers over IPv6 but never flushes the body, so every dynamic route hangs
  // until the client gives up. Over IPv4 the same request returns in ~1s.
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.clerk/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.clerk/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'playwright/.clerk/user.json',
      },
      dependencies: ['setup'],
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.clerk/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        storageState: 'playwright/.clerk/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // `next dev` is deliberately chosen over `next start`: the production server
  // never sends sign-in HTML to anonymous visitors on this Clerk test instance,
  // because the middleware's dev-browser handshake aborts the response upstream.
  // Under `next dev` the page streams fine and Clerk's testing helpers handle the
  // handshake tokens.
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
