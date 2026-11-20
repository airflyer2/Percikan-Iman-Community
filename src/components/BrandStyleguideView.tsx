import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Heart,
  Instagram,
  Landmark,
  Layers,
  MessageCircle,
  Palette,
  QrCode,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Type as TypeIcon
} from 'lucide-react';
import { NavScreen } from '../types';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../data/gallery';

interface BrandStyleguideViewProps {
  onNavigate?: (screen: NavScreen) => void;
}

type SurfaceKey = 'greige' | 'stone' | 'slate' | 'cobalt';
type MotifThemeKey = 'greige' | 'ice' | 'slate';
type TrackFilter = 'dual' | 'de' | 'id';

interface SurfaceSpec {
  id: SurfaceKey;
  label: string;
  hex: string;
  bgClass: string;
  textClass: string;
  mutedClass: string;
  borderClass: string;
  recommendedAssetIds: string[];
}

interface BrandSvgAsset {
  id: string;
  file: string;
  titleDe: string;
  titleId: string;
  spec: string;
  usage: string;
  isSquare?: boolean;
}

interface MotifAsset {
  id: string;
  file: string;
  titleDe: string;
  titleId: string;
  dimensions: string;
  anatomyNote: string;
  usageNote: string;
}

interface ColorToken {
  name: string;
  roleDe: string;
  roleId: string;
  hex: string;
  cssVar: string;
  contrastLabel: string;
  group: 'greige' | 'blue' | 'teak';
  isDarkSurface?: boolean;
}

interface IgGridPost {
  index: string;
  slug: string;
  titleDe: string;
  titleId: string;
  archetype: string;
  captionFormula: string;
  theme: 'cobalt' | 'photo-recap' | 'greige-editorial' | 'kids' | 'wegweiser' | 'muslimah' | 'ramadan-teak' | 'familienlager' | 'donation-qr';
  tag: string;
  headlineDe: string;
  subtitleId: string;
  meta: string;
  palette: string[];
}

interface ChecklistItem {
  id: string;
  titleDe: string;
  detailId: string;
}

const SURFACES: SurfaceSpec[] = [
  {
    id: 'greige',
    label: 'Limestone Greige #EAE6DF',
    hex: '#EAE6DF',
    bgClass: 'bg-[#EAE6DF]',
    textClass: 'text-[#132435]',
    mutedClass: 'text-[#4A5E72]',
    borderClass: 'border-[#D5CFC4]',
    recommendedAssetIds: ['logo-primary', 'logo-duotone-civic', 'logo-monochrome-ink', 'emblem-mark', 'emblem-avatar-ig']
  },
  {
    id: 'stone',
    label: 'Warm Stone #F4F2ED',
    hex: '#F4F2ED',
    bgClass: 'bg-[#F4F2ED]',
    textClass: 'text-[#132435]',
    mutedClass: 'text-[#4A5E72]',
    borderClass: 'border-[#D5CFC4]',
    recommendedAssetIds: ['logo-primary', 'logo-duotone-civic', 'logo-monochrome-ink', 'emblem-mark', 'emblem-avatar-ig']
  },
  {
    id: 'slate',
    label: 'Deep Slate-Blue #132435',
    hex: '#132435',
    bgClass: 'bg-[#132435]',
    textClass: 'text-white',
    mutedClass: 'text-[#9CC4E4]',
    borderClass: 'border-[#243B52]',
    recommendedAssetIds: ['logo-reverse-white', 'emblem-avatar-ig']
  },
  {
    id: 'cobalt',
    label: 'Percikan Cobalt #1D5B8C',
    hex: '#1D5B8C',
    bgClass: 'bg-[#1D5B8C]',
    textClass: 'text-white',
    mutedClass: 'text-[#DFE8F0]',
    borderClass: 'border-[#15466E]',
    recommendedAssetIds: ['logo-reverse-white', 'emblem-avatar-ig']
  }
];

const BRAND_SVG_ASSETS: BrandSvgAsset[] = [
  {
    id: 'logo-primary',
    file: '/brand/logo-primary.svg',
    titleDe: 'Primärlogo (Cobalt & Steel)',
    titleId: 'Logo Utama Horizontal v2',
    spec: 'viewBox 245 236 745 196 · #1D5B8C / #5B7E9E / #132435',
    usage: 'Briefköpfe, Website-Header, Broschüren und Dokumente auf Limestone Greige (#EAE6DF) oder Warm Stone (#F4F2ED).'
  },
  {
    id: 'logo-duotone-civic',
    file: '/brand/logo-duotone-civic.svg',
    titleDe: 'Cobalt & Roasted Teak Duotone',
    titleId: 'Varian Dwitona Cobalt & Jati',
    spec: 'Flat Vector · #1D5B8C + #8C5327 + #132435',
    usage: 'Feiertags-Flyer, Wegweiser-Titelseiten, Einladungen und zweifarbige Drucksachen mit warmem Braun-Akzent.'
  },
  {
    id: 'logo-monochrome-ink',
    file: '/brand/logo-monochrome-ink.svg',
    titleDe: 'Monochrom Slate-Blue Ink (#132435)',
    titleId: 'Monokrom Tinta Biru Gelap',
    spec: 'Flat Vector · 1-farbiger Druck',
    usage: 'Stempel, behördliche Schreiben, Schwarz-Weiss-Kopien und Swiss QR-Rechnungen.'
  },
  {
    id: 'logo-reverse-white',
    file: '/brand/logo-reverse-white.svg',
    titleDe: 'Negativ-Logo (#FFFFFF / #9CC4E4)',
    titleId: 'Logo Terbalik Latar Gelap',
    spec: 'Für #132435 & #1D5B8C Hintergründe',
    usage: 'Foto-Overlays im PPI-Stil, dunkle Event-Recap-Kacheln und Bühnenbanner.'
  },
  {
    id: 'emblem-mark',
    file: '/brand/emblem-mark.svg',
    titleDe: 'Facetten-Emblem (Signet)',
    titleId: 'Simbol Api Geometris',
    spec: 'viewBox 820 238 172 192 · Standalone',
    usage: 'Favicons, Wasserzeichen, Highlight-Icons und Ausgangsgeometrie der «Anatomy of the Spark»-Motive.'
  },
  {
    id: 'emblem-avatar-ig',
    file: '/brand/emblem-avatar-ig.svg',
    titleDe: 'Instagram Profil-Badge (@verein.pi)',
    titleId: 'Lencana Avatar Lingkaran v2',
    spec: '1080×1080 px · Greige/Ivory-Kreis & Teak-Punkte',
    usage: 'Profilbild für Instagram @verein.pi, WhatsApp-Community und YouTube.',
    isSquare: true
  }
];

const MOTIF_ASSETS: MotifAsset[] = [
  {
    id: 'motif-corner-stamp',
    file: '/brand/motif-corner-stamp.svg',
    titleDe: 'Corner Registration Stamp',
    titleId: 'Stempel Sudut Presisi',
    dimensions: '160×160 px · 45° Viertel-Kawung',
    anatomyNote: 'Leitet den 45°-Facettenwinkel direkt aus dem Signet ab, kombiniert mit Schweizer + Fadenkreuz und Teak-Punkt.',
    usageNote: 'In oberen oder unteren 64px-Sicherheitsrändern von Flyern und Slides verankern.'
  },
  {
    id: 'motif-kawung-divider',
    file: '/brand/motif-kawung-divider.svg',
    titleDe: 'Kawung-Facet Chapter Divider',
    titleId: 'Pembatas Bab Kawung',
    dimensions: '720×48 px · 1px Linie + 8-Punkt-Stern',
    anatomyNote: 'Dreifache Nusantara-Raute mit zentralem Roasted-Teak-Diamanten zwischen präzisen Schweizer Haarlinien.',
    usageNote: 'Trennt DE-Titelstrukturen von ID-Begleittexten in Wegweiser-Kapiteln und Newslettern.'
  },
  {
    id: 'motif-topographic-ribbon',
    file: '/brand/motif-topographic-ribbon.svg',
    titleDe: 'Alpine Topographic Ribbon',
    titleId: 'Pita Kontur Topografi Alpen',
    dimensions: '960×160 px · 4 Höhenlinien + Wegpunkte',
    anatomyNote: 'Harmonische Schweizer Höhenkurven in #9CC4E4, #5B7E9E, #1D5B8C und #8C5327 mit Rauten-Markierungen.',
    usageNote: 'Als dezenter Fuss- oder Kopfbereich auf Hero-Karten, Familienlager-Recaps und Deckblättern.'
  },
  {
    id: 'motif-teak-signpost',
    file: '/brand/motif-teak-signpost.svg',
    titleDe: 'Roasted Teak Signpost Badge',
    titleId: 'Penanda Arah Wegweiser Jati',
    dimensions: '280×72 px · #8C5327 Richtungsblock',
    anatomyNote: 'Schweizer Wanderweg-Plakette mit 45°-Spark-Pfeil in Crisp Ivory #FAF9F6 auf Roasted Teak #8C5327.',
    usageNote: 'Kennzeichnet Kapitel, Aktionsaufrufe, wichtige Notrufnummern und Wegweiser-Hinweise.'
  }
];

const COLOR_TOKENS: ColorToken[] = [
  // Beige-Grey Grounds & Borders (5 tokens)
  {
    name: 'Limestone Greige',
    roleDe: 'Primäre Beige-Grau-Leinwand',
    roleId: 'Kanvas utama batu kapur hangat',
    hex: '#EAE6DF',
    cssVar: '--color-canvas',
    contrastLabel: '12.6:1 vs Ink (AAA)',
    group: 'greige'
  },
  {
    name: 'Warm Stone',
    roleDe: 'Karten, Formulare & Atelier-Blätter',
    roleId: 'Permukaan kartu & panel bersih',
    hex: '#F4F2ED',
    cssVar: '--color-surface-elevated',
    contrastLabel: '14.0:1 vs Ink (AAA)',
    group: 'greige'
  },
  {
    name: 'Crisp Ivory',
    roleDe: 'Erhöhte Karten (#FFFFFF nur für QR-Zone)',
    roleId: 'Sorotan gading lembut',
    hex: '#FAF9F6',
    cssVar: '--color-surface-ivory',
    contrastLabel: '14.9:1 vs Ink (AAA)',
    group: 'greige'
  },
  {
    name: 'Recessed Greige',
    roleDe: 'Sekundäre Leisten & aktive Tabs',
    roleId: 'Latar sekunder & bilah ringkas',
    hex: '#E1DDD4',
    cssVar: '--color-surface-subtle',
    contrastLabel: '11.4:1 vs Ink (AAA)',
    group: 'greige'
  },
  {
    name: 'Pebble Border',
    roleDe: '1px Haarlinien & Schweizer Raster',
    roleId: 'Garis kisi 1px & bingkai batu',
    hex: '#D5CFC4',
    cssVar: '--color-border-stone',
    contrastLabel: 'UI Hairline 1px',
    group: 'greige'
  },
  // Blue & Undertones (7 tokens)
  {
    name: 'Slate-Blue Ink',
    roleDe: 'Primäre Typografie & dunkle Flächen',
    roleId: 'Tinta biru gelap & latar malam',
    hex: '#132435',
    cssVar: '--color-ink',
    contrastLabel: '15.2:1 auf Ivory (AAA)',
    group: 'blue',
    isDarkSurface: true
  },
  {
    name: 'Steel Muted',
    roleDe: 'Fliesstext, Untertitel & Metadaten',
    roleId: 'Teks isi & subjudul dwibahasa',
    hex: '#4A5E72',
    cssVar: '--color-ink-muted',
    contrastLabel: '6.4:1 auf Ivory (AA+)',
    group: 'blue',
    isDarkSurface: true
  },
  {
    name: 'Percikan Cobalt',
    roleDe: 'Primärer Markenakzent & CTAs',
    roleId: 'Biru kobalt utama lembaga',
    hex: '#1D5B8C',
    cssVar: '--color-cerulean',
    contrastLabel: '6.8:1 auf Ivory (AA+)',
    group: 'blue',
    isDarkSurface: true
  },
  {
    name: 'Cobalt Hover',
    roleDe: 'Aktiver Zustand & Fokus-Tiefe',
    roleId: 'Status tekan & batas interaktif',
    hex: '#15466E',
    cssVar: '--color-cerulean-hover',
    contrastLabel: '9.4:1 auf Ivory (AAA)',
    group: 'blue',
    isDarkSurface: true
  },
  {
    name: 'Steel Undertone',
    roleDe: 'Topographische Linien & Sekundärblau',
    roleId: 'Garis topografi & biru baja',
    hex: '#5B7E9E',
    cssVar: '--color-steel',
    contrastLabel: '4.1:1 Dekor / Grafik',
    group: 'blue',
    isDarkSurface: true
  },
  {
    name: 'Ice-Blue Mist',
    roleDe: 'Info-Flächen, Kinder- & Lernkarten',
    roleId: 'Latar kabut biru lembut',
    hex: '#DFE8F0',
    cssVar: '--color-cerulean-tint',
    contrastLabel: '5.5:1 vs Cobalt',
    group: 'blue'
  },
  {
    name: 'Powder Sky',
    roleDe: 'Heller Akzent nur auf #132435 / #1D5B8C',
    roleId: 'Sorotan biru langit di latar gelap',
    hex: '#9CC4E4',
    cssVar: '--color-primary-fixed-dim',
    contrastLabel: '8.7:1 auf Slate-Blue (AAA)',
    group: 'blue'
  },
  // Contrasting Brown Pop (3 tokens)
  {
    name: 'Roasted Teak',
    roleDe: 'Kontrast-Pop: Wegweiser, Ramadan & CTAs',
    roleId: 'Aksen cokelat jati hangat Nusantara',
    hex: '#8C5327',
    cssVar: '--color-teak',
    contrastLabel: '6.2:1 auf Ivory (AA+)',
    group: 'teak',
    isDarkSurface: true
  },
  {
    name: 'Teak Deep',
    roleDe: 'Tiefer Braun-Hover & Warn-Rahmen',
    roleId: 'Status tekan & aksen jati tua',
    hex: '#6F401D',
    cssVar: '--color-teak-hover',
    contrastLabel: '8.8:1 auf Ivory (AAA)',
    group: 'teak',
    isDarkSurface: true
  },
  {
    name: 'Teak Sand',
    roleDe: 'Warmer Pop-Hintergrund für Pills & Badges',
    roleId: 'Latar pasir jati lembut',
    hex: '#F3E8DF',
    cssVar: '--color-teak-tint',
    contrastLabel: '5.3:1 vs Roasted Teak',
    group: 'teak'
  }
];

const IG_HIGHLIGHTS = [
  { label: "Ta'lim", bg: 'bg-[#DFE8F0]', border: 'border-[#1D5B8C]/35', text: 'text-[#1D5B8C]', code: '01' },
  { label: 'Kids', bg: 'bg-[#FAF9F6]', border: 'border-[#D5CFC4]', text: 'text-[#132435]', code: '02' },
  { label: 'Muslimah', bg: 'bg-[#F3E8DF]', border: 'border-[#8C5327]/40', text: 'text-[#8C5327]', code: '03' },
  { label: 'Events', bg: 'bg-[#132435]', border: 'border-[#132435]', text: 'text-[#9CC4E4]', code: '04' },
  { label: 'Spenden', bg: 'bg-[#8C5327]', border: 'border-[#8C5327]', text: 'text-white', code: '05' }
];

const IG_GRID_POSTS: IgGridPost[] = [
  {
    index: '01',
    slug: 'talim-flyer',
    titleDe: "Monatliches Ta'lim Flyer",
    titleId: 'Pengajian Bulanan Swiss',
    archetype: 'Swiss Typographic Flyer (4:5)',
    captionFormula: 'Plus Jakarta Sans ExtraBold Titel auf Limestone Greige #EAE6DF + Roasted-Teak-Datumspill.',
    theme: 'cobalt',
    tag: "TA'LIM · SCHWEIZ",
    headlineDe: 'Back to Qur’an: Sura Al-Baqara',
    subtitleId: 'Kajian bulanan bersama keluarga di Iman Zentrum Volketswil & Baar.',
    meta: 'SO · 11:00–16:00 CET',
    palette: ['#EAE6DF', '#1D5B8C', '#8C5327']
  },
  {
    index: '02',
    slug: 'event-recap',
    titleDe: 'Event Photo Recap (PPI-Stil)',
    titleId: 'Dokumentasi Acara Komunitas',
    archetype: 'Bottom-Gradient Photo Overlay',
    captionFormula: 'Slate-Blue/Cobalt Verlauf unten (45%), weisse Plus-Jakarta-Headline, 64px Figma-Sicherheitsrand.',
    theme: 'photo-recap',
    tag: 'RECAP · VOLKETSWIL',
    headlineDe: '77 Familien im Dialog',
    subtitleId: 'Kehangatan silaturahmi lintas generasi komunitas Indonesia di Swiss.',
    meta: 'PI-ARCHIVE · 2026',
    palette: ['#132435', '#1D5B8C', '#9CC4E4']
  },
  {
    index: '03',
    slug: 'editorial-quote',
    titleDe: 'Groteskes Qur’an/Hadith Zitat',
    titleId: 'Kutipan Hikmah Tipografis',
    archetype: 'Architectural Quote Card',
    captionFormula: 'Limestone Greige #EAE6DF Fläche, vertikale Roasted-Teak-Linie (#8C5327), Versquelle in JetBrains Mono.',
    theme: 'greige-editorial',
    tag: 'SURA AL-BAQARA · 2:261',
    headlineDe: '«Gleichnis derer, die ihren Besitz auf dem Weg Allahs spenden...»',
    subtitleId: 'Perumpamaan infak yang menumbuhkan keberkahan berlipat ganda.',
    meta: 'AYAT & REFLEXION',
    palette: ['#EAE6DF', '#8C5327', '#132435']
  },
  {
    index: '04',
    slug: 'kinder-iqra',
    titleDe: 'Pengajian Anak / Kinder-Iqra',
    titleId: 'Pendidikan Al-Qur’an Anak',
    archetype: 'Civic Education Card',
    captionFormula: 'Ice-Blue Mist #DFE8F0 Fläche + klares Zoom-Zeitfenster + Kontaktperson in Mono.',
    theme: 'kids',
    tag: 'KINDER & JUGEND',
    headlineDe: 'Iqra & Tilawah für Kinder',
    subtitleId: 'Belajar huruf hijaiyah & tajwid bersama kakak pembina setiap Rabu & Sabtu.',
    meta: 'ZOOM · MI & SA',
    palette: ['#DFE8F0', '#1D5B8C', '#132435']
  },
  {
    index: '05',
    slug: 'percikan-wegweiser',
    titleDe: 'Percikan Wegweiser Launch',
    titleId: 'Peluncuran Buku Panduan',
    archetype: 'Figma Slides Cover Mockup',
    captionFormula: 'Deep Slate-Blue #132435 Deckcover mit Topographic Ribbon & Roasted Teak Signpost.',
    theme: 'wegweiser',
    tag: 'WEGWEISER · 10 SLIDES',
    headlineDe: 'Percikan Wegweiser',
    subtitleId: 'Panduan hidup Muslim Indonesia di Swiss: hukum lokal, keluarga & zakat.',
    meta: 'FIGMA SLIDES & PDF',
    palette: ['#132435', '#9CC4E4', '#8C5327']
  },
  {
    index: '06',
    slug: 'muslimah-offline',
    titleDe: 'Muslimah Offline Gathering',
    titleId: 'Pertemuan Muslimah Swiss',
    archetype: 'Teak Sand Soft Card',
    captionFormula: 'Teak Sand #F3E8DF Oberfläche mit #8C5327 Rahmen, warmes ID-Thema + Schweizer SBB-Hinweis.',
    theme: 'muslimah',
    tag: 'MUSLIMAH · ZÜRICH',
    headlineDe: 'My Quran Journey',
    subtitleId: 'Lingkar tadabbur & berbagi pengalaman muslimah perantauan.',
    meta: 'ANMELDUNG · SR. LUSI',
    palette: ['#F3E8DF', '#8C5327', '#132435']
  },
  {
    index: '07',
    slug: 'ramadan-eid',
    titleDe: 'Ramadan / Eid Grusskarte',
    titleId: 'Ucapan Ramadan & Idulfitri',
    archetype: 'Deep Slate & Roasted Teak Edition',
    captionFormula: 'Deep Slate-Blue #132435 + Kawung-Facet-Stern in Roasted Teak #8C5327 & Powder Sky #9CC4E4.',
    theme: 'ramadan-teak',
    tag: 'RAMADAN 1447H',
    headlineDe: 'Ramadan Mubarak · Marhaban ya Ramadan',
    subtitleId: 'Semoga keberkahan menyertai keluarga Anda di seluruh kanton Swiss.',
    meta: 'VEREIN PERCIKAN IMAN',
    palette: ['#132435', '#8C5327', '#9CC4E4']
  },
  {
    index: '08',
    slug: 'familienlager-carousel',
    titleDe: 'Familienlager Carousel Cover',
    titleId: 'Sampul Karusel Kemah Keluarga',
    archetype: 'Alpine Contour Carousel (1/6)',
    captionFormula: 'Warm Stone #F4F2ED + Topographic Ribbon + klarer Swipe-Indikator `1/6` in Teak.',
    theme: 'familienlager',
    tag: 'SWIPE 1/6 · LÖRRACH',
    headlineDe: 'Familienlager VPI 2026',
    subtitleId: '60 peserta menikmati alam perbatasan Swiss-Jerman dalam ukhuwah.',
    meta: '10.–11. OKT · DJH',
    palette: ['#F4F2ED', '#1D5B8C', '#8C5327']
  },
  {
    index: '09',
    slug: 'donation-qr-card',
    titleDe: 'Swiss QR-Rechnung & TWINT',
    titleId: 'Kartu Infaq & QR Swiss',
    archetype: 'PostFinance Donation Tile',
    captionFormula: 'Deep Slate-Blue #132435 Rahmen + #FFFFFF QR-Ruhezone + IBAN & UID CHE-382.914.820.',
    theme: 'donation-qr',
    tag: 'TRANSPARENZ · ART. 10',
    headlineDe: 'Infaq & Zakat Schweiz',
    subtitleId: 'Salurkan amanah Anda langsung ke rekening resmi PostFinance perkumpulan.',
    meta: 'CH89 0900 0000 6049 6610 7',
    palette: ['#132435', '#FFFFFF', '#8C5327']
  }
];

const FLYER_CHECKLIST: ChecklistItem[] = [
  {
    id: 'margins',
    titleDe: '64px Sicherheitsrand auf 1080×1350 Figma-Templates (24px auf Web-Karten)',
    detailId: 'Pastikan margin aman minimal 64px di keempat sisi kanvas Figma agar teks tidak terpotong di feed IG.'
  },
  {
    id: 'header',
    titleDe: 'Mikro-Absender oben links: VEREIN PERCIKAN IMAN · SCHWEIZ + Corner Stamp',
    detailId: 'Cantumkan identitas resmi perkumpulan serta cap sudut/komponen motif dari pustaka Figma.'
  },
  {
    id: 'palette',
    titleDe: 'Nur Greige (#EAE6DF), Blues (#132435/#1D5B8C/#5B7E9E) & Roasted Teak (#8C5327)',
    detailId: 'Tanpa hijau Jade, tanpa gradasi ungu/oranye pastel atau warna neon di luar palet resmi v2.'
  },
  {
    id: 'fonts',
    titleDe: 'Ausschl. 2 Non-Serif Fonts: Plus Jakarta Sans + JetBrains Mono',
    detailId: 'Zero Serif! Maksimal 3 tingkat ukuran tipografi; hindari font tulisan tangan (brush script).'
  },
  {
    id: 'bilingual',
    titleDe: 'Dual-Track DE + ID eingehalten (70% DE Struktur · 30% ID Wärme)',
    detailId: 'Judul & logistik acara berbahasa Jerman (DE), kehangatan pengantar dalam bahasa Indonesia (ID).'
  },
  {
    id: 'legal',
    titleDe: 'Spenden-Flyer: UID CHE-382.914.820 & PostFinance IBAN + #FFFFFF QR-Zone geprüft',
    detailId: 'Verifikasi nomor IBAN CH89 0900 0000 6049 6610 7 sebelum ekspor 2× PNG dari Figma.'
  }
];

const IG_BIO_TEXT = `Verein Percikan Iman Schweiz 🇨🇭🇮🇩
Islamisch-indonesische Gemeinschaft · Art. 60–79 ZGB
Komunitas Muslim Indonesia di Swiss
📍 Zürich · Baar · St. Gallen | UID CHE-382.914.820
🔗 percikaniman.ch`;

function buildPatternDataUri(edition: MotifThemeKey): string {
  const palette =
    edition === 'ice'
      ? {
          bg: '#DFE8F0',
          grid: 'rgba(29,91,140,0.16)',
          contour: 'rgba(29,91,140,0.28)',
          outerFill: 'rgba(29,91,140,0.09)',
          outerStroke: 'rgba(29,91,140,0.34)',
          innerFill: 'rgba(140,83,39,0.12)',
          innerStroke: 'rgba(140,83,39,0.38)',
          centerFill: 'rgba(140,83,39,0.28)',
          cross: 'rgba(19,36,53,0.45)'
        }
      : edition === 'slate'
        ? {
            bg: '#132435',
            grid: 'rgba(156,196,228,0.14)',
            contour: 'rgba(156,196,228,0.32)',
            outerFill: 'rgba(156,196,228,0.08)',
            outerStroke: 'rgba(156,196,228,0.42)',
            innerFill: 'rgba(140,83,39,0.22)',
            innerStroke: 'rgba(140,83,39,0.75)',
            centerFill: 'rgba(140,83,39,0.55)',
            cross: 'rgba(156,196,228,0.65)'
          }
        : {
            bg: '#EAE6DF',
            grid: '#D5CFC4',
            contour: 'rgba(91,126,158,0.24)',
            outerFill: 'rgba(29,91,140,0.07)',
            outerStroke: 'rgba(29,91,140,0.26)',
            innerFill: 'rgba(91,126,158,0.11)',
            innerStroke: 'rgba(91,126,158,0.3)',
            centerFill: 'rgba(140,83,39,0.26)',
            cross: 'rgba(29,91,140,0.42)'
          };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <rect width="240" height="240" fill="${palette.bg}"/>
    <g stroke="${palette.grid}" stroke-width="0.85">
      <line x1="60" y1="0" x2="60" y2="240"/><line x1="120" y1="0" x2="120" y2="240"/><line x1="180" y1="0" x2="180" y2="240"/>
      <line x1="0" y1="60" x2="240" y2="60"/><line x1="0" y1="120" x2="240" y2="120"/><line x1="0" y1="180" x2="240" y2="180"/>
    </g>
    <g fill="none" stroke="${palette.contour}" stroke-width="1">
      <path d="M 0 36 C 60 12, 180 60, 240 36"/>
      <path d="M 0 156 C 60 132, 180 180, 240 156"/>
      <path d="M 36 0 C 12 60, 60 180, 36 240"/>
      <path d="M 156 0 C 132 60, 180 180, 156 240"/>
    </g>
    <g transform="translate(120 120)">
      <polygon points="0,-46 14,-14 46,0 14,14 0,46 -14,14 -46,0 -14,-14" fill="${palette.outerFill}" stroke="${palette.outerStroke}" stroke-width="1"/>
      <polygon points="0,-24 9,-9 24,0 9,9 0,24 -9,9 -24,0 -9,-9" fill="${palette.innerFill}" stroke="${palette.innerStroke}" stroke-width="0.9"/>
      <polygon points="0,-10 10,0 0,10 -10,0" fill="${palette.centerFill}" stroke="${palette.innerStroke}" stroke-width="0.9"/>
    </g>
    <g fill="${palette.outerFill}" stroke="${palette.outerStroke}" stroke-width="1">
      <path d="M 0 0 L 46 0 L 14 14 L 0 46 Z"/><path d="M 240 0 L 240 46 L 226 14 L 194 0 Z"/>
      <path d="M 0 240 L 0 194 L 14 226 L 46 240 Z"/><path d="M 240 240 L 194 240 L 226 226 L 240 194 Z"/>
    </g>
    <g stroke="${palette.cross}" stroke-width="1.2" stroke-linecap="square">
      <line x1="55" y1="60" x2="65" y2="60"/><line x1="60" y1="55" x2="60" y2="65"/>
      <line x1="175" y1="60" x2="185" y2="60"/><line x1="180" y1="55" x2="180" y2="65"/>
      <line x1="55" y1="180" x2="65" y2="180"/><line x1="60" y1="175" x2="60" y2="185"/>
      <line x1="175" y1="180" x2="185" y2="180"/><line x1="180" y1="175" x2="180" y2="185"/>
    </g>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildSwissQrBillPayload(amountChf: number, referencePurpose: string): string {
  const formattedAmount = amountChf > 0 ? amountChf.toFixed(2) : '';
  return [
    'SPC',
    '0200',
    '1',
    'CH8909000000604966107',
    'S',
    'Verein Percikan Iman',
    'Postfach',
    '',
    '8000',
    'Zürich',
    'CH',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    formattedAmount,
    'CHF',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'NON',
    '',
    `${referencePurpose} | UID CHE-382.914.820`,
    'EPD'
  ].join('\n');
}

export const BrandStyleguideView: React.FC<BrandStyleguideViewProps> = ({ onNavigate }) => {
  const [activeSurface, setActiveSurface] = useState<SurfaceKey>('greige');
  const [showClearspace, setShowClearspace] = useState<boolean>(true);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState<TrackFilter>('dual');
  const [motifTheme, setMotifTheme] = useState<MotifThemeKey>('greige');
  const [selectedPostSlug, setSelectedPostSlug] = useState<string>(IG_GRID_POSTS[0].slug);

  const [qrAmount, setQrAmount] = useState<number>(50);
  const [qrPurpose, setQrPurpose] = useState<string>('Infaq & Vereinsbetrieb');
  const [qrSvgDataUri, setQrSvgDataUri] = useState<string>('');

  const [checkedRuleIds, setCheckedRuleIds] = useState<string[]>(['margins', 'palette']);

  const selectedSurface = SURFACES.find((s) => s.id === activeSurface) || SURFACES[0];
  const selectedPost = IG_GRID_POSTS.find((p) => p.slug === selectedPostSlug) || IG_GRID_POSTS[0];
  const patternPreviewUri = useMemo(() => buildPatternDataUri(motifTheme), [motifTheme]);

  const swissQrPayload = useMemo(() => buildSwissQrBillPayload(qrAmount, qrPurpose), [qrAmount, qrPurpose]);

  useEffect(() => {
    let cancelled = false;

    QRCode.toString(swissQrPayload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
      .then((svgMarkup) => {
        if (!cancelled) {
          setQrSvgDataUri(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrSvgDataUri('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [swissQrPayload]);

  const copyText = (value: string, label?: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value).catch(() => {});
    }
    setCopiedValue(label || value);
    window.setTimeout(() => {
      setCopiedValue((prev) => (prev === (label || value) ? null : prev));
    }, 2200);
  };

  const toggleChecklistItem = (id: string) => {
    setCheckedRuleIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const checklistCompletion = Math.round((checkedRuleIds.length / FLYER_CHECKLIST.length) * 100);

  const motifStageStyle =
    motifTheme === 'ice'
      ? 'bg-[#DFE8F0] border-[#5B7E9E]/40 text-[#132435]'
      : motifTheme === 'slate'
        ? 'bg-[#132435] border-[#29445F] text-white'
        : 'bg-[#EAE6DF] border-[#D5CFC4] text-[#132435]';

  const motifCardStyle =
    motifTheme === 'ice'
      ? 'bg-[#FAF9F6] border-[#5B7E9E]/35 text-[#132435]'
      : motifTheme === 'slate'
        ? 'bg-[#1C3248] border-[#5B7E9E]/40 text-white'
        : 'bg-[#F4F2ED] border-[#D5CFC4] text-[#132435]';

  return (
    <div className="w-full bg-[#EAE6DF] text-[#132435]">
      {/* Accessible Copy Notification Region */}
      <div aria-live="polite" className="sr-only">
        {copiedValue ? `${copiedValue} in die Zwischenablage kopiert` : ''}
      </div>

      {copiedValue && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 bg-[#132435] text-white px-4 py-2.5 rounded-lg border border-[#8C5327] shadow-lg flex items-center gap-2 text-xs font-mono"
        >
          <Check className="w-4 h-4 text-[#9CC4E4]" aria-hidden="true" />
          <span>Kopiert: {copiedValue}</span>
        </div>
      )}

      {/* 1. HERO & DUAL-TRACK BRAND ARCHITECTURE */}
      <section
        className="relative border-b border-[#D5CFC4] bg-[#EAE6DF]"
        style={{
          backgroundImage: `url('/brand/pattern-swiss-nusantara.svg')`,
          backgroundSize: '240px 240px'
        }}
      >
        <div className="bg-gradient-to-b from-[#EAE6DF]/90 via-[#EAE6DF]/94 to-[#EAE6DF] py-14 lg:py-20">
          <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7">
              <div className="inline-flex flex-wrap items-center gap-2 text-xs font-medium text-[#4A5E72] pb-2.5 mb-5 border-b border-[#D5CFC4]">
                <Scale className="w-3.5 h-3.5 text-[#1D5B8C]" aria-hidden="true" />
                <span>Schweizer Verein gemäss Art. 60–79 ZGB</span>
                <span aria-hidden="true" className="text-[#B8B0A2]">·</span>
                <span className="font-mono text-[11px] text-[#132435] tabular-nums">UID CHE-382.914.820</span>
                <span aria-hidden="true" className="text-[#B8B0A2]">·</span>
                <span className="font-mono text-[11px] text-[#8C5327] font-semibold">v2 · Greige, Cobalt &amp; Teak</span>
              </div>

              <h1 className="display-hero font-extrabold text-[#132435] mb-5">
                Swiss Civic Atelier × Archipelago Nusantara
              </h1>

              <p className="text-base md:text-lg text-[#4A5E72] leading-relaxed max-w-[62ch] mb-3">
                Das verbindliche Marken- und Designsystem v2 für den Verein «Percikan Iman» Schweiz — aufgebaut auf
                Limestone Greige (<code className="font-mono text-xs text-[#132435]">#EAE6DF</code>), Percikan Cobalt (
                <code className="font-mono text-xs text-[#1D5B8C]">#1D5B8C</code>) und Roasted Teak (
                <code className="font-mono text-xs text-[#8C5327]">#8C5327</code>) mit zwei präzisen Non-Serif-Schriften.
              </p>
              <p className="text-sm text-[#4A5E72] leading-relaxed max-w-[62ch] mb-7 border-l-3 border-[#8C5327] pl-3.5">
                Sistem identitas visual dwibahasa (<strong className="text-[#132435]">DE + ID</strong>) dalam arsitektur
                Figma Design &amp; Figma Slides yang ringan bagi relawan dan konsisten bagi komunitas{' '}
                <strong className="text-[#1D5B8C]">@verein.pi</strong>.
              </p>

              {/* Quick Section Jump Pills */}
              <nav aria-label="Brand Styleguide Abschnitte" className="flex flex-wrap gap-2">
                {[
                  { href: '#brand-logos', label: 'Logo & Avatar Lab' },
                  { href: '#brand-motifs', label: 'Anatomy of the Spark (Motifs)' },
                  { href: '#brand-colors', label: '15 Farb-Tokens' },
                  { href: '#brand-typography', label: '2-Font Typografie & DE+ID' },
                  { href: '#brand-instagram', label: '@verein.pi 3×3 Grid' },
                  { href: '#brand-qr', label: 'QR-Rechnung & TWINT' },
                  { href: '#brand-checklist', label: '3-Minuten Figma Check' }
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="min-h-9 px-3 py-1.5 rounded-lg bg-[#FAF9F6] hover:bg-[#DFE8F0] border border-[#D5CFC4] hover:border-[#1D5B8C] text-xs font-semibold text-[#132435] hover:text-[#1D5B8C] inline-flex items-center transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            {/* Right Specimen Card: Dual-Track Architecture & Official Registry */}
            <aside className="lg:col-span-5 bg-[#FAF9F6] rounded-xl border border-[#D5CFC4] p-6 space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#E1DDD4] pb-4">
                <img
                  src="/brand/logo-primary.svg"
                  alt="Verein Percikan Iman Schweiz v2 Primärlogo"
                  className="h-11 w-auto object-contain"
                />
                <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-[#F3E8DF] text-[#8C5327] font-bold border border-[#8C5327]/25">
                  v2.0 · 11 SVGs
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-[#F4F2ED] border border-[#D5CFC4]">
                  <span className="font-mono text-[11px] font-bold text-[#1D5B8C] block mb-1">
                    Track A · Deutsch (DE)
                  </span>
                  <p className="text-[#132435] font-semibold mb-1">Struktur &amp; Rechtssicherheit</p>
                  <p className="text-[#4A5E72] leading-relaxed">
                    Titel, Daten, Orte, ZGB-Statuten und Finanztransparenz in präziser Schweizer Amtssprache.
                  </p>
                </div>
                <div className="p-3.5 rounded-lg bg-[#F3E8DF]/70 border border-[#8C5327]/30">
                  <span className="font-mono text-[11px] font-bold text-[#8C5327] block mb-1">
                    Track B · Indonesia (ID)
                  </span>
                  <p className="text-[#132435] font-semibold mb-1">Kehangatan &amp; Spiritualitas</p>
                  <p className="text-[#4A5E72] leading-relaxed">
                    Subjudul kajian, ajakan silaturahmi, refleksi Al-Qur’an dan penguatan ikatan diaspora.
                  </p>
                </div>
              </div>

              <dl className="border-t border-[#E1DDD4] pt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#4A5E72]">Verein</dt>
                  <dd className="font-semibold text-[#132435] text-right">Verein Percikan Iman Schweiz</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#4A5E72]">Sitz &amp; UID</dt>
                  <dd className="font-mono text-[#132435] tabular-nums text-right">8000 Zürich · CHE-382.914.820</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#4A5E72]">PostFinance IBAN</dt>
                  <dd className="font-mono text-[#1D5B8C] font-semibold tabular-nums text-right">
                    CH89 0900 0000 6049 6610 7
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#4A5E72]">Kontakt &amp; IG</dt>
                  <dd className="font-mono text-[#132435] text-right">info@percikaniman.ch · {INSTAGRAM_HANDLE}</dd>
                </div>
              </dl>

              {onNavigate && (
                <div className="flex flex-wrap gap-2.5 pt-2 border-t border-[#E1DDD4]">
                  <button
                    type="button"
                    onClick={() => onNavigate('donate')}
                    className="min-h-9 px-3.5 py-2 bg-[#1D5B8C] hover:bg-[#15466E] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Zum Spendenportal
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('about')}
                    className="min-h-9 px-3.5 py-2 bg-[#F4F2ED] hover:bg-[#E1DDD4] text-[#132435] border border-[#D5CFC4] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Statuten &amp; Vorstand
                  </button>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE LOGO & AVATAR LAB */}
      <section id="brand-logos" className="py-14 max-w-[1200px] mx-auto px-6 border-b border-[#D5CFC4]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#1D5B8C] font-semibold mb-2">
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>public/brand/*.svg · C2PA-bereinigte v2 Vektordateien</span>
            </div>
            <h2 className="display-section font-extrabold text-[#132435]">
              Logo-System &amp; Avatar Lab
            </h2>
            <p className="text-sm text-[#4A5E72] mt-1 max-w-[60ch]">
              Testen Sie alle offiziellen Logo-Varianten und das IG-Badge auf den vier v2 Atelier-Oberflächen und laden
              Sie jede Vektordatei direkt als sauberes <code className="font-mono text-xs text-[#1D5B8C]">.svg</code>{' '}
              herunter.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Hintergrundfläche wählen" className="flex flex-wrap gap-1.5">
              {SURFACES.map((surface) => {
                const isSelected = surface.id === activeSurface;
                return (
                  <button
                    key={surface.id}
                    type="button"
                    onClick={() => setActiveSurface(surface.id)}
                    aria-pressed={isSelected}
                    className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[#132435] text-white border-[#132435]'
                        : 'bg-[#FAF9F6] text-[#132435] border-[#D5CFC4] hover:border-[#1D5B8C]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="w-3 h-3 rounded-full border border-black/15"
                      style={{ backgroundColor: surface.hex }}
                    />
                    <span>{surface.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowClearspace((prev) => !prev)}
              aria-pressed={showClearspace}
              className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                showClearspace
                  ? 'bg-[#DFE8F0] text-[#1D5B8C] border-[#1D5B8C]/40'
                  : 'bg-[#FAF9F6] text-[#4A5E72] border-[#D5CFC4]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Schutzzone {showClearspace ? 'EIN' : 'AUS'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BRAND_SVG_ASSETS.map((asset) => {
            const isRecommended = selectedSurface.recommendedAssetIds.includes(asset.id);
            const downloadName = asset.file.split('/').pop() || `${asset.id}.svg`;
            return (
              <article
                key={asset.id}
                className="bg-[#FAF9F6] rounded-xl border border-[#D5CFC4] overflow-hidden flex flex-col justify-between"
              >
                <div
                  className={`relative p-6 min-h-48 flex items-center justify-center border-b ${selectedSurface.bgClass} ${selectedSurface.borderClass} transition-colors`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-2.5 left-3 font-mono text-xs ${selectedSurface.mutedClass} opacity-65`}
                  >
                    +
                  </span>
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-2.5 right-3 font-mono text-xs ${selectedSurface.mutedClass} opacity-65`}
                  >
                    +
                  </span>

                  <span
                    className={`absolute top-3 right-3 px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                      isRecommended
                        ? 'bg-[#F3E8DF] text-[#8C5327]'
                        : 'bg-[#E1DDD4] text-[#4A5E72]'
                    }`}
                  >
                    {isRecommended ? 'Empfohlen' : 'Alternativ'}
                  </span>

                  <div
                    className={`relative flex items-center justify-center p-4 ${
                      showClearspace
                        ? 'border border-dashed border-[#9CC4E4]/85 rounded-lg'
                        : ''
                    }`}
                  >
                    <img
                      src={asset.file}
                      alt={`${asset.titleDe} (${asset.titleId})`}
                      className={`${
                        asset.isSquare
                          ? 'w-28 h-28 rounded-full'
                          : 'max-h-20 w-auto max-w-full'
                      } object-contain`}
                    />
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="font-editorial text-lg font-bold text-[#132435] mb-0.5">
                      {asset.titleDe}
                    </h3>
                    <p className="text-xs font-semibold text-[#8C5327] mb-2">{asset.titleId}</p>
                    <p className="font-mono text-[11px] text-[#4A5E72] mb-2">{asset.spec}</p>
                    <p className="text-xs text-[#4A5E72] leading-relaxed">{asset.usage}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E1DDD4]">
                    <code className="font-mono text-[11px] text-[#4A5E72] truncate">{asset.file}</code>
                    <a
                      href={asset.file}
                      download={downloadName}
                      className="min-h-8 px-3 py-1.5 bg-[#1D5B8C] hover:bg-[#15466E] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>SVG laden</span>
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3. MODULAR MOTIF LAB ("ANATOMY OF THE SPARK") */}
      <section id="brand-motifs" className="py-14 max-w-[1200px] mx-auto px-6 border-b border-[#D5CFC4]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#8C5327] font-bold mb-2">
              <Compass className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Anatomy of the Spark · 4 Modulare Figma-Komponenten + 1 Nahtlos-Muster</span>
            </div>
            <h2 className="display-section font-extrabold text-[#132435]">
              Modular Motif Lab («Anatomy of the Spark»)
            </h2>
            <p className="text-sm text-[#4A5E72] mt-1 max-w-[64ch]">
              Die 45°-Raute und der geometrische Funke des Signets werden in vier modulare Atelier-Bausteine
              übersetzt — umschaltbar über alle drei offiziellen Kartenthemen.
            </p>
          </div>

          <div role="group" aria-label="Motif Thema wählen" className="flex flex-wrap items-center gap-2">
            {[
              { id: 'greige' as const, label: 'Limestone Greige (#EAE6DF)' },
              { id: 'ice' as const, label: 'Ice-Blue Mist (#DFE8F0)' },
              { id: 'slate' as const, label: 'Deep Slate-Blue (#132435)' }
            ].map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => setMotifTheme(theme.id)}
                aria-pressed={motifTheme === theme.id}
                className={`min-h-9 px-3.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                  motifTheme === theme.id
                    ? 'bg-[#132435] text-white border-[#132435]'
                    : 'bg-[#FAF9F6] text-[#132435] border-[#D5CFC4] hover:border-[#1D5B8C]'
                }`}
              >
                {theme.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Modular Motif Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {MOTIF_ASSETS.map((motif) => {
            const downloadName = motif.file.split('/').pop() || `${motif.id}.svg`;
            return (
              <article
                key={motif.id}
                className={`rounded-xl border p-6 flex flex-col justify-between gap-5 transition-colors ${motifCardStyle}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className={`font-mono text-[11px] font-semibold block mb-1 ${
                        motifTheme === 'slate' ? 'text-[#9CC4E4]' : 'text-[#1D5B8C]'
                      }`}
                    >
                      {motif.dimensions}
                    </span>
                    <h3 className="font-editorial text-xl font-bold">{motif.titleDe}</h3>
                    <p
                      className={`text-xs font-semibold mt-0.5 ${
                        motifTheme === 'slate' ? 'text-[#F3E8DF]' : 'text-[#8C5327]'
                      }`}
                    >
                      {motif.titleId}
                    </p>
                  </div>
                  <a
                    href={motif.file}
                    download={downloadName}
                    className="min-h-8 px-3 py-1.5 bg-[#8C5327] hover:bg-[#6F401D] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>SVG laden</span>
                  </a>
                </div>

                {/* Stage Preview */}
                <div
                  className={`rounded-lg border p-5 min-h-32 flex items-center justify-center ${motifStageStyle}`}
                >
                  <img
                    src={motif.file}
                    alt={`${motif.titleDe} (${motif.titleId})`}
                    className="max-h-24 w-auto max-w-full object-contain"
                  />
                </div>

                <div className="space-y-1.5 text-xs">
                  <p className={motifTheme === 'slate' ? 'text-[#DFE8F0]' : 'text-[#4A5E72]'}>
                    <strong className={motifTheme === 'slate' ? 'text-white' : 'text-[#132435]'}>Geometrie:</strong>{' '}
                    {motif.anatomyNote}
                  </p>
                  <p className={motifTheme === 'slate' ? 'text-[#9CC4E4]' : 'text-[#4A5E72]'}>
                    <strong className={motifTheme === 'slate' ? 'text-white' : 'text-[#132435]'}>Einsatz:</strong>{' '}
                    {motif.usageNote}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {/* Seamless Pattern Switcher Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div
            className="lg:col-span-8 min-h-60 rounded-xl border border-[#D5CFC4] p-6 flex flex-col justify-between"
            style={{
              backgroundImage: `url("${patternPreviewUri}")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '200px 200px'
            }}
          >
            <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded bg-[#FAF9F6]/95 border border-[#D5CFC4] text-xs font-mono text-[#132435]">
              <span>Nahtlose Kachel 240×240 px</span>
              <span>·</span>
              <span className="text-[#8C5327] font-bold">
                {motifTheme === 'greige'
                  ? 'Limestone Greige'
                  : motifTheme === 'ice'
                    ? 'Ice-Blue Mist'
                    : 'Deep Slate-Blue'}
              </span>
            </div>

            <div className="bg-[#FAF9F6]/95 backdrop-blur-xs rounded-lg border border-[#D5CFC4] p-4 max-w-md">
              <p className="font-editorial text-lg font-bold text-[#132435]">
                {motifTheme === 'slate'
                  ? 'Eid Mubarak 1447H · Deep Slate & Roasted Teak'
                  : motifTheme === 'ice'
                    ? 'Bildungsforum & Kinder-Tilawah Schweiz'
                    : 'Verein Percikan Iman · Offizielle v2 Musterkachel'}
              </p>
              <p className="text-xs text-[#4A5E72] mt-1">
                Kombiniert 60px Schweizer Haarlinien, Alpine Höhenkurven, Nusantara-Kawung-Rauten und Roasted Teak Akzente.
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 bg-[#FAF9F6] rounded-xl border border-[#D5CFC4] p-5 flex flex-col justify-between gap-4">
            <div>
              <h3 className="font-editorial text-lg font-bold text-[#132435] mb-1">
                Kachel-Anatomie (1:1)
              </h3>
              <p className="text-xs text-[#4A5E72] mb-4">
                Wiederholbares SVG-Grundmuster für Website-Sektionen, Wegweiser-Trenner und Event-Banner.
              </p>
              <div className="aspect-square max-w-44 mx-auto rounded-lg overflow-hidden border border-[#D5CFC4]">
                <img
                  src={motifTheme === 'greige' ? '/brand/pattern-swiss-nusantara.svg' : patternPreviewUri}
                  alt="Einzelkachel des v2 Swiss-Nusantara Musters"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E1DDD4]">
              <code className="font-mono text-[11px] text-[#4A5E72] truncate">/brand/pattern-swiss-nusantara.svg</code>
              <a
                href="/brand/pattern-swiss-nusantara.svg"
                download="pattern-swiss-nusantara.svg"
                className="min-h-8 px-3 py-1.5 bg-[#1D5B8C] hover:bg-[#15466E] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>SVG laden</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 15-TOKEN GREIGE / BLUE / TEAK COLOR MATRIX */}
      <section id="brand-colors" className="py-14 max-w-[1200px] mx-auto px-6 border-b border-[#D5CFC4]">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#1D5B8C] font-semibold mb-2">
            <Palette className="w-3.5 h-3.5" aria-hidden="true" />
            <span>15 Gesperrte v2 Tokens · Klicken zum Kopieren · WCAG 2.1 Kontrast geprüft</span>
          </div>
          <h2 className="display-section font-extrabold text-[#132435]">
            Farb-Token Matrix (Beige-Grau, Blautöne &amp; Roasted Teak)
          </h2>
          <p className="text-sm text-[#4A5E72] mt-1 max-w-[64ch]">
            Limestone Greige (<code className="font-mono text-xs text-[#132435]">#EAE6DF</code>) beruhigt die Fläche,
            Kobalt &amp; Stahlblau (<code className="font-mono text-xs text-[#1D5B8C]">#1D5B8C / #5B7E9E</code>)
            tragen Autorität und Roasted Teak (<code className="font-mono text-xs text-[#8C5327]">#8C5327</code>)
            setzt bewusste kulturelle Akzente.{' '}
            <strong className="text-[#132435]">
              Reinweiss #FFFFFF ist ausschliesslich für die ISO-20022-Ruhezone der Schweizer QR-Rechnung reserviert.
            </strong>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {COLOR_TOKENS.map((token) => (
            <div
              key={token.hex}
              className="bg-[#FAF9F6] rounded-xl border border-[#D5CFC4] overflow-hidden flex flex-col justify-between"
            >
              <div
                className="h-24 p-3.5 flex items-end justify-between border-b border-[#D5CFC4]"
                style={{ backgroundColor: token.hex }}
              >
                <span
                  className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                    token.isDarkSurface
                      ? 'bg-black/25 text-white'
                      : 'bg-[#FAF9F6]/95 text-[#132435] border border-[#D5CFC4]'
                  }`}
                >
                  {token.hex}
                </span>
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                    token.isDarkSurface
                      ? 'text-white/95 bg-white/15'
                      : 'text-[#132435] bg-[#FAF9F6]/85'
                  }`}
                >
                  {token.contrastLabel}
                </span>
              </div>

              <div className="p-4 space-y-2.5">
                <div>
                  <h3 className="font-bold text-sm text-[#132435]">{token.name}</h3>
                  <p className="text-xs text-[#4A5E72] mt-0.5">{token.roleDe}</p>
                  <p className="text-[11px] text-[#8C5327] font-medium mt-0.5">{token.roleId}</p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#E1DDD4]">
                  <button
                    type="button"
                    onClick={() => copyText(token.hex, `${token.name} (${token.hex})`)}
                    className="min-h-8 flex-1 px-2.5 py-1 bg-[#F4F2ED] hover:bg-[#DFE8F0] border border-[#D5CFC4] rounded text-[11px] font-mono text-[#132435] hover:text-[#1D5B8C] inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3 h-3" aria-hidden="true" />
                    <span>{token.hex}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(`var(${token.cssVar})`, token.cssVar)}
                    className="min-h-8 flex-1 px-2.5 py-1 bg-[#F4F2ED] hover:bg-[#F3E8DF] border border-[#D5CFC4] rounded text-[11px] font-mono text-[#4A5E72] hover:text-[#8C5327] inline-flex items-center justify-center gap-1 cursor-pointer transition-colors truncate"
                    title={`Kopiere var(${token.cssVar})`}
                  >
                    <span className="truncate">{token.cssVar}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. STRICTLY 2 NON-SERIF FONTS & DUAL-TRACK RULE */}
      <section id="brand-typography" className="py-14 max-w-[1200px] mx-auto px-6 border-b border-[#D5CFC4]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#1D5B8C] font-semibold mb-2">
              <TypeIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Strikt 2 Non-Serif Schriften · Plus Jakarta Sans + JetBrains Mono</span>
            </div>
            <h2 className="display-section font-extrabold text-[#132435]">
              Typografie &amp; Dual-Track Regel
            </h2>
          </div>

          <div role="group" aria-label="Sprachansicht wählen" className="inline-flex rounded-lg border border-[#D5CFC4] bg-[#FAF9F6] p-1 gap-1">
            {[
              { id: 'dual' as const, label: 'Dual-Track (DE + ID)' },
              { id: 'de' as const, label: 'Deutsch (Struktur)' },
              { id: 'id' as const, label: 'Indonesia (Wärme)' }
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTrackFilter(mode.id)}
                aria-pressed={trackFilter === mode.id}
                className={`min-h-8 px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                  trackFilter === mode.id
                    ? 'bg-[#1D5B8C] text-white'
                    : 'text-[#4A5E72] hover:text-[#132435]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Type Scale Specimen */}
          <div className="lg:col-span-7 bg-[#FAF9F6] rounded-xl border border-[#D5CFC4] divide-y divide-[#E1DDD4]">
            <div className="p-6">
              <div className="flex items-center justify-between text-xs font-mono text-[#4A5E72] mb-2">
                <span>DISPLAY GROTESK · Plus Jakarta Sans · ExtraBold 800 · -0.025em</span>
                <span>48–58px</span>
              </div>
              <p className="font-sans text-3xl sm:text-4xl font-extrabold text-[#132435] tracking-[-0.025em] leading-tight">
                Glauben vertiefen, Gemeinschaft in der Schweiz stärken.
              </p>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between text-xs font-mono text-[#4A5E72] mb-2">
                <span>UI &amp; BODY GROTESK · Plus Jakarta Sans · 400–600</span>
                <span>15–18px</span>
              </div>
              <p className="font-sans text-base text-[#132435] leading-relaxed">
                Percikan Iman Schweiz verbindet seit 1998 spirituelle Tiefe mit Schweizer Vereinskultur —{' '}
                <span className="text-[#8C5327] font-semibold">
                  mendampingi keluarga dan generasi muda Muslim Indonesia di Swiss dengan transparansi penuh.
                </span>
              </p>
            </div>

            <div className="p-6 bg-[#F4F2ED]">
              <div className="flex items-center justify-between text-xs font-mono text-[#4A5E72] mb-2">
                <span>CIVIC METADATA MONO · JetBrains Mono · Regular/Bold · tabular-nums</span>
                <span>11–13px</span>
              </div>
              <div className="font-mono tabular-nums text-xs sm:text-sm text-[#132435] flex flex-wrap gap-x-6 gap-y-2">
                <span>UID: CHE-382.914.820</span>
                <span className="text-[#1D5B8C] font-bold">IBAN: CH89 0900 0000 6049 6610 7</span>
                <span className="text-[#8C5327] font-bold">JAHRESBEITRAG: CHF 120.00</span>
              </div>
            </div>
          </div>

          {/* Live Dual-Track Composition Preview */}
          <div className="lg:col-span-5 bg-[#FAF9F6] rounded-xl border border-[#D5CFC4] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#E1DDD4] pb-3 mb-4">
                <span className="font-mono text-[11px] font-bold text-[#1D5B8C]">
                  VEREIN PERCIKAN IMAN · SCHWEIZ
                </span>
                <span className="font-mono text-[11px] text-[#4A5E72] tabular-nums">Art. 60–79 ZGB</span>
              </div>

              {(trackFilter === 'dual' || trackFilter === 'de') && (
                <div className="mb-4">
                  <span className="inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-[#DFE8F0] text-[#1D5B8C] font-semibold mb-2">
                    Track A · DE Primärschicht
                  </span>
                  <h3 className="font-sans text-2xl font-bold text-[#132435] tracking-[-0.025em] mb-1.5">
                    Einladung zum Monatlichen Ta’lim &amp; Familiennachmittag
                  </h3>
                  <p className="text-sm text-[#4A5E72] leading-relaxed">
                    Sonntag, 11:00–16:00 Uhr · Iman Zentrum Volketswil · Offen für alle Mitglieder und Gäste.
                  </p>
                </div>
              )}

              {(trackFilter === 'dual' || trackFilter === 'id') && (
                <div className="p-4 rounded-lg bg-[#F4F2ED] border-l-3 border-[#8C5327]">
                  <span className="inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-[#F3E8DF] text-[#8C5327] font-bold mb-1.5">
                    Track B · ID Subjudul &amp; Kehangatan
                  </span>
                  <p className="text-sm font-semibold text-[#132435] mb-1">
                    “Back to Qur’an — Tadabbur Surat Al-Baqarah”
                  </p>
                  <p className="text-xs text-[#4A5E72] leading-relaxed">
                    Mari hadir bersama keluarga untuk memperkuat iman, mempererat silaturahmi, dan berbagi hidangan
                    kebersamaan di rantau Swiss.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-[#E1DDD4] flex items-center justify-between text-xs font-mono text-[#4A5E72]">
              <span>Verhältnis-Regel: 70% DE / 30% ID</span>
              <span className="text-[#8C5327] font-bold">Zürich · Baar · St. Gallen</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. @VEREIN.PI IG PROFILE MAKEOVER & COHESIVE 3x3 GRID SIMULATOR */}
      <section id="brand-instagram" className="py-14 max-w-[1200px] mx-auto px-6 border-b border-[#D5CFC4]">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#1D5B8C] font-semibold mb-2">
            <Instagram className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{INSTAGRAM_HANDLE} · 1080×1350 (4:5 Portrait Figma Templates) · 5 Highlight Covers</span>
          </div>
          <h2 className="display-section font-extrabold text-[#132435]">
            @verein.pi Instagram Makeover &amp; 3×3 Launch-Grid
          </h2>
          <p className="text-sm text-[#4A5E72] mt-1 max-w-[62ch]">
            Direkt in Figma editierbar statt uneinheitlicher Einzelbilder: Klicken Sie auf eine der neun Kacheln, um das
            v2 Farb- und Dual-Track-Rezept zu inspizieren.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: IG Mobile Profile + 3x3 Feed Simulator */}
          <div className="lg:col-span-7 bg-[#FAF9F6] rounded-2xl border border-[#D5CFC4] p-5 sm:p-6 space-y-6">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-5 border-b border-[#E1DDD4]">
              <img
                src="/brand/emblem-avatar-ig.svg"
                alt="@verein.pi Instagram Profilbild"
                className="w-20 h-20 rounded-full border border-[#D5CFC4] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-mono font-bold text-base text-[#132435]">{INSTAGRAM_HANDLE}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#DFE8F0] text-[#1D5B8C] text-[11px] font-semibold">
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    <span>Schweizer Verein</span>
                  </span>
                </div>

                <div className="text-xs text-[#132435] space-y-0.5 leading-relaxed">
                  <p className="font-bold">Verein Percikan Iman Schweiz</p>
                  <p className="text-[#4A5E72]">Islamisch-indonesische Gemeinschaft · Art. 60–79 ZGB</p>
                  <p className="text-[#8C5327] font-semibold">Komunitas Muslim Indonesia di Swiss</p>
                  <p className="font-mono text-[11px] text-[#1D5B8C]">Zürich · Baar · St. Gallen · percikaniman.ch</p>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => copyText(IG_BIO_TEXT, '@verein.pi IG Bio')}
                  className="min-h-8 px-3 py-1.5 bg-[#1D5B8C] hover:bg-[#15466E] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Bio kopieren</span>
                </button>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-8 px-3 py-1.5 bg-[#F4F2ED] hover:bg-[#E1DDD4] text-[#132435] border border-[#D5CFC4] rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Instagram</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              </div>
            </div>

            {/* 5 Highlight Covers */}
            <div className="flex items-center gap-4 overflow-x-auto pb-1">
              {IG_HIGHLIGHTS.map((hl) => (
                <div key={hl.label} className="flex flex-col items-center gap-1.5 shrink-0">
                  <div
                    className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-mono text-xs font-bold ${hl.bg} ${hl.border} ${hl.text}`}
                  >
                    {hl.code}
                  </div>
                  <span className="text-[11px] font-semibold text-[#132435]">{hl.label}</span>
                </div>
              ))}
            </div>

            {/* 3x3 4:5 Feed Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {IG_GRID_POSTS.map((post) => {
                const isActive = post.slug === selectedPostSlug;
                const tileStyle =
                  post.theme === 'photo-recap'
                    ? 'bg-gradient-to-t from-[#132435] via-[#1D5B8C] to-[#5B7E9E] text-white'
                    : post.theme === 'wegweiser' || post.theme === 'donation-qr' || post.theme === 'ramadan-teak'
                      ? 'bg-[#132435] text-white'
                      : post.theme === 'kids'
                        ? 'bg-[#DFE8F0] text-[#132435]'
                        : post.theme === 'muslimah'
                          ? 'bg-[#F3E8DF] text-[#132435]'
                          : post.theme === 'familienlager'
                            ? 'bg-[#F4F2ED] text-[#132435]'
                            : 'bg-[#EAE6DF] text-[#132435]';

                return (
                  <button
                    key={post.slug}
                    type="button"
                    onClick={() => setSelectedPostSlug(post.slug)}
                    aria-pressed={isActive}
                    className={`aspect-[4/5] rounded-lg p-2.5 sm:p-3 text-left flex flex-col justify-between border transition-all cursor-pointer relative overflow-hidden ${tileStyle} ${
                      isActive
                        ? 'ring-2 ring-[#8C5327] ring-offset-2 border-[#8C5327]'
                        : 'border-[#D5CFC4] hover:border-[#1D5B8C]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[9px] font-mono opacity-85">
                      <span className="truncate">{post.tag}</span>
                      <span>{post.index}</span>
                    </div>

                    <div>
                      <p className="font-sans text-xs sm:text-sm font-bold tracking-tight leading-snug line-clamp-2">
                        {post.headlineDe}
                      </p>
                      <p className="text-[10px] opacity-80 line-clamp-2 mt-1 hidden sm:block">
                        {post.subtitleId}
                      </p>
                    </div>

                    <div className="text-[9px] font-mono opacity-75 truncate border-t border-current/15 pt-1">
                      {post.meta}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Post Anatomy Inspector */}
          <aside className="lg:col-span-5 bg-[#FAF9F6] rounded-2xl border border-[#D5CFC4] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E1DDD4] pb-4">
              <div>
                <span className="font-mono text-[11px] font-semibold text-[#1D5B8C] block">
                  KACHEL {selectedPost.index} / 09 · {selectedPost.archetype}
                </span>
                <h3 className="font-editorial text-2xl font-bold text-[#132435] mt-0.5">
                  {selectedPost.titleDe}
                </h3>
                <p className="text-xs font-semibold text-[#8C5327]">{selectedPost.titleId}</p>
              </div>
            </div>

            {/* Enlarged 4:5 Post Preview */}
            <div className="max-w-xs mx-auto rounded-xl border border-[#D5CFC4] overflow-hidden bg-[#FAF9F6]">
              <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-[#E1DDD4]">
                <div className="flex items-center gap-2">
                  <img src="/brand/emblem-avatar-ig.svg" alt="" className="w-6 h-6 rounded-full border border-[#D5CFC4]" />
                  <span className="font-mono text-xs font-semibold text-[#132435]">{INSTAGRAM_HANDLE}</span>
                </div>
                <span className="font-mono text-[10px] text-[#4A5E72]">1080×1350</span>
              </div>

              <div
                className={`aspect-[4/5] p-6 flex flex-col justify-between ${
                  selectedPost.theme === 'photo-recap'
                    ? 'bg-gradient-to-t from-[#132435] via-[#1D5B8C] to-[#5B7E9E] text-white'
                    : selectedPost.theme === 'wegweiser' ||
                        selectedPost.theme === 'donation-qr' ||
                        selectedPost.theme === 'ramadan-teak'
                      ? 'bg-[#132435] text-white'
                      : selectedPost.theme === 'kids'
                        ? 'bg-[#DFE8F0] text-[#132435]'
                        : selectedPost.theme === 'muslimah'
                          ? 'bg-[#F3E8DF] text-[#132435]'
                          : selectedPost.theme === 'familienlager'
                            ? 'bg-[#F4F2ED] text-[#132435]'
                            : 'bg-[#EAE6DF] text-[#132435]'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono opacity-85 border-b border-current/20 pb-2">
                  <span>VEREIN PERCIKAN IMAN · SCHWEIZ</span>
                  <span>{selectedPost.index}</span>
                </div>

                <div className="space-y-2.5">
                  <span
                    className={`inline-block font-mono text-[10px] px-2 py-0.5 rounded font-semibold ${
                      selectedPost.theme === 'ramadan-teak' || selectedPost.theme === 'wegweiser'
                        ? 'bg-[#8C5327] text-white'
                        : 'bg-white/15 border border-current/20'
                    }`}
                  >
                    {selectedPost.tag}
                  </span>
                  <h4 className="font-sans text-2xl font-extrabold tracking-tight leading-tight">
                    {selectedPost.headlineDe}
                  </h4>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {selectedPost.subtitleId}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono opacity-80 border-t border-current/20 pt-2">
                  <span>{selectedPost.meta}</span>
                  <span>UID CHE-382.914.820</span>
                </div>
              </div>

              <div className="px-3.5 py-2.5 flex items-center justify-between text-[#132435]">
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4" aria-hidden="true" />
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  <Send className="w-4 h-4" aria-hidden="true" />
                </div>
                <Bookmark className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#E1DDD4]">
              <div>
                <span className="text-xs font-bold text-[#132435] block mb-1">Layout- &amp; Textformel:</span>
                <p className="text-xs text-[#4A5E72] leading-relaxed">{selectedPost.captionFormula}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-[#132435]">Paletten-Lock:</span>
                {selectedPost.palette.map((hex) => (
                  <span
                    key={hex}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F4F2ED] border border-[#D5CFC4] font-mono text-[11px] text-[#132435]"
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-black/15" style={{ backgroundColor: hex }} />
                    {hex}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* 7. LIVE SWISS QR-RECHNUNG & TWINT DONATION CARD PREVIEW */}
      <section id="brand-qr" className="py-14 max-w-[1200px] mx-auto px-6 border-b border-[#D5CFC4]">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#1D5B8C] font-semibold mb-2">
            <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ISO 20022 Swiss QR-Code Payload · #FFFFFF Ruhezone · PostFinance &amp; TWINT-ready</span>
          </div>
          <h2 className="display-section font-extrabold text-[#132435]">
            Swiss QR-Rechnung &amp; TWINT Spendenkarte
          </h2>
          <p className="text-sm text-[#4A5E72] mt-1 max-w-[62ch]">
            Live-Vorschau für Spenden-Flyer und Web-Belege mit verifiziertem PostFinance-Konto und Vereins-UID.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Interactive Controls */}
          <div className="lg:col-span-5 bg-[#FAF9F6] rounded-xl border border-[#D5CFC4] p-6 space-y-5">
            <div>
              <label className="text-xs font-bold text-[#132435] block mb-2">
                Spendenzweck (Verwendungszweck)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {['Infaq & Vereinsbetrieb', 'Ramadan & Iftar-Hilfe', 'Kinder- & Jugendbildung'].map((purpose) => (
                  <button
                    key={purpose}
                    type="button"
                    onClick={() => setQrPurpose(purpose)}
                    aria-pressed={qrPurpose === purpose}
                    className={`min-h-9 px-3.5 py-2 rounded-lg text-xs font-semibold text-left border cursor-pointer transition-colors ${
                      qrPurpose === purpose
                        ? 'bg-[#DFE8F0] border-[#1D5B8C] text-[#1D5B8C]'
                        : 'bg-[#F4F2ED] border-[#D5CFC4] text-[#132435] hover:border-[#B8B0A2]'
                    }`}
                  >
                    {purpose}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-[#132435] block mb-2">Betrag (CHF)</span>
              <div className="flex flex-wrap gap-2">
                {[25, 50, 120, 250].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQrAmount(amt)}
                    aria-pressed={qrAmount === amt}
                    className={`min-h-9 px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold tabular-nums border cursor-pointer transition-colors ${
                      qrAmount === amt
                        ? 'bg-[#1D5B8C] text-white border-[#1D5B8C]'
                        : 'bg-[#FAF9F6] text-[#132435] border-[#D5CFC4] hover:border-[#1D5B8C]'
                    }`}
                  >
                    CHF {amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#132435] text-white space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#9CC4E4] flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" aria-hidden="true" />
                  PostFinance IBAN
                </span>
                <span className="px-2 py-0.5 rounded bg-[#8C5327] text-[11px] font-semibold">Verifiziert</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-white/10 px-3 py-2 rounded-lg">
                <code className="font-mono text-xs sm:text-sm tracking-wide tabular-nums">
                  CH89 0900 0000 6049 6610 7
                </code>
                <button
                  type="button"
                  onClick={() => copyText('CH89 0900 0000 6049 6610 7', 'PostFinance IBAN')}
                  className="min-h-8 px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Kopieren</span>
                </button>
              </div>
              <p className="text-[11px] font-mono text-white/75 tabular-nums">
                Verein Percikan Iman · 8000 Zürich · UID CHE-382.914.820
              </p>
            </div>
          </div>

          {/* Swiss QR-Bill Payment Part + TWINT Card */}
          <div className="lg:col-span-7 bg-[#FAF9F6] rounded-xl border border-[#D5CFC4] overflow-hidden">
            <div className="bg-[#E1DDD4] px-6 py-3 border-b border-[#D5CFC4] flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-[#132435]">
                ZAHLTEIL · SCHWEIZER QR-RECHNUNG (VORSCHAU)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#8C5327] text-white font-mono text-[11px] font-semibold">
                <span>TWINT kompatibel</span>
              </span>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
              {/* Swiss QR Matrix (#FFFFFF reserved strictly for SIX QR quiet zone) */}
              <div className="sm:col-span-5 flex flex-col items-center">
                <div className="relative p-3 bg-[#FFFFFF] border border-[#D5CFC4] rounded-lg">
                  {qrSvgDataUri ? (
                    <img
                      src={qrSvgDataUri}
                      alt={`Swiss QR-Code für Verein Percikan Iman Schweiz über CHF ${qrAmount}`}
                      className="w-40 h-40 object-contain"
                    />
                  ) : (
                    <div className="w-40 h-40 bg-[#FFFFFF] flex items-center justify-center font-mono text-xs text-[#4A5E72]">
                      QR wird erzeugt...
                    </div>
                  )}
                  {/* Official Black/White Swiss Cross Center Overlay */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="w-7 h-7 bg-black border-2 border-white flex items-center justify-center">
                      <div className="relative w-4 h-4">
                        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-white block" />
                        <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-white block" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 w-full grid grid-cols-2 gap-2 text-xs border-t border-dashed border-[#D5CFC4] pt-3">
                  <div>
                    <span className="text-[11px] text-[#4A5E72] block">Währung</span>
                    <strong className="font-mono text-[#132435]">CHF</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#4A5E72] block">Betrag</span>
                    <strong className="font-mono text-[#132435] tabular-nums">{qrAmount.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Payment Metadata */}
              <div className="sm:col-span-7 space-y-4 sm:border-l sm:border-dashed sm:border-[#D5CFC4] sm:pl-6 text-xs">
                <div>
                  <span className="font-mono text-[11px] font-bold text-[#132435] block mb-0.5">
                    Konto / Zahlbar an
                  </span>
                  <p className="font-mono text-[#1D5B8C] font-semibold tabular-nums">
                    CH89 0900 0000 6049 6610 7
                  </p>
                  <p className="text-[#132435] font-medium mt-0.5">Verein Percikan Iman, 8000 Zürich</p>
                  <p className="text-[#4A5E72] font-mono text-[11px] tabular-nums">UID CHE-382.914.820</p>
                </div>

                <div>
                  <span className="font-mono text-[11px] font-bold text-[#132435] block mb-0.5">
                    Zusätzliche Informationen
                  </span>
                  <p className="text-[#132435]">{qrPurpose}</p>
                  <p className="text-[#8C5327] font-semibold mt-0.5">
                    Infaq amanah · Dikelola transparan sesuai Statuta Pasal 10
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F4F2ED] border border-[#D5CFC4] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#132435] block">TWINT &amp; E-Banking</span>
                    <span className="text-[11px] text-[#4A5E72]">
                      QR-Code direkt mit Schweizer Banking-App oder TWINT scannen.
                    </span>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-[#8C5327] shrink-0" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. VOLUNTEER "3-MINUTE FIGMA FLYER" GUARDRAIL CHECKLIST */}
      <section id="brand-checklist" className="py-14 max-w-[1200px] mx-auto px-6">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-[#1D5B8C] font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>3-Schritte Figma-Workflow: Duplizieren → Text editieren → 2× PNG exportieren</span>
          </div>
          <h2 className="display-section font-extrabold text-[#132435]">
            Volunteer «3-Minuten Figma Flyer» Leitplanken
          </h2>
          <p className="text-sm text-[#4A5E72] mt-1 max-w-[62ch]">
            Der schnelle Vorher-/Nachher-Vergleich schützt @verein.pi vor uneinheitlichen Bastel-Flyern — abhaken und
            in unter drei Minuten direkt aus Figma freigeben.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* DO vs DON'T Visual Guardrails */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* DO Card */}
            <article className="bg-[#FAF9F6] rounded-xl border-2 border-[#1D5B8C] p-5 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#DFE8F0] text-[#1D5B8C] text-xs font-bold mb-4">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>DO · Greige, Cobalt &amp; Teak</span>
                </div>

                <div className="rounded-lg bg-[#EAE6DF] border border-[#D5CFC4] p-4 space-y-2.5">
                  <span className="font-mono text-[10px] text-[#1D5B8C] font-bold block">
                    VEREIN PERCIKAN IMAN · SCHWEIZ
                  </span>
                  <h3 className="font-sans text-lg font-extrabold text-[#132435] tracking-tight leading-snug">
                    Monatliches Ta’lim
                  </h3>
                  <p className="text-xs text-[#4A5E72]">
                    Kajian keluarga &amp; tadabbur surat Al-Baqarah.
                  </p>
                  <div className="pt-2 border-t border-[#D5CFC4] flex justify-between font-mono text-[10px] text-[#8C5327] font-bold">
                    <span>VOLKETSWIL</span>
                    <span>11:00 CET</span>
                  </div>
                </div>
              </div>

              <ul className="mt-4 space-y-1.5 text-xs text-[#4A5E72]">
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#1D5B8C] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>64px Figma-Rand, Plus Jakarta Sans + JetBrains Mono</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#1D5B8C] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Limestone Greige Fläche + Roasted Teak Akzent</span>
                </li>
              </ul>
            </article>

            {/* DON'T Card */}
            <article className="bg-[#FAF9F6] rounded-xl border-2 border-[#8C5327] p-5 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#F3E8DF] text-[#8C5327] text-xs font-bold mb-4">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>DON&apos;T · Markenbruch</span>
                </div>

                <div className="rounded-lg bg-gradient-to-br from-purple-500 via-pink-400 to-orange-400 p-4 text-white space-y-2 text-center">
                  <p className="text-[11px] font-bold tracking-widest uppercase">
                    ✨ DON&apos;T MISS OUT!! ✨
                  </p>
                  <p className="italic font-bold text-lg">
                    Super Kajian Weekend!!
                  </p>
                  <p className="text-[10px] bg-white/25 rounded px-2 py-1">
                    Pastell-Lila/Orange, Serif/Script &amp; enge Ränder verboten
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-1.5 text-xs text-[#4A5E72]">
                <li className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#8C5327] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Keine Regenbogen-, Lila-, Pink- oder Neon-Verläufe</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#8C5327] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Keine Serif- oder Handschrift-Schriften verwenden</span>
                </li>
              </ul>
            </article>
          </div>

          {/* Interactive 6-Step Pre-Flight Checklist */}
          <div className="lg:col-span-6 bg-[#FAF9F6] rounded-xl border border-[#D5CFC4] p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-[#E1DDD4] pb-4">
              <div>
                <h3 className="font-editorial text-xl font-bold text-[#132435]">
                  Freigabe-Checkliste vor Export
                </h3>
                <p className="text-xs text-[#4A5E72]">
                  {checkedRuleIds.length} von {FLYER_CHECKLIST.length} Prüfpunkten bestätigt ({checklistCompletion}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckedRuleIds([])}
                className="min-h-8 px-2.5 py-1 bg-[#F4F2ED] hover:bg-[#E1DDD4] border border-[#D5CFC4] rounded-lg text-xs font-semibold text-[#4A5E72] inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                <span>Reset</span>
              </button>
            </div>

            <div className="w-full h-2 bg-[#E1DDD4] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8C5327] transition-all duration-300"
                style={{ width: `${checklistCompletion}%` }}
              />
            </div>

            <div className="space-y-2.5">
              {FLYER_CHECKLIST.map((item) => {
                const isChecked = checkedRuleIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-[#F3E8DF]/65 border-[#8C5327]/45'
                        : 'bg-[#F4F2ED] border-[#D5CFC4] hover:border-[#1D5B8C]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="mt-1 h-4 w-4 rounded accent-[#8C5327]"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-[#132435] block">{item.titleDe}</span>
                      <span className="text-[#4A5E72] leading-relaxed">{item.detailId}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            {onNavigate && (
              <div className="pt-2 border-t border-[#E1DDD4] flex items-center justify-between gap-2 text-xs">
                <span className="text-[#4A5E72]">Bereit für den Event-Kalender oder Fotokatalog?</span>
                <button
                  type="button"
                  onClick={() => onNavigate('gallery')}
                  className="text-[#1D5B8C] hover:text-[#15466E] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Zur Galerie</span>
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
