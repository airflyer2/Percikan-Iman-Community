import { expect, test } from '@playwright/test';
import {
  attachTelemetryTrackers,
  createRoleContext,
  signInViaLoginPage,
} from './fixtures/auth';
import {
  attemptUnauthenticatedOrMemberFirestoreRead,
  attemptUnauthenticatedOrMemberFirestoreWrite,
  buildBallotBreakdown,
  buildMemberDocument,
  deleteFirestoreDoc,
  getFirestoreDoc,
  listFirestoreCollection,
  resetEmulators,
  seedAuthUser,
  seedFirestoreDoc,
  seedStandardWorld,
  TEST_PERSONAS,
} from './fixtures/emulator';
import {
  ADMIN_SELECTORS,
  AdminShellPage,
  AssemblyPage,
  AttendanceScannerPage,
  DonatePage,
  fillPhotoUploadUrl,
  LOCALE_REGEX,
  PublicLayoutPage,
} from './pages';

test.describe('Tier 2 — Boundaries, Negative Cases & Security Rules (F1–F18)', () => {
  test.describe('F1 Boundaries: Unknown Routes & Unauthenticated Guards', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('unknown public path /nonexistent-route redirects to /', async ({
      page,
    }) => {
      await page.goto('/nonexistent-route');
      await expect(page).toHaveURL(/\/$/);
    });

    test('deep unknown public path /foo/bar/baz redirects to /', async ({
      page,
    }) => {
      await page.goto('/foo/bar/baz');
      await expect(page).toHaveURL(/\/$/);
    });

    test('unknown admin sub-route /admin/nonexistent redirects to first permitted tab for admin', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/nonexistent');
        await expect(handle.page).toHaveURL(/\/admin\/programs$/);
      } finally {
        await handle.close();
      }
    });

    test('unauthenticated visit to /member does not render active member profile', async ({
      page,
    }) => {
      await page.goto('/member');
      await expect(page.getByText('PI-FAM-2021')).toHaveCount(0);
    });

    test('unauthenticated visit to /assembly does not allow casting ballots', async ({
      page,
    }) => {
      await page.goto('/assembly');
      await expect(
        page.getByRole('button', { name: /Cast Ballot/i })
      ).toHaveCount(0);
    });
  });

  test.describe('F2 Boundaries: Emulator Reset & Unauthenticated Write Denials', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('resetEmulators wipes previously seeded documents cleanly', async ({
      page,
    }) => {
      await resetEmulators();
      await page.goto('/programs');
      await expect(
        page.getByText("Monatliches Pengajian (Ta'lim Schweiz)")
      ).toHaveCount(0);
    });

    test('unauthenticated Firestore REST write to /programs is denied (403)', async () => {
      const res = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'programs',
        docId: 'prog-hack',
        data: { id: 'prog-hack', title: 'Hacked' },
      });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    });

    test('direct cold navigation to /admin/events mounts AdminLoginGate without prior / visit', async ({
      page,
    }) => {
      await page.goto('/admin/events');
      const shell = new AdminShellPage(page);
      await shell.assertAdminLoginGateVisible();
    });

    test('hard reload on /admin/assembly preserves route for signed-in admin without 404', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/assembly');
        const res = await handle.page.reload();
        expect(res?.status() ?? 200).toBeLessThan(400);
        await expect(handle.page).toHaveURL(/\/admin\/assembly$/);
      } finally {
        await handle.close();
      }
    });

    test('unknown REST document read on private collection /donationPledges fails without owner token', async () => {
      const res = await attemptUnauthenticatedOrMemberFirestoreRead({
        collectionPath: 'donationPledges',
      });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    });
  });

  test.describe('F3 Boundaries: Zero Inline Admin & Zero Impersonation Controls', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('superAdmin on / sees zero Admin ON/OFF toggle', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'superAdmin');
      try {
        const pub = new PublicLayoutPage(handle.page);
        await pub.goto('/');
        await pub.assertNoPublicAdminClutter();
      } finally {
        await handle.close();
      }
    });

    test('admin on /programs sees zero inline Edit or Delete program buttons', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/programs');
        await expect(
          handle.page.getByRole('button', { name: /Delete Program|Programm löschen|Edit Program/i })
        ).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });

    test('admin on /assembly sees zero moderation controls even when gaSession.isOpen is false', async ({
      browser,
    }) => {
      await seedStandardWorld({ gaOpen: false });
      const handle = await createRoleContext(browser, 'admin');
      try {
        const assembly = new AssemblyPage(handle.page);
        await assembly.goto();
        await assembly.assertNoModerationControls();
      } finally {
        await handle.close();
      }
    });

    test('standard active member sees zero /admin navigation links anywhere on public shell', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        await handle.page.goto('/member');
        await expect(handle.page.locator('a[href^="/admin"]')).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });

    test('/admin/members never renders Role Testing Mode or Switch User impersonation controls', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'superAdmin');
      try {
        await handle.page.goto('/admin/members');
        await expect(
          handle.page.getByText(/Role Testing Mode|switchedFromSuperAdmin/i)
        ).toHaveCount(0);
        await expect(
          handle.page.getByRole('button', { name: /Switch User|Impersonate/i })
        ).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F4 Boundaries: Bundle & Route Chunk Isolation', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('visitor traversing /donate, /gallery, /about, /contact never requests admin or seed chunks', async ({
      page,
    }) => {
      const trackers = attachTelemetryTrackers(page);
      for (const p of ['/donate', '/gallery', '/about', '/contact']) {
        await page.goto(p);
        await page.waitForLoadState('load');
        await expect(page.locator('#main-content, main').first()).toBeVisible({
          timeout: 15000,
        });
        await expect(page.locator('[aria-busy="true"], .animate-spin')).toHaveCount(0, {
          timeout: 15000,
        });
      }
      expect(trackers.getLeakedAdminOrSeedUrls()).toEqual([]);
    });

    test('authenticated standard member on /member never requests admin or seed chunks', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        handle.trackers.requestedUrls.length = 0;
        await handle.page.goto('/member');
        await handle.page.waitForLoadState('load');
        await expect(
          handle.page.getByText(TEST_PERSONAS.activeFamily.memberCode).first()
        ).toBeVisible({ timeout: 15000 });
        await expect(
          handle.page.locator('[aria-busy="true"], .animate-spin')
        ).toHaveCount(0, { timeout: 15000 });
        expect(handle.trackers.getLeakedAdminOrSeedUrls()).toEqual([]);
      } finally {
        await handle.close();
      }
    });

    test('authenticated standard member on /assembly never requests admin or jsqr chunks', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activePersonal');
      try {
        handle.trackers.requestedUrls.length = 0;
        await handle.page.goto('/assembly');
        await handle.page.waitForLoadState('load');
        await expect(
          handle.page.locator('[aria-busy="true"], .animate-spin')
        ).toHaveCount(0, { timeout: 15000 });
        await expect(handle.page.locator('h1').first()).toBeVisible({
          timeout: 15000,
        });
        expect(handle.trackers.getLeakedAdminOrSeedUrls()).toEqual([]);
      } finally {
        await handle.close();
      }
    });

    test('authenticated standard member blocked on /admin/programs never renders AdminDashboard controls', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activePersonal');
      try {
        const shell = new AdminShellPage(handle.page);
        await shell.goto('/admin/programs');
        await shell.assertAccessDenied();
        await expect(
          handle.page.getByRole('button', { name: /New Program|Neues Programm/i })
        ).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });

    test('canManageBoard-only on /admin/board never loads jsqr attendance scanner module', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canManageBoard');
      try {
        handle.trackers.requestedUrls.length = 0;
        await handle.page.goto('/admin/board');
        await handle.page.waitForLoadState('load');
        await expect(
          handle.page.getByRole('button', { name: ADMIN_SELECTORS.addBoardBtn }).first()
        ).toBeVisible({ timeout: 15000 });
        await expect(
          handle.page.getByText('Loading Board of Directors from Firestore...')
        ).toHaveCount(0, { timeout: 15000 });
        const leakedScanner = handle.trackers.requestedUrls.filter((u) =>
          /jsqr|AdminEventAttendanceScanner/i.test(u)
        );
        expect(leakedScanner).toEqual([]);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F5 Boundaries: Auth Failure & Missing Profile Handling', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('unauthenticated /member never falls back to DEFAULT_FAMILY_MEMBER', async ({
      page,
    }) => {
      await page.goto('/member');
      await expect(page.getByText('Ridwan Kamil Santoso')).toHaveCount(0);
    });

    test('Auth user without /members/{uid} doc does not crash public or /member routes', async ({
      page,
    }) => {
      const orphan = await seedAuthUser({
        email: 'orphan@percikaniman.org',
        password: 'OrphanUser!2026',
        name: 'Orphan User',
      });
      expect(orphan.uid).toBeTruthy();
      const trackers = attachTelemetryTrackers(page);
      await page.goto('/login');
      await page.locator('#login_identifier').fill('orphan@percikaniman.org');
      await page.locator('#login_password').fill('OrphanUser!2026');
      const submitBtn = page.locator('form button[type="submit"]').first();
      await submitBtn.click();
      await expect(submitBtn).toBeEnabled({ timeout: 10000 });
      await page.goto('/member');
      await expect(page.locator('main, #main-content').first()).toBeVisible({
        timeout: 10000,
      });
      expect(trackers.pageErrors).toEqual([]);
    });

    test('wrong password on /login displays inline error and stays on /login', async ({
      page,
    }) => {
      await page.goto('/login');
      await page.locator('#login_identifier').fill(TEST_PERSONAS.activeFamily.email);
      await page.locator('#login_password').fill('WrongPassword!999');
      await page.locator('form button[type="submit"]').first().click();
      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.locator('.bg-red-50, [role="alert"]').first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('non-staff memberCode (PI-7740) is rejected on login form', async ({
      page,
    }) => {
      await page.goto('/login');
      await page.locator('#login_identifier').fill('PI-7740');
      await page.locator('#login_password').fill(TEST_PERSONAS.activePersonal.password);
      await page.locator('form button[type="submit"]').first().click();
      await expect(page).toHaveURL(/\/login$/);
      await expect(
        page.locator('.bg-red-50, [role="alert"]').first()
      ).toBeVisible({ timeout: 10000 });
    });

    test('browser reload after sign-out does not restore previous authenticated member', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        await handle.page.goto('/member');
        await handle.page
          .getByRole('button', { name: LOCALE_REGEX.logoutNav })
          .first()
          .click();
        await expect(
          handle.page
            .getByRole('link', { name: LOCALE_REGEX.loginNav })
            .or(handle.page.getByRole('button', { name: LOCALE_REGEX.loginNav }))
            .or(handle.page.locator('#login_identifier'))
            .first()
        ).toBeVisible({ timeout: 15000 });
        await handle.page.reload();
        await handle.page.goto('/member');
        await expect(handle.page.getByText('PI-FAM-2021')).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F6 Boundaries: AdminRouteGuard Denials & Partial-Role Redirects', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('standard non-staff member visiting /admin sees Access Denied and Return to Public link', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        const shell = new AdminShellPage(handle.page);
        await shell.goto('/admin');
        await shell.assertAccessDenied();
      } finally {
        await handle.close();
      }
    });

    test('canScanQR-only visiting /admin/members redirects to /admin/attendance', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        await handle.page.goto('/admin/members');
        await expect(handle.page).toHaveURL(/\/admin\/attendance$/);
      } finally {
        await handle.close();
      }
    });

    test('canManageBoard-only visiting /admin/donations redirects to /admin/board', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canManageBoard');
      try {
        await handle.page.goto('/admin/donations');
        await expect(handle.page).toHaveURL(/\/admin\/board$/);
      } finally {
        await handle.close();
      }
    });

    test('non-superAdmin isAdmin visiting /admin/bootstrap is redirected away or denied', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/bootstrap');
        await expect(handle.page).not.toHaveURL(/\/admin\/bootstrap$/);
      } finally {
        await handle.close();
      }
    });

    test('invalid password on AdminLoginGate shows inline error and keeps target path guarded', async ({
      page,
    }) => {
      await page.goto('/admin/donations');
      await page
        .locator('#admin_login_identifier, #login_identifier, input[type="email"]')
        .first()
        .fill(TEST_PERSONAS.admin.email);
      await page
        .locator('#admin_login_password, #login_password, input[type="password"]')
        .first()
        .fill('BadPass!123');
      await page.locator('form button[type="submit"]').first().click();
      await expect(
        page.locator('.bg-red-50, [role="alert"]').first()
      ).toBeVisible({ timeout: 10000 });
      await expect(page.locator('a[href="/admin/programs"]')).toHaveCount(0);
    });
  });

  test.describe('F7 Boundaries: Dev Gating & Override Isolation', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('AdminLoginGate exposes zero runtime Firebase config modal buttons', async ({
      page,
    }) => {
      await page.goto('/admin/attendance');
      await expect(
        page.getByRole('button', { name: /Connect Firebase|Firebase Cloud Active/i })
      ).toHaveCount(0);
    });

    test('AdminLoginGate exposes zero public Become a Member paywall tabs', async ({
      page,
    }) => {
      await page.goto('/admin/programs');
      await expect(
        page.getByRole('button', { name: /Become a Member|Mitglied werden/i })
      ).toHaveCount(0);
    });

    test('non-existent seeded user cannot auto-provision in Auth without valid password', async ({
      page,
    }) => {
      await page.goto('/login');
      await page.locator('#login_identifier').fill('ghost@percikaniman.org');
      await page.locator('#login_password').fill('Member!2026');
      await page.locator('form button[type="submit"]').first().click();
      await expect(page).toHaveURL(/\/login$/);
    });

    test('tampering localStorage mock member keys does not grant /admin access', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'vpi_mock_members',
          JSON.stringify([{ email: 'fake@percikaniman.org', isAdmin: true, isSuperAdmin: true }])
        );
      });
      await page.goto('/admin/programs');
      const shell = new AdminShellPage(page);
      await shell.assertAdminLoginGateVisible();
    });

    test('tampering localStorage firebase override with malformed JSON does not crash /login', async ({
      page,
    }) => {
      const trackers = attachTelemetryTrackers(page);
      await page.addInitScript(() => {
        window.localStorage.setItem('percikan_iman_firebase_config', '{invalid-json');
      });
      await page.goto('/login');
      await expect(page.locator('#login_identifier')).toBeVisible();
      expect(trackers.pageErrors).toEqual([]);
    });
  });

  test.describe('F8 Boundaries: App Check Resilience', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('home route renders full layout even without external reCAPTCHA network reachability', async ({
      page,
    }) => {
      const trackers = attachTelemetryTrackers(page);
      await page.goto('/');
      await expect(page.locator('h1').first()).toBeVisible();
      expect(trackers.pageErrors).toEqual([]);
    });

    test('donate page remains interactive if reCAPTCHA CDN requests are aborted', async ({
      page,
    }) => {
      await page.route('**/*recaptcha*/**', (route) => route.abort());
      const donate = new DonatePage(page);
      await donate.goto();
      await expect(donate.submitButton).toBeVisible();
    });

    test('rapid consecutive route switches across /, /programs, /donate produce zero uncaught errors', async ({
      page,
    }) => {
      const trackers = attachTelemetryTrackers(page);
      await page.goto('/');
      await page.goto('/programs');
      await page.goto('/donate');
      await page.goto('/about');
      expect(trackers.pageErrors).toEqual([]);
    });

    test('/assembly renders closed or open chamber cleanly without App Check uncaught error', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        await handle.page.goto('/assembly');
        await expect(handle.page.locator('main, #main-content').first()).toBeVisible();
        expect(handle.trackers.pageErrors).toEqual([]);
      } finally {
        await handle.close();
      }
    });

    test('/admin/donations renders without App Check uncaught error', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/donations');
        await expect(
          handle.page.getByText('Anonymer Spender Zürich').first()
        ).toBeVisible({ timeout: 15000 });
        expect(handle.trackers.pageErrors).toEqual([]);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F9 Boundaries: Unsafe URL Schemes Rejected', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('rejects javascript:alert(1) and whitespace-prefixed " javascript:alert(1)" in /admin/programs imageUrl and prevents Firestore write', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/programs');
        await handle.page
          .getByRole('button', { name: ADMIN_SELECTORS.addProgramBtn })
          .first()
          .click();
        const dialog = handle.page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible' });
        await handle.page
          .locator(ADMIN_SELECTORS.programTitleInput)
          .first()
          .fill('XSS JS Program');
        const descInput = dialog.locator('textarea').first();
        if (await descInput.isVisible().catch(() => false)) {
          await descInput.fill('Should be blocked by isSafeHttpUrl.');
        }

        for (const payload of ['javascript:alert(1)', ' javascript:alert(1)']) {
          await fillPhotoUploadUrl(dialog, payload);
          await dialog
            .getByRole('button', { name: ADMIN_SELECTORS.saveProgramBtn })
            .first()
            .click();
          const validationError = dialog
            .locator(
              '[role="alert"], .bg-red-50, .text-red-600, .text-red-700, .text-\\[\\#ba1a1a\\], input:invalid'
            )
            .first();
          await expect(validationError).toBeVisible({ timeout: 5000 });
        }

        const programs = await listFirestoreCollection('programs');
        expect(programs.some((p) => p.data.title === 'XSS JS Program')).toBe(false);
      } finally {
        await handle.close();
      }
    });

    test('rejects mixed-case JAVASCRIPT:void(0) in /admin/programs imageUrl', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/programs');
        await handle.page
          .getByRole('button', { name: ADMIN_SELECTORS.addProgramBtn })
          .first()
          .click();
        const dialog = handle.page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible' });
        await handle.page
          .locator(ADMIN_SELECTORS.programTitleInput)
          .first()
          .fill('XSS Uppercase Program');
        const descInput = dialog.locator('textarea').first();
        if (await descInput.isVisible().catch(() => false)) {
          await descInput.fill('Mixed case XSS scheme.');
        }
        await fillPhotoUploadUrl(dialog, 'JAVASCRIPT:void(0)');
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveProgramBtn })
          .first()
          .click();
        await expect(
          dialog
            .locator(
              '[role="alert"], .bg-red-50, .text-red-600, .text-red-700, .text-\\[\\#ba1a1a\\], input:invalid'
            )
            .first()
        ).toBeVisible({ timeout: 5000 });
        const programs = await listFirestoreCollection('programs');
        expect(programs.some((p) => p.data.title === 'XSS Uppercase Program')).toBe(false);
      } finally {
        await handle.close();
      }
    });

    test('rejects data:text/html and data:image/svg+xml in /admin/programs imageUrl', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/programs');
        await handle.page
          .getByRole('button', { name: ADMIN_SELECTORS.addProgramBtn })
          .first()
          .click();
        const dialog = handle.page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible' });
        await handle.page
          .locator(ADMIN_SELECTORS.programTitleInput)
          .first()
          .fill('XSS Data HTML Program');
        const descInput = dialog.locator('textarea').first();
        if (await descInput.isVisible().catch(() => false)) {
          await descInput.fill('Data URI XSS attempt.');
        }
        for (const payload of [
          'data:text/html,<script>alert(1)</script>',
          'data:image/svg+xml,<svg onload="alert(1)"/>',
        ]) {
          await fillPhotoUploadUrl(dialog, payload);
          await dialog
            .getByRole('button', { name: ADMIN_SELECTORS.saveProgramBtn })
            .first()
            .click();
          await expect(
            dialog
              .locator(
                '[role="alert"], .bg-red-50, .text-red-600, .text-red-700, .text-\\[\\#ba1a1a\\], input:invalid'
              )
              .first()
          ).toBeVisible({ timeout: 5000 });
        }
        const programs = await listFirestoreCollection('programs');
        expect(programs.some((p) => p.data.title === 'XSS Data HTML Program')).toBe(false);
      } finally {
        await handle.close();
      }
    });

    test('rejects vbscript:msgbox(1) in /admin/events onlineLink', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/events');
        await handle.page
          .getByRole('button', { name: ADMIN_SELECTORS.addEventBtn })
          .first()
          .click();
        const dialog = handle.page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible' });
        await handle.page
          .locator(ADMIN_SELECTORS.eventTitleInput)
          .first()
          .fill('XSS VBScript Event');
        const dateInput = dialog.locator('input[type="date"]').first();
        if (await dateInput.isVisible().catch(() => false)) {
          await dateInput.fill('2026-10-15');
        }
        const timeInput = dialog
          .locator('input[name="time"], input[placeholder*="18:00" i], input[placeholder*="08:30" i]')
          .first();
        if (await timeInput.isVisible().catch(() => false)) {
          await timeInput.fill('18:00 - 20:00');
        }
        const locInput = dialog
          .locator('input[name="location"], input[placeholder*="Zürich" i], input[placeholder*="Location" i]')
          .first();
        if (await locInput.isVisible().catch(() => false)) {
          await locInput.fill('Online');
        }
        const descInput = dialog.locator('textarea').first();
        if (await descInput.isVisible().catch(() => false)) {
          await descInput.fill('Should reject vbscript online link.');
        }
        const onlineCheckbox = dialog.locator('input[type="checkbox"]').first();
        if (
          (await onlineCheckbox.isVisible().catch(() => false)) &&
          !(await onlineCheckbox.isChecked().catch(() => false))
        ) {
          await onlineCheckbox.check();
        }
        const linkInput = dialog
          .locator(
            'input[name="onlineLink"], input[placeholder*="meet" i], input[placeholder*="zoom" i]'
          )
          .first();
        await expect(linkInput).toBeVisible({ timeout: 5000 });
        await linkInput.fill('vbscript:msgbox(1)');
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveEventBtn })
          .first()
          .click();
        await expect(
          dialog
            .locator(
              '[role="alert"], .bg-red-50, .text-red-600, .text-red-700, .text-\\[\\#ba1a1a\\], input:invalid'
            )
            .first()
        ).toBeVisible({ timeout: 5000 });
        const events = await listFirestoreCollection('events');
        expect(events.some((e) => e.data.title === 'XSS VBScript Event')).toBe(false);
      } finally {
        await handle.close();
      }
    });

    test('rejects file:///etc/passwd in /admin/board imageUrl', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canManageBoard');
      try {
        await handle.page.goto('/admin/board');
        await handle.page
          .getByRole('button', { name: ADMIN_SELECTORS.addBoardBtn })
          .first()
          .click();
        const dialog = handle.page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible' });
        await handle.page
          .locator(ADMIN_SELECTORS.boardNameInput)
          .first()
          .fill('Unsafe File Board Member');
        await handle.page
          .locator(ADMIN_SELECTORS.boardRoleInput)
          .first()
          .fill('Board Tester');
        await dialog
          .locator('textarea')
          .first()
          .fill('Should fail URL validation.');
        await fillPhotoUploadUrl(dialog, 'file:///etc/passwd');
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveBoardBtn })
          .first()
          .click();
        await expect(
          dialog
            .locator(
              '[role="alert"], .bg-red-50, .text-red-600, .text-red-700, .text-\\[\\#ba1a1a\\], input:invalid'
            )
            .first()
        ).toBeVisible({ timeout: 5000 });
        const board = await listFirestoreCollection('boardMembers');
        expect(board.some((b) => b.data.name === 'Unsafe File Board Member')).toBe(false);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F10 Boundaries: Empty Firestore Without Static Fallback', () => {
    test.beforeEach(async () => {
      await resetEmulators();
    });

    test('/programs renders explicit empty state when Firestore /programs is empty (no src/data fallback)', async ({
      page,
    }) => {
      await page.goto('/programs');
      await page.waitForLoadState('load');
      await expect(page.locator('[aria-busy="true"], .animate-spin')).toHaveCount(0);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(
        page.getByText(/Keine Programme gefunden|No programs found|Program tidak ditemukan|Tiada program dijumpai/i).first()
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText("Monatliches Pengajian (Ta'lim Schweiz)")
      ).toHaveCount(0);
    });

    test('/ renders no static events when Firestore /events is empty', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('load');
      await expect(page.locator('[aria-busy="true"], .animate-spin')).toHaveCount(0);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(
        page.getByText(/Keine.*Veranstaltungen|No.*events|empty|0 Events/i).first()
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText('Guest Lecture: Ustadz Salim A. Fillah')
      ).toHaveCount(0);
    });

    test('/about renders no static board members when Firestore /boardMembers is empty', async ({
      page,
    }) => {
      await page.goto('/about');
      await page.waitForLoadState('load');
      await expect(page.locator('[aria-busy="true"], .animate-spin')).toHaveCount(0);
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(
        page
          .getByText(
            /Kein(?:e)? Vorstandsmitglied(?:er)? gefunden|No board members|empty|0 Mitglieder/i
          )
          .first()
      ).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Dr. H. Aam Amiruddin')).toHaveCount(0);
    });

    test('deleting all seeded programs keeps /programs empty across hard reload', async ({
      page,
    }) => {
      await seedStandardWorld();
      const programs = await listFirestoreCollection('programs');
      for (const prog of programs) {
        await deleteFirestoreDoc('programs', prog.id);
      }
      await page.goto('/programs');
      await page.reload();
      await page.waitForLoadState('load');
      await expect(page.locator('[aria-busy="true"], .animate-spin')).toHaveCount(0);
      await expect(
        page.getByText(/Keine Programme gefunden|No programs found|Program tidak ditemukan|Tiada program dijumpai/i).first()
      ).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText("Monatliches Pengajian (Ta'lim Schweiz)")
      ).toHaveCount(0);
    });

    test('/donate renders no static fallback destinations when Firestore /destinations is empty', async ({
      page,
    }) => {
      await page.goto('/donate');
      await page.waitForLoadState('load');
      await expect(page.locator('[aria-busy="true"], .animate-spin')).toHaveCount(0);
      await expect(page.locator('h1').first()).toBeVisible();
      const optionsCount = await page
        .locator('#form-destination-dropdown option')
        .count();
      expect(optionsCount).toBe(0);
    });
  });

  test.describe('F11 Boundaries: Role-Scoped Content Write Denials', () => {
    test('unauthenticated REST write to /events, /campaigns, /siteConfig/notice is denied (403)', async () => {
      await seedStandardWorld();
      const r1 = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'events',
        docId: 'evt-hack',
        data: {
          id: 'evt-hack',
          title: 'Hack Event',
          date: '2026-10-01',
          time: '10:00 - 12:00',
          category: 'Majelis & Spiritual',
          location: 'Zürich',
          description: 'Unauthorized event write test',
        },
      });
      const r2 = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'campaigns',
        docId: 'camp-hack',
        data: {
          id: 'camp-hack',
          title: 'Hack Campaign',
          description: 'Unauthorized campaign write test',
          progressPercent: 10,
          currentAmount: 100,
          goalAmount: 1000,
        },
      });
      const r3 = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'siteConfig',
        docId: 'notice',
        data: { enabled: true, badge: 'Hack', message: 'Hack' },
      });
      expect(r1.status).toBe(403);
      expect(r2.status).toBe(403);
      expect(r3.status).toBe(403);
    });

    test('standard member REST write to /programs is denied (403)', async () => {
      const { users } = await seedStandardWorld();
      const res = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'programs',
        docId: 'prog-member-hack',
        data: {
          id: 'prog-member-hack',
          title: 'Member Hack',
          category: 'Religious',
          tag: 'Active',
          iconName: 'volunteer_activism',
          description: 'Member hack description',
          detailedOverview: 'Member hack overview',
          imageUrl: 'https://images.unsplash.com/photo-1585036156171-384164a8c675',
          dateOrSchedule: 'Sundays',
          location: 'Zürich',
        },
        idToken: users.activeFamily.idToken,
      });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    });

    test('canManageBoard-only REST write to /programs and /events is denied (403)', async () => {
      const { users } = await seedStandardWorld();
      const progRes = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'programs',
        docId: 'prog-board-hack',
        data: {
          id: 'prog-board-hack',
          title: 'Board Hack',
          category: 'Religious',
          tag: 'Active',
          iconName: 'volunteer_activism',
          description: 'Board hack description',
          detailedOverview: 'Board hack overview',
          imageUrl: 'https://images.unsplash.com/photo-1585036156171-384164a8c675',
          dateOrSchedule: 'Sundays',
          location: 'Zürich',
        },
        idToken: users.canManageBoard.idToken,
      });
      const evtRes = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'events',
        docId: 'evt-board-hack',
        data: {
          id: 'evt-board-hack',
          title: 'Board Hack Event',
          date: '2026-10-01',
          time: '10:00 - 12:00',
          category: 'Majelis & Spiritual',
          location: 'Zürich',
          description: 'Board hack event',
        },
        idToken: users.canManageBoard.idToken,
      });
      expect(progRes.status).toBe(403);
      expect(evtRes.status).toBe(403);
    });

    test('canScanQR-only REST write to /boardMembers is denied (403)', async () => {
      const { users } = await seedStandardWorld();
      const res = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'boardMembers',
        docId: 'board-scan-hack',
        data: {
          id: 'board-scan-hack',
          name: 'Scan Hack',
          role: 'Hacker',
          department: 'Administration',
          imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
          bio: 'Unauthorized board member write',
        },
        idToken: users.canScanQR.idToken,
      });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    });

    test('/admin/programs form blocks creating program with empty required title', async ({
      browser,
    }) => {
      await seedStandardWorld();
      const before = await listFirestoreCollection('programs');
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/programs');
        await handle.page
          .getByRole('button', { name: ADMIN_SELECTORS.addProgramBtn })
          .first()
          .click();
        const dialog = handle.page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible' });
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveProgramBtn })
          .first()
          .click();
        const after = await listFirestoreCollection('programs');
        expect(after.length).toBe(before.length);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F12 Boundaries: Donation Pledge Bounds & Ledger Protection', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('/donate disables or blocks submission when custom amount is 0', async ({
      page,
    }) => {
      const donate = new DonatePage(page);
      await donate.goto();
      await donate.customAmountInput.fill('0');
      await donate.donorNameInput.fill('Zero Donor');
      await donate.donorEmailInput.fill('zero@example.ch');
      await expect(donate.submitButton).toBeDisabled();
    });

    test('Firestore rules reject /donationPledges create with amount > 100000 (100001)', async () => {
      const res = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'donationPledges',
        docId: 'pledge-overmax',
        data: {
          id: 'pledge-overmax',
          donorName: 'Over Max',
          email: 'max@example.ch',
          amount: 100001,
          currency: 'CHF',
          destination: 'INFAQ & Vereinsbetrieb',
          date: '2026-09-10',
          paymentMethod: 'Bank Transfer',
          status: 'Processing',
        },
      });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    });

    test('Firestore rules reject /donationPledges create forging status="Completed" or currency="EUR"', async () => {
      const badStatus = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'donationPledges',
        docId: 'pledge-bad-status',
        data: {
          id: 'pledge-bad-status',
          donorName: 'Forge Status',
          email: 'forge@example.ch',
          amount: 50,
          currency: 'CHF',
          destination: 'INFAQ & Vereinsbetrieb',
          date: '2026-09-10',
          paymentMethod: 'Bank Transfer',
          status: 'Completed',
        },
      });
      const badCurrency = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'donationPledges',
        docId: 'pledge-bad-cur',
        data: {
          id: 'pledge-bad-cur',
          donorName: 'Forge Currency',
          email: 'forge@example.ch',
          amount: 50,
          currency: 'EUR',
          destination: 'INFAQ & Vereinsbetrieb',
          date: '2026-09-10',
          paymentMethod: 'Bank Transfer',
          status: 'Processing',
        },
      });
      expect(badStatus.status).toBe(403);
      expect(badCurrency.status).toBe(403);
    });

    test('standard member cannot read /donationPledges or /donationReports via REST (403)', async () => {
      const { users } = await seedStandardWorld();
      const pledgesRead = await attemptUnauthenticatedOrMemberFirestoreRead({
        collectionPath: 'donationPledges',
        idToken: users.activeFamily.idToken,
      });
      const reportsRead = await attemptUnauthenticatedOrMemberFirestoreRead({
        collectionPath: 'donationReports',
        idToken: users.activeFamily.idToken,
      });
      expect(pledgesRead.status).toBe(403);
      expect(reportsRead.status).toBe(403);
    });

    test('standard member cannot create /donationReports document directly (403)', async () => {
      const { users } = await seedStandardWorld();
      const res = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'donationReports',
        docId: 'rep-forge',
        data: {
          id: 'rep-forge',
          donorName: 'Forged Report',
          email: 'forge@example.ch',
          amount: 500,
          currency: 'CHF',
          destination: 'INFAQ',
          date: '2026-09-10',
          paymentMethod: 'TWINT',
          status: 'Completed',
        },
        idToken: users.activeFamily.idToken,
      });
      expect(res.status).toBe(403);

      // Even admin cannot mutate immutable pledge fields (amount) on /donationPledges
      await seedFirestoreDoc('donationPledges', 'pledge-immutable-check', {
        id: 'pledge-immutable-check',
        donorName: 'Immutable Donor',
        email: 'immut@example.ch',
        amount: 50,
        currency: 'CHF',
        destination: 'INFAQ & Vereinsbetrieb (Percikan Iman Schweiz)',
        date: '2026-09-10',
        paymentMethod: 'Bank Transfer',
        status: 'Processing',
      });
      const immutRes = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'donationPledges',
        docId: 'pledge-immutable-check',
        data: {
          id: 'pledge-immutable-check',
          donorName: 'Immutable Donor',
          email: 'immut@example.ch',
          amount: 9999,
          currency: 'CHF',
          destination: 'INFAQ & Vereinsbetrieb (Percikan Iman Schweiz)',
          date: '2026-09-10',
          paymentMethod: 'Bank Transfer',
          status: 'Promoted',
        },
        updateMask: ['amount', 'status'],
        idToken: users.admin.idToken,
      });
      expect(immutRes.status).toBe(403);
    });
  });

  test.describe('F13 Boundaries: Member Field Protection & Privilege Escalation Denials', () => {
    test('member REST self-update forging verifiedVoteWeight is denied (403)', async () => {
      const { users } = await seedStandardWorld();
      const res = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'members',
        docId: users.activeFamily.uid,
        data: {
          ...buildMemberDocument(TEST_PERSONAS.activeFamily, users.activeFamily.uid),
          verifiedVoteWeight: 10,
        },
        updateMask: ['verifiedVoteWeight'],
        idToken: users.activeFamily.idToken,
      });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    });

    test('member REST self-update forging isAdmin or membershipStatus is denied (403)', async () => {
      const { users } = await seedStandardWorld();
      const adminEscalation = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'members',
        docId: users.activePersonal.uid,
        data: {
          ...buildMemberDocument(
            TEST_PERSONAS.activePersonal,
            users.activePersonal.uid
          ),
          isAdmin: true,
        },
        updateMask: ['isAdmin'],
        idToken: users.activePersonal.idToken,
      });
      const statusForge = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'members',
        docId: users.pendingPayment.uid,
        data: {
          ...buildMemberDocument(
            TEST_PERSONAS.pendingPayment,
            users.pendingPayment.uid
          ),
          membershipStatus: 'active',
        },
        updateMask: ['membershipStatus'],
        idToken: users.pendingPayment.idToken,
      });
      expect(adminEscalation.status).toBe(403);
      expect(statusForge.status).toBe(403);
    });

    test('member REST update targeting another member /members/{otherUid} is denied (403)', async () => {
      const { users } = await seedStandardWorld();
      const res = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'members',
        docId: users.activePersonal.uid,
        data: {
          ...buildMemberDocument(
            TEST_PERSONAS.activePersonal,
            users.activePersonal.uid
          ),
          phone: '+41 00 000 00 00',
        },
        updateMask: ['phone'],
        idToken: users.activeFamily.idToken,
      });
      expect(res.status).toBe(403);
    });

    test('non-SuperAdmin isAdmin cannot grant isSuperAdmin or delete member doc (403)', async () => {
      const { users } = await seedStandardWorld();
      const elevateRes = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'members',
        docId: users.admin.uid,
        data: {
          ...buildMemberDocument(TEST_PERSONAS.admin, users.admin.uid),
          isSuperAdmin: true,
        },
        updateMask: ['isSuperAdmin'],
        idToken: users.admin.idToken,
      });
      const delRes = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'DELETE',
        collectionPath: 'members',
        docId: users.activePersonal.uid,
        idToken: users.admin.idToken,
      });
      expect(elevateRes.status).toBe(403);
      expect(delRes.status).toBe(403);
    });

    test('Firestore rules reject categoryChangeRequest containing invalid adminNotes key (403)', async () => {
      const { users } = await seedStandardWorld();
      const res = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'members',
        docId: users.activePersonal.uid,
        data: {
          ...buildMemberDocument(
            TEST_PERSONAS.activePersonal,
            users.activePersonal.uid
          ),
          categoryChangeRequest: {
            requestedCategory: 'family',
            requestedAt: '2026-09-10T00:00:00.000Z',
            reason: 'Test',
            status: 'rejected',
            adminNotes: 'Legacy invalid key',
          },
        },
        updateMask: ['categoryChangeRequest'],
        idToken: users.admin.idToken,
      });
      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    });
  });

  test.describe('F14 Boundaries: Scanner Rejections & Field Restrictions', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('fee_paused member (PI-PAUSED-01) is rejected at /admin/attendance without writing attendance', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const scanner = new AttendanceScannerPage(handle.page);
        await scanner.goto();
        await scanner.submitManualCode('PI-PAUSED-01');
        await expect(
          handle.page.getByText(/pausiert|fee_paused|Beitragspause/i).first()
        ).toBeVisible({ timeout: 15000 });
        const records = await listFirestoreCollection('attendance');
        expect(records.some((r) => r.data.memberCode === 'PI-PAUSED-01')).toBe(false);
      } finally {
        await handle.close();
      }
    });

    test('relocated member (PI-ALUM-309) is rejected at /admin/attendance', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const scanner = new AttendanceScannerPage(handle.page);
        await scanner.goto();
        await scanner.submitManualCode('PI-ALUM-309');
        await expect(
          handle.page.getByText(/verzogen|relocated|Abgemeldet/i).first()
        ).toBeVisible({ timeout: 15000 });
        const records = await listFirestoreCollection('attendance');
        expect(records.some((r) => r.data.memberCode === 'PI-ALUM-309')).toBe(false);
      } finally {
        await handle.close();
      }
    });

    test('unknown member code (PI-UNKNOWN-999) shows not_member rejection without Firestore write', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const scanner = new AttendanceScannerPage(handle.page);
        await scanner.goto();
        await scanner.submitManualCode('PI-UNKNOWN-999');
        await expect(
          handle.page.getByText(/Kein registriertes Vereinsmitglied|nicht gefunden|not found/i).first()
        ).toBeVisible({ timeout: 15000 });
        const records = await listFirestoreCollection('attendance');
        expect(records.some((r) => r.data.memberCode === 'PI-UNKNOWN-999')).toBe(false);
      } finally {
        await handle.close();
      }
    });

    test('duplicate scan of already checked-in member (PI-7740) does not double-count attendance', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const scanner = new AttendanceScannerPage(handle.page);
        await scanner.goto();
        await scanner.submitManualCode('PI-7740');
        await expect
          .poll(async () => (await listFirestoreCollection('attendance')).length)
          .toBe(1);
        // Intentional 3200ms wait to clear AdminEventAttendanceScanner's 3000ms identical-payload hardware debounce
        await handle.page.waitForTimeout(3200);
        await scanner.submitManualCode('PI-7740');
        await expect(
          handle.page.getByText(/Bereits eingecheckt|Already checked in/i).first()
        ).toBeVisible({ timeout: 15000 });
        const records = await listFirestoreCollection('attendance');
        expect(records.filter((r) => r.data.memberCode === 'PI-7740').length).toBe(1);
      } finally {
        await handle.close();
      }
    });

    test('canScanQR-only cannot update member name/isAdmin or delete attendance via REST (403)', async () => {
      const { users } = await seedStandardWorld();
      await seedFirestoreDoc('attendance', 'att-protected-1', {
        id: 'att-protected-1',
        eventId: 'evt-pengajian-stadel',
        eventTitle: 'Test Event',
        memberCode: 'PI-7740',
        memberName: 'Bambang Sudirman',
        category: 'personal',
        status: 'active',
        isFeeExempt: false,
        partyCount: 1,
        partyMembers: ['Bambang Sudirman'],
        scannedAt: '2026-09-13T13:30:00.000Z',
        scannedBy: 'Hendra Wijaya',
        feePaidChf: 0,
        verified: true,
      });

      const forbiddenMemberPatch =
        await attemptUnauthenticatedOrMemberFirestoreWrite({
          method: 'PATCH',
          collectionPath: 'members',
          docId: users.pendingPayment.uid,
          data: {
            ...buildMemberDocument(
              TEST_PERSONAS.pendingPayment,
              users.pendingPayment.uid
            ),
            isAdmin: true,
          },
          updateMask: ['isAdmin'],
          idToken: users.canScanQR.idToken,
        });
      const forbiddenDelete = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'DELETE',
        collectionPath: 'attendance',
        docId: 'att-protected-1',
        idToken: users.canScanQR.idToken,
      });
      expect(forbiddenMemberPatch.status).toBe(403);
      expect(forbiddenDelete.status).toBe(403);
    });
  });

  test.describe('F15 Boundaries: GA Admin Permissions & Session Gating', () => {
    test('non-admin member cannot write /siteConfig/gaSession (403)', async () => {
      const { users } = await seedStandardWorld();
      const res = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'siteConfig',
        docId: 'gaSession',
        data: {
          isOpen: true,
          sessionTitle: 'Hack Session',
          scheduledDate: '2026-09-15',
          activeQuestionId: 'ga-q1',
        },
        idToken: users.activeFamily.idToken,
      });
      expect(res.status).toBe(403);
    });

    test('non-admin member cannot create or update /assemblyQuestions (403)', async () => {
      const { users } = await seedStandardWorld();
      const res = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'assemblyQuestions',
        docId: 'ga-q-hack',
        data: {
          id: 'ga-q-hack',
          title: 'Hack Motion',
          description: 'Unauthorized motion creation attempt',
          category: 'Budget & Financial',
          status: 'on_floor',
          type: 'yes_no_abstain',
          options: [
            { id: 'opt-yes', text: 'Ja', votesWeighted: 0, ballotCount: 0 },
            { id: 'opt-no', text: 'Nein', votesWeighted: 0, ballotCount: 0 },
          ],
          optionIds: ['opt-yes', 'opt-no'],
          totalVotesWeighted: 0,
          totalBallots: 0,
          createdAt: '2026-09-15T10:00:00.000Z',
          createdBy: 'Ridwan Kamil Santoso',
          quorumRequiredPercent: 50,
        },
        idToken: users.activeFamily.idToken,
      });
      expect(res.status).toBe(403);
    });

    test('raising ga-q2 on_floor automatically demotes prior on_floor motion ga-q1', async ({
      browser,
    }) => {
      await seedStandardWorld({ gaOpen: true, activeQuestionId: 'ga-q1' });
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/assembly');
        await handle.page
          .getByRole('button', { name: /Raise to Floor|Auf die Tagesordnung/i })
          .first()
          .click();
        await expect
          .poll(async () => {
            const q1 = await getFirestoreDoc('assemblyQuestions', 'ga-q1');
            const q2 = await getFirestoreDoc('assemblyQuestions', 'ga-q2');
            return q2?.status === 'on_floor' && q1?.status !== 'on_floor';
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('unauthenticated REST read of /siteConfig/gaSession is denied (403)', async () => {
      await seedStandardWorld();
      const res = await attemptUnauthenticatedOrMemberFirestoreRead({
        collectionPath: 'siteConfig',
        docId: 'gaSession',
      });
      expect(res.status).toBe(403);
    });

    test('closed GA session (gaSession.isOpen === false) hides Cast Ballot buttons on /assembly', async ({
      browser,
    }) => {
      await seedStandardWorld({ gaOpen: false });
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        const assembly = new AssemblyPage(handle.page);
        await assembly.goto();
        await expect(assembly.castBallotButton()).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F16 Boundaries: Ballot Immutability, Standing & Inquiry Rules', () => {
    test('duplicate ballot creation for same UID is blocked in UI and denied in Firestore', async ({
      browser,
    }) => {
      const { users } = await seedStandardWorld({
        gaOpen: true,
        activeQuestionId: 'ga-q1',
      });
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        const assembly = new AssemblyPage(handle.page);
        await assembly.goto();
        await assembly.castVote(/Ja|Yes/i);
        await handle.page.reload();
        await expect(
          handle.page.getByText(/Voted with 2 Votes|Abgestimmt mit 2/i).first()
        ).toBeVisible({ timeout: 15000 });
        await expect(assembly.castBallotButton()).toHaveCount(0);

        const dupRes = await attemptUnauthenticatedOrMemberFirestoreWrite({
          method: 'POST',
          collectionPath: 'assemblyQuestions/ga-q1/ballots',
          docId: users.activeFamily.uid,
          data: {
            id: users.activeFamily.uid,
            questionId: 'ga-q1',
            memberCode: 'PI-FAM-2021',
            memberName: 'Ridwan Kamil Santoso',
            membershipCategory: 'family',
            votedOptionId: 'opt-no',
            voteWeight: 2,
            timestamp: '2026-09-15T10:05:00.000Z',
            breakdown: buildBallotBreakdown({ spouseEligible: true }),
          },
          idToken: users.activeFamily.idToken,
        });
        expect(dupRes.ok).toBe(false);
        expect(dupRes.status).toBe(409);

        const overwriteRes = await attemptUnauthenticatedOrMemberFirestoreWrite({
          method: 'PATCH',
          collectionPath: 'assemblyQuestions/ga-q1/ballots',
          docId: users.activeFamily.uid,
          data: { votedOptionId: 'opt-no' },
          updateMask: ['votedOptionId'],
          idToken: users.activeFamily.idToken,
        });
        expect(overwriteRes.ok).toBe(false);
        expect(overwriteRes.status).toBe(403);

        const storedBallot = await getFirestoreDoc(
          'assemblyQuestions/ga-q1/ballots',
          users.activeFamily.uid
        );
        expect(storedBallot?.votedOptionId).toBe('opt-yes');
      } finally {
        await handle.close();
      }
    });

    test('updating or deleting an existing ballot is strictly denied (403)', async () => {
      const { users } = await seedStandardWorld({
        gaOpen: true,
        activeQuestionId: 'ga-q1',
      });
      await seedFirestoreDoc('assemblyQuestions/ga-q1/ballots', users.activeFamily.uid, {
        id: users.activeFamily.uid,
        questionId: 'ga-q1',
        memberCode: 'PI-FAM-2021',
        memberName: 'Ridwan Kamil Santoso',
        membershipCategory: 'family',
        votedOptionId: 'opt-yes',
        voteWeight: 2,
        timestamp: '2026-09-15T10:00:00.000Z',
        breakdown: buildBallotBreakdown({ spouseEligible: true }),
      });
      const upd = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'assemblyQuestions/ga-q1/ballots',
        docId: users.activeFamily.uid,
        data: { votedOptionId: 'opt-no' },
        updateMask: ['votedOptionId'],
        idToken: users.activeFamily.idToken,
      });
      const del = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'DELETE',
        collectionPath: 'assemblyQuestions/ga-q1/ballots',
        docId: users.activeFamily.uid,
        idToken: users.activeFamily.idToken,
      });
      expect(upd.status).toBe(403);
      expect(del.status).toBe(403);
    });

    test('uncertified member or fee_paused/pending_payment member ballot create is denied (403)', async () => {
      const { users } = await seedStandardWorld({
        gaOpen: true,
        activeQuestionId: 'ga-q1',
        certifyVoterRoll: false,
      });
      const uncertifiedRes = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'assemblyQuestions/ga-q1/ballots',
        docId: users.activeFamily.uid,
        data: {
          id: users.activeFamily.uid,
          questionId: 'ga-q1',
          memberCode: 'PI-FAM-2021',
          memberName: 'Ridwan Kamil Santoso',
          membershipCategory: 'family',
          votedOptionId: 'opt-yes',
          voteWeight: 2,
          timestamp: '2026-09-15T10:00:00.000Z',
          breakdown: buildBallotBreakdown({ spouseEligible: true }),
        },
        idToken: users.activeFamily.idToken,
      });
      const pausedRes = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'assemblyQuestions/ga-q1/ballots',
        docId: users.feePaused.uid,
        data: {
          id: users.feePaused.uid,
          questionId: 'ga-q1',
          memberCode: 'PI-PAUSED-01',
          memberName: 'Yusuf Pratama',
          membershipCategory: 'personal',
          votedOptionId: 'opt-yes',
          voteWeight: 1,
          timestamp: '2026-09-15T10:00:00.000Z',
          breakdown: buildBallotBreakdown(),
        },
        idToken: users.feePaused.idToken,
      });
      expect(uncertifiedRes.status).toBe(403);
      expect(pausedRes.status).toBe(403);
    });

    test('ballot with mismatched voteWeight, invalid optionId, or closed motion is denied (403)', async () => {
      const { users } = await seedStandardWorld({
        gaOpen: true,
        activeQuestionId: 'ga-q1',
      });
      const badWeight = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'assemblyQuestions/ga-q1/ballots',
        docId: users.activeFamily.uid,
        data: {
          id: users.activeFamily.uid,
          questionId: 'ga-q1',
          memberCode: 'PI-FAM-2021',
          memberName: 'Ridwan Kamil Santoso',
          membershipCategory: 'family',
          votedOptionId: 'opt-yes',
          voteWeight: 5,
          timestamp: '2026-09-15T10:00:00.000Z',
          breakdown: buildBallotBreakdown({ spouseEligible: true }),
        },
        idToken: users.activeFamily.idToken,
      });
      const badOption = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'assemblyQuestions/ga-q1/ballots',
        docId: users.activePersonal.uid,
        data: {
          id: users.activePersonal.uid,
          questionId: 'ga-q1',
          memberCode: 'PI-7740',
          memberName: 'Bambang Sudirman',
          membershipCategory: 'personal',
          votedOptionId: 'opt-hacked',
          voteWeight: 1,
          timestamp: '2026-09-15T10:00:00.000Z',
          breakdown: buildBallotBreakdown(),
        },
        idToken: users.activePersonal.idToken,
      });
      const closedMotion = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'assemblyQuestions/ga-q4/ballots',
        docId: users.activePersonal.uid,
        data: {
          id: users.activePersonal.uid,
          questionId: 'ga-q4',
          memberCode: 'PI-7740',
          memberName: 'Bambang Sudirman',
          membershipCategory: 'personal',
          votedOptionId: 'opt-yes',
          voteWeight: 1,
          timestamp: '2026-09-15T10:00:00.000Z',
          breakdown: buildBallotBreakdown(),
        },
        idToken: users.activePersonal.idToken,
      });
      expect(badWeight.status).toBe(403);
      expect(badOption.status).toBe(403);
      expect(closedMotion.status).toBe(403);
    });

    test('pending_payment member cannot create board inquiry or upvote, and member cannot forge authorUid (403)', async () => {
      const { users } = await seedStandardWorld();
      const pendingInquiry = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'boardInquiries',
        docId: 'inq-pending',
        data: {
          id: 'inq-pending',
          title: 'Unpaid Question',
          content: 'Blocked pending payment inquiry',
          category: 'General',
          authorUid: users.pendingPayment.uid,
          authorName: 'Taufik Hidayat',
          authorMemberCode: 'PI-9552',
          authorCategory: 'personal',
          submittedAt: '2026-09-15T10:00:00.000Z',
          status: 'submitted',
        },
        idToken: users.pendingPayment.idToken,
      });
      const pendingUpvote = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'boardInquiries/inq-1/upvotes',
        docId: users.pendingPayment.uid,
        data: { uid: users.pendingPayment.uid, createdAt: '2026-09-15T10:00:00.000Z' },
        idToken: users.pendingPayment.idToken,
      });
      const forgedAuthor = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'boardInquiries',
        docId: 'inq-forged',
        data: {
          id: 'inq-forged',
          title: 'Spoofed Inquiry',
          content: 'Spoofed authorUid attempt',
          category: 'General',
          authorUid: users.admin.uid,
          authorName: 'Impersonated Admin',
          authorMemberCode: 'PI-ADMIN',
          authorCategory: 'family',
          submittedAt: '2026-09-15T10:00:00.000Z',
          status: 'submitted',
        },
        idToken: users.activeFamily.idToken,
      });
      expect(pendingInquiry.status).toBe(403);
      expect(pendingUpvote.status).toBe(403);
      expect(forgedAuthor.status).toBe(403);
    });
  });

  test.describe('F17 Boundaries: One-Time Bootstrap Lock Enforcement', () => {
    test('when /siteConfig/bootstrap already exists, /admin/bootstrap cannot re-seed', async ({
      browser,
    }) => {
      await seedStandardWorld({ includeBootstrap: true });
      const handle = await createRoleContext(browser, 'superAdmin');
      try {
        await handle.page.goto('/admin/bootstrap');
        await handle.page.waitForLoadState('load');
        await expect(
          handle.page.locator('[aria-busy="true"], .animate-spin')
        ).toHaveCount(0, { timeout: 15000 });
        const seedBtn = handle.page
          .getByRole('button', { name: /Bootstrap|Seed|Initialisier|Inisialisasi/i })
          .first();
        const isDisabledOrAbsent =
          (await seedBtn.count()) === 0 || (await seedBtn.isDisabled().catch(() => true));
        expect(isDisabledOrAbsent).toBe(true);
        const currentPath = new URL(handle.page.url()).pathname;
        if (currentPath.endsWith('/admin/bootstrap')) {
          await expect(
            handle.page
              .getByText(
                /Already Bootstrapped|Bereits initialisiert|Completed|Locked|gesperrt|Access Denied|seededAt/i
              )
              .first()
          ).toBeVisible({ timeout: 10000 });
        } else {
          expect(currentPath).toMatch(/^\/admin\/(programs|events|content|board|donations|members|attendance|assembly)/);
        }
      } finally {
        await handle.close();
      }
    });

    test('even isSuperAdmin cannot update or delete /siteConfig/bootstrap via REST (403)', async () => {
      const { users } = await seedStandardWorld({ includeBootstrap: true });
      const upd = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'PATCH',
        collectionPath: 'siteConfig',
        docId: 'bootstrap',
        data: {
          seededAt: '2027-01-01T00:00:00.000Z',
          seededBy: 'superadmin@percikaniman.org',
          version: '2.0.0',
        },
        idToken: users.superAdmin.idToken,
      });
      const del = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'DELETE',
        collectionPath: 'siteConfig',
        docId: 'bootstrap',
        idToken: users.superAdmin.idToken,
      });
      expect(upd.status).toBe(403);
      expect(del.status).toBe(403);
    });

    test('non-SuperAdmin isAdmin cannot read or create /siteConfig/bootstrap (403)', async () => {
      const { users } = await seedStandardWorld({ includeBootstrap: true });
      const readRes = await attemptUnauthenticatedOrMemberFirestoreRead({
        collectionPath: 'siteConfig',
        docId: 'bootstrap',
        idToken: users.admin.idToken,
      });
      const { users: usersUnseeded } = await seedStandardWorld({
        includeBootstrap: false,
      });
      const createRes = await attemptUnauthenticatedOrMemberFirestoreWrite({
        method: 'POST',
        collectionPath: 'siteConfig',
        docId: 'bootstrap',
        data: {
          seededAt: '2026-09-01T00:00:00.000Z',
          seededBy: 'admin@percikaniman.org',
          version: '1.0.0',
        },
        idToken: usersUnseeded.admin.idToken,
      });
      expect(readRes.status).toBe(403);
      expect(createRes.status).toBe(403);
    });

    test('standard member cannot read or create /siteConfig/bootstrap (403)', async () => {
      const { users } = await seedStandardWorld({ includeBootstrap: true });
      const readRes = await attemptUnauthenticatedOrMemberFirestoreRead({
        collectionPath: 'siteConfig',
        docId: 'bootstrap',
        idToken: users.activeFamily.idToken,
      });
      expect(readRes.status).toBe(403);
    });

    test('unauthenticated caller cannot read /siteConfig/bootstrap (403)', async () => {
      await seedStandardWorld({ includeBootstrap: true });
      const readRes = await attemptUnauthenticatedOrMemberFirestoreRead({
        collectionPath: 'siteConfig',
        docId: 'bootstrap',
      });
      expect(readRes.status).toBe(403);
    });
  });

  test.describe('F18 Boundaries: Locale Fallback & Clean Translations', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('invalid localStorage language code ("fr") falls back cleanly to "de"', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('percikan_iman_language', 'fr');
      });
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    });

    test('switching across all 4 locales on /programs renders zero "undefined" text nodes', async ({
      page,
    }) => {
      const pub = new PublicLayoutPage(page);
      await pub.goto('/programs');
      for (const lang of ['de', 'en', 'id', 'ms'] as const) {
        await pub.switchLanguage(lang);
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toMatch(/\bundefined\b/);
      }
    });

    test('deprecated adminOn/adminOff strings do not appear in any of the 4 locales', async ({
      page,
    }) => {
      const pub = new PublicLayoutPage(page);
      await pub.goto('/');
      for (const lang of ['de', 'en', 'id', 'ms'] as const) {
        await pub.switchLanguage(lang);
        await expect(
          page.getByText(LOCALE_REGEX.adminToggleForbidden)
        ).toHaveCount(0);
      }
    });

    test('Access Denied screen renders localized messaging in both de and en', async ({
      browser,
    }) => {
      const deHandle = await createRoleContext(browser, 'activeFamily', {
        initialLanguage: 'de',
      });
      try {
        const deShell = new AdminShellPage(deHandle.page);
        await deShell.goto('/admin');
        await expect(
          deHandle.page.getByText(/Zugriff verweigert/i).first()
        ).toBeVisible({ timeout: 15000 });
        await expect(deHandle.page.locator('a[href="/"]').first()).toBeVisible();
      } finally {
        await deHandle.close();
      }

      const enHandle = await createRoleContext(browser, 'activeFamily', {
        initialLanguage: 'en',
      });
      try {
        const enShell = new AdminShellPage(enHandle.page);
        await enShell.goto('/admin');
        await expect(
          enHandle.page.getByText(/Access Denied/i).first()
        ).toBeVisible({ timeout: 15000 });
        await expect(enHandle.page.locator('a[href="/"]').first()).toBeVisible();
      } finally {
        await enHandle.close();
      }
    });

    test('donation pledge confirmation renders cleanly in id and ms locales without undefined text', async ({
      page,
    }) => {
      const pub = new PublicLayoutPage(page);
      const donate = new DonatePage(page);
      for (const locale of ['id', 'ms'] as const) {
        await donate.goto();
        await pub.switchLanguage(locale);
        await donate.submitPledge({
          amount: 25,
          name: `Donor ${locale.toUpperCase()}`,
          email: `donor.${locale}@example.ch`,
        });
        await expect(donate.confirmationDialog).toBeVisible({ timeout: 15000 });
        const text = await donate.confirmationDialog.innerText();
        expect(text).not.toMatch(/\bundefined\b/);
        const closeBtn = donate.confirmationDialog
          .getByRole('button')
          .first();
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click();
        }
      }
    });
  });
});
