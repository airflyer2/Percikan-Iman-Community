import { BoardMember } from '../types';

export const INITIAL_BOARD_MEMBERS: BoardMember[] = [
  {
    id: 'board-pres-ch',
    name: 'Bruder Muharronif (Ronif)',
    role: 'Präsident des Vereins (President)',
    department: 'Executive Leadership',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    bio: 'Präsident des Vereins Percikan Iman gemäss Statuten. Leitung der Vereinsgeschäfte, Außenvertretung und Vorsitz der ordentlichen Vereinsversammlung.',
    email: 'info@percikaniman.ch',
    order: 1
  },
  {
    id: 'board-vp-ch',
    name: 'Bruder Michael Stumpp (Michi)',
    role: 'Vizepräsident & Protokollführer',
    department: 'Executive Leadership',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    bio: 'Vizepräsident und Protokollführer des VPI. Verantwortlich für Mitgliederverwaltung, Statutenkonformität und rechtliche Vertretung nach Schweizer Vereinsrecht (Art. 60–79 ZGB).',
    email: 'info@percikaniman.ch',
    order: 2
  },
  {
    id: 'board-treasurer-ch',
    name: 'Bruder Giancarlo Maraffio (Carlo)',
    role: 'Kassier & Buchhalter (Treasurer)',
    department: 'Finance & Compliance',
    imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&auto=format&fit=crop&q=80',
    bio: 'Verantwortlich für die ordnungsgemässe Buchführung, Jahresrechnung, Bilanz- und Erfolgsrechnung sowie die Budgetplanung des Vereins.',
    email: 'info@percikaniman.ch',
    order: 3
  },
  {
    id: 'board-sec-ch',
    name: 'Schwester Lusiana (Lusi)',
    role: 'Protokollführerin & Vorstand',
    department: 'Executive Leadership',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80',
    bio: 'Protokollführerin und Vorstandsmitglied. Koordiniert Vereinsversammlungen, das Muslima-Programm (Tahsin) sowie die Anmeldung für Jugend- und Kinder-Quranunterricht.',
    email: 'info@percikaniman.ch',
    order: 4
  },
  {
    id: 'board-brandon-ch',
    name: 'Bruder Brandon Egger',
    role: 'Vorstand (Jugend & Outdoor)',
    department: 'Education & Youth',
    imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80',
    bio: 'Vorstandsmitglied mit Fokus auf Jugendförderung, Outdoor-Aktivitäten, Tagesausflüge und die Organisation des jährlichen Familienlagers.',
    email: 'info@percikaniman.ch',
    order: 5
  },
  {
    id: 'board-lily-ch',
    name: 'Schwester Lily Ahmad (Suherlina)',
    role: 'Vorstand (Programme & Pengajian)',
    department: 'Education & Youth',
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&auto=format&fit=crop&q=80',
    bio: 'Leitet die Programmplanung für die monatlichen Pengajians in den Schweizer Kantonen (Volketswil, Baar, Stadel, St. Gallen) und Bildungsangebote.',
    email: 'info@percikaniman.ch',
    order: 6
  },
  {
    id: 'board-david-ch',
    name: 'Bruder David Schneiter',
    role: 'Vorstand (Jugend & Outdoor)',
    department: 'Education & Youth',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    bio: 'Verantwortlich für Jugendprogramme, Sportevents, Daytrips und interkulturelle Outdoor-Initiativen für Jugendliche.',
    email: 'info@percikaniman.ch',
    order: 7
  },
  {
    id: 'board-fikri-ch',
    name: 'Bruder Fikri',
    role: 'Vorstand (Digital & Medien)',
    department: 'Digital & Media',
    imageUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80',
    bio: 'Vorstandsmitglied für Digitalisierung, Webpräsenz, Medienkommunikation und technische Unterstützung der Online-Vorträge.',
    email: 'info@percikaniman.ch',
    order: 8
  },
  {
    id: 'board-fatema-ch',
    name: 'Schwester Fatema',
    role: 'Vorstandsmitglied',
    department: 'Social Impact & Relief',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
    bio: 'Engagiert in Gemeinschaftsprojekten, Unterstützung für Neumitglieder und Mualaf-Begleitungsinitiativen.',
    email: 'info@percikaniman.ch',
    order: 9
  },
  {
    id: 'board-safira-ch',
    name: 'Schwester Safira Ramadanthy',
    role: 'Vorstandsmitglied (Events & Organisation)',
    department: 'Executive Leadership',
    imageUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&auto=format&fit=crop&q=80',
    bio: 'Wohnhaft in Zürich. MSc in Business Engineering (Supply Chain) der Universität Antwerpen; Master Production Planner bei Johnson & Johnson Innovative Medicine Schaffhausen. Koordinatorin für Grossanlässe und Gastvorträge.',
    email: 'info@percikaniman.ch',
    order: 10
  },
  {
    id: 'board-founder',
    name: 'Dr. H. Aam Amiruddin, M.Si',
    role: 'Founder & Spiritual Advisor',
    department: 'Advisory Council',
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80',
    bio: 'Renommierter islamischer Gelehrter, Buchautor und geistlicher Mentor. Gründer der Percikan Iman Bewegung für praktische Glaubensbildung, Familienharmonie und interkulturellen Dialog.',
    email: 'info@percikaniman.ch',
    order: 11
  },
  {
    id: 'board-revisoren',
    name: 'Oky Tedjasukmana & Ahsan Sarwar',
    role: 'Unabhängige Revisoren (Auditors)',
    department: 'Finance & Compliance',
    imageUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=500&auto=format&fit=crop&q=80',
    bio: 'Gewählte Revisoren gemäss Art. 10 der Statuten. Prüfer der Jahresrechnung, Bankkonten und Belege des VPI mit uneingeschränktem Prüfungsurteil und Décharge-Empfehlung.',
    email: 'info@percikaniman.ch',
    order: 12
  }
];

export { BOARD_DEPARTMENTS } from '../constants/board';
export { PRESET_BOARD_AVATARS } from '../constants/assets';
