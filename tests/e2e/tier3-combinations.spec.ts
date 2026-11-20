import { expect, test } from '@playwright/test';
import { createRoleContext, signInViaAdminGate } from './fixtures/auth';
import {
  buildMemberDocument,
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
  PublicLayoutPage,
} from './pages';

test.describe('Tier 3 — Pairwise Cross-Feature Combinations (18 tests)', () => {
  test('C01 [F1+F10+F11]: /admin/programs creation propagates live via onSnapshot to second context on /programs', async ({
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
      const dialog = adminCtx.page.locator('[role="dialog"]').first();
      await dialog.waitFor({ state: 'visible' });
      await adminCtx.page
        .locator(ADMIN_SELECTORS.programTitleInput)
        .first()
        .fill('Live Sync Winter Academy');
      const descInput = dialog.locator('textarea').first();
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill('Live synced program description.');
      }
      await dialog
        .getByRole('button', { name: ADMIN_SELECTORS.saveProgramBtn })
        .first()
        .click();

      await expect(
        visitorCtx.page.getByText('Live Sync Winter Academy').first()
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await adminCtx.close();
      await visitorCtx.close();
    }
  });

  test('C02 [F10+F11]: /admin/events creation propagates live to visitor context on /', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const adminCtx = await createRoleContext(browser, 'admin');
    const visitorCtx = await createRoleContext(browser, 'visitor');
    try {
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
      const dialog = adminCtx.page.locator('[role="dialog"]').first();
      await dialog.waitFor({ state: 'visible' });
      await adminCtx.page
        .locator(ADMIN_SELECTORS.eventTitleInput)
        .first()
        .fill('Zürich Autumn Iftar Live');
      const dateInput = dialog.locator('input[type="date"]').first();
      if (await dateInput.isVisible().catch(() => false)) {
        await dateInput.fill('2026-10-18');
      }
      const timeInput = dialog
        .locator('input[name="time"], input[placeholder*="18:00" i], input[placeholder*="08:30" i]')
        .first();
      if (await timeInput.isVisible().catch(() => false)) {
        await timeInput.fill('18:00 - 21:00');
      }
      const locInput = dialog
        .locator('input[name="location"], input[placeholder*="Zürich" i], input[placeholder*="Location" i]')
        .first();
      if (await locInput.isVisible().catch(() => false)) {
        await locInput.fill('Zürich-Stadelhofen');
      }
      const descInput = dialog.locator('textarea').first();
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill('Live synced autumn iftar gathering.');
      }
      await dialog
        .getByRole('button', { name: ADMIN_SELECTORS.saveEventBtn })
        .first()
        .click();

      await expect(
        visitorCtx.page.getByText('Zürich Autumn Iftar Live').first()
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await adminCtx.close();
      await visitorCtx.close();
    }
  });

  test('C03 [F10+F11+F18]: /admin/content SiteNotice update propagates live across PublicLayout', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const adminCtx = await createRoleContext(browser, 'admin');
    const visitorCtx = await createRoleContext(browser, 'visitor');
    try {
      await visitorCtx.page.goto('/programs');
      await adminCtx.page.goto('/admin/content');
      const badgeInput = adminCtx.page
        .locator(ADMIN_SELECTORS.noticeBadgeInput)
        .first();
      await expect(badgeInput).toBeVisible({ timeout: 15000 });
      await expect(badgeInput).toHaveValue('Generalversammlung 2026', {
        timeout: 15000,
      });
      await badgeInput.fill('Dringender Saalwechsel Zürich');
      const messageInput = adminCtx.page
        .locator(ADMIN_SELECTORS.noticeMessageInput)
        .first();
      await expect(messageInput).toBeVisible({ timeout: 5000 });
      await messageInput.fill('Bitte beachten Sie den neuen Raum in Zürich.');
      await adminCtx.page
        .getByRole('button', { name: ADMIN_SELECTORS.saveNoticeBtn })
        .first()
        .click();
      await expect(
        visitorCtx.page.getByText('Dringender Saalwechsel Zürich').first()
      ).toBeVisible({ timeout: 15000 });
      await expect(
        visitorCtx.page
          .getByText('Bitte beachten Sie den neuen Raum in Zürich.')
          .first()
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await adminCtx.close();
      await visitorCtx.close();
    }
  });

  test('C04 [F6+F11]: canManageBoard updates /admin/board and /about reflects change in second session', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const boardCtx = await createRoleContext(browser, 'canManageBoard');
    const visitorCtx = await createRoleContext(browser, 'visitor');
    try {
      await visitorCtx.page.goto('/about');
      await boardCtx.page.goto('/admin/board');
      await boardCtx.page
        .getByRole('button', { name: ADMIN_SELECTORS.addBoardBtn })
        .first()
        .click();
      const dialog = boardCtx.page.locator('[role="dialog"]').first();
      await dialog.waitFor({ state: 'visible' });
      await boardCtx.page
        .locator(ADMIN_SELECTORS.boardNameInput)
        .first()
        .fill('Prof. Tariq Ramadan-Sync');
      await boardCtx.page
        .locator(ADMIN_SELECTORS.boardRoleInput)
        .first()
        .fill('Advisory Chair');
      await dialog
        .locator('textarea')
        .first()
        .fill('Advisory chair supporting Swiss community dialogue.');
      await dialog
        .getByRole('button', { name: ADMIN_SELECTORS.saveBoardBtn })
        .first()
        .click();

      await expect(
        visitorCtx.page.getByText('Prof. Tariq Ramadan-Sync').first()
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await boardCtx.close();
      await visitorCtx.close();
    }
  });

  test('C05 [F8+F12]: public /donate pledge -> /admin/donations batch promotion -> /donationReports ledger', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const visitorCtx = await createRoleContext(browser, 'visitor');
    const adminCtx = await createRoleContext(browser, 'admin');
    try {
      const donate = new DonatePage(visitorCtx.page);
      await donate.goto();
      await donate.submitPledge({
        amount: 250,
        name: 'Pairwise Donor CHF250',
        email: 'pairwise@example.ch',
      });
      await expect(donate.confirmationDialog).toBeVisible({ timeout: 15000 });

      await adminCtx.page.goto('/admin/donations');
      await expect(
        adminCtx.page.getByText('Pairwise Donor CHF250').first()
      ).toBeVisible({ timeout: 15000 });
      await adminCtx.page
        .getByRole('button', { name: /Promote|Bestätigen|Approve/i })
        .first()
        .click();

      await expect
        .poll(async () => {
          const reports = await listFirestoreCollection('donationReports');
          return reports.some(
            (r) => r.data.donorName === 'Pairwise Donor CHF250' && r.data.amount === 250
          );
        })
        .toBe(true);
    } finally {
      await visitorCtx.close();
      await adminCtx.close();
    }
  });

  test('C06 [F11+F12]: /admin/donations destination addition updates /donate dropdown live', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const adminCtx = await createRoleContext(browser, 'admin');
    const visitorCtx = await createRoleContext(browser, 'visitor');
    try {
      await visitorCtx.page.goto('/donate');
      await adminCtx.page.goto('/admin/donations');
      await adminCtx.page
        .locator('main, h1, h2')
        .first()
        .waitFor({ state: 'visible', timeout: 15000 });
      const addDestBtn = adminCtx.page
        .getByRole('button', { name: /Add Destination|Ziel hinzufügen/i })
        .first();
      if (!(await addDestBtn.isVisible().catch(() => false))) {
        await adminCtx.page.goto('/admin/content');
        await adminCtx.page
          .locator('main, h1, h2')
          .first()
          .waitFor({ state: 'visible', timeout: 15000 });
      }
      await expect(addDestBtn).toBeVisible({ timeout: 15000 });
      await addDestBtn.click();
      const dialog = adminCtx.page.locator('[role="dialog"]').first();
      await dialog.waitFor({ state: 'visible' });
      await dialog
        .locator(
          'input[name="name"], input[placeholder*="Sumatra" i], input[placeholder*="Destination" i], input[type="text"]'
        )
        .first()
        .fill('Stipendienfonds 2027');
      const shortLabelInput = dialog
        .locator('input[name="shortLabel"], input[placeholder*="Short" i]')
        .first();
      if (await shortLabelInput.isVisible().catch(() => false)) {
        await shortLabelInput.fill('Stipendien 2027');
      }
      const descInput = dialog.locator('textarea').first();
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill('Neue Destination für Bildungsstipendien.');
      }
      await dialog
        .getByRole('button', { name: /Add Destination|Save|Create/i })
        .first()
        .click();
      await expect(visitorCtx.page.locator('#form-destination-dropdown')).toContainText(
        'Stipendienfonds 2027',
        { timeout: 15000 }
      );
    } finally {
      await adminCtx.close();
      await visitorCtx.close();
    }
  });

  test('C07 [F5+F13+F14]: /admin/attendance door cash settlement updates member /member portal live', async ({
    browser,
  }) => {
    const { users } = await seedStandardWorld();
    const scannerCtx = await createRoleContext(browser, 'canScanQR');
    const memberCtx = await createRoleContext(browser, 'pendingPayment');
    try {
      await memberCtx.page.goto('/member');
      await expect(
        memberCtx.page.getByText(/Pending Fee Payment/i).first()
      ).toBeVisible({ timeout: 15000 });
      const scanner = new AttendanceScannerPage(scannerCtx.page);
      await scanner.goto();
      await scanner.submitManualCode('PI-9552');
      await expect(scanner.doorSettlementButton()).toBeVisible({ timeout: 15000 });
      await scanner.doorSettlementButton().click();

      await expect(
        memberCtx.page.getByText(/Active Member|Aktives Mitglied|Anggota Aktif|Ahli Aktif/i).first()
      ).toBeVisible({ timeout: 15000 });
      await expect(
        memberCtx.page.getByText(/Pending Fee Payment/i)
      ).toHaveCount(0);
      await expect
        .poll(async () => {
          const doc = await getFirestoreDoc('members', users.pendingPayment.uid);
          return {
            membershipStatus: doc?.membershipStatus,
            paymentStatus: doc?.paymentStatus,
          };
        })
        .toEqual({ membershipStatus: 'active', paymentStatus: 'paid' });
    } finally {
      await scannerCtx.close();
      await memberCtx.close();
    }
  });

  test('C08 [F2+F4+F14]: hard reload on /admin/attendance preserves scanner chunk and completes check-in', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const scannerCtx = await createRoleContext(browser, 'canScanQR');
    try {
      const scanner = new AttendanceScannerPage(scannerCtx.page);
      await scanner.goto();
      await scannerCtx.page.reload();
      await expect(scanner.manualInput).toBeVisible({ timeout: 15000 });
      await scanner.submitManualCode('PI-STU-8821');
      await expect
        .poll(async () => {
          const att = await listFirestoreCollection('attendance');
          return att.some((a) => a.data.memberCode === 'PI-STU-8821');
        })
        .toBe(true);
    } finally {
      await scannerCtx.close();
    }
  });

  test('C09 [F15+F16]: /admin/assembly Certify Voter Roll unlocks voting for previously uncertified member', async ({
    browser,
  }) => {
    await seedStandardWorld({
      certifyVoterRoll: false,
      gaOpen: true,
      activeQuestionId: 'ga-q1',
    });
    const adminCtx = await createRoleContext(browser, 'admin');
    const memberCtx = await createRoleContext(browser, 'activeFamily');
    try {
      const assembly = new AssemblyPage(memberCtx.page);
      await assembly.goto();

      await adminCtx.page.goto('/admin/assembly');
      await adminCtx.page
        .getByRole('button', { name: /Certify Voter Roll|Wählerverzeichnis/i })
        .first()
        .click();

      await expect(assembly.castBallotButton()).toBeEnabled({ timeout: 15000 });
      await assembly.castVote(/Ja|Yes/i);
    } finally {
      await adminCtx.close();
      await memberCtx.close();
    }
  });

  test('C10 [F15+F16]: /admin/assembly raising ga-q2 on_floor updates /assembly live and accepts votes', async ({
    browser,
  }) => {
    const { users } = await seedStandardWorld({
      certifyVoterRoll: true,
      gaOpen: true,
      activeQuestionId: 'ga-q1',
    });
    const adminCtx = await createRoleContext(browser, 'admin');
    const memberCtx = await createRoleContext(browser, 'activePersonal');
    try {
      const assembly = new AssemblyPage(memberCtx.page);
      await assembly.goto();

      await adminCtx.page.goto('/admin/assembly');
      const q2Card = adminCtx.page.locator('[data-testid="assembly-motion-card-ga-q2"]');
      await expect(q2Card).toBeVisible({ timeout: 15000 });
      await q2Card
        .getByRole('button', { name: /Raise to Floor|Auf die Tagesordnung/i })
        .first()
        .click();

      await expect
        .poll(async () => (await getFirestoreDoc('assemblyQuestions', 'ga-q2'))?.status)
        .toBe('on_floor');
      await expect(
        memberCtx.page.getByText('Statutenänderung Art. 8 Digitaler Einlass').first()
      ).toBeVisible({ timeout: 15000 });
      await assembly.castVote(/Ja|Yes/i);
      await expect
        .poll(
          async () =>
            await getFirestoreDoc(
              'assemblyQuestions/ga-q2/ballots',
              users.activePersonal.uid
            ),
          { timeout: 15000 }
        )
        .not.toBeNull();
      const ballot = await getFirestoreDoc(
        'assemblyQuestions/ga-q2/ballots',
        users.activePersonal.uid
      );
      expect(ballot?.voteWeight).toBe(1);
    } finally {
      await adminCtx.close();
      await memberCtx.close();
    }
  });

  test('C11 [F15+F16]: /admin/assembly closing motion locks voting on /assembly and freezes finalResults', async ({
    browser,
  }) => {
    await seedStandardWorld({
      certifyVoterRoll: true,
      gaOpen: true,
      activeQuestionId: 'ga-q1',
    });
    const adminCtx = await createRoleContext(browser, 'admin');
    const memberCtx = await createRoleContext(browser, 'activeFamily');
    try {
      const assembly = new AssemblyPage(memberCtx.page);
      await assembly.goto();
      await assembly.castVote(/Ja|Yes/i);

      await adminCtx.page.goto('/admin/assembly');
      await adminCtx.page
        .getByRole('button', { name: /Close Vote|Abstimmung schliessen/i })
        .first()
        .click();

      await expect
        .poll(async () => {
          const q1 = await getFirestoreDoc('assemblyQuestions', 'ga-q1');
          const fr = q1?.finalResults as Record<string, unknown> | undefined;
          return q1?.status === 'closed' && fr?.totalWeight === 2 && fr?.totalBallots === 1;
        })
        .toBe(true);
      await expect(assembly.castBallotButton()).toHaveCount(0);
    } finally {
      await adminCtx.close();
      await memberCtx.close();
    }
  });

  test('C12 [F15+F16]: member inquiry on /assembly is answered & escalated in /admin/assembly', async ({
    browser,
  }) => {
    await seedStandardWorld({ gaOpen: true, activeQuestionId: 'ga-q1' });
    const memberCtx = await createRoleContext(browser, 'activeFamily');
    const adminCtx = await createRoleContext(browser, 'admin');
    try {
      const assembly = new AssemblyPage(memberCtx.page);
      await assembly.goto();
      await assembly.inquiriesTab.click();
      await assembly.askQuestionButton.click();
      const dialog = memberCtx.page
        .locator('[role="dialog"], div.fixed.inset-0 > div.bg-white')
        .first();
      await dialog.locator('input[type="text"]').first().fill('Parkplatz Stadelhofen');
      await dialog.locator('textarea').first().fill('Gibt es reservierte Plätze?');
      await dialog.getByRole('button', { name: /Submit|Senden/i }).first().click();

      await adminCtx.page.goto('/admin/assembly');
      const inquiryCard = adminCtx.page
        .locator('div')
        .filter({ hasText: 'Parkplatz Stadelhofen' })
        .filter({
          has: adminCtx.page.getByRole('button', {
            name: /Answer Question|Frage beantworten|Answer/i,
          }),
        })
        .first();
      await expect(inquiryCard).toBeVisible({ timeout: 15000 });
      await inquiryCard
        .getByRole('button', { name: /Answer Question|Frage beantworten|Answer/i })
        .first()
        .click();
      const answerDialog = adminCtx.page
        .locator('[role="dialog"], div.fixed.inset-0 > div.bg-white')
        .first();
      await answerDialog
        .locator('textarea')
        .first()
        .fill('Ja, 10 Parkplätze im Parkhaus Hohe Promenade sind reserviert.');
      await answerDialog
        .getByRole('button', {
          name: /Publish Board Reply|Publish|Reply|Send|Submit|Save|Antwort|Senden/i,
        })
        .first()
        .click();

      await expect
        .poll(async () => {
          const inqs = await listFirestoreCollection('boardInquiries');
          const match = inqs.find((i) => i.data.title === 'Parkplatz Stadelhofen');
          return match?.data.status === 'answered';
        })
        .toBe(true);

      const escalateCard = adminCtx.page
        .locator('div')
        .filter({ hasText: 'Parkplatz Stadelhofen' })
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
          const match = inqs.find((i) => i.data.title === 'Parkplatz Stadelhofen');
          return typeof match?.data.convertedToQuestionId === 'string';
        })
        .toBe(true);
    } finally {
      await memberCtx.close();
      await adminCtx.close();
    }
  });

  test('C13 [F13+F15+F16]: household growth on /member triggers mismatch badge in /admin/members and re-verify updates voteWeight', async ({
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
      await addChildForm.locator('input[type="text"]').first().fill('Damar Santoso');
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
    } finally {
      await memberCtx.close();
      await adminCtx.close();
    }
  });

  test('C14 [F5+F6+F13]: superAdmin role delegation in /admin/members unlocks /admin/attendance live for member', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const superCtx = await createRoleContext(browser, 'superAdmin');
    const memberCtx = await createRoleContext(browser, 'activePersonal');
    try {
      await memberCtx.page.goto('/member');
      await superCtx.page.goto('/admin/members');
      const targetRow = superCtx.page
        .locator('tr')
        .filter({ hasText: 'Bambang Sudirman' })
        .first();
      await expect(targetRow).toBeVisible({ timeout: 15000 });
      await targetRow
        .getByRole('button', { name: /^QR\s*[+✓]/i })
        .first()
        .click();
      await expect(
        memberCtx.page.getByText(/QR Scanner|Launch Live QR Scanner/i).first()
      ).toBeVisible({ timeout: 15000 });
      await memberCtx.page.goto('/admin/attendance');
      await expect(memberCtx.page).toHaveURL(/\/admin\/attendance$/);
    } finally {
      await superCtx.close();
      await memberCtx.close();
    }
  });

  test('C15 [F1+F6+F18]: unauthenticated deep-link /admin/donations in en locale preserves path across AdminLoginGate', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      window.localStorage.setItem('percikan_iman_language', 'en');
    });
    const page = await ctx.newPage();
    try {
      await signInViaAdminGate(
        page,
        '/admin/donations',
        TEST_PERSONAS.admin.email,
        TEST_PERSONAS.admin.password
      );
      await expect(page).toHaveURL(/\/admin\/donations$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    } finally {
      await ctx.close();
    }
  });

  test('C16 [F1+F10+F17]: /admin/bootstrap on empty Firestore hydrates public /, /programs, /donate, /about', async ({
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

      await visitorCtx.page.goto('/programs');
      await expect(
        visitorCtx.page.getByText(/Pengajian/i).first()
      ).toBeVisible({ timeout: 15000 });
      await visitorCtx.page.goto('/about');
      await expect(
        visitorCtx.page.getByText(/Amiruddin/i).first()
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await superCtx.close();
      await visitorCtx.close();
    }
  });

  test('C17 [F9+F10+F11]: rejected javascript: URL followed by valid https: URL saves and renders cleanly on /programs', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const adminCtx = await createRoleContext(browser, 'admin');
    try {
      await adminCtx.page.goto('/admin/programs');
      await adminCtx.page
        .getByRole('button', { name: ADMIN_SELECTORS.addProgramBtn })
        .first()
        .click();
      const dialog = adminCtx.page.locator('[role="dialog"]').first();
      await dialog.waitFor({ state: 'visible' });
      await adminCtx.page
        .locator(ADMIN_SELECTORS.programTitleInput)
        .first()
        .fill('Recovered Safe Program');
      const descInput = dialog.locator('textarea').first();
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill('Recovered program after URL validation fix.');
      }
      await fillPhotoUploadUrl(dialog, 'javascript:alert(1)');
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
      expect(
        (await listFirestoreCollection('programs')).some(
          (p) => p.data.title === 'Recovered Safe Program'
        )
      ).toBe(false);

      await fillPhotoUploadUrl(
        dialog,
        'https://images.unsplash.com/photo-1585036156171-384164a8c675'
      );
      await dialog
        .getByRole('button', { name: ADMIN_SELECTORS.saveProgramBtn })
        .first()
        .click();
      await expect(dialog).toBeHidden({ timeout: 15000 });
      await expect(
        adminCtx.page.getByText('Recovered Safe Program').first()
      ).toBeVisible({ timeout: 15000 });
      await expect
        .poll(
          async () =>
            (await listFirestoreCollection('programs')).some(
              (p) =>
                p.data.title === 'Recovered Safe Program' &&
                p.data.imageUrl ===
                  'https://images.unsplash.com/photo-1585036156171-384164a8c675'
            ),
          { timeout: 15000 }
        )
        .toBe(true);
      await adminCtx.page.goto('/programs');
      await expect(
        adminCtx.page.getByText('Recovered Safe Program').first()
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await adminCtx.close();
    }
  });

  test('C18 [F1+F3+F4]: Return to Public Site from AdminLayout transitions to decluttered PublicLayout', async ({
    browser,
  }) => {
    await seedStandardWorld();
    const adminCtx = await createRoleContext(browser, 'admin');
    try {
      const shell = new AdminShellPage(adminCtx.page);
      await shell.goto('/admin/programs');
      await shell.returnToPublicLink.click();
      await expect(adminCtx.page).toHaveURL(/\/$/);
      const pub = new PublicLayoutPage(adminCtx.page);
      await pub.assertNoPublicAdminClutter();
    } finally {
      await adminCtx.close();
    }
  });
});
