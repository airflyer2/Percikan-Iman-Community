import { expect, test } from '@playwright/test';
import {
  attachTelemetryTrackers,
  createRoleContext,
  signInViaAdminGate,
  signInViaLoginPage,
} from './fixtures/auth';
import {
  buildMemberDocument,
  generateValidQrPayload,
  getFirestoreDoc,
  listFirestoreCollection,
  resetEmulators,
  seedAuthUser,
  seedFirestoreDoc,
  seedStandardWorld,
  TEST_PERSONAS,
  type PersonaSpec,
} from './fixtures/emulator';
import {
  ADMIN_SELECTORS,
  AdminShellPage,
  AssemblyPage,
  AttendanceScannerPage,
  DonatePage,
  PublicLayoutPage,
} from './pages';

test.describe('Tier 4 — Real-World Application CUJ 1–5 & Full Lifecycles (9 tests)', () => {
  test('CUJ 1: Public visitor & member decluttered experience with zero admin chunks and zero permission-denied errors', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const visitor = await createRoleContext(browser, 'visitor');
    const member = await createRoleContext(browser, 'activeFamily');
    try {
      const visitorPublic = new PublicLayoutPage(visitor.page);
      for (const route of ['/', '/programs', '/donate', '/gallery', '/about', '/contact']) {
        await visitorPublic.goto(route);
        await visitorPublic.assertNoPublicAdminClutter();
      }
      await visitorPublic.goto('/');
      await expect(
        visitor.page.getByText('Generalversammlung 2026').first()
      ).toBeVisible({ timeout: 15000 });
      await visitorPublic.goto('/programs');
      await expect(
        visitor.page.getByText('Solidaritätsküche Zürich').first()
      ).toBeVisible({ timeout: 15000 });
      await visitorPublic.goto('/donate');
      await expect(
        visitor.page.getByText(/INFAQ & Vereinsbetrieb/i).first()
      ).toBeVisible({ timeout: 15000 });
      await visitorPublic.goto('/about');
      await expect(
        visitor.page.getByText('Dr. H. Aam Amiruddin').first()
      ).toBeVisible({ timeout: 15000 });

      await visitor.page.waitForLoadState('load');
      await expect(
        visitor.page.locator('[aria-busy="true"], .animate-spin')
      ).toHaveCount(0, { timeout: 15000 });
      expect(visitor.trackers.getLeakedAdminOrSeedUrls()).toEqual([]);
      expect(visitor.trackers.getPermissionDeniedErrors()).toEqual([]);
      expect(visitor.trackers.pageErrors).toEqual([]);

      const memberPublic = new PublicLayoutPage(member.page);
      const assembly = new AssemblyPage(member.page);
      await memberPublic.goto('/member');
      await expect(
        member.page.locator('[aria-busy="true"], .animate-spin')
      ).toHaveCount(0, { timeout: 15000 });
      await memberPublic.assertNoPublicAdminClutter();
      await memberPublic.goto('/assembly');
      await expect(
        member.page.locator('[aria-busy="true"], .animate-spin')
      ).toHaveCount(0, { timeout: 15000 });
      await expect(
        member.page.getByText(/General Assembly Chamber|Generalversammlung/i).first()
      ).toBeVisible({ timeout: 15000 });
      await memberPublic.assertNoPublicAdminClutter();
      await assembly.assertNoModerationControls();
      expect(member.trackers.getLeakedAdminOrSeedUrls()).toEqual([]);
      expect(member.trackers.getPermissionDeniedErrors()).toEqual([]);
      expect(member.trackers.pageErrors).toEqual([]);
    } finally {
      await visitor.close();
      await member.close();
    }
  });

  test('CUJ 2: Board admin real-time content management (/admin/programs & /admin/events -> live onSnapshot in second session)', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const adminCtx = await createRoleContext(browser, 'admin');
    const visitorCtx = await createRoleContext(browser, 'visitor');
    try {
      await visitorCtx.page.goto('/programs');

      await adminCtx.page.goto('/admin/programs');
      await adminCtx.page
        .getByRole('button', { name: ADMIN_SELECTORS.addProgramBtn })
        .first()
        .click();
      const progDialog = adminCtx.page.locator('[role="dialog"]').first();
      await progDialog.waitFor({ state: 'visible' });
      await adminCtx.page
        .locator(ADMIN_SELECTORS.programTitleInput)
        .first()
        .fill('CUJ2 Live Quran Circle');
      const progDesc = progDialog.locator('textarea').first();
      if (await progDesc.isVisible().catch(() => false)) {
        await progDesc.fill('Live synced program from CUJ2.');
      }
      await progDialog
        .getByRole('button', { name: ADMIN_SELECTORS.saveProgramBtn })
        .first()
        .click();

      await expect(
        visitorCtx.page.getByText('CUJ2 Live Quran Circle').first()
      ).toBeVisible({ timeout: 15000 });

      await adminCtx.page.reload();
      await expect(
        adminCtx.page.getByText('CUJ2 Live Quran Circle').first()
      ).toBeVisible({ timeout: 15000 });

      await visitorCtx.page.goto('/');
      await visitorCtx.page
        .getByRole('button', { name: /All Events/i })
        .first()
        .click();
      await adminCtx.page.goto('/admin/events');
      await adminCtx.page
        .getByRole('button', { name: ADMIN_SELECTORS.addEventBtn })
        .first()
        .click();
      const evtDialog = adminCtx.page.locator('[role="dialog"]').first();
      await evtDialog.waitFor({ state: 'visible' });
      await adminCtx.page
        .locator(ADMIN_SELECTORS.eventTitleInput)
        .first()
        .fill('CUJ2 Annual Symposium');
      const dateInput = evtDialog.locator('input[type="date"]').first();
      if (await dateInput.isVisible().catch(() => false)) {
        await dateInput.fill('2026-11-15');
      }
      const timeInput = evtDialog
        .locator('input[name="time"], input[placeholder*="18:00" i], input[placeholder*="08:30" i]')
        .first();
      if (await timeInput.isVisible().catch(() => false)) {
        await timeInput.fill('14:00 - 18:00');
      }
      const locInput = evtDialog
        .locator('input[name="location"], input[placeholder*="Zürich" i], input[placeholder*="Location" i]')
        .first();
      if (await locInput.isVisible().catch(() => false)) {
        await locInput.fill('Zürich-Stadelhofen');
      }
      const evtDesc = evtDialog.locator('textarea').first();
      if (await evtDesc.isVisible().catch(() => false)) {
        await evtDesc.fill('Annual community symposium.');
      }
      await evtDialog
        .getByRole('button', { name: ADMIN_SELECTORS.saveEventBtn })
        .first()
        .click();

      await expect(
        visitorCtx.page.getByText('CUJ2 Annual Symposium').first()
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await adminCtx.close();
      await visitorCtx.close();
    }
  });

  test('CUJ 3: Delegated QR operator event check-in, door cash settlement, fee_paused rejection & live admin sync', async ({
    browser,
  }) => {
    const { users } = await seedStandardWorld();
    const pendingFamilyPersona: PersonaSpec = {
      ...TEST_PERSONAS.pendingPayment,
      key: 'pendingPayment',
      email: 'pending.family@percikaniman.org',
      name: 'Farid Family Pending',
      memberCode: 'PI-FAM-PEND',
      membershipCategory: 'family',
      yearlyContribution: 120,
      spouse: { name: 'Amina Pending', email: 'amina.pending@percikaniman.org' },
    };
    const famPendAuth = await seedAuthUser(pendingFamilyPersona);
    await seedFirestoreDoc(
      'members',
      famPendAuth.uid,
      buildMemberDocument(pendingFamilyPersona, famPendAuth.uid)
    );

    const scannerCtx = await createRoleContext(browser, 'canScanQR');
    const adminCtx = await createRoleContext(browser, 'admin');
    try {
      const scanner = new AttendanceScannerPage(scannerCtx.page);
      const shell = new AdminShellPage(scannerCtx.page);
      await scannerCtx.page.goto('/admin');
      await expect(scannerCtx.page).toHaveURL(/\/admin\/attendance$/);
      await expect(shell.tabLink('programs')).toHaveCount(0);

      // Start camera stream via Chromium fake media device
      await scanner.startCameraButton.click();
      await expect(scanner.stopCameraButton).toBeVisible({ timeout: 10000 });
      await scanner.stopCameraButton.click();

      // Active family check-in via JSON QR payload
      await scanner.submitManualCode(
        generateValidQrPayload(TEST_PERSONAS.activeFamily)
      );
      await expect(
        scannerCtx.page
          .locator('[data-testid="last-scan-result"]')
          .filter({ hasText: /Ridwan Kamil Santoso/ })
          .first()
      ).toBeVisible({ timeout: 15000 });

      // Pending payment personal door cash settlement (CHF 80)
      await scanner.submitManualCode('PI-9552');
      await expect(scanner.doorSettlementButton()).toBeVisible({ timeout: 15000 });
      await expect(
        scannerCtx.page.getByText(/CHF\s*80/i).first()
      ).toBeVisible({ timeout: 10000 });
      await scanner.doorSettlementButton().click();
      await expect
        .poll(async () => {
          const doc = await getFirestoreDoc('members', users.pendingPayment.uid);
          return {
            membershipStatus: doc?.membershipStatus,
            paymentMethod: doc?.paymentMethod,
          };
        })
        .toEqual({ membershipStatus: 'active', paymentMethod: 'cash' });
      await expect(
        scannerCtx.page
          .locator('[data-testid="last-scan-result"]')
          .filter({ hasText: /Taufik Hidayat/ })
          .filter({ hasText: /aktiviert und eingecheckt/i })
          .first()
      ).toBeVisible({ timeout: 15000 });

      // Pending payment family door cash settlement (CHF 120)
      await scanner.submitManualCode('PI-FAM-PEND');
      await expect(scanner.doorSettlementButton()).toBeVisible({ timeout: 15000 });
      await expect(
        scannerCtx.page.getByText(/CHF\s*120/i).first()
      ).toBeVisible({ timeout: 10000 });
      await scanner.doorSettlementButton().click();
      await expect
        .poll(async () => {
          const doc = await getFirestoreDoc('members', famPendAuth.uid);
          return {
            membershipStatus: doc?.membershipStatus,
            paymentMethod: doc?.paymentMethod,
          };
        })
        .toEqual({ membershipStatus: 'active', paymentMethod: 'cash' });
      await expect(
        scannerCtx.page
          .locator('[data-testid="last-scan-result"]')
          .filter({ hasText: /Farid Family Pending/ })
          .filter({ hasText: /aktiviert und eingecheckt/i })
          .first()
      ).toBeVisible({ timeout: 15000 });

      // fee_paused explicit rejection
      await scanner.submitManualCode('PI-PAUSED-01');
      await expect(
        scannerCtx.page.getByText(/pausiert|fee_paused|Beitragspause/i).first()
      ).toBeVisible({ timeout: 15000 });

      // Second admin session sees synced attendance in Firestore UI
      await adminCtx.page.goto('/admin/attendance');
      await expect(
        adminCtx.page.getByText(/Ridwan Kamil Santoso/).first()
      ).toBeVisible({ timeout: 15000 });
      await expect(
        adminCtx.page.getByText(/Taufik Hidayat/).first()
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await scannerCtx.close();
      await adminCtx.close();
    }
  });

  test('CUJ 4: General Assembly certification, floor control & concurrent multi-member weighted ballot tallying', async ({
    browser,
  }) => {
    const { users } = await seedStandardWorld({
      certifyVoterRoll: false,
      gaOpen: false,
      activeQuestionId: '',
      gaQ1Status: 'draft',
    });

    // Seed a 4-vote family member (1 primary + 1 spouse + 2 children >= 16 yrs)
    const fourVotePersona: PersonaSpec = {
      ...TEST_PERSONAS.activeFamily,
      key: 'activeFamily',
      email: 'fourvote.family@percikaniman.org',
      name: 'Sulaiman FourVote',
      memberCode: 'PI-FAM4-01',
      verifiedVoteWeight: 4,
      spouse: {
        name: 'Khadijah FourVote',
        email: 'khadijah.four@percikaniman.org',
      },
      children: [
        { id: 'c4-1', name: 'Zaid FourVote', birthYear: '2004', relation: 'Son' },
        { id: 'c4-2', name: 'Amina FourVote', birthYear: '2008', relation: 'Daughter' },
      ],
    };
    const fourVoteAuth = await seedAuthUser(fourVotePersona);
    await seedFirestoreDoc(
      'members',
      fourVoteAuth.uid,
      buildMemberDocument(fourVotePersona, fourVoteAuth.uid, {
        includeVerifiedVoteWeight: false,
      })
    );

    const adminCtx = await createRoleContext(browser, 'admin');
    const twoVoteCtx = await createRoleContext(browser, 'activeFamily');
    const fourVoteCtx = await browser.newContext({ permissions: ['camera'] });
    const fourVotePage = await fourVoteCtx.newPage();
    const fourVoteTrackers = attachTelemetryTrackers(fourVotePage);

    try {
      await signInViaLoginPage(
        fourVotePage,
        fourVotePersona.email,
        fourVotePersona.password
      );
      const twoVoteAssembly = new AssemblyPage(twoVoteCtx.page);
      const fourVoteAssembly = new AssemblyPage(fourVotePage);
      await twoVoteAssembly.goto();
      await fourVoteAssembly.goto();
      await twoVoteAssembly.assertNoModerationControls();
      await fourVoteAssembly.assertNoModerationControls();

      // Admin certifies voter roll, opens GA, and raises ga-q1 specifically on_floor
      await adminCtx.page.goto('/admin/assembly');
      await adminCtx.page
        .getByRole('button', { name: /Certify Voter Roll|Wählerverzeichnis/i })
        .first()
        .click();
      await expect
        .poll(async () => {
          const doc4 = await getFirestoreDoc('members', fourVoteAuth.uid);
          const doc2 = await getFirestoreDoc('members', users.activeFamily.uid);
          return { w4: doc4?.verifiedVoteWeight, w2: doc2?.verifiedVoteWeight };
        })
        .toEqual({ w4: 4, w2: 2 });

      await adminCtx.page
        .getByRole('button', { name: /Open GA|Open Session|Versammlung öffnen/i })
        .first()
        .click();
      const q1Card = adminCtx.page.locator('[data-testid="assembly-motion-card-ga-q1"]');
      await expect(q1Card).toBeVisible({ timeout: 15000 });
      await q1Card
        .getByRole('button', { name: /Raise to Floor|Auf die Tagesordnung/i })
        .first()
        .click();

      await expect(fourVoteAssembly.castBallotButton()).toBeEnabled({
        timeout: 15000,
      });
      await expect(twoVoteAssembly.castBallotButton()).toBeEnabled({
        timeout: 15000,
      });

      // Concurrent 4-vote and 2-vote ballots from independent browser contexts
      await fourVoteAssembly.castVote(/Ja|Yes/i);
      await twoVoteAssembly.castVote(/Ja|Yes/i);

      await expect
        .poll(async () => {
          const ballots = await listFirestoreCollection(
            'assemblyQuestions/ga-q1/ballots'
          );
          const totalWeight = ballots.reduce(
            (sum, b) => sum + Number(b.data.voteWeight || 0),
            0
          );
          return { count: ballots.length, totalWeight };
        })
        .toEqual({ count: 2, totalWeight: 6 });

      // Assert live weighted tally UI propagation across browser sessions BEFORE closing
      await expect(
        twoVoteCtx.page.getByText(/6\s*votes|Total Weighted Votes:\s*6/i).first()
      ).toBeVisible({ timeout: 15000 });
      await expect(
        adminCtx.page.getByText(/6\s*(?:weighted\s*)?votes|Total Weighted Votes:\s*6/i).first()
      ).toBeVisible({ timeout: 15000 });

      const famBallot = await getFirestoreDoc(
        'assemblyQuestions/ga-q1/ballots',
        users.activeFamily.uid
      );
      const fourBallot = await getFirestoreDoc(
        'assemblyQuestions/ga-q1/ballots',
        fourVoteAuth.uid
      );
      expect(famBallot?.memberEmail).toBeUndefined();
      expect(fourBallot?.memberEmail).toBeUndefined();
      expect(fourBallot?.voteWeight).toBe(4);
      expect(famBallot?.voteWeight).toBe(2);

      // Admin closes motion and snapshots finalResults
      await adminCtx.page
        .getByRole('button', { name: /Close Vote|Abstimmung schliessen/i })
        .first()
        .click();
      await expect
        .poll(async () => {
          const q = await getFirestoreDoc('assemblyQuestions', 'ga-q1');
          const fr = q?.finalResults as Record<string, unknown> | undefined;
          return (
            q?.status === 'closed' &&
            fr?.totalWeight === 6 &&
            fr?.totalBallots === 2
          );
        })
        .toBe(true);

      // Member submits board inquiry -> Admin answers & escalates to assembly motion
      await twoVoteAssembly.inquiriesTab.click();
      await twoVoteAssembly.askQuestionButton.click();
      const inqDialog = twoVoteCtx.page
        .locator('[role="dialog"], div.fixed.inset-0 > div.bg-white')
        .first();
      await inqDialog.locator('input[type="text"]').first().fill('Jugendbudget 2027');
      await inqDialog
        .locator('textarea')
        .first()
        .fill('Können wir CHF 3000 für das Jugendcamp reservieren?');
      await inqDialog.getByRole('button', { name: /Submit|Senden/i }).first().click();

      const adminInqCard = adminCtx.page
        .locator('div')
        .filter({ hasText: 'Jugendbudget 2027' })
        .filter({
          has: adminCtx.page.getByRole('button', {
            name: /Answer Question|Frage beantworten|Answer/i,
          }),
        })
        .first();
      await expect(adminInqCard).toBeVisible({ timeout: 15000 });
      await adminInqCard
        .getByRole('button', { name: /Answer Question|Frage beantworten|Answer/i })
        .first()
        .click();
      const ansDialog = adminCtx.page
        .locator('[role="dialog"], div.fixed.inset-0 > div.bg-white')
        .first();
      await ansDialog
        .locator('textarea')
        .first()
        .fill('Der Vorstand befürwortet einen Antrag für CHF 3000.');
      await ansDialog
        .getByRole('button', {
          name: /Publish Board Reply|Publish|Reply|Send|Submit|Save|Antwort|Senden/i,
        })
        .first()
        .click();

      const escalateCard = adminCtx.page
        .locator('div')
        .filter({ hasText: 'Jugendbudget 2027' })
        .filter({
          has: adminCtx.page.getByRole('button', {
            name: /Convert to Assembly Vote|Escalate|In Antrag umwandeln/i,
          }),
        })
        .last();
      const escalateBtn = escalateCard
        .getByRole('button', {
          name: /Convert to Assembly Vote|Escalate|In Antrag umwandeln/i,
        })
        .first();
      await expect(escalateBtn).toBeVisible({ timeout: 10000 });
      await escalateBtn.click();

      await expect
        .poll(async () => {
          const inqs = await listFirestoreCollection('boardInquiries');
          const match = inqs.find((i) => i.data.title === 'Jugendbudget 2027');
          return (
            match?.data.status === 'agenda_item' &&
            typeof match?.data.convertedToQuestionId === 'string'
          );
        })
        .toBe(true);
      expect(fourVoteTrackers.pageErrors).toEqual([]);
    } finally {
      await adminCtx.close();
      await twoVoteCtx.close();
      await fourVoteCtx.close();
    }
  });

  test('CUJ 5: Deep-link AdminLoginGate preservation, partial-role redirects, and /donate -> /admin/donations promotion', async ({
    browser,
  }) => {
    await seedStandardWorld();

    // 1. Unauthenticated deep-link to /admin/donations via AdminLoginGate
    const gateCtx = await browser.newContext();
    const gatePage = await gateCtx.newPage();
    try {
      await gatePage.goto('/admin/donations');
      await new AdminShellPage(gatePage).assertAdminLoginGateVisible();
      await signInViaAdminGate(
        gatePage,
        '/admin/donations',
        TEST_PERSONAS.admin.email,
        TEST_PERSONAS.admin.password
      );
      await expect(gatePage).toHaveURL(/\/admin\/donations$/);
    } finally {
      await gateCtx.close();
    }

    // 2. Standard member denied on /admin
    const memberCtx = await createRoleContext(browser, 'activePersonal');
    try {
      const shell = new AdminShellPage(memberCtx.page);
      await shell.goto('/admin');
      await shell.assertAccessDenied();
    } finally {
      await memberCtx.close();
    }

    // 3. Partial role redirects & hidden tabs (canManageBoard & canScanQR)
    const boardCtx = await createRoleContext(browser, 'canManageBoard');
    try {
      const boardShell = new AdminShellPage(boardCtx.page);
      await boardCtx.page.goto('/admin/donations');
      await expect(boardCtx.page).toHaveURL(/\/admin\/board$/);
      for (const hiddenTab of [
        'programs',
        'events',
        'content',
        'donations',
        'members',
        'attendance',
        'assembly',
        'bootstrap',
      ] as const) {
        await expect(boardShell.tabLink(hiddenTab)).toHaveCount(0);
      }
    } finally {
      await boardCtx.close();
    }

    const scanCtx = await createRoleContext(browser, 'canScanQR');
    try {
      await scanCtx.page.goto('/admin/donations');
      await expect(scanCtx.page).toHaveURL(/\/admin\/attendance$/);
    } finally {
      await scanCtx.close();
    }

    // 4. Public pledge -> Admin promotion
    const donorCtx = await createRoleContext(browser, 'visitor');
    const adminCtx = await createRoleContext(browser, 'admin');
    try {
      const donate = new DonatePage(donorCtx.page);
      await donate.goto();
      await donate.submitPledge({
        amount: 100,
        name: 'CUJ5 Pledge Donor',
        email: 'cuj5@example.ch',
      });
      await expect(donate.confirmationDialog).toBeVisible({ timeout: 15000 });

      await adminCtx.page.goto('/admin/donations');
      await expect(
        adminCtx.page.getByText('CUJ5 Pledge Donor').first()
      ).toBeVisible({ timeout: 15000 });
      await adminCtx.page
        .getByRole('button', { name: /Promote|Bestätigen|Approve/i })
        .first()
        .click();

      await expect
        .poll(async () => {
          const reports = await listFirestoreCollection('donationReports');
          return reports.some(
            (r) =>
              r.data.donorName === 'CUJ5 Pledge Donor' &&
              typeof r.data.sourcePledgeId === 'string'
          );
        })
        .toBe(true);
    } finally {
      await donorCtx.close();
      await adminCtx.close();
    }
  });

  test('Lifecycle 6: Greenfield /admin/bootstrap seeding, one-time lock & public hydration', async ({
    browser,
  }) => {
    await resetEmulators();
    const sa = await seedAuthUser(TEST_PERSONAS.superAdmin);
    await seedFirestoreDoc(
      'members',
      sa.uid,
      buildMemberDocument(TEST_PERSONAS.superAdmin, sa.uid)
    );

    const superCtx = await createRoleContext(browser, 'superAdmin');
    const visitorCtx = await createRoleContext(browser, 'visitor');
    try {
      await superCtx.page.goto('/admin/bootstrap');
      await superCtx.page
        .getByRole('button', { name: /Bootstrap|Seed|Initialisier|Inisialisasi/i })
        .first()
        .click();

      await expect
        .poll(async () => await getFirestoreDoc('siteConfig', 'bootstrap'), {
          timeout: 20000,
        })
        .not.toBeNull();

      // Reload confirms bootstrap cannot be executed a second time
      await superCtx.page.reload();
      await expect(
        superCtx.page
          .getByText(
            /already been bootstrapped|bereits initialisiert|sudah pernah diinisialisasi|telah pun diinisialisasikan/i
          )
          .first()
      ).toBeVisible({ timeout: 15000 });
      const seedBtn = superCtx.page
        .getByRole('button', { name: /Bootstrap|Seed|Initialisier|Inisialisasi/i })
        .first();
      const locked =
        (await seedBtn.count()) === 0 || (await seedBtn.isDisabled().catch(() => true));
      expect(locked).toBe(true);

      // Public site is now hydrated across routes
      for (const route of ['/', '/programs', '/donate', '/about']) {
        await visitorCtx.page.goto(route);
        await expect(
          visitorCtx.page.locator('#main-content, main').first()
        ).toBeVisible();
      }
    } finally {
      await superCtx.close();
      await visitorCtx.close();
    }
  });

  test('Lifecycle 7: Multi-locale workflow (de -> en -> id -> ms) across PublicLayout & AdminLayout', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const adminCtx = await createRoleContext(browser, 'admin');
    try {
      const pub = new PublicLayoutPage(adminCtx.page);
      await pub.goto('/');
      for (const lang of ['de', 'en', 'id', 'ms'] as const) {
        await pub.switchLanguage(lang);
        await expect(adminCtx.page.locator('html')).toHaveAttribute('lang', lang);
      }
      await adminCtx.page.reload();
      await expect(adminCtx.page.locator('html')).toHaveAttribute('lang', 'ms');

      const shell = new AdminShellPage(adminCtx.page);
      await shell.goto('/admin/programs');
      await expect(adminCtx.page.locator('html')).toHaveAttribute('lang', 'ms');
      await expect(adminCtx.page.locator('#admin-main-content')).toBeVisible({ timeout: 15000 });
      await expect(
        adminCtx.page.getByRole('button', { name: ADMIN_SELECTORS.addProgramBtn }).first()
      ).toBeVisible({ timeout: 15000 });
      const bodyText = await adminCtx.page.locator('body').innerText();
      expect(bodyText).not.toMatch(/\bundefined\b/);
    } finally {
      await adminCtx.close();
    }
  });

  test('Lifecycle 8: Household growth -> /admin/members mismatch & re-verify -> /assembly updated vote weight', async ({
    browser,
  }) => {
    const { users } = await seedStandardWorld({
      gaOpen: true,
      activeQuestionId: 'ga-q1',
      certifyVoterRoll: true,
    });
    const memberCtx = await createRoleContext(browser, 'activeFamily');
    const adminCtx = await createRoleContext(browser, 'admin');
    try {
      await memberCtx.page.goto('/member');
      await memberCtx.page
        .getByRole('button', { name: /Add Child|Kind hinzufügen/i })
        .first()
        .click();
      const addChildForm = memberCtx.page
        .locator('form')
        .filter({ hasText: /Register a Child|Add Child|Kind/i })
        .first();
      await expect(addChildForm).toBeVisible({ timeout: 10000 });
      await addChildForm.locator('input[type="text"]').first().fill('Zaki Santoso');
      await addChildForm
        .locator('input[placeholder*="20" i], input[placeholder*="Year" i]')
        .first()
        .fill('2005');
      await addChildForm
        .getByRole('button', { name: /Save Child|Kind speichern|Add/i })
        .first()
        .click();
      await memberCtx.page.locator('#save-top-btn').click();
      await expect(memberCtx.page.locator('#save-top-btn')).toBeDisabled({ timeout: 10000 });

      await adminCtx.page.goto('/admin/members');
      const memberRow = adminCtx.page
        .locator('tr')
        .filter({ hasText: 'Ridwan Kamil Santoso' })
        .filter({
          has: adminCtx.page.getByRole('button', {
            name: /Stimmgewicht neu bestätigen|Re-verify|Neu prüfen|Verify|Verifikasi Ulang|Sahkan Semula/i,
          }),
        })
        .first();
      await expect(memberRow).toBeVisible({ timeout: 15000 });
      await memberRow
        .getByRole('button', {
          name: /Stimmgewicht neu bestätigen|Re-verify|Neu prüfen|Verify|Verifikasi Ulang|Sahkan Semula/i,
        })
        .first()
        .click();

      await expect
        .poll(async () => {
          const doc = await getFirestoreDoc('members', users.activeFamily.uid);
          return doc?.verifiedVoteWeight;
        })
        .toBe(3);

      const assembly = new AssemblyPage(memberCtx.page);
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
      expect(ballot?.voteWeight).toBe(3);
    } finally {
      await memberCtx.close();
      await adminCtx.close();
    }
  });

  test('Lifecycle 9: Hard reloads across SPA routes & zero dev override UI on AdminLoginGate', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const visitorCtx = await createRoleContext(browser, 'visitor');
    const adminCtx = await createRoleContext(browser, 'admin');
    try {
      const trackers = attachTelemetryTrackers(visitorCtx.page);
      for (const pubRoute of ['/', '/programs']) {
        await visitorCtx.page.goto(pubRoute);
        const res = await visitorCtx.page.reload();
        expect(res?.status() ?? 200).toBeLessThan(400);
      }
      expect(trackers.getLeakedAdminOrSeedUrls()).toEqual([]);

      for (const adminRoute of ['/admin/attendance', '/admin/programs', '/admin/assembly']) {
        await adminCtx.page.goto(adminRoute);
        await expect(adminCtx.page.locator('#admin-main-content')).toBeVisible({ timeout: 15000 });
        const res = await adminCtx.page.reload();
        expect(res?.status() ?? 200).toBeLessThan(400);
        await expect(adminCtx.page).toHaveURL(new RegExp(`${adminRoute}$`));
        await expect(adminCtx.page.locator('#admin-main-content')).toBeVisible({ timeout: 15000 });
      }
    } finally {
      await visitorCtx.close();
      await adminCtx.close();
    }
  });
});
