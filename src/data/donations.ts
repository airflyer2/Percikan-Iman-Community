import { ContributionDestination, DonationReport } from '../types';

export const INITIAL_DESTINATIONS: ContributionDestination[] = [
  {
    id: 'verein-infaq',
    name: 'INFAQ & Vereinsbetrieb (Percikan Iman Schweiz)',
    shortLabel: 'INFAQ & Vereinsbetrieb',
    category: 'Vereinsbetrieb & Da\'wah',
    description: 'Direkte Unterstützung für die monatlichen Pengajians, Raummieten in Volketswil, Baar und Stadel, Bildungsveranstaltungen und Vereinsverwaltung gemäss Statuten Art. 3.',
    totalCollected: 6546
  },
  {
    id: 'zakat-fitrah-maal',
    name: 'Zakat Fitrah & Zakat Maal',
    shortLabel: 'Zakat Fitrah & Maal',
    category: 'Religiöse Pflichtabgaben',
    description: '100%ige zweckgebundene Auszahlung an bedürftige Familien, Waisen und Asnaf gemäss den Bestimmungen des islamischen Rechts (2025: CHF 5\'370 geleistet).',
    totalCollected: 5370
  },
  {
    id: 'qurban-project',
    name: 'Qurban Spende (Opfertiere)',
    shortLabel: 'Qurban Spende',
    category: 'Religiöse Opfertiere',
    description: 'Finanzierung von Schafen und Rindern zur Verteilung an arme Familien während des Eid al-Adha (2025: 15 Schafe für CHF 2\'775).',
    totalCollected: 2775
  },
  {
    id: 'sharing-caring-ramadan',
    name: 'Sharing is Caring – Ramadan Iftar & Waisenhilfe',
    shortLabel: 'Sharing is Caring',
    category: 'Ramadan Nothilfe',
    description: 'Freitags-Iftar Mahlzeitboxen für Bedürftige und Spenden an Waisenhäuser. Im letzten Ramadan: 795 Mahlzeitboxen inkl. Getränke finanziert.',
    totalCollected: 1186
  },
  {
    id: 'sumatera-disaster-relief',
    name: 'Katastrophenhilfe «Sumatera is Calling»',
    shortLabel: 'Sumatera is Calling',
    category: 'Nothilfe & Katastrophenschutz',
    description: 'Akute Notfall- und Wiederaufbauhilfe für Betroffene von Naturkatastrophen und Überschwemmungen in Sumatra und Indonesien.',
    totalCollected: 4500
  },
  {
    id: 'familienlager-unterstuetzung',
    name: 'Solidaritätsbeitrag Familienlager (Lörrach 2026)',
    shortLabel: 'Solidarität Familienlager',
    category: 'Gemeinschaft & Familie',
    description: 'Zuschüsse für einkommensschwächere Familien und Kinder zur Teilnahme am jährlichen VPI-Familienlager.',
    totalCollected: 2400
  },
  {
    id: 'trauerhilfe-fonds',
    name: 'Trauerfall-Hilfe für Mitglieder (Art. 6015)',
    shortLabel: 'Trauerfall-Hilfe',
    category: 'Soziale Fürsorge',
    description: 'Solidarische Soforthilfe für Hinterbliebene von Vereinsmitgliedern und deren Familien in schwierigen Lebenslagen.',
    totalCollected: 1200
  }
];

export const INITIAL_DONATION_REPORTS: DonationReport[] = [
  {
    id: 'VPI-2025-01',
    donorName: 'Br. Muharronif & Familie',
    email: 'info@percikaniman.ch',
    amount: 500,
    currency: 'CHF',
    destination: 'INFAQ & Vereinsbetrieb (Percikan Iman Schweiz)',
    date: '2026-05-02 14:15',
    paymentMethod: 'PostFinance Banküberweisung (IBAN CH89...)',
    status: 'Completed',
    notes: 'Zweckgebundener Infaq für Raummiete Volketswil'
  },
  {
    id: 'VPI-2025-02',
    donorName: 'Sr. Safira Ramadanthy',
    email: 'safira@percikaniman.ch',
    amount: 300,
    currency: 'CHF',
    destination: 'Sharing is Caring – Ramadan Iftar & Waisenhilfe',
    date: '2026-04-18 10:30',
    paymentMethod: 'TWINT / Banküberweisung',
    status: 'Completed',
    notes: 'Iftar-Boxen für Bedürftige'
  },
  {
    id: 'VPI-2025-03',
    donorName: 'Br. Michael Stumpp',
    email: 'michi@percikaniman.ch',
    amount: 1000,
    currency: 'CHF',
    destination: 'Zakat Fitrah & Zakat Maal',
    date: '2026-03-28 17:45',
    paymentMethod: 'PostFinance Banküberweisung',
    status: 'Completed',
    notes: 'Zakat Maal 2026'
  },
  {
    id: 'VPI-2025-04',
    donorName: 'Br. Giancarlo Maraffio',
    email: 'carlo@percikaniman.ch',
    amount: 250,
    currency: 'CHF',
    destination: 'Solidaritätsbeitrag Familienlager (Lörrach 2026)',
    date: '2026-03-15 11:20',
    paymentMethod: 'PostFinance',
    status: 'Completed',
    notes: 'Teilnehmer-Unterstützung Jugend'
  },
  {
    id: 'VPI-2025-05',
    donorName: 'Keluarga Bäch (Sr. Lisda & Sr. Dian Frey)',
    email: 'info@percikaniman.ch',
    amount: 400,
    currency: 'CHF',
    destination: 'INFAQ & Vereinsbetrieb (Percikan Iman Schweiz)',
    date: '2026-02-10 16:00',
    paymentMethod: 'Banküberweisung',
    status: 'Completed',
    notes: 'Vorbereitung Monatliches Pengajian Bäch'
  }
];
