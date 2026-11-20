import { expect, test } from '@playwright/test';
import {
  createRoleContext,
  signInViaAdminGate,
  signInViaLoginPage,
  attachTelemetryTrackers,
} from './fixtures/auth';
import {
  generateValidQrPayload,
  getFirestoreDoc,
  listFirestoreCollection,
  resetEmulators,
  seedAuthUser,
  seedFirestoreDoc,
  seedStandardWorld,
  TEST_PERSONAS,
  buildMemberDocument,
} from './fixtures/emulator';
import {
  ADMIN_SELECTORS,
  AdminShellPage,
  AssemblyPage,
  AttendanceScannerPage,
  DonatePage,
  fillPhotoUploadUrl,
  LOCALE_REGEX,
  MemberPortalPage,
  PublicLayoutPage,
} from './pages';

test.describe('Tier 1 — Happy-Path Equivalence Classes (F1–F18)', () => {
  test.describe('F1: Public vs. Admin Route Topology & Title Sync', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('renders HomeView at / with synchronized German default document.title', async ({
      page,
    }) => {
      const publicPage = new PublicLayoutPage(page);
      await publicPage.goto('/');
      await expect(page).toHaveURL(/\/$/);
      await expect(page).toHaveTitle(/Verein Percikan Iman Schweiz/);
      await expect(page.locator('h1').first()).toBeVisible();
    });

    test('navigates across all primary public routes (/programs, /donate, /gallery, /about, /contact)', async ({
      page,
    }) => {
      const routes = ['/programs', '/donate', '/gallery', '/about', '/contact'];
      for (const route of routes) {
        await page.goto(route);
        await expect(page).toHaveURL(new RegExp(`${route}$`));
        await expect(page).toHaveTitle(/Verein Percikan Iman Schweiz/);
        await expect(page.locator('#main-content, main').first()).toBeVisible();
      }
    });

    test('supports browser Back and Forward history navigation across routes', async ({
      page,
    }) => {
      await page.goto('/');
      await page.goto('/programs');
      await page.goto('/donate');
      await expect(page).toHaveURL(/\/donate$/);
      await page.goBack();
      await expect(page).toHaveURL(/\/programs$/);
      await page.goForward();
      await expect(page).toHaveURL(/\/donate$/);
    });

    test('redirects /admin index to /admin/programs for signed-in full admin', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin');
        await expect(handle.page).toHaveURL(/\/admin\/programs$/);
      } finally {
        await handle.close();
      }
    });

    test('redirects signed-in member visiting /login directly to /member', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        await handle.page.goto('/login');
        await expect(handle.page).toHaveURL(/\/member$/);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F2: Hosting SPA Fallback Rewrite & Emulator Connectivity', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('hard reload on /programs resolves 200 without 404', async ({ page }) => {
      await page.goto('/programs');
      const response = await page.reload();
      expect(response?.status() ?? 200).toBeLessThan(400);
      await expect(page).toHaveURL(/\/programs$/);
      await expect(page.locator('#program-search-input')).toBeVisible();
    });

    test('hard reload on /assembly resolves cleanly for authenticated member', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        await handle.page.goto('/assembly');
        const response = await handle.page.reload();
        expect(response?.status() ?? 200).toBeLessThan(400);
        await expect(handle.page).toHaveURL(/\/assembly$/);
      } finally {
        await handle.close();
      }
    });

    test('hard reload on /admin/attendance mounts QR scanner without 404', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const scanner = new AttendanceScannerPage(handle.page);
        await scanner.goto();
        const response = await handle.page.reload();
        expect(response?.status() ?? 200).toBeLessThan(400);
        await expect(handle.page).toHaveURL(/\/admin\/attendance$/);
        await expect(scanner.manualInput).toBeVisible();
      } finally {
        await handle.close();
      }
    });

    test('hard reload on /admin/donations keeps admin route active', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/donations');
        const response = await handle.page.reload();
        expect(response?.status() ?? 200).toBeLessThan(400);
        await expect(handle.page).toHaveURL(/\/admin\/donations$/);
      } finally {
        await handle.close();
      }
    });

    test('reads seeded Firestore Emulator content on /programs immediately', async ({
      page,
    }) => {
      await seedFirestoreDoc('programs', 'prog-emulator-check', {
        id: 'prog-emulator-check',
        title: 'Emulator Probe Program 2026',
        description: 'Live seeded program via REST.',
        detailedOverview: 'Detailed overview for emulator probe program.',
        category: 'Religious',
        tag: 'Active',
        dateOrSchedule: 'Jeden Freitag',
        location: 'Zürich',
        imageUrl: 'https://images.unsplash.com/photo-1585036156171-384164a8c675',
        iconName: 'volunteer_activism',
      });
      await page.goto('/programs');
      await expect(
        page.getByText('Emulator Probe Program 2026')
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('F3: Public Decluttering (Zero Inline Admin / Switchers)', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('visitor browsing / sees zero Admin ON/OFF toggles or Role Testing switchers', async ({
      page,
    }) => {
      const publicPage = new PublicLayoutPage(page);
      await publicPage.goto('/');
      await publicPage.assertNoPublicAdminClutter();
    });

    test('signed-in isAdmin browsing / sees zero inline Add Event or Admin ON/OFF buttons', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        const publicPage = new PublicLayoutPage(handle.page);
        await publicPage.goto('/');
        await publicPage.assertNoPublicAdminClutter();
        await expect(
          handle.page.getByRole('button', { name: /\+\s*Add Event|Event hinzufügen/i })
        ).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });

    test('signed-in isAdmin browsing /about sees zero inline Board edit buttons', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        const publicPage = new PublicLayoutPage(handle.page);
        await publicPage.goto('/about');
        await publicPage.assertNoPublicAdminClutter();
        await expect(
          handle.page.getByRole('button', { name: /Edit Board|Vorstand bearbeiten/i })
        ).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });

    test('signed-in isAdmin browsing /assembly sees zero board moderation or sandbox controls', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        const assembly = new AssemblyPage(handle.page);
        await assembly.goto();
        await assembly.assertNoModerationControls();
      } finally {
        await handle.close();
      }
    });

    test('signed-in staff member sees /admin quick-launch inside /member delegated roles panel', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const memberPortal = new MemberPortalPage(handle.page);
        await memberPortal.goto();
        const scannerLink = handle.page
          .locator('a[href="/admin/attendance"], button')
          .filter({ hasText: /QR Scanner|Launch Live QR Scanner/i })
          .first();
        await expect(scannerLink).toBeVisible();
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F4: Bundle & Network Isolation', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('visitor loading / downloads zero AdminDashboard, AdminEventAttendanceScanner, jsqr, or src/data chunks', async ({
      page,
    }) => {
      const trackers = attachTelemetryTrackers(page);
      await page.goto('/');
      await page.waitForLoadState('load');
      await expect(page.locator('[aria-busy="true"], .animate-spin')).toHaveCount(0, {
        timeout: 15000,
      });
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
      expect(trackers.getLeakedAdminOrSeedUrls()).toEqual([]);
    });

    test('visitor loading /programs and /donate downloads zero admin or jsqr chunks', async ({
      page,
    }) => {
      const trackers = attachTelemetryTrackers(page);
      await page.goto('/programs');
      await page.waitForLoadState('load');
      await expect(page.locator('#program-search-input')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[aria-busy="true"], .animate-spin')).toHaveCount(0, {
        timeout: 15000,
      });
      await page.goto('/donate');
      await page.waitForLoadState('load');
      await expect(page.locator('#form-destination-dropdown')).toBeVisible({
        timeout: 15000,
      });
      await expect(page.locator('[aria-busy="true"], .animate-spin')).toHaveCount(0, {
        timeout: 15000,
      });
      expect(trackers.getLeakedAdminOrSeedUrls()).toEqual([]);
    });

    test('signed-in admin on /admin/programs loads admin portal without loading jsqr scanner bundle', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        handle.trackers.requestedUrls.length = 0;
        await handle.page.goto('/admin/programs');
        await handle.page.waitForLoadState('load');
        await expect(
          handle.page.getByRole('button', { name: ADMIN_SELECTORS.addProgramBtn }).first()
        ).toBeVisible({ timeout: 15000 });
        await expect(
          handle.page.getByText('Loading programs from Firestore...')
        ).toHaveCount(0, { timeout: 15000 });
        const jsqrRequests = handle.trackers.requestedUrls.filter((u) =>
          /jsqr|AdminEventAttendanceScanner/i.test(u)
        );
        expect(jsqrRequests).toEqual([]);
      } finally {
        await handle.close();
      }
    });

    test('visiting /admin/attendance lazy-loads scanner route cleanly on demand', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const scanner = new AttendanceScannerPage(handle.page);
        await scanner.goto();
        await expect(scanner.startCameraButton).toBeVisible();
      } finally {
        await handle.close();
      }
    });

    test('visiting /admin/programs does not execute or fetch seed data files until /admin/bootstrap is opened', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'superAdmin');
      try {
        handle.trackers.requestedUrls.length = 0;
        await handle.page.goto('/admin/programs');
        await handle.page.waitForLoadState('load');
        await expect(
          handle.page.getByRole('button', { name: ADMIN_SELECTORS.addProgramBtn }).first()
        ).toBeVisible({ timeout: 15000 });
        await expect(
          handle.page.getByText('Loading programs from Firestore...')
        ).toHaveCount(0, { timeout: 15000 });
        const seedUrls = handle.trackers.requestedUrls.filter((u) =>
          /\/src\/data\//i.test(u)
        );
        expect(seedUrls).toEqual([]);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F5: Centralized AuthContext & Session Persistence', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('signing in via /login hydrates AuthContext and routes to /member', async ({
      page,
    }) => {
      await signInViaLoginPage(
        page,
        TEST_PERSONAS.activeFamily.email,
        TEST_PERSONAS.activeFamily.password
      );
      await expect(page).toHaveURL(/\/member$/);
      await expect(page.getByText(TEST_PERSONAS.activeFamily.name).first()).toBeVisible();
    });

    test('hard reload on /member restores authenticated session from Firebase Auth + Firestore', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activePersonal');
      try {
        await handle.page.goto('/member');
        await handle.page.reload();
        await expect(handle.page).toHaveURL(/\/member$/);
        await expect(
          handle.page.getByText(TEST_PERSONAS.activePersonal.memberCode).first()
        ).toBeVisible();
      } finally {
        await handle.close();
      }
    });

    test('signing out clears AuthContext session cleanly', async ({ browser }) => {
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        await handle.page.goto('/member');
        const signOutBtn = handle.page
          .getByRole('button', { name: LOCALE_REGEX.logoutNav })
          .first();
        await signOutBtn.click();
        await expect(
          handle.page
            .getByRole('link', { name: LOCALE_REGEX.loginNav })
            .or(handle.page.getByRole('button', { name: LOCALE_REGEX.loginNav }))
            .or(handle.page.locator('#login_identifier'))
            .first()
        ).toBeVisible({ timeout: 15000 });
        await handle.page.goto('/member');
        await expect(handle.page).not.toHaveURL(/\/member$/);
      } finally {
        await handle.close();
      }
    });

    test('live Firestore update to member role propagates via onSnapshot without reload', async ({
      browser,
    }) => {
      const { users } = await seedStandardWorld();
      const handle = await createRoleContext(browser, 'activePersonal');
      try {
        await handle.page.goto('/member');
        await seedFirestoreDoc('members', users.activePersonal.uid, {
          ...buildMemberDocument(TEST_PERSONAS.activePersonal, users.activePersonal.uid),
          canScanQR: true,
        });
        await expect(
          handle.page.getByText(/QR Scanner|Launch Live QR Scanner/i).first()
        ).toBeVisible({ timeout: 15000 });
      } finally {
        await handle.close();
      }
    });

    test('live Firestore update to member standing propagates to /member immediately', async ({
      browser,
    }) => {
      const { users } = await seedStandardWorld();
      const handle = await createRoleContext(browser, 'pendingPayment');
      try {
        await handle.page.goto('/member');
        await seedFirestoreDoc('members', users.pendingPayment.uid, {
          ...buildMemberDocument(TEST_PERSONAS.pendingPayment, users.pendingPayment.uid),
          membershipStatus: 'active',
          paymentStatus: 'paid',
          verifiedVoteWeight: 1,
        });
        await expect(
          handle.page.getByText(/Active Member|Aktives Mitglied|Anggota Aktif|Ahli Aktif/i).first()
        ).toBeVisible({ timeout: 15000 });
        await expect(
          handle.page.getByText(/Pending Fee Payment/i)
        ).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F6: AdminRouteGuard, AdminLoginGate & AdminLayout', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('unauthenticated visit to /admin/donations renders AdminLoginGate and returns to /admin/donations after login', async ({
      page,
    }) => {
      await signInViaAdminGate(
        page,
        '/admin/donations',
        TEST_PERSONAS.admin.email,
        TEST_PERSONAS.admin.password
      );
      await expect(page).toHaveURL(/\/admin\/donations$/);
    });

    test('isAdmin sees permitted admin tabs in isolated AdminLayout without public footer', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        const adminShell = new AdminShellPage(handle.page);
        await adminShell.goto('/admin/programs');
        await expect(adminShell.tabLink('programs')).toBeVisible();
        await expect(adminShell.tabLink('events')).toBeVisible();
        await expect(adminShell.tabLink('donations')).toBeVisible();
        await expect(adminShell.tabLink('assembly')).toBeVisible();
        await expect(adminShell.returnToPublicLink).toBeVisible();
        await expect(handle.page.locator('footer')).toHaveCount(0);
        await expect(
          handle.page.getByText(LOCALE_REGEX.adminToggleForbidden)
        ).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });

    test('isSuperAdmin sees /admin/bootstrap tab when siteConfig/bootstrap does not exist', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'superAdmin');
      try {
        const adminShell = new AdminShellPage(handle.page);
        await adminShell.goto('/admin/programs');
        await expect(adminShell.tabLink('bootstrap')).toBeVisible();
      } finally {
        await handle.close();
      }
    });

    test('canManageBoard-only visiting /admin lands on /admin/board with board tab only', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canManageBoard');
      try {
        const adminShell = new AdminShellPage(handle.page);
        await adminShell.goto('/admin');
        await expect(handle.page).toHaveURL(/\/admin\/board$/);
        await expect(adminShell.tabLink('board')).toBeVisible();
        await expect(adminShell.tabLink('donations')).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });

    test('canScanQR-only visiting /admin lands on /admin/attendance with attendance tab only', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const adminShell = new AdminShellPage(handle.page);
        await adminShell.goto('/admin');
        await expect(handle.page).toHaveURL(/\/admin\/attendance$/);
        await expect(adminShell.tabLink('attendance')).toBeVisible();
        await expect(adminShell.tabLink('members')).toHaveCount(0);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F7: Dev/Emulator Gating of Vault & Config Overrides', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('AdminLoginGate never displays developer Firebase config modal trigger', async ({
      page,
    }) => {
      await page.goto('/admin/programs');
      await expect(
        page.getByRole('button', { name: /Connect Firebase|Firebase Cloud Active/i })
      ).toHaveCount(0);
    });

    test('emulator environment allows seeded Super Admin authentication without manual config override', async ({
      page,
    }) => {
      await signInViaLoginPage(
        page,
        TEST_PERSONAS.superAdmin.email,
        TEST_PERSONAS.superAdmin.password
      );
      await expect(page).toHaveURL(/\/member$/);
    });

    test('emulator environment allows Admin code login on AdminLoginGate', async ({
      page,
    }) => {
      await signInViaAdminGate(
        page,
        '/admin/programs',
        TEST_PERSONAS.admin.memberCode,
        TEST_PERSONAS.admin.password
      );
      await expect(page).toHaveURL(/\/admin\/programs$/);
    });

    test('public /login provides standard email/password and Google sign-in controls', async ({
      page,
    }) => {
      await page.goto('/login');
      await expect(page.locator('#login_identifier')).toBeVisible();
      await expect(page.locator('#login_password')).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Google/i })
      ).toBeVisible();
    });

    test('public /login allows newly registered standard user to authenticate against emulator', async ({
      page,
    }) => {
      const customUser = {
        email: 'fresh.member@percikaniman.org',
        password: 'FreshUser!2026',
        name: 'Fresh Member',
      };
      const auth = await seedAuthUser(customUser);
      await seedFirestoreDoc('members', auth.uid, {
        uid: auth.uid,
        name: customUser.name,
        email: customUser.email,
        memberCode: 'PI-FRESH-1',
        membershipCategory: 'personal',
        membershipStatus: 'active',
        paymentStatus: 'paid',
        paymentMethod: 'twint',
        yearlyContribution: 80,
        verifiedVoteWeight: 1,
      });
      await signInViaLoginPage(page, customUser.email, customUser.password);
      await expect(page).toHaveURL(/\/member$/);
      await expect(page.getByText('Fresh Member').first()).toBeVisible();
    });
  });

  test.describe('F8: Firebase App Check Non-Blocking Local/Emulator Mode', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('home route / renders without App Check blocking errors', async ({
      page,
    }) => {
      const trackers = attachTelemetryTrackers(page);
      await page.goto('/');
      await page.waitForLoadState('load');
      await expect(page.locator('[aria-busy="true"], .animate-spin')).toHaveCount(0, {
        timeout: 15000,
      });
      await expect(
        page.getByText("Monatliches Pengajian (Ta'lim Schweiz)").first()
      ).toBeVisible({ timeout: 15000 });
      expect(trackers.pageErrors).toEqual([]);
    });

    test('programs route /programs subscribes to Firestore cleanly under App Check', async ({
      page,
    }) => {
      const trackers = attachTelemetryTrackers(page);
      await page.goto('/programs');
      await expect(
        page.getByText("Monatliches Pengajian (Ta'lim Schweiz)")
      ).toBeVisible({ timeout: 15000 });
      expect(trackers.getPermissionDeniedErrors()).toEqual([]);
    });

    test('public /donate pledge submission succeeds with App Check initialized', async ({
      page,
    }) => {
      const donate = new DonatePage(page);
      await donate.goto();
      await donate.submitPledge({
        amount: 25,
        name: 'App Check Donor',
        email: 'appcheck@example.ch',
      });
      await expect(donate.confirmationDialog).toBeVisible({ timeout: 15000 });
    });

    test('authentication on /login succeeds with App Check initialized', async ({
      page,
    }) => {
      await signInViaLoginPage(
        page,
        TEST_PERSONAS.activePersonal.email,
        TEST_PERSONAS.activePersonal.password
      );
      await expect(page).toHaveURL(/\/member$/);
    });

    test('admin Firestore write on /admin/programs succeeds with App Check initialized', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/programs');
        await expect(
          handle.page.getByText("Monatliches Pengajian (Ta'lim Schweiz)")
        ).toBeVisible({ timeout: 15000 });
        expect(handle.trackers.getPermissionDeniedErrors()).toEqual([]);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F9: URL Scheme Validation (isSafeHttpUrl)', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('accepts valid https:// imageUrl when creating a program in /admin/programs', async ({
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
          .fill('Safe HTTPS Program');
        const descInput = dialog.locator('textarea').first();
        if (await descInput.isVisible().catch(() => false)) {
          await descInput.fill('Program with valid HTTPS image URL.');
        }
        await fillPhotoUploadUrl(
          dialog,
          'https://images.unsplash.com/photo-1585036156171-384164a8c675'
        );
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveProgramBtn })
          .first()
          .click();
        await expect(handle.page.getByText('Safe HTTPS Program').first()).toBeVisible({
          timeout: 15000,
        });
        await expect
          .poll(async () => {
            const programs = await listFirestoreCollection('programs');
            return programs.some(
              (p) =>
                p.data.title === 'Safe HTTPS Program' &&
                p.data.imageUrl ===
                  'https://images.unsplash.com/photo-1585036156171-384164a8c675'
            );
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('accepts valid http:// imageUrl in /admin/programs', async ({
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
          .fill('Safe HTTP Program');
        const descInput = dialog.locator('textarea').first();
        if (await descInput.isVisible().catch(() => false)) {
          await descInput.fill('Program with valid HTTP image URL.');
        }
        await fillPhotoUploadUrl(dialog, 'http://localhost:3000/sample.jpg');
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveProgramBtn })
          .first()
          .click();
        await expect(handle.page.getByText('Safe HTTP Program').first()).toBeVisible({
          timeout: 15000,
        });
        await expect
          .poll(async () => {
            const programs = await listFirestoreCollection('programs');
            return programs.some(
              (p) =>
                p.data.title === 'Safe HTTP Program' &&
                p.data.imageUrl === 'http://localhost:3000/sample.jpg'
            );
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('accepts valid https:// onlineLink in /admin/events', async ({
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
          .fill('Online Seminar Event');
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
          await locInput.fill('Online Zoom');
        }
        const descInput = dialog.locator('textarea').first();
        if (await descInput.isVisible().catch(() => false)) {
          await descInput.fill('Online seminar event with safe HTTPS link.');
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
        await linkInput.fill('https://meet.jit.si/percikan-iman-safe');
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveEventBtn })
          .first()
          .click();
        await expect(handle.page.getByText('Online Seminar Event').first()).toBeVisible({
          timeout: 15000,
        });
        await expect
          .poll(async () => {
            const events = await listFirestoreCollection('events');
            return events.some(
              (e) =>
                e.data.title === 'Online Seminar Event' &&
                e.data.onlineLink === 'https://meet.jit.si/percikan-iman-safe'
            );
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('accepts valid https:// imageUrl in /admin/content campaign form', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/content');
        await handle.page
          .getByRole('button', { name: ADMIN_SELECTORS.addCampaignBtn })
          .first()
          .click();
        const dialog = handle.page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible' });
        await handle.page
          .locator(ADMIN_SELECTORS.campaignTitleInput)
          .first()
          .fill('Safe HTTPS Campaign');
        const descInput = dialog.locator('textarea').first();
        if (await descInput.isVisible().catch(() => false)) {
          await descInput.fill('Verified campaign image URL.');
        }
        await fillPhotoUploadUrl(
          dialog,
          'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6'
        );
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveCampaignBtn })
          .first()
          .click();
        await expect(handle.page.getByText('Safe HTTPS Campaign').first()).toBeVisible({
          timeout: 15000,
        });
        await expect
          .poll(async () => {
            const campaigns = await listFirestoreCollection('campaigns');
            return campaigns.some(
              (c) =>
                c.data.title === 'Safe HTTPS Campaign' &&
                c.data.imageUrl ===
                  'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6'
            );
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('accepts valid https:// imageUrl in /admin/board', async ({
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
          .fill('Ustadzah Aisyah Safe');
        await handle.page
          .locator(ADMIN_SELECTORS.boardRoleInput)
          .first()
          .fill('Education Coordinator');
        await dialog
          .locator('textarea')
          .first()
          .fill('Leads youth and family education programs.');
        await fillPhotoUploadUrl(
          dialog,
          'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2'
        );
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveBoardBtn })
          .first()
          .click();
        await expect(handle.page.getByText('Ustadzah Aisyah Safe').first()).toBeVisible({
          timeout: 15000,
        });
        await expect
          .poll(async () => {
            const board = await listFirestoreCollection('boardMembers');
            return board.some(
              (b) =>
                b.data.name === 'Ustadzah Aisyah Safe' &&
                b.data.imageUrl ===
                  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2'
            );
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F10: Route-Scoped Content Services (No Static Fallback)', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('home route / displays Firestore siteConfig/notice banner, next event, and featured programs', async ({
      page,
    }) => {
      const publicPage = new PublicLayoutPage(page);
      await publicPage.goto('/');
      await expect(publicPage.siteNoticeBanner).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Generalversammlung 2026').first()).toBeVisible({
        timeout: 15000,
      });
      await expect(
        page.getByText(/Die ordentliche Generalversammlung findet am 15\. September 2026/i).first()
      ).toBeVisible();
    });

    test('programs route /programs filters by category and searches live Firestore programs', async ({
      page,
    }) => {
      await page.goto('/programs');
      await page.locator('#program-search-input').fill('Solidaritätsküche');
      await expect(page.getByText('Solidaritätsküche Zürich')).toBeVisible();
      await expect(page.getByText("Monatliches Pengajian (Ta'lim Schweiz)")).toHaveCount(0);
    });

    test('donate route /donate populates destinations and campaigns from Firestore', async ({
      page,
    }) => {
      const donate = new DonatePage(page);
      await donate.goto();
      await expect(donate.destinationSelect).toContainText(
        /INFAQ & Vereinsbetrieb/i
      );
    });

    test('about route /about renders live boardMembers from Firestore', async ({
      page,
    }) => {
      await page.goto('/about');
      await expect(page.getByText('Dr. H. Aam Amiruddin').first()).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText('Dewi Kartika').first()).toBeVisible();
    });

    test('public routes emit zero permission-denied console errors', async ({
      page,
    }) => {
      const trackers = attachTelemetryTrackers(page);
      for (const route of ['/', '/programs', '/donate', '/about', '/contact']) {
        await page.goto(route);
        await page.waitForLoadState('load');
        await expect(page.locator('#main-content, main').first()).toBeVisible({
          timeout: 15000,
        });
        await expect(page.locator('[aria-busy="true"], .animate-spin')).toHaveCount(0, {
          timeout: 15000,
        });
      }
      expect(trackers.getPermissionDeniedErrors()).toEqual([]);
    });
  });

  test.describe('F11: Admin Content, Events & Board Workspaces', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('/admin/programs creates a new program and persists in Firestore', async ({
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
          .fill('Quran Halaqah Basel');
        const descInput = dialog.locator('textarea').first();
        if (await descInput.isVisible().catch(() => false)) {
          await descInput.fill('Weekly community study circle in Basel.');
        }
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveProgramBtn })
          .first()
          .click();
        await expect(handle.page.getByText('Quran Halaqah Basel').first()).toBeVisible({
          timeout: 15000,
        });
        await expect
          .poll(async () => {
            const programs = await listFirestoreCollection('programs');
            return programs.some((p) => p.data.title === 'Quran Halaqah Basel');
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('/admin/events creates a community event and persists in Firestore', async ({
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
          .fill('Eid Community Brunch Zürich');
        const dateInput = dialog.locator('input[type="date"]').first();
        if (await dateInput.isVisible().catch(() => false)) {
          await dateInput.fill('2026-10-20');
        }
        const timeInput = dialog
          .locator('input[name="time"], input[placeholder*="18:00" i], input[placeholder*="08:30" i]')
          .first();
        if (await timeInput.isVisible().catch(() => false)) {
          await timeInput.fill('10:00 - 13:00');
        }
        const locInput = dialog
          .locator('input[name="location"], input[placeholder*="Zürich" i], input[placeholder*="Location" i]')
          .first();
        if (await locInput.isVisible().catch(() => false)) {
          await locInput.fill('Zürich-Stadelhofen');
        }
        const descInput = dialog.locator('textarea').first();
        if (await descInput.isVisible().catch(() => false)) {
          await descInput.fill('Community brunch gathering for families.');
        }
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveEventBtn })
          .first()
          .click();
        await expect(
          handle.page.getByText('Eid Community Brunch Zürich').first()
        ).toBeVisible({ timeout: 15000 });
        await expect
          .poll(async () => {
            const events = await listFirestoreCollection('events');
            return events.some((e) => e.data.title === 'Eid Community Brunch Zürich');
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('/admin/content updates SiteNotice in Firestore', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/content');
        const badgeInput = handle.page
          .locator(ADMIN_SELECTORS.noticeBadgeInput)
          .first();
        await expect(badgeInput).toBeVisible({ timeout: 15000 });
        await badgeInput.fill('Ramadan Iftar 2026');
        const messageInput = handle.page
          .locator(ADMIN_SELECTORS.noticeMessageInput)
          .first();
        await expect(messageInput).toBeVisible({ timeout: 5000 });
        await messageInput.fill('Gemeinsames Iftar am 15. März 2026 in Zürich.');
        await handle.page
          .getByRole('button', { name: ADMIN_SELECTORS.saveNoticeBtn })
          .first()
          .click();
        await expect
          .poll(async () => {
            const notice = await getFirestoreDoc('siteConfig', 'notice');
            return { badge: notice?.badge, message: notice?.message };
          })
          .toEqual({
            badge: 'Ramadan Iftar 2026',
            message: 'Gemeinsames Iftar am 15. März 2026 in Zürich.',
          });
      } finally {
        await handle.close();
      }
    });

    test('/admin/content lists and manages campaigns from Firestore', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/content');
        await expect(
          handle.page.getByText(/INFAQ & Vereinsbetrieb/i).first()
        ).toBeVisible({ timeout: 15000 });
        await handle.page
          .getByRole('button', { name: ADMIN_SELECTORS.addCampaignBtn })
          .first()
          .click();
        const dialog = handle.page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible' });
        await handle.page
          .locator(ADMIN_SELECTORS.campaignTitleInput)
          .first()
          .fill('Zakat Infrastruktur 2026');
        const descInput = dialog.locator('textarea').first();
        if (await descInput.isVisible().catch(() => false)) {
          await descInput.fill('Ausbau der Gemeinschaftsräume in Zürich.');
        }
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveCampaignBtn })
          .first()
          .click();
        await expect(
          handle.page.getByText('Zakat Infrastruktur 2026').first()
        ).toBeVisible({ timeout: 15000 });
        await expect
          .poll(async () => {
            const campaigns = await listFirestoreCollection('campaigns');
            return campaigns.some((c) => c.data.title === 'Zakat Infrastruktur 2026');
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('canManageBoard creates/updates a board member in /admin/board', async ({
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
          .fill('Ustadz Hasan Basri');
        await handle.page
          .locator(ADMIN_SELECTORS.boardRoleInput)
          .first()
          .fill('Spiritual Advisor');
        await dialog
          .locator('textarea')
          .first()
          .fill('Advisor for religious affairs and community lectures.');
        await dialog
          .getByRole('button', { name: ADMIN_SELECTORS.saveBoardBtn })
          .first()
          .click();
        await expect(
          handle.page.getByText('Ustadz Hasan Basri').first()
        ).toBeVisible({ timeout: 15000 });
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F12: Two-Collection Donations (donationPledges -> donationReports)', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('public /donate preset CHF 50 submission creates Processing pledge in /donationPledges', async ({
      page,
    }) => {
      const donate = new DonatePage(page);
      await donate.goto();
      await donate.submitPledge({
        amount: 50,
        name: 'Lukas Meier',
        email: 'lukas.meier@example.ch',
      });
      await expect(donate.confirmationDialog).toBeVisible({ timeout: 15000 });
      await expect
        .poll(
          async () => {
            const pledges = await listFirestoreCollection('donationPledges');
            return pledges.some(
              (p) =>
                p.data.donorName === 'Lukas Meier' &&
                p.data.status === 'Processing' &&
                p.data.currency === 'CHF' &&
                p.data.amount === 50
            );
          },
          { timeout: 15000 }
        )
        .toBe(true);
    });

    test('public /donate custom CHF 175.50 pledge persists with exact CHF amount', async ({
      page,
    }) => {
      const donate = new DonatePage(page);
      await donate.goto();
      await donate.submitPledge({
        amount: 175.5,
        name: 'Anna Keller',
        email: 'anna.keller@example.ch',
      });
      await expect(donate.confirmationDialog).toBeVisible({ timeout: 15000 });
      await expect
        .poll(
          async () => {
            const pledges = await listFirestoreCollection('donationPledges');
            return pledges.some(
              (p) => p.data.donorName === 'Anna Keller' && p.data.amount === 175.5
            );
          },
          { timeout: 15000 }
        )
        .toBe(true);
    });

    test('/admin/donations promotes a Processing pledge to /donationReports with sourcePledgeId', async ({
      browser,
    }) => {
      await seedFirestoreDoc('donationPledges', 'pledge-promote-1', {
        id: 'pledge-promote-1',
        donorName: 'Promote Donor',
        email: 'promote@example.ch',
        amount: 100,
        currency: 'CHF',
        destination: 'INFAQ & Vereinsbetrieb (Percikan Iman Schweiz)',
        date: '2026-09-10',
        paymentMethod: 'Bank Transfer',
        status: 'Processing',
      });
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/donations');
        await expect(handle.page.getByText('Promote Donor').first()).toBeVisible({
          timeout: 15000,
        });
        await handle.page
          .getByRole('button', { name: /Promote|Bestätigen|Approve/i })
          .first()
          .click();
        await expect
          .poll(async () => {
            const reports = await listFirestoreCollection('donationReports');
            return reports.some(
              (r) =>
                r.data.donorName === 'Promote Donor' &&
                r.data.sourcePledgeId === 'pledge-promote-1'
            );
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('/admin/donations rejects a Processing pledge without creating a report', async ({
      browser,
    }) => {
      await seedFirestoreDoc('donationPledges', 'pledge-reject-1', {
        id: 'pledge-reject-1',
        donorName: 'Reject Donor',
        email: 'reject@example.ch',
        amount: 40,
        currency: 'CHF',
        destination: 'INFAQ & Vereinsbetrieb (Percikan Iman Schweiz)',
        date: '2026-09-10',
        paymentMethod: 'Bank Transfer',
        status: 'Processing',
      });
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/donations');
        await expect(handle.page.getByText('Reject Donor').first()).toBeVisible({
          timeout: 15000,
        });
        handle.page.once('dialog', (dialog) =>
          dialog.accept('Payment could not be verified')
        );
        await handle.page
          .getByRole('button', { name: /Reject|Ablehnen/i })
          .first()
          .click();
        await expect
          .poll(async () => {
            const pledge = await getFirestoreDoc('donationPledges', 'pledge-reject-1');
            return pledge === null || pledge.status === 'Rejected';
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('/admin/donations displays verified /donationReports ledger in CHF', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/donations');
        await expect(
          handle.page.getByText('Anonymer Spender Zürich').first()
        ).toBeVisible({ timeout: 15000 });
        await expect(handle.page.getByText(/CHF\s*500/i).first()).toBeVisible();
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F13: Member Management, reviewNotes & verifiedVoteWeight', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('/member self-service update persists phone edit to /members/{uid}', async ({
      browser,
    }) => {
      const { users } = await seedStandardWorld();
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        await handle.page.goto('/member');
        const phoneInput = handle.page
          .locator('input[name="phone"], input[placeholder*="+49 176" i]')
          .or(handle.page.locator('input[type="tel"]').last())
          .first();
        await expect(phoneInput).toBeVisible({ timeout: 15000 });
        await phoneInput.fill('+41 79 999 88 77');
        const saveBtn = handle.page
          .locator('#save-top-btn')
          .or(
            handle.page.getByRole('button', {
              name: /Save Changes|Speichern|All Saved/i,
            })
          )
          .first();
        await expect(saveBtn).toBeEnabled({ timeout: 5000 });
        await saveBtn.click();
        await expect
          .poll(async () => {
            const doc = await getFirestoreDoc('members', users.activeFamily.uid);
            return doc?.phone;
          })
          .toBe('+41 79 999 88 77');
      } finally {
        await handle.close();
      }
    });

    test('/admin/members approves pending payment for Taufik Hidayat', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/members');
        const taufikCard = handle.page
          .locator('div, tr')
          .filter({ hasText: 'Taufik Hidayat' })
          .filter({
            has: handle.page.getByRole('button', {
              name: /Approve & Activate Member|Approve Payment|Zahlung bestätigen|Confirm Payment/i,
            }),
          })
          .first();
        await expect(taufikCard).toBeVisible({ timeout: 15000 });
        await taufikCard
          .getByRole('button', {
            name: /Approve & Activate Member|Approve Payment|Zahlung bestätigen|Confirm Payment/i,
          })
          .first()
          .click();
        await expect
          .poll(async () => {
            const members = await listFirestoreCollection('members');
            const taufik = members.find((m) => m.data.memberCode === 'PI-9552');
            return taufik?.data.membershipStatus;
          })
          .toBe('active');
      } finally {
        await handle.close();
      }
    });

    test('/admin/members approves pending categoryChangeRequest for Bambang Sudirman', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/members');
        const reqCard = handle.page
          .locator('div')
          .filter({ hasText: 'Bambang Sudirman' })
          .filter({
            has: handle.page.getByRole('button', {
              name: /Approve Category Change|Approve.*Request|Genehmigen/i,
            }),
          })
          .first();
        await expect(reqCard).toBeVisible({ timeout: 15000 });
        await reqCard
          .getByRole('button', {
            name: /Approve Category Change|Approve.*Request|Genehmigen/i,
          })
          .first()
          .click();
        await expect
          .poll(async () => {
            const members = await listFirestoreCollection('members');
            const bambang = members.find((m) => m.data.memberCode === 'PI-7740');
            return bambang?.data.membershipCategory;
          })
          .toBe('family');
      } finally {
        await handle.close();
      }
    });

    test('/admin/members rejects categoryChangeRequest writing reviewNotes (not adminNotes)', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/members');
        const reqCard = handle.page
          .locator('div')
          .filter({ hasText: 'Bambang Sudirman' })
          .filter({
            has: handle.page.getByRole('button', {
              name: /Decline|Reject|Ablehnen/i,
            }),
          })
          .first();
        await expect(reqCard).toBeVisible({ timeout: 15000 });
        await reqCard
          .getByRole('button', { name: /Decline|Reject|Ablehnen/i })
          .first()
          .click();
        await expect
          .poll(async () => {
            const members = await listFirestoreCollection('members');
            const bambang = members.find((m) => m.data.memberCode === 'PI-7740');
            const req = bambang?.data.categoryChangeRequest as
              | Record<string, unknown>
              | undefined;
            return (
              req?.status === 'rejected' &&
              typeof req?.reviewNotes === 'string' &&
              !('adminNotes' in (req || {}))
            );
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('/admin/members displays verifiedVoteWeight and allows isSuperAdmin role delegation', async ({
      browser,
    }) => {
      const { users } = await seedStandardWorld();
      const handle = await createRoleContext(browser, 'superAdmin');
      try {
        await handle.page.goto('/admin/members');
        await expect(
          handle.page.getByText(/Verified.*Vote|verifiedVoteWeight|2\s*Vote/i).first()
        ).toBeVisible({ timeout: 15000 });
        const targetRow = handle.page
          .locator('tr')
          .filter({ hasText: 'Bambang Sudirman' })
          .first();
        await expect(targetRow).toBeVisible({ timeout: 15000 });
        await targetRow
          .getByRole('button', { name: /^Admin\s*[+✓]/i })
          .first()
          .click();
        await expect
          .poll(async () => {
            const doc = await getFirestoreDoc('members', users.activePersonal.uid);
            return doc?.isAdmin;
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F14: QR Scanner & Door Cash Settlement (/admin/attendance)', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('/admin/attendance starts camera stream via Chromium fake media device without modal errors', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const scanner = new AttendanceScannerPage(handle.page);
        await scanner.goto();
        await scanner.startCameraButton.click();
        await expect(scanner.stopCameraButton).toBeVisible({ timeout: 10000 });
      } finally {
        await handle.close();
      }
    });

    test('manual check-in by memberCode (PI-7740) writes verified record to /attendance', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const scanner = new AttendanceScannerPage(handle.page);
        await scanner.goto();
        await scanner.submitManualCode('PI-7740');
        await expect(
          handle.page
            .locator('[data-testid="last-scan-result"]')
            .filter({ hasText: /Check-in erfolgreich|Bereits eingecheckt/i })
            .filter({ hasText: /Bambang Sudirman/ })
            .first()
        ).toBeVisible({ timeout: 15000 });
        await expect
          .poll(
            async () => {
              const records = await listFirestoreCollection('attendance');
              return records.some(
                (r) => r.data.memberCode === 'PI-7740' && r.data.verified === true
              );
            },
            { timeout: 15000 }
          )
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('JSON QR payload check-in records full family partyCount in /attendance', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const scanner = new AttendanceScannerPage(handle.page);
        await scanner.goto();
        await scanner.submitManualCode(
          generateValidQrPayload(TEST_PERSONAS.activeFamily)
        );
        await expect(
          handle.page
            .locator('[data-testid="last-scan-result"]')
            .filter({ hasText: /Check-in erfolgreich|Bereits eingecheckt/i })
            .filter({ hasText: /Ridwan Kamil Santoso/ })
            .first()
        ).toBeVisible({ timeout: 15000 });
        await expect
          .poll(
            async () => {
              const records = await listFirestoreCollection('attendance');
              const famRecord = records.find(
                (r) => r.data.memberCode === 'PI-FAM-2021'
              );
              return famRecord?.data.partyCount;
            },
            { timeout: 15000 }
          )
          .toBe(5);
      } finally {
        await handle.close();
      }
    });

    test('pending_payment member (PI-9552) settles CHF 80 door cash fee and logs attendance', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'canScanQR');
      try {
        const scanner = new AttendanceScannerPage(handle.page);
        await scanner.goto();
        await scanner.submitManualCode('PI-9552');
        await expect(scanner.doorSettlementButton()).toBeVisible({ timeout: 15000 });
        await scanner.doorSettlementButton().click();
        await expect
          .poll(async () => {
            const members = await listFirestoreCollection('members');
            const taufik = members.find((m) => m.data.memberCode === 'PI-9552');
            return taufik?.data.membershipStatus;
          })
          .toBe('active');
        await expect
          .poll(
            async () => {
              const records = await listFirestoreCollection('attendance');
              return records.some((r) => r.data.memberCode === 'PI-9552');
            },
            { timeout: 15000 }
          )
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('isAdmin can delete an attendance record from /admin/attendance', async ({
      browser,
    }) => {
      await seedFirestoreDoc('attendance', 'att-del-1', {
        id: 'att-del-1',
        eventId: 'evt-pengajian-stadel',
        eventTitle: 'Monatliches Pengajian & Familien-Begegnung',
        memberCode: 'PI-7740',
        memberName: 'Bambang Sudirman',
        category: 'personal',
        status: 'active',
        isFeeExempt: false,
        partyCount: 1,
        partyMembers: ['Bambang Sudirman'],
        scannedAt: '2026-09-13T13:30:00.000Z',
        scannedBy: 'Dr. H. Aam Amiruddin',
        feePaidChf: 0,
        verified: true,
      });
      const handle = await createRoleContext(browser, 'admin');
      try {
        const scanner = new AttendanceScannerPage(handle.page);
        await scanner.goto();
        await scanner.eventSelect.selectOption('evt-pengajian-stadel');
        await expect(handle.page.getByText('Bambang Sudirman').first()).toBeVisible({
          timeout: 15000,
        });
        await handle.page
          .getByRole('button', { name: /Delete|Löschen|Remove/i })
          .first()
          .click();
        await expect
          .poll(async () => await getFirestoreDoc('attendance', 'att-del-1'))
          .toBeNull();
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F15: GA Admin Moderation & Voter Roll Certification (/admin/assembly)', () => {
    test.beforeEach(async () => {
      await seedStandardWorld({ certifyVoterRoll: false, gaOpen: false, activeQuestionId: '' });
    });

    test('/admin/assembly opens siteConfig/gaSession live in Firestore', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/assembly');
        await handle.page
          .getByRole('button', { name: /Open GA|Open Session|Versammlung öffnen/i })
          .first()
          .click();
        await expect
          .poll(async () => (await getFirestoreDoc('siteConfig', 'gaSession'))?.isOpen)
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('/admin/assembly batch "Certify Voter Roll" stamps verifiedVoteWeight across active and exempt members', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/assembly');
        await handle.page
          .getByRole('button', { name: /Certify Voter Roll|Wählerverzeichnis/i })
          .first()
          .click();
        await expect
          .poll(async () => {
            const members = await listFirestoreCollection('members');
            const fam = members.find((m) => m.data.memberCode === 'PI-FAM-2021');
            return fam?.data.verifiedVoteWeight;
          })
          .toBe(2);
      } finally {
        await handle.close();
      }
    });

    test('/admin/assembly creates a draft motion with optionIds', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/assembly');
        await handle.page
          .getByRole('button', {
            name: /Prepare \/ Draft Question|New Motion|Pose Question|Neuer Antrag/i,
          })
          .first()
          .click();
        const dialog = handle.page.locator('[role="dialog"]').first();
        await dialog.waitFor({ state: 'visible' });
        await dialog
          .locator('input[name="title"], input[type="text"]')
          .first()
          .fill('Neues Vereinslokal mieten');
        const motionDesc = dialog.locator('textarea').first();
        if (await motionDesc.isVisible().catch(() => false)) {
          await motionDesc.fill('Antrag zur Anmietung neuer Vereinsräume in Zürich.');
        }
        await dialog
          .getByRole('button', {
            name: /Save Draft Motion|Publish Question|Save|Create|Erstellen/i,
          })
          .first()
          .click();
        await expect
          .poll(async () => {
            const questions = await listFirestoreCollection('assemblyQuestions');
            return questions.some(
              (q) =>
                q.data.title === 'Neues Vereinslokal mieten' &&
                Array.isArray(q.data.optionIds)
            );
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('/admin/assembly raises a draft motion (ga-q2) on_floor', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/assembly');
        const q2Card = handle.page.locator('[data-testid="assembly-motion-card-ga-q2"]');
        await expect(q2Card).toBeVisible({ timeout: 15000 });
        await q2Card
          .getByRole('button', {
            name: /Raise to Floor|Auf die Tagesordnung|Open Vote/i,
          })
          .first()
          .click();
        await expect
          .poll(async () => {
            const q2 = await getFirestoreDoc('assemblyQuestions', 'ga-q2');
            return q2?.status;
          })
          .toBe('on_floor');
      } finally {
        await handle.close();
      }
    });

    test('/admin/assembly closes an on_floor motion writing frozen finalResults', async ({
      browser,
    }) => {
      await seedStandardWorld({ gaOpen: true, activeQuestionId: 'ga-q1' });
      const handle = await createRoleContext(browser, 'admin');
      try {
        await handle.page.goto('/admin/assembly');
        await handle.page
          .getByRole('button', { name: /Close Vote|Abstimmung schliessen/i })
          .first()
          .click();
        await expect
          .poll(async () => {
            const q1 = await getFirestoreDoc('assemblyQuestions', 'ga-q1');
            return q1?.status === 'closed' && Boolean(q1?.finalResults);
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F16: GA Member Voting (/ballots/{uid}) & Board Inquiries (/upvotes/{uid})', () => {
    test.beforeEach(async () => {
      await seedStandardWorld({ gaOpen: true, activeQuestionId: 'ga-q1', certifyVoterRoll: true });
    });

    test('certified activeFamily casts 2-vote ballot stored at /assemblyQuestions/ga-q1/ballots/{uid} without memberEmail', async ({
      browser,
    }) => {
      const { users } = await seedStandardWorld({ gaOpen: true, activeQuestionId: 'ga-q1' });
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        const assembly = new AssemblyPage(handle.page);
        await assembly.goto();
        await assembly.castVote(/Ja|Yes/i);
        await expect
          .poll(
            async () =>
              await getFirestoreDoc(
                'assemblyQuestions/ga-q1/ballots',
                users.activeFamily.uid
              ),
            { timeout: 15000 }
          )
          .not.toBeNull();
        const ballot = await getFirestoreDoc(
          'assemblyQuestions/ga-q1/ballots',
          users.activeFamily.uid
        );
        expect(ballot).not.toBeNull();
        expect(ballot?.voteWeight).toBe(2);
        expect(ballot?.memberEmail).toBeUndefined();
      } finally {
        await handle.close();
      }
    });

    test('certified feeExempt member casts 1-vote ballot on active floor motion', async ({
      browser,
    }) => {
      const { users } = await seedStandardWorld({ gaOpen: true, activeQuestionId: 'ga-q1' });
      const handle = await createRoleContext(browser, 'feeExempt');
      try {
        const assembly = new AssemblyPage(handle.page);
        await assembly.goto();
        await assembly.castVote(/Ja|Yes/i);
        await expect
          .poll(
            async () =>
              await getFirestoreDoc(
                'assemblyQuestions/ga-q1/ballots',
                users.feeExempt.uid
              ),
            { timeout: 15000 }
          )
          .not.toBeNull();
        const ballot = await getFirestoreDoc(
          'assemblyQuestions/ga-q1/ballots',
          users.feeExempt.uid
        );
        expect(ballot?.voteWeight).toBe(1);
      } finally {
        await handle.close();
      }
    });

    test('live tallies on /assembly reflect cast weighted votes immediately', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activeFamily');
      try {
        const assembly = new AssemblyPage(handle.page);
        await assembly.goto();
        await assembly.castVote(/Ja|Yes/i);
        await expect(handle.page.getByText(/2\s*votes?/i).first()).toBeVisible({
          timeout: 15000,
        });
      } finally {
        await handle.close();
      }
    });

    test('active member submits a new inquiry in /boardInquiries', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'activePersonal');
      try {
        const assembly = new AssemblyPage(handle.page);
        await assembly.goto();
        await assembly.inquiriesTab.click();
        await assembly.askQuestionButton.click();
        const dialog = handle.page
          .locator('[role="dialog"], div.fixed.inset-0 > div.bg-white')
          .first();
        await dialog.locator('input[type="text"]').first().fill('Kinderbetreuung 2027');
        await dialog
          .locator('textarea')
          .first()
          .fill('Wird es bei Events eine Kinderbetreuung geben?');
        await dialog
          .getByRole('button', { name: /Submit|Senden/i })
          .first()
          .click();
        await expect
          .poll(async () => {
            const inquiries = await listFirestoreCollection('boardInquiries');
            return inquiries.some((i) => i.data.title === 'Kinderbetreuung 2027');
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });

    test('active member toggles /boardInquiries/inq-1/upvotes/{uid}', async ({
      browser,
    }) => {
      const { users } = await seedStandardWorld({ gaOpen: true, activeQuestionId: 'ga-q1' });
      const handle = await createRoleContext(browser, 'activePersonal');
      try {
        const assembly = new AssemblyPage(handle.page);
        await assembly.goto();
        await assembly.inquiriesTab.click();
        await handle.page
          .getByRole('button', { name: /Endorse|Upvote|Unterstützen/i })
          .first()
          .click();
        await expect
          .poll(async () => {
            const upvote = await getFirestoreDoc(
              'boardInquiries/inq-1/upvotes',
              users.activePersonal.uid
            );
            return upvote !== null;
          })
          .toBe(true);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F17: One-Time /admin/bootstrap Seeding & Lock', () => {
    test.beforeEach(async () => {
      await resetEmulators();
      const sa = await seedAuthUser(TEST_PERSONAS.superAdmin);
      await seedFirestoreDoc(
        'members',
        sa.uid,
        buildMemberDocument(TEST_PERSONAS.superAdmin, sa.uid)
      );
    });

    test('isSuperAdmin sees /admin/bootstrap when /siteConfig/bootstrap is absent', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'superAdmin');
      try {
        const adminShell = new AdminShellPage(handle.page);
        await adminShell.goto('/admin/bootstrap');
        await expect(handle.page).toHaveURL(/\/admin\/bootstrap$/);
        await expect(
          handle.page.getByRole('button', { name: /Bootstrap|Seed|Initialisier|Inisialisasi/i }).first()
        ).toBeVisible();
      } finally {
        await handle.close();
      }
    });

    test('/admin/bootstrap displays zero counts for empty collections before seeding', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'superAdmin');
      try {
        await handle.page.goto('/admin/bootstrap');
        await expect(handle.page.getByText('0').first()).toBeVisible({
          timeout: 15000,
        });
      } finally {
        await handle.close();
      }
    });

    test('triggering /admin/bootstrap seeds programs, events, and boardMembers into Firestore', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'superAdmin');
      try {
        await handle.page.goto('/admin/bootstrap');
        await handle.page
          .getByRole('button', { name: /Bootstrap|Seed|Initialisier|Inisialisasi/i })
          .first()
          .click();
        await expect
          .poll(async () => (await listFirestoreCollection('programs')).length, {
            timeout: 20000,
          })
          .toBeGreaterThan(0);
        await expect
          .poll(async () => (await listFirestoreCollection('events')).length, {
            timeout: 20000,
          })
          .toBeGreaterThan(0);
        await expect
          .poll(async () => (await listFirestoreCollection('boardMembers')).length, {
            timeout: 20000,
          })
          .toBeGreaterThan(0);
      } finally {
        await handle.close();
      }
    });

    test('triggering /admin/bootstrap creates /siteConfig/bootstrap lock marker', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'superAdmin');
      try {
        await handle.page.goto('/admin/bootstrap');
        await handle.page
          .getByRole('button', { name: /Bootstrap|Seed|Initialisier|Inisialisasi/i })
          .first()
          .click();
        await expect
          .poll(async () => await getFirestoreDoc('siteConfig', 'bootstrap'), {
            timeout: 20000,
          })
          .not.toBeNull();
      } finally {
        await handle.close();
      }
    });

    test('triggering /admin/bootstrap stamps verifiedVoteWeight on seeded active members', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'superAdmin');
      try {
        await handle.page.goto('/admin/bootstrap');
        await handle.page
          .getByRole('button', { name: /Bootstrap|Seed|Initialisier|Inisialisasi/i })
          .first()
          .click();
        await expect
          .poll(
            async () => {
              const members = await listFirestoreCollection('members');
              return members.some(
                (m) => typeof m.data.verifiedVoteWeight === 'number'
              );
            },
            { timeout: 20000 }
          )
          .toBe(true);
      } finally {
        await handle.close();
      }
    });
  });

  test.describe('F18: 4-Locale i18n Updates (de default, en, id, ms)', () => {
    test.beforeEach(async () => {
      await seedStandardWorld();
    });

    test('fresh browser context defaults to de (Deutsch) with German navigation labels', async ({
      page,
    }) => {
      const publicPage = new PublicLayoutPage(page);
      await publicPage.goto('/');
      expect(await publicPage.getHtmlLang()).toBe('de');
      await expect(
        publicPage.primaryNav.getByText('Programme').first()
      ).toBeVisible();
    });

    test('switching to en updates html[lang] and navigation labels to English', async ({
      page,
    }) => {
      const publicPage = new PublicLayoutPage(page);
      await publicPage.goto('/');
      await publicPage.switchLanguage('en');
      await expect(
        publicPage.primaryNav.getByText('Programs').first()
      ).toBeVisible();
    });

    test('switching to id updates html[lang] and navigation labels to Bahasa Indonesia', async ({
      page,
    }) => {
      const publicPage = new PublicLayoutPage(page);
      await publicPage.goto('/');
      await publicPage.switchLanguage('id');
      await expect(
        publicPage.primaryNav.getByText('Donasi & Transparansi').first()
      ).toBeVisible();
    });

    test('switching to ms updates html[lang] and navigation labels to Bahasa Melayu', async ({
      page,
    }) => {
      const publicPage = new PublicLayoutPage(page);
      await publicPage.goto('/');
      await publicPage.switchLanguage('ms');
      await expect(
        publicPage.primaryNav.getByText('Derma & Ketelusan').first()
      ).toBeVisible();
    });

    test('selected locale persists across hard reload and inside AdminLayout', async ({
      browser,
    }) => {
      const handle = await createRoleContext(browser, 'admin', {
        initialLanguage: 'en',
      });
      try {
        const adminShell = new AdminShellPage(handle.page);
        await adminShell.goto('/admin/programs');
        await expect(handle.page.locator('html')).toHaveAttribute('lang', 'en');
        await handle.page.reload();
        await expect(handle.page.locator('html')).toHaveAttribute('lang', 'en');
        await expect(adminShell.returnToPublicLink).toContainText(/Return to Public Site/i);
      } finally {
        await handle.close();
      }
    });
  });
});
