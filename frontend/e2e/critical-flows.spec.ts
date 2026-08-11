import { test, expect, type Page } from '@playwright/test';
import { createTestSession } from './fixtures/session-fixture';
import { gotoEmpty, openPanel, openSession, readStoredJson, seedAndGoto } from './fixtures/seed';

/**
 * E2E: cross-cutting flows — the app shell rather than any single panel.
 *
 * Sidebar navigation, the theme toggle, the dashboard session table, the Stude
 * chat popup, the mobile drawer, and the two static pages (Integraciones and
 * Próximos).
 *
 * Panel switching, the library filters and the library search used to live here
 * too, as weaker copies that counted rows or only wrote to the console. They are
 * asserted properly in `session-detail.spec.ts` and `library.spec.ts` now, so
 * the duplicates are gone instead of being maintained in two places.
 */

const DAY = 24 * 60 * 60 * 1000;

const SESSIONS = [
  createTestSession({
    id: 'crit-neuro',
    title: 'Neurociencia Cognitiva',
    course: 'Psicología',
    starred: false,
  }),
  createTestSession({
    id: 'crit-marketing',
    title: 'Marketing Digital',
    course: 'Negocios',
    starred: true,
    createdAt: new Date(Date.now() - DAY).toISOString(),
  }),
];

/** The hamburger is `lg:hidden`, so below Tailwind's `lg` the sidebar is a drawer. */
const LG_BREAKPOINT = 1024;

const sidebar = (page: Page) => page.getByRole('complementary', { name: 'Navegación principal' });

/**
 * The nav menu inside the sidebar, not the whole aside.
 *
 * The logo above it is also a link to `/dashboard` and also carries the
 * accessible name "Inicio", so an aside-wide lookup for that label is a strict
 * mode violation. `#navigation` is the skip-link target, so it is a real anchor
 * rather than a selector invented for the test.
 */
const navMenu = (page: Page) => sidebar(page).locator('#navigation');

/**
 * Make the sidebar clickable.
 *
 * Under `lg` the aside is translated off-canvas and only the hamburger is on
 * screen, so clicking a nav link straight away passes on the desktop projects
 * and fails on the mobile ones. Keyed off the viewport — which the project
 * config fixes — rather than off whether the button happens to be visible, so
 * a missing hamburger fails the test instead of silently skipping the click.
 */
async function revealSidebar(page: Page) {
  if ((page.viewportSize()?.width ?? LG_BREAKPOINT) >= LG_BREAKPOINT) return;
  await page.getByRole('button', { name: 'Abrir menú de navegación' }).click();
  await expect(page.getByRole('button', { name: 'Cerrar menú de navegación' })).toBeVisible();
}

/**
 * Wait until React has hydrated the shell.
 *
 * The sidebar, the theme toggle and the hamburger are all in the server-rendered
 * HTML but carry no listeners until hydration finishes, so a click that lands
 * first is a silent no-op: the handler does not exist, nothing re-renders, and
 * the assertion after it waits out its whole timeout against unchanged markup.
 *
 * The sidebar's "Recientes" list is the signal. It renders empty on the server
 * and only fills once the mount effect has read localStorage, so a seeded title
 * appearing there means handlers are live. Counted rather than asserted visible:
 * below `lg` the aside is translated off-canvas, and its entry animation starts
 * the links at zero opacity on every viewport.
 *
 * The timeout matches the `toHaveURL` ones for the same reason — under
 * `next dev` a route has to finish compiling before it can hydrate, and with
 * several workers sharing one dev server that outruns the global 15 s cap often
 * enough to flake.
 */
async function waitForHydration(page: Page) {
  await expect(sidebar(page).getByRole('link', { name: SESSIONS[0].title })).toHaveCount(1, {
    timeout: 60_000,
  });
}

/** Seed, navigate, and wait for hydration. */
async function openShell(page: Page, path: string) {
  await seedAndGoto(page, SESSIONS, path);
  await waitForHydration(page);
}

test.describe('Navegación', () => {
  test('the sidebar reaches every section', async ({ page }) => {
    await openShell(page, '/dashboard');

    // Ordered so each click leaves the route the previous one landed on —
    // starting from /dashboard, "Inicio" first would assert nothing.
    const steps = [
      { label: 'Biblioteca', url: /\/library$/ },
      { label: 'Próximos', url: /\/upcoming$/ },
      { label: 'Destacados', url: /\/starred$/ },
      { label: 'Estadísticas', url: /\/analytics$/ },
      { label: 'Inicio', url: /\/dashboard$/ },
    ];

    for (const { label, url } of steps) {
      await revealSidebar(page);
      await navMenu(page).getByRole('link', { name: label }).click();
      // Client-side navigation under `next dev` waits on an on-demand compile
      // of the target route, which outruns the global expect cap when cold.
      await expect(page).toHaveURL(url, { timeout: 60_000 });
    }
  });

  test('the footer links to Integraciones', async ({ page }) => {
    await openShell(page, '/dashboard');
    await revealSidebar(page);

    await sidebar(page).getByRole('link', { name: 'Integraciones' }).click();

    await expect(page).toHaveURL(/\/integrations$/, { timeout: 60_000 });
  });
});

test.describe('Tema', () => {
  /** Mirrors `STORAGE_KEY` in `lib/theme.ts`. */
  const THEME_KEY = 'studere-theme';

  test('the toggle flips the dark class, persists it, and survives navigation', async ({ page }) => {
    // Pin the starting theme: without it the initial state comes from the OS
    // `prefers-color-scheme`, and the test could only assert "it changed".
    //
    // Only when the key is unset. `addInitScript` runs on *every* document,
    // ahead of the pre-paint script in `app/layout.tsx` that reads the same key,
    // so writing unconditionally would re-pin light after the reload below and
    // fail the very persistence this test is here to prove.
    await page.addInitScript(
      ([key]) => {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, 'light');
      },
      [THEME_KEY] as const,
    );
    await seedAndGoto(page, SESSIONS, '/dashboard');
    // Re-navigated after the theme was pinned, so the barrier comes after it.
    await waitForHydration(page);

    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Cambiar tema' }).click();
    await expect(html).toHaveClass(/dark/);
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe('dark');

    // The layout applies the class from storage in an inline script before
    // paint, so a reload is the check that the write, not just the click, works.
    await page.reload();
    await expect(html).toHaveClass(/dark/);

    await waitForHydration(page);
    await revealSidebar(page);
    await navMenu(page).getByRole('link', { name: 'Biblioteca' }).click();
    await expect(page).toHaveURL(/\/library$/, { timeout: 60_000 });
    await expect(html).toHaveClass(/dark/);
  });
});

test.describe('Tabla de sesiones del dashboard', () => {
  const rows = (page: Page) => page.locator('[data-session-row]');

  test('renders one row per stored session', async ({ page }) => {
    await seedAndGoto(page, SESSIONS, '/dashboard');

    await expect(rows(page)).toHaveCount(SESSIONS.length);
    for (const session of SESSIONS) {
      await expect(rows(page).filter({ hasText: session.title })).toBeVisible();
    }
  });

  test('shows the empty state instead of a table when storage is empty', async ({ page }) => {
    await gotoEmpty(page, '/dashboard');

    // A different copy from the library's — same component, different props.
    await expect(page.getByRole('heading', { name: 'Sin sesiones aún' })).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
  });

  test('starring from the dashboard persists', async ({ page }) => {
    await seedAndGoto(page, SESSIONS, '/dashboard');
    const target = rows(page).filter({ hasText: SESSIONS[0].title });

    await target.getByRole('button', { name: 'Destacar sesión' }).click();

    await expect(target.getByRole('button', { name: 'Quitar de destacados' })).toBeVisible();
    const stored = await readStoredJson<Array<{ id: string; starred: boolean }>>(
      page,
      'studere.sessions.v1',
      (value) => value?.find((s) => s.id === SESSIONS[0].id)?.starred === true,
    );
    expect(stored.find((s) => s.id === SESSIONS[0].id)!.starred).toBe(true);
  });

  test('a row opens the session detail', async ({ page }) => {
    await seedAndGoto(page, SESSIONS, '/dashboard');

    await rows(page).filter({ hasText: SESSIONS[0].title }).getByRole('link').click();

    await expect(page).toHaveURL(new RegExp(`/sessions/${SESSIONS[0].id}$`), { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: SESSIONS[0].title, level: 1 })).toBeVisible();
  });
});

test.describe('Detalle de sesión — shell', () => {
  test('the mind map renders its canvas', async ({ page }) => {
    await openSession(page, SESSIONS[0]);

    await openPanel(page, 'Mapa Mental');

    // An ECharts force layout behind a `dynamic()` import with a loading
    // placeholder, so the container is the signal — not a fixed delay.
    await expect(page.locator('#mindmap-container')).toBeVisible({ timeout: 30_000 });
  });

  test('the live region announces the active panel', async ({ page }) => {
    await openSession(page, SESSIONS[0]);
    // `sr-only`, so assert its text rather than its visibility.
    const live = page.locator('[aria-live="polite"][aria-atomic="true"]');

    await expect(live).toHaveText('Panel activo: Resumen IA');

    await openPanel(page, 'Flashcards');
    await expect(live).toHaveText('Panel activo: Flashcards');

    await openPanel(page, 'Tareas');
    await expect(live).toHaveText('Panel activo: Tareas');
  });
});

test.describe('Chat con Stude', () => {
  const REPLY = 'La memoria de trabajo retiene información por segundos.';

  /**
   * Answer the backend chat call with a fixed reply.
   *
   * Without this the popup silently falls back to `buildBrainReply`, so the
   * conversation still renders and a test asserting "some assistant bubble
   * appeared" would pass with the network dead. Stubbing makes the assertion
   * about the reply we served.
   *
   * The backend lives on another origin (`localhost:7071`), so the fetch is
   * cross-origin: the CORS headers and the preflight branch are what make the
   * stubbed response reach the app instead of being blocked by the browser.
   *
   * Returns the messages the app sent, so a test can assert what was requested.
   */
  async function stubChat(page: Page) {
    const sent: Array<{ message: string }> = [];
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
    };

    await page.route('**/api/stude-chat', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      sent.push(route.request().postDataJSON());
      await route.fulfill({
        status: 200,
        headers: { ...cors, 'content-type': 'application/json' },
        body: JSON.stringify({ reply: REPLY }),
      });
    });

    return sent;
  }

  async function openChat(page: Page) {
    await page.getByRole('button', { name: 'Stude', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Chat con Stude IA' });
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    return dialog;
  }

  test('sends a message and renders the reply', async ({ page }) => {
    const sent = await stubChat(page);
    await openSession(page, SESSIONS[0]);

    const dialog = await openChat(page);
    await dialog.getByPlaceholder('Preguntale a Stude...').fill('¿Qué es la memoria de trabajo?');
    await dialog.getByRole('button', { name: 'Enviar mensaje' }).click();

    await expect(dialog.getByText('¿Qué es la memoria de trabajo?')).toBeVisible();
    await expect(dialog.getByText(REPLY)).toBeVisible();
    expect(sent.map((body) => body.message)).toEqual(['¿Qué es la memoria de trabajo?']);
  });

  test('a quick prompt sends its full template, not its label', async ({ page }) => {
    const sent = await stubChat(page);
    await openSession(page, SESSIONS[0]);

    const dialog = await openChat(page);
    await dialog.getByRole('button', { name: 'Resumen clave' }).click();

    await expect(dialog.getByText(REPLY)).toBeVisible();
    // The button reads "Resumen clave"; the prompt behind it is the long form
    // from BRAIN_PROMPT_TEMPLATES, and only the request body proves which went out.
    expect(sent).toHaveLength(1);
    expect(sent[0].message).toBe(
      'Dame los puntos clave de esta sesión en formato ejecutivo, priorizando lo que necesito para un examen.',
    );
  });

  test('the conversation survives closing and reopening the popup', async ({ page }) => {
    await stubChat(page);
    await openSession(page, SESSIONS[0]);

    const dialog = await openChat(page);
    await dialog.getByPlaceholder('Preguntale a Stude...').fill('Hola Stude');
    await dialog.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(dialog.getByText(REPLY)).toBeVisible();

    await dialog.getByRole('button', { name: 'Cerrar' }).click();
    await expect(dialog).toBeHidden();

    // History is persisted onto the session, so the reopened popup is not blank.
    const reopened = await openChat(page);
    await expect(reopened.getByText('Hola Stude')).toBeVisible();
    await expect(reopened.getByText(REPLY)).toBeVisible();
  });
});

test.describe('Drawer móvil', () => {
  // Pinned rather than inherited: the desktop projects would otherwise never
  // exercise the drawer, and `revealSidebar` would skip its own body.
  test.use({ viewport: { width: 390, height: 844 } });

  test('the hamburger opens the drawer and a link closes it', async ({ page }) => {
    await openShell(page, '/dashboard');
    const hamburger = page.getByRole('button', { name: 'Abrir menú de navegación' });

    await expect(hamburger).toHaveAttribute('aria-expanded', 'false');

    await hamburger.click();
    const opened = page.getByRole('button', { name: 'Cerrar menú de navegación' });
    await expect(opened).toHaveAttribute('aria-expanded', 'true');

    await navMenu(page).getByRole('link', { name: 'Biblioteca' }).click();

    await expect(page).toHaveURL(/\/library$/, { timeout: 60_000 });
    // Navigating also closes the drawer — the nav links reset the open state.
    await expect(page.getByRole('button', { name: 'Abrir menú de navegación' })).toBeVisible();
  });

  test('Escape closes the drawer', async ({ page }) => {
    await openShell(page, '/dashboard');

    await page.getByRole('button', { name: 'Abrir menú de navegación' }).click();
    await expect(page.getByRole('button', { name: 'Cerrar menú de navegación' })).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByRole('button', { name: 'Abrir menú de navegación' })).toBeVisible();
  });
});

test.describe('Páginas estáticas', () => {
  test('Integraciones lists every provider with real connection states', async ({ page }) => {
    await seedAndGoto(page, SESSIONS, '/integrations');

    await expect(page.getByRole('heading', { name: 'Integraciones', level: 1 })).toBeVisible();
    // Fresh context starts with nothing connected, so the development banner shows.
    await expect(
      page.getByText(
        'Las integraciones reales están en desarrollo. Podés conectar las integraciones locales y el resto estará disponible próximamente.',
      ),
    ).toBeVisible();

    const providers = [
      'Google Calendar',
      'Microsoft Outlook',
      'Google Drive / Dropbox',
      'Slack / Discord',
      'Chrome Extension',
      'Automatizaciones',
    ];
    for (const name of providers) {
      await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
    }

    // Every card starts disconnected with an enabled Conectar CTA.
    await expect(page.getByText('Desconectada', { exact: true })).toHaveCount(providers.length);
    await expect(page.getByRole('button', { name: 'Conectar', exact: true })).toHaveCount(providers.length);

    // Connecting a builtin integration (Automatizaciones) persists end to end:
    // the card flips to Conectada, the storage key is written, and the banner
    // disappears because there is now at least one real connection.
    const automationsCard = page
      .locator('.int-card')
      .filter({ has: page.getByRole('heading', { name: 'Automatizaciones', level: 2 }) });

    await automationsCard.getByRole('button', { name: 'Conectar' }).click();
    await expect(automationsCard.getByText('Conectada', { exact: true })).toBeVisible();
    await expect(
      automationsCard.getByRole('button', { name: 'Desconectar', exact: true }),
    ).toBeVisible();

    await readStoredJson<string[]>(
      page,
      'studere.integrations.v1',
      (value) => Array.isArray(value) && value.includes('automations'),
    );

    await expect(
      page.getByText(
        'Las integraciones reales están en desarrollo. Podés conectar las integraciones locales y el resto estará disponible próximamente.',
      ),
    ).toHaveCount(0);
    await expect(page.getByText('Desconectada', { exact: true })).toHaveCount(providers.length - 1);

    // Disconnecting reverts to the disconnected state and unpersists the id.
    await automationsCard.getByRole('button', { name: 'Desconectar' }).click();
    await expect(automationsCard.getByText('Desconectada', { exact: true })).toBeVisible();
    await readStoredJson<string[]>(page, 'studere.integrations.v1', (value) =>
      Array.isArray(value) ? !value.includes('automations') : false,
    );
  });

  test('Próximos lists its events and links both calendars to Integraciones', async ({ page }) => {
    await seedAndGoto(page, SESSIONS, '/upcoming');

    await expect(page.getByRole('heading', { name: 'Próximos eventos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Repaso de Parcial I' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Clase online de Historia Económica' }),
    ).toBeVisible();

    for (const name of ['Conectar Google Calendar', 'Conectar Microsoft Outlook']) {
      await expect(page.getByRole('link', { name })).toHaveAttribute('href', '/integrations');
    }
  });
});
