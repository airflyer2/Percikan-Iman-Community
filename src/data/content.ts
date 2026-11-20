import { Program, Campaign } from '../types';

export {
  LOGO_URL,
  DONATION_HERO_IMAGE,
  AUTH_HERO_IMAGE,
  MEMBER_AVATARS,
} from '../constants/assets';

export const PROGRAMS_DATA: Program[] = [
  {
    id: 'monatliche-pengajian',
    title: 'Monatliches Pengajian (Ta\'lim Schweiz)',
    category: 'Religious',
    tag: 'Zentrales Programm',
    iconName: 'volunteer_activism',
    description: 'Regelmässige monatliche Treffen in Schweizer Zentren (Volketswil, Baar, Stadel, Bäch, St. Gallen). Fokus: «Back to Qur\'an – Sura Al-Baqara», religiöse Wissensvertiefung und Gemeinschaft.',
    imageUrl: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=80&w=800',
    dateOrSchedule: 'Monatlich an Sonntagen (11:00 – 16:00 CET)',
    location: 'Iman Zentrum Volketswil, Bilal Moschee Baar, Stadel, Bäch',
    participantsCount: '77 Familien & 49 Einzelmitglieder',
    detailedOverview: 'Das monatliche Pengajian ist das Herzstück des Vereins Percikan Iman in der Schweiz. Familien und Einzelpersonen kommen zusammen, um theologische Vorträge zu hören, die Sura Al-Baqara zu studieren und den Zusammenhalt der südostasiatischen Diaspora in der Schweiz zu stärken.'
  },
  {
    id: 'quran-kinder-muslimah',
    title: 'Quran Tilawah & Iqra (Kinder & Muslimah)',
    category: 'Youth',
    tag: 'Wöchentlich',
    iconName: 'school',
    description: 'Strukturiertes Unterrichtsprogramm für Kinder und Jugendliche: Iqra, Quran-Rezitation und Auswendiglernen unter liebevoller Leitung erfahrener Lehrerinnen.',
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=800',
    dateOrSchedule: 'Mittwoch & Samstag via Zoom',
    location: 'Online via Zoom',
    participantsCount: 'Team: Schwester Sri, Susan & Atik',
    detailedOverview: 'Unser engagiertes Betreuungsteam vermittelt Kindern und Jugendlichen spielerisch und fundiert die Grundlagen der arabischen Schrift (Iqra), die richtige Aussprache (Makharij) und die Rezitation der Suren des Heiligen Korans.'
  },
  {
    id: 'quran-jugend',
    title: 'Quran Tilawah – Jugend',
    category: 'Youth',
    tag: 'Jugendförderung',
    iconName: 'groups',
    description: 'Spezifischer Korankurs für Jugendliche und Heranwachsende, geleitet von Bruder Adi. Vertiefung von Tajwid und gegenseitiger Austausch.',
    imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800',
    dateOrSchedule: 'Jeden Mittwochabend',
    location: 'Online via Zoom (Anmeldung bei Sr. Lusi)',
    participantsCount: 'Leitung: Bruder Adi',
    detailedOverview: 'Der Jugend-Koranunterricht richtet sich an Teenager und junge Erwachsene. Er kombiniert Koran-Tilawah mit Diskussionsrunden über islamische Ethik und das Aufwachsen in der Schweizer Gesellschaft.'
  },
  {
    id: 'muslimah-tahsin',
    title: 'Kelas Online Tahsin & My Quran Journey (Muslimah)',
    category: 'Religious',
    tag: 'Frauenprogramm',
    iconName: 'auto_stories',
    description: 'Online-Tahsin-Kurse für Schwestern sowie die lockere Gesprächsreihe «My Quran Journey» für gegenseitige Motivation und spirituelles Wachstum.',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800',
    dateOrSchedule: '1x wöchentlich (Mo, Di, Do, Sa, So flexible Zeiten)',
    location: 'Online via Zoom (Kontakt: Lusi +49 176 960 67 999)',
    participantsCount: 'Mehrere Kleingruppen',
    detailedOverview: 'Flexible Online-Lernzeiten für Berufstätige und Mütter. Erlernen des flüssigen Lesens mit Tajwid-Regeln in vertrauensvoller Atmosphäre unter Gleichgesinnten.'
  },
  {
    id: 'familienlager-vpi',
    title: 'Familienlager VPI (Family Camp)',
    category: 'Social Impact',
    tag: 'Jahreshöhepunkt',
    iconName: 'diversity_3',
    description: 'Grosses jährliches Gemeinschaftswochenende (2026 in DJH Lörrach; 2025 in Überlingen). 60 Teilnehmer geniessen Natur, Sport, Vorträge und Freundschaft.',
    imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800',
    dateOrSchedule: '10.–11. Oktober 2026',
    location: 'DJH Hellmut-Waßmer-Hostel Lörrach (Deutschland)',
    participantsCount: '60 Plätze (Erwachsene & Kinder)',
    detailedOverview: 'Das VPI-Familienlager stärkt den Zusammenhalt über alle Altersstufen hinweg. Mit gemeinsamen Gebeten, Lagerfeuer, Outdoor-Spielen und Workshops für Eltern und Kinder ist es der beliebteste Fixpunkt im Vereinsjahr.'
  },
  {
    id: 'mualaf-programm',
    title: 'Begleitung für Mualaf (Neue Muslime)',
    category: 'Religious',
    tag: 'Begleitung & Bildung',
    iconName: 'psychology',
    description: 'Einfühlsame Unterstützung und individuelle Begleitung für Neumuslime: Arabische Schrift, Grundlagen des Gebets und Verständnis der islamischen Werte.',
    imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800',
    dateOrSchedule: 'Individuell nach Absprache (Online & Persönlich)',
    location: 'Online & Begegnungstreffen',
    participantsCount: 'Laufend',
    detailedOverview: 'Der VPI steht neuen Musliminnen und Muslimen als offene Gemeinschaft zur Seite. Neben spirituellem Mentoring bieten wir praktische Hilfe beim Erlernen des rituellen Gebets und der Koranrezitation.'
  },
  {
    id: 'jugend-outdoor',
    title: 'Jugend Outdoor & Daytrips',
    category: 'Youth',
    tag: 'Outdoor & Sport',
    iconName: 'hiking',
    description: 'Naturerlebnisse, Wandertage und Team-Building-Events für Jugendliche in den Schweizer Bergen und Wäldern mit Brandon Egger und David Schneiter.',
    imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800',
    dateOrSchedule: 'Regelmässige Ausflüge (Nächster Daytrip: Juni 2026)',
    location: 'Schweizer Wandergebiete & Seenlandschaften',
    participantsCount: 'Leitung: Br. Brandon & Br. David',
    detailedOverview: 'Sport und gesunde Naturerfahrung im Team. Die Jugendlichen entdecken die Schweizer Natur, lernen Eigenverantwortung und knüpfen dauerhafte Freundschaften.'
  },
  {
    id: 'ramadan-charity',
    title: 'Ramadan, Zakat & Humanitäre Aktionen',
    category: 'Social Impact',
    tag: 'Solidarität & Hilfe',
    iconName: 'favorite',
    description: 'Kultum, Iftar-Spenden («Sharing is Caring»), Zakat Fitrah & Maal (2025: CHF 5\'370), Qurban (15 Schafe: CHF 2\'775) sowie Nothilfe wie «Sumatera is Calling».',
    imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800',
    dateOrSchedule: 'Ganzjährig & intensiv im Ramadan',
    location: 'Schweiz, Indonesien & Partnerregionen',
    participantsCount: 'Über 795 Iftar-Boxen & Hilfsprojekte',
    detailedOverview: 'Transparente Sammlung und Weiterleitung von Pflicht- und Freiwilligenabgaben. Im Jahr 2025 wurden über 795 Mahlzeitboxen verteilt, Waisenhausspenden getätigt und Notleidende in Sumatra und Ost-Nusa Tenggara direkt unterstützt.'
  }
];

export const CAMPAIGNS_DATA: Campaign[] = [
  {
    id: 'vpi-infaq-verein',
    title: 'INFAQ & Vereinsbetrieb (Percikan Iman Schweiz)',
    description: 'Zweckgebundene Spenden zur Finanzierung von Raummieten (Volketswil, Baar, Stadel), Referentenhonoraren, Bildungsmaterialien und Vereinskommunikation gemäss Art. 3 der Statuten.',
    progressPercent: 87,
    currentAmount: 6546,
    goalAmount: 7500,
    isCritical: true,
    tag: 'VEREINSBETRIEB',
    iconName: 'account_balance',
    beneficiaries: 'VPI Gemeinschaft Schweiz'
  },
  {
    id: 'zakat-fitrah-maal',
    title: 'Zakat Fitrah & Zakat Maal 2026',
    description: 'Offizielle Zakat-Verwaltung des Vereins Percikan Iman. 100%ige Weiterleitung an anspruchsberechtigte Asnaf, Waisen und Bedürftige. (2025 gesammelt: CHF 5\'370).',
    progressPercent: 72,
    currentAmount: 5370,
    goalAmount: 7500,
    isCritical: true,
    tag: 'OBLIGATORISCHE ZAKAT',
    iconName: 'volunteer_activism',
    beneficiaries: 'Bedürftige & Waisen'
  },
  {
    id: 'qurban-project',
    title: 'Qurban Kampagne (Opfertiere für Bedürftige)',
    description: 'Gemeinschaftlicher Qurban zur Unterstützung armer Familien in abgelegenen Regionen Indonesiens. 2025 wurden 15 Schafe (CHF 2\'775) erfolgreich geschächtet und verteilt.',
    progressPercent: 92,
    currentAmount: 2775,
    goalAmount: 3000,
    isCritical: false,
    tag: 'QURBAN',
    iconName: 'pets',
    beneficiaries: 'Bedürftige Dörfer'
  },
  {
    id: 'sharing-is-caring-ramadan',
    title: 'Sharing is Caring – Ramadan Iftar Boxen',
    description: 'Freitägliche Mahlzeitboxen für Fastende und Bedürftige. Im letzten Ramadan wurden 795 Mahlzeitboxen inkl. Getränke sowie Waisenunterstützung finanziert.',
    progressPercent: 100,
    currentAmount: 1186,
    goalAmount: 1000,
    isCritical: false,
    tag: 'RAMADAN HILFE',
    iconName: 'restaurant',
    beneficiaries: '795+ Bedürftige & Waisen'
  }
];

export const OTHER_PROJECTS: Campaign[] = [
  {
    id: 'proj-ramadan-berbagi',
    title: 'Ramadan Berbagi & Iftar Boxen',
    description: 'Verteilung von Iftar-Mahlzeiten und Lebensmittelpaketen an Bedürftige und Waisen während des heiligen Monats Ramadan.',
    progressPercent: 100,
    currentAmount: 1186,
    goalAmount: 1000,
    isCritical: false,
    tag: 'RAMADAN',
    iconName: 'restaurant',
    beneficiaries: '795+ Fastende & Bedürftige'
  },
  {
    id: 'proj-trauerspenden-solidaritaet',
    title: 'Trauerspenden & Todesfall-Fonds',
    description: 'Gegenseitige Solidarität und Beistand bei Todesfällen von Mitgliedern oder Angehörigen gemäss Beschluss der Vereinsversammlung.',
    progressPercent: 85,
    currentAmount: 600,
    goalAmount: 1000,
    isCritical: false,
    tag: 'SOLIDARITÄT',
    iconName: 'health_and_safety',
    beneficiaries: 'Hinterbliebene Familien'
  },
  {
    id: 'proj-familienlager-zuschuss',
    title: 'Familienlager 2026 Unterstützung',
    description: 'Subventionierung von Reise- und Übernachtungskosten für kinderreiche Familien und Studierende beim Jahreslager in Lörrach.',
    progressPercent: 60,
    currentAmount: 1800,
    goalAmount: 3000,
    isCritical: false,
    tag: 'JUGEND & FAMILIE',
    iconName: 'groups',
    beneficiaries: 'Familien & Jugendliche VPI'
  },
  {
    id: 'proj-quran-druck-unterricht',
    title: 'Unterrichtsmaterialien & Quran-Iqra',
    description: 'Beschaffung von Lehrmitteln, Tajwid-Büchern und Iqra-Heften für den Unterricht der Kinder- und Jugendklassen.',
    progressPercent: 75,
    currentAmount: 950,
    goalAmount: 1200,
    isCritical: false,
    tag: 'BILDUNG',
    iconName: 'auto_stories',
    beneficiaries: 'Schüler & Jugendklassen'
  }
];
