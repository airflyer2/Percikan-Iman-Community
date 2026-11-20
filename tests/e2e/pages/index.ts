import { expect, type Locator, type Page } from '@playwright/test';

export const LOCALE_REGEX = {
  homeNav: /Startseite|Home|Beranda|Laman Utama/i,
  programsNav: /Programme|Programs|Program/i,
  donateNav: /Spenden|Donate|Donasi|Derma/i,
  aboutNav: /Über uns|About Us|Tentang Kami|Mengenai Kami/i,
  contactNav: /Kontakt|Contact|Kontak|Hubungi Kami/i,
  loginNav: /Anmelden|Log In|Masuk|Log Masuk/i,
  logoutNav: /Abmelden|Log Out|Sign Out|Keluar|Log Keluar/i,
  adminNav: /Verwaltung|Admin|Administrasi|Pentadbiran/i,
  returnToPublic: /Return to Public Site|Zurück zur Website|Zurück zur öffentlichen Seite|Kembali ke Situs Publik|Kembali ke Laman Awam/i,
  accessDenied: /Access Denied|Zugriff verweigert|Akses Ditolak|Akses Dinafikan/i,
  pledgePending: /pending|Prüfung|Verifizierung|menunggu|pengesahan/i,
  adminToggleForbidden:
    /Admin:\s*(ON|OFF|EIN|AUS|AKTIF)|Admin[- ]?(Modus|Mode)|Mode Admin|Pentadbir:\s*(AKTIF|TIDAK AKTIF)|Mod Pentadbir/i,
};

export const ADMIN_SELECTORS = {
  addProgramBtn: /Add New Program|New Program|Neues Programm|Add Program/i,
  programTitleInput:
    '[role="dialog"] input[name="title"], [role="dialog"] input[placeholder*="Majelis" i], [role="dialog"] input[placeholder*="Titel" i], [role="dialog"] input[placeholder*="Title" i]',
  saveProgramBtn: /Publish Program|Save Changes|Speichern/i,
  addEventBtn: /New Event|Neues Event|Add Event/i,
  eventTitleInput:
    '[role="dialog"] input[name="title"], [role="dialog"] input[placeholder*="Kajian" i], [role="dialog"] input[placeholder*="Title" i], [role="dialog"] input[placeholder*="Titel" i]',
  saveEventBtn: /Publish Event|Save Event Changes|Create Event|Save Changes|Speichern/i,
  addCampaignBtn: /Add Campaign|New Campaign|Neue Kampagne/i,
  campaignTitleInput:
    '[role="dialog"] input[name="title"], [role="dialog"] input[placeholder*="NTT Emergency" i], [role="dialog"] input[placeholder*="Title" i], [role="dialog"] input[placeholder*="Titel" i]',
  saveCampaignBtn: /Save Campaign|Edit Fundraising Campaign|Publish Campaign|Save Changes|Speichern/i,
  addBoardBtn: /Add Board Member|Add Board|Neues Vorstandsmitglied/i,
  boardNameInput:
    '[role="dialog"] input[name="name"], [role="dialog"] input[placeholder*="Amiruddin" i], [role="dialog"] input[placeholder*="Name" i]',
  boardRoleInput:
    '[role="dialog"] input[name="role"], [role="dialog"] input[placeholder*="Executive Director" i], [role="dialog"] input[placeholder*="Role" i]',
  saveBoardBtn: /Publish Board Member|Save Changes|Speichern/i,
  noticeBadgeInput:
    'input[name="badge"], input[placeholder*="URGENT RELIEF" i]',
  noticeMessageInput:
    'input[name="message"], textarea[name="message"], input[placeholder*="Emergency Appeal" i]',
  saveNoticeBtn: /Save Banner Settings|Save Notice|Hinweis speichern/i,
};

export function activeDialog(page: Page): Locator {
  return page.locator('[role="dialog"]').first();
}

export async function fillPhotoUploadUrl(
  scope: Page | Locator,
  url: string
): Promise<void> {
  const urlInput = scope.locator('input[type="url"]').first();
  if (!(await urlInput.isVisible().catch(() => false))) {
    const toggleBtn = scope
      .getByRole('button', {
        name: /Paste external image URL instead|Externe.*URL/i,
      })
      .first();
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });
    await toggleBtn.click();
  }
  await expect(urlInput).toBeVisible({ timeout: 5000 });
  await urlInput.fill(url);
  const applyBtn = scope
    .getByRole('button', { name: /Apply URL|URL übernehmen/i })
    .first();
  if (await applyBtn.isVisible().catch(() => false)) {
    await applyBtn.click();
  }
}

export class PublicLayoutPage {
  readonly page: Page;
  readonly primaryNav: Locator;
  readonly mainContent: Locator;
  readonly footer: Locator;
  readonly languageSelectorTrigger: Locator;
  readonly siteNoticeBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.primaryNav = page.locator('header nav[aria-label="Primary"], header nav').first();
    this.mainContent = page.locator('#main-content, main').first();
    this.footer = page.locator('footer').first();
    this.languageSelectorTrigger = page
      .locator('[aria-label="Language selector"]')
      .first();
    this.siteNoticeBanner = page
      .locator(
        '[data-testid="site-notice"], [role="region"][aria-label*="Notice" i], [role="status"], div:has(> div > div > span:has(svg.lucide-megaphone))'
      )
      .first();
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
    await this.mainContent.waitFor({ state: 'visible', timeout: 15000 });
  }

  async switchLanguage(code: 'de' | 'en' | 'id' | 'ms'): Promise<void> {
    const labelMap: Record<typeof code, RegExp> = {
      de: /Deutsch|German/i,
      en: /English/i,
      id: /Bahasa Indonesia|Indonesian/i,
      ms: /Bahasa Melayu|Malay/i,
    };

    if (await this.languageSelectorTrigger.isVisible().catch(() => false)) {
      await this.languageSelectorTrigger.click();
      const dropdownContainer = this.languageSelectorTrigger.locator('..');
      const optionButton = dropdownContainer
        .locator('div.absolute button, [role="menuitem"], ul button')
        .filter({ hasText: labelMap[code] })
        .first();
      await expect(optionButton).toBeVisible({ timeout: 5000 });
      await optionButton.click();
    } else {
      await this.footer
        .getByRole('button', { name: new RegExp(`^${code}$`, 'i') })
        .first()
        .click();
    }

    await expect(this.page.locator('html')).toHaveAttribute('lang', code);
  }

  async getHtmlLang(): Promise<string> {
    return (await this.page.locator('html').getAttribute('lang')) || '';
  }

  async assertNoPublicAdminClutter(): Promise<void> {
    await expect(
      this.page.getByText(LOCALE_REGEX.adminToggleForbidden)
    ).toHaveCount(0);
    await expect(
      this.page.getByText(/Role Testing Mode|Evaluate Test Profiles|Voter Persona Sandbox/i)
    ).toHaveCount(0);
    await expect(
      this.page.getByRole('button', { name: /Switch User|Als Mitglied testen/i })
    ).toHaveCount(0);
    await expect(
      this.primaryNav.getByRole('button', { name: /^\s*(Admin|Verwaltung|QR Scanner|Board Admin)\s*$/i })
    ).toHaveCount(0);
    await expect(
      this.primaryNav.getByRole('link', { name: /^\s*(Admin|Verwaltung|QR Scanner|Board Admin)\s*$/i })
    ).toHaveCount(0);
  }
}

export class AdminShellPage {
  readonly page: Page;
  readonly nav: Locator;
  readonly returnToPublicLink: Locator;
  readonly signOutButton: Locator;
  readonly roleBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nav = page.locator('aside nav, header nav, nav[aria-label*="Admin" i]').first();
    this.returnToPublicLink = page
      .locator('a[href="/"]')
      .filter({ hasText: LOCALE_REGEX.returnToPublic })
      .or(page.locator('a[href="/"]').first())
      .first();
    this.signOutButton = page
      .getByRole('button', { name: LOCALE_REGEX.logoutNav })
      .first();
    this.roleBadge = page
      .locator('[data-testid="admin-role-badge"], .admin-role-badge')
      .first();
  }

  async goto(subpath = '/admin'): Promise<void> {
    await this.page.goto(subpath);
  }

  tabLink(tab: 'programs' | 'events' | 'content' | 'board' | 'donations' | 'members' | 'attendance' | 'assembly' | 'bootstrap'): Locator {
    return this.page.locator(`a[href="/admin/${tab}"]`).first();
  }

  async navigateToTab(
    tab: 'programs' | 'events' | 'content' | 'board' | 'donations' | 'members' | 'attendance' | 'assembly' | 'bootstrap'
  ): Promise<void> {
    await this.tabLink(tab).click();
    await expect(this.page).toHaveURL(new RegExp(`/admin/${tab}$`));
  }

  async assertAccessDenied(): Promise<void> {
    await expect(
      this.page.getByText(LOCALE_REGEX.accessDenied).first()
    ).toBeVisible();
    await expect(this.page.locator('a[href="/"]').first()).toBeVisible();
  }

  async assertAdminLoginGateVisible(): Promise<void> {
    await expect(
      this.page
        .locator('#admin_login_identifier, #login_identifier, input[type="email"]')
        .first()
    ).toBeVisible();
    await expect(
      this.page.getByRole('button', { name: /Become a Member|Mitglied werden/i })
    ).toHaveCount(0);
  }
}

export class DonatePage {
  readonly page: Page;
  readonly destinationSelect: Locator;
  readonly customAmountInput: Locator;
  readonly donorNameInput: Locator;
  readonly donorEmailInput: Locator;
  readonly submitButton: Locator;
  readonly confirmationDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.destinationSelect = page.locator('#form-destination-dropdown');
    this.customAmountInput = page.locator('#custom-chf-amount');
    this.donorNameInput = page.locator('#donor-full-name');
    this.donorEmailInput = page.locator('#donor-email');
    this.submitButton = page.locator('form button[type="submit"]').first();
    this.confirmationDialog = page.locator('[role="dialog"]').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/donate');
    await this.destinationSelect.waitFor({ state: 'visible', timeout: 15000 });
  }

  presetButton(amount: 25 | 50 | 100 | 250): Locator {
    return this.page
      .getByRole('group', { name: /Preset donation amounts/i })
      .getByRole('button', { name: new RegExp(`^\\s*CHF\\s*${amount}\\s*$`, 'i') });
  }

  async submitPledge(params: {
    amount: 25 | 50 | 100 | 250 | number;
    name: string;
    email: string;
    destination?: string;
  }): Promise<void> {
    if (params.destination) {
      await this.destinationSelect.selectOption({ label: params.destination });
    }
    if (
      params.amount === 25 ||
      params.amount === 50 ||
      params.amount === 100 ||
      params.amount === 250
    ) {
      await this.presetButton(params.amount).click();
    } else {
      await this.customAmountInput.fill(String(params.amount));
    }
    await this.donorNameInput.fill(params.name);
    await this.donorEmailInput.fill(params.email);
    await this.submitButton.click();
  }
}

export class AssemblyPage {
  readonly page: Page;
  readonly motionsTab: Locator;
  readonly inquiriesTab: Locator;
  readonly rulesTab: Locator;
  readonly askQuestionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.motionsTab = page
      .getByRole('button', {
        name: /Assembly Voting Motions|Abstimmungsanträge|Mosi Pemungutan Suara|Usul Pengundian/i,
      })
      .first();
    this.inquiriesTab = page
      .getByRole('button', {
        name: /Questions to the Board|Fragen an den Vorstand|Pertanyaan ke Pengurus|Soalan kepada Jawatankuasa/i,
      })
      .first();
    this.rulesTab = page
      .getByRole('button', {
        name: /Statutory Rules|Statuten|Peraturan Statuta|Peraturan Statut/i,
      })
      .first();
    this.askQuestionButton = page
      .getByRole('button', {
        name: /Ask Question to Board|Frage an den Vorstand|Ajukan Pertanyaan|Tanya Soalan/i,
      })
      .first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/assembly');
  }

  castBallotButton(): Locator {
    return this.page
      .getByRole('button', {
        name: /Cast Ballot|Stimme abgeben|Beri Suara|Berikan Undi/i,
      })
      .first();
  }

  async castVote(optionLabelRegex: RegExp): Promise<void> {
    await this.castBallotButton().click();
    const dialog = this.page
      .locator('[role="dialog"], div.fixed.inset-0 > div.bg-white')
      .first();
    await dialog.waitFor({ state: 'visible' });
    await dialog
      .locator('label')
      .filter({ hasText: optionLabelRegex })
      .first()
      .click();
    const certCheckbox = dialog.locator('input[type="checkbox"]').first();
    if (await certCheckbox.isVisible().catch(() => false)) {
      await certCheckbox.check();
    }
    await dialog
      .getByRole('button', {
        name: /Submit.*Weighted Votes|Confirm|Abstimmen|Stimmen abgeben|Kirim.*Suara|Hantar.*Undi/i,
      })
      .first()
      .click();
    await expect(
      this.page
        .getByText(
          /Ballot Successfully Recorded|Stimme erfolgreich|Suara Berhasil|Undi Berjaya/i
        )
        .first()
    ).toBeVisible({ timeout: 15000 });
  }

  async assertNoModerationControls(): Promise<void> {
    await expect(
      this.page.getByRole('button', {
        name: /Pose Question to Assembly|Raise to Floor|Close Vote on Motion|Answer Question|Convert to Assembly Vote|Re-open Floor Vote|Antrag stellen|Auf die Tagesordnung|Abstimmung schliessen|Frage beantworten|In Antrag umwandeln|Ajukan Mosi|Tutup Pemungutan|Buka Lantai|Jawab Pertanyaan|Konversi ke Mosi|Kemuka Usul|Tutup Undian/i,
      })
    ).toHaveCount(0);
    await expect(
      this.page.getByText(
        /Voter Persona Sandbox|Super Admin Parliamentary Session|Super Admin Parlamentssitzung/i
      )
    ).toHaveCount(0);
  }
}

export class AttendanceScannerPage {
  readonly page: Page;
  readonly eventSelect: Locator;
  readonly startCameraButton: Locator;
  readonly stopCameraButton: Locator;
  readonly manualInput: Locator;
  readonly manualSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.eventSelect = page.locator('select').first();
    this.startCameraButton = page
      .getByRole('button', { name: /Kamera starten|Start Camera/i })
      .first();
    this.stopCameraButton = page
      .getByRole('button', { name: /Kamera stoppen|Stop Camera/i })
      .first();
    this.manualInput = page
      .locator(
        'input[placeholder*="PI-FAM" i], input[placeholder*="PI-7740" i], input[placeholder*="PI-2026" i], input[placeholder*="Mitgliedsnummer" i], input[placeholder*="memberCode" i]'
      )
      .first();
    this.manualSubmitButton = page
      .getByRole('button', { name: /Einchecken|Check In/i })
      .first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/attendance');
    await this.manualInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  async submitManualCode(codeOrJson: string): Promise<void> {
    await this.manualInput.fill(codeOrJson);
    await this.manualSubmitButton.click();
  }

  doorSettlementButton(): Locator {
    return this.page
      .getByRole('button', { name: /bar erhalten &\s*(?:jetzt\s+)?einchecken|Settle Cash/i })
      .first();
  }
}

export class MemberPortalPage {
  readonly page: Page;
  readonly root: Locator;
  readonly qrCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('#member-profile-view, main').first();
    this.qrCard = page.locator('#digital-membership-card, [data-testid="digital-membership-card"]').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/member');
    await this.root.waitFor({ state: 'visible', timeout: 15000 });
  }
}
