import type { Browser, BrowserContext, Page } from '@playwright/test';
import { TEST_PERSONAS, type PersonaKey, type PersonaSpec } from './emulator';

export interface TelemetryTrackers {
  consoleErrors: string[];
  pageErrors: string[];
  requestedUrls: string[];
  failedResponses: Array<{ url: string; status: number }>;
  getPermissionDeniedErrors: () => string[];
  getLeakedAdminOrSeedUrls: () => string[];
}

export function attachTelemetryTrackers(page: Page): TelemetryTrackers {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestedUrls: string[] = [];
  const failedResponses: Array<{ url: string; status: number }> = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err.message || String(err));
  });

  page.on('request', (req) => {
    requestedUrls.push(req.url());
  });

  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('favicon.ico')) {
      failedResponses.push({ url: res.url(), status: res.status() });
    }
  });

  return {
    consoleErrors,
    pageErrors,
    requestedUrls,
    failedResponses,
    getPermissionDeniedErrors: () =>
      consoleErrors.filter((msg) =>
        /permission[-_ ]denied|missing or insufficient permissions/i.test(msg)
      ),
    getLeakedAdminOrSeedUrls: () =>
      requestedUrls.filter((url) =>
        /(AdminDashboard|AdminEventAttendanceScanner|AdminLayout|AdminApp|AdminAssemblyTab|AdminEventsTab|AdminBootstrapPanel|jsqr|\/src\/data\/)/i.test(
          url
        )
      ),
  };
}

export async function signInViaLoginPage(
  page: Page,
  identifier: string,
  password: string
): Promise<void> {
  if (!new URL(page.url()).pathname.startsWith('/login')) {
    await page.goto('/login');
  }
  const identifierInput = page
    .locator(
      '#login_identifier, input[autocomplete="username"], input[type="email"]'
    )
    .first();
  await identifierInput.waitFor({ state: 'visible', timeout: 15000 });
  await identifierInput.fill(identifier);

  const passwordInput = page
    .locator(
      '#login_password, input[autocomplete="current-password"], input[type="password"]'
    )
    .first();
  await passwordInput.fill(password);

  const submitButton = page
    .locator('form button[type="submit"]')
    .first();
  await submitButton.click();

  await page.waitForFunction(
    () => !window.location.pathname.startsWith('/login'),
    undefined,
    { timeout: 15000 }
  );
}

export async function signInViaAdminGate(
  page: Page,
  targetPath: string,
  identifier: string,
  password: string
): Promise<void> {
  await page.goto(targetPath);

  const identifierInput = page
    .locator(
      '#admin_login_identifier, #login_identifier, input[autocomplete="username"], input[type="email"]'
    )
    .first();
  await identifierInput.waitFor({ state: 'visible', timeout: 15000 });
  await identifierInput.fill(identifier);

  const passwordInput = page
    .locator(
      '#admin_login_password, #login_password, input[autocomplete="current-password"], input[type="password"]'
    )
    .first();
  await passwordInput.fill(password);

  const submitButton = page
    .locator('form button[type="submit"]')
    .first();
  await submitButton.click();

  await page
    .locator(
      'nav a[href="/admin/programs"], nav a[href="/admin/board"], nav a[href="/admin/attendance"], a[href="/"], [data-testid="access-denied"]'
    )
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });
}

export interface RoleContextHandle {
  context: BrowserContext;
  page: Page;
  trackers: TelemetryTrackers;
  persona: PersonaSpec | null;
  close: () => Promise<void>;
}

export async function createRoleContext(
  browser: Browser,
  role: PersonaKey | 'visitor',
  options?: {
    initialLanguage?: 'de' | 'en' | 'id' | 'ms';
    skipLogin?: boolean;
  }
): Promise<RoleContextHandle> {
  const context = await browser.newContext({
    permissions: ['camera'],
  });

  if (options?.initialLanguage) {
    const lang = options.initialLanguage;
    await context.addInitScript((l) => {
      window.localStorage.setItem('percikan_iman_language', l);
    }, lang);
  }

  const page = await context.newPage();
  const trackers = attachTelemetryTrackers(page);

  if (role === 'visitor') {
    await page.goto('/');
    return {
      context,
      page,
      trackers,
      persona: null,
      close: () => context.close(),
    };
  }

  const persona = TEST_PERSONAS[role];
  if (!options?.skipLogin) {
    await signInViaLoginPage(page, persona.email, persona.password);
  }

  return {
    context,
    page,
    trackers,
    persona,
    close: () => context.close(),
  };
}
