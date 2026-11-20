import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../src/lib/firebase', () => ({
  getFirebaseServices: vi.fn(() => null),
  isFirebaseConfigured: vi.fn(() => false),
  getFirebaseOptions: vi.fn(() => null)
}));

import App from '../src/App';
import { BrandStyleguideView } from '../src/components/BrandStyleguideView';
import { LanguageProvider } from '../src/i18n';

const BRAND_FILES = [
  'logo-primary.svg',
  'logo-monochrome-ink.svg',
  'logo-reverse-white.svg',
  'logo-duotone-civic.svg',
  'emblem-mark.svg',
  'emblem-avatar-ig.svg',
  'pattern-swiss-nusantara.svg',
  'motif-corner-stamp.svg',
  'motif-kawung-divider.svg',
  'motif-topographic-ribbon.svg',
  'motif-teak-signpost.svg'
];

function ensureTestLocalStorage(): void {
  if (
    typeof window !== 'undefined' &&
    (!window.localStorage ||
      typeof window.localStorage.setItem !== 'function' ||
      !globalThis.localStorage ||
      typeof globalThis.localStorage.setItem !== 'function')
  ) {
    const store = new Map<string, string>();
    const memoryStorage: Storage = {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(String(key), String(value));
      }
    };
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      enumerable: true,
      value: memoryStorage,
      writable: true
    });
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      enumerable: true,
      value: memoryStorage,
      writable: true
    });
  }
}

describe('v2 Brand Kit SVGs, Greige/Blue/Teak Tokens & /brand Styleguide Route', () => {
  beforeEach(() => {
    ensureTestLocalStorage();
    window.scrollTo = vi.fn();
    window.localStorage.setItem('percikan_iman_language', 'de');
    window.history.replaceState({}, '', '/');
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/');
    window.location.hash = '';
  });

  it('ships all 11 clean C2PA-free, Jade-free v2 SVGs in public/brand/ without modifying public/logo.svg', () => {
    const publicDir = path.resolve(process.cwd(), 'public');
    const brandDir = path.join(publicDir, 'brand');
    const originalLogo = fs.readFileSync(path.join(publicDir, 'logo.svg'), 'utf8');
    expect(originalLogo).toContain('<c2pa:manifest>');

    for (const fileName of BRAND_FILES) {
      const filePath = path.join(brandDir, fileName);
      expect(fs.existsSync(filePath), `Expected ${fileName} to exist`).toBe(true);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('<svg');
      expect(content).toContain('</svg>');
      expect(content).not.toContain('c2pa:manifest');
      expect(content.toUpperCase()).not.toContain('#0D6E52');
      expect(content.toUpperCase()).not.toContain('#E7F3EE');
    }

    const avatarSvg = fs.readFileSync(path.join(brandDir, 'emblem-avatar-ig.svg'), 'utf8');
    expect(avatarSvg).toContain('viewBox="0 0 1080 1080"');
    expect(avatarSvg).toContain('#EAE6DF');

    const emblemSvg = fs.readFileSync(path.join(brandDir, 'emblem-mark.svg'), 'utf8');
    expect(emblemSvg).toContain('viewBox="820 238 172 192"');

    const duotoneSvg = fs.readFileSync(path.join(brandDir, 'logo-duotone-civic.svg'), 'utf8');
    expect(duotoneSvg).toContain('#1D5B8C');
    expect(duotoneSvg).toContain('#8C5327');
  });

  it('enforces strictly 2 non-serif fonts (zero Newsreader) and v2 Greige/Cobalt/Steel/Teak tokens in index.html & src/index.css', () => {
    const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
    expect(indexHtml).not.toMatch(/Newsreader/i);
    expect(indexHtml).toContain('Plus+Jakarta+Sans');
    expect(indexHtml).toContain('JetBrains+Mono');
    expect(indexHtml).toContain('bg-[#EAE6DF]');
    expect(indexHtml).toContain('text-[#132435]');

    const indexCss = fs.readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
    expect(indexCss).not.toMatch(/Newsreader/i);
    expect(indexCss).toContain('#EAE6DF');
    expect(indexCss).toContain('#1D5B8C');
    expect(indexCss).toContain('#5B7E9E');
    expect(indexCss).toContain('#8C5327');
  });

  it('renders BrandStyleguideView when initializing App at /brand pathname and #brand hash', () => {
    window.history.replaceState({}, '', '/brand');
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Swiss Civic Atelier × Archipelago Nusantara/i })
    ).toBeInTheDocument();
    expect(document.title).toContain('Brand Kit & Design System');

    cleanup();
    window.history.replaceState({}, '', '/');
    window.location.hash = '#brand';
    render(<App />);
    expect(
      screen.getByRole('heading', { level: 1, name: /Swiss Civic Atelier × Archipelago Nusantara/i })
    ).toBeInTheDocument();
  });

  it('navigates from Footer Brand Kit button to /brand and updates browser pathname', () => {
    window.history.replaceState({}, '', '/');
    render(<App />);

    const footerBrandButton = screen.getByRole('button', { name: /Brand Kit & Design System/i });
    fireEvent.click(footerBrandButton);

    expect(window.location.pathname).toBe('/brand');
    expect(
      screen.getByRole('heading', { level: 2, name: /Logo-System & Avatar Lab/i })
    ).toBeInTheDocument();

    const homeNavBtn = screen.getByRole('button', { name: /Verein Percikan Iman Schweiz — Home/i });
    fireEvent.click(homeNavBtn);
    expect(window.location.pathname).toBe('/');
  });

  it('renders all v2 Brand Identity sections, all 11 SVG downloads, Greige/Blue/Teak tokens, zero Newsreader/Canva, and interactive controls', async () => {
    const { container } = render(
      <LanguageProvider>
        <BrandStyleguideView />
      </LanguageProvider>
    );

    const renderedText = container.textContent || '';
    expect(renderedText).not.toMatch(/Newsreader/i);
    expect(renderedText).not.toMatch(/\bCanva\b/i);
    expect(renderedText.toUpperCase()).not.toContain('#0D6E52');
    expect(renderedText.toUpperCase()).not.toContain('#E7F3EE');

    // Core v2 section headings
    expect(screen.getByRole('heading', { name: /Logo-System & Avatar Lab/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Modular Motif Lab \(«Anatomy of the Spark»\)/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Farb-Token Matrix/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Typografie & Dual-Track Regel/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /@verein\.pi Instagram Makeover/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Swiss QR-Rechnung & TWINT Spendenkarte/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Volunteer «3-Minuten Figma Flyer» Leitplanken/i })).toBeInTheDocument();

    // All 11 SVG download links present
    const downloadLinks = screen.getAllByRole('link', { name: /SVG laden/i });
    const hrefs = downloadLinks.map((link) => link.getAttribute('href'));
    for (const fileName of BRAND_FILES) {
      expect(hrefs).toContain(`/brand/${fileName}`);
    }

    // Locked v2 color hex tokens visible in matrix
    expect(screen.getAllByText('#EAE6DF').length).toBeGreaterThan(0);
    expect(screen.getAllByText('#1D5B8C').length).toBeGreaterThan(0);
    expect(screen.getAllByText('#5B7E9E').length).toBeGreaterThan(0);
    expect(screen.getAllByText('#8C5327').length).toBeGreaterThan(0);

    // Legal & banking metadata
    expect(screen.getAllByText(/CH89 0900 0000 6049 6610 7/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CHE-382\.914\.820/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/8000 Zürich/i).length).toBeGreaterThan(0);

    // Live QR SVG generated asynchronously via qrcode
    await waitFor(() => {
      const qrImg = screen.getByAltText(/Swiss QR-Code für Verein Percikan Iman Schweiz/i);
      expect(qrImg.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
    });

    // Interactive QR amount preset updates payment display
    fireEvent.click(screen.getByRole('button', { name: 'CHF 120' }));
    expect(screen.getByText('120.00')).toBeInTheDocument();

    // Interactive Motif colorway toggle
    const iceMistBtn = screen.getByRole('button', { name: /Ice-Blue Mist \(#DFE8F0\)/i });
    fireEvent.click(iceMistBtn);
    expect(iceMistBtn).toHaveAttribute('aria-pressed', 'true');

    // Interactive IG grid tile updates inspector
    fireEvent.click(screen.getByRole('button', { name: /RAMADAN 1447H/i }));
    expect(screen.getByRole('heading', { name: /Ramadan \/ Eid Grusskarte/i })).toBeInTheDocument();

    // Interactive surface toggle in Logo Lab
    const deepSlateBtn = screen.getByRole('button', { name: /Deep Slate-Blue #132435/i });
    fireEvent.click(deepSlateBtn);
    expect(deepSlateBtn).toHaveAttribute('aria-pressed', 'true');

    // Interactive checklist completion update (starts at 2/6 = 33%, toggling a 3rd gives 50%)
    expect(screen.getByText(/2 von 6 Prüfpunkten bestätigt \(33%\)/i)).toBeInTheDocument();
    const headerRuleCheckbox = screen.getByLabelText(/Mikro-Absender oben links/i);
    fireEvent.click(headerRuleCheckbox);
    expect(screen.getByText(/3 von 6 Prüfpunkten bestätigt \(50%\)/i)).toBeInTheDocument();
  });
});
