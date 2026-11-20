import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Megaphone } from 'lucide-react';
import { useLanguage } from '../i18n';
import { subscribeSiteNotice } from '../lib/firestoreContent';
import { NavScreen, SiteNotice } from '../types';
import { Footer } from './Footer';
import { InfoModalProps, InfoModals } from './InfoModals';
import { Navbar } from './Navbar';
import { StatutenModal } from './StatutenModal';

export interface PublicLayoutOutletContext {
  onOpenStatuten: () => void;
  onOpenModal: (type: InfoModalProps['type']) => void;
}

export function usePublicLayout(): PublicLayoutOutletContext | null {
  try {
    return useOutletContext<PublicLayoutOutletContext | null>() ?? null;
  } catch {
    return null;
  }
}

export function normalizeScreenToPath(screen: NavScreen | string): string {
  const clean = String(screen || '').trim().toLowerCase();
  switch (clean) {
    case 'home':
    case '':
      return '/';
    case 'auth':
    case 'login':
      return '/login';
    case 'programs':
    case 'donate':
    case 'gallery':
    case 'about':
    case 'contact':
    case 'brand':
    case 'member':
    case 'assembly':
      return `/${clean}`;
    default:
      return '/';
  }
}

export const PublicLayout: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [siteNotice, setSiteNotice] = useState<SiteNotice | null>(null);
  const [infoModal, setInfoModal] = useState<InfoModalProps['type']>(null);
  const [isStatutenOpen, setIsStatutenOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeSiteNotice((res) => {
      setSiteNotice(res.data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': `${t.nav.home} | Verein Percikan Iman Schweiz`,
      '/programs': `${t.nav.programs} | Verein Percikan Iman Schweiz`,
      '/donate': `${t.nav.donate} | Verein Percikan Iman Schweiz`,
      '/about': `${t.nav.about} | Verein Percikan Iman Schweiz`,
      '/contact': `${t.nav.contact} | Verein Percikan Iman Schweiz`,
      '/gallery': 'Fotokatalog | Verein Percikan Iman Schweiz',
      '/brand': `${t.nav.brandKit} | Verein Percikan Iman Schweiz`,
      '/login': `${t.nav.login} | Verein Percikan Iman Schweiz`,
      '/member': `${t.nav.myMembership} | Verein Percikan Iman Schweiz`,
      '/assembly': 'Vereinsversammlung (GA) | Verein Percikan Iman Schweiz'
    };
    document.title =
      titles[location.pathname] || 'Verein Percikan Iman Schweiz — Gemeinschaft & Transparenz';
  }, [location.pathname, t]);

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // ignore in jsdom / unsupported environments
    }
  }, [location.pathname]);

  const handleOpenStatuten = () => setIsStatutenOpen(true);
  const handleOpenModal = (type: InfoModalProps['type']) => {
    if (type === 'statutes') {
      setIsStatutenOpen(true);
    } else {
      setInfoModal(type);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#EAE6DF] text-[#132435] selection:bg-[#DFE8F0] selection:text-[#132435]">
      <a href="#main-content" className="skip-link visually-hidden">
        Skip to main content
      </a>

      <Navbar />

      <div className="pt-20 lg:pt-22">
        {siteNotice?.enabled && (
          <div
            data-testid="site-notice"
            className="bg-[#132435] text-[#FAF9F6] py-2.5 px-6 border-b border-[#132435]"
          >
            <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2.5 py-0.5 rounded-md bg-[#8C5327] text-white text-[11px] font-semibold tracking-wide flex items-center gap-1.5 shrink-0">
                  <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{siteNotice.badge}</span>
                </span>
                <span className="text-[#FAF9F6]/90 font-normal">{siteNotice.message}</span>
              </div>
              {siteNotice.linkText && siteNotice.linkScreen && (
                <button
                  type="button"
                  onClick={() => navigate(normalizeScreenToPath(siteNotice.linkScreen!))}
                  className="shrink-0 text-[#9CC4E4] hover:text-white font-semibold underline underline-offset-4 transition-colors inline-flex items-center gap-1.5 cursor-pointer min-h-6"
                >
                  <span>{siteNotice.linkText}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <main id="main-content" tabIndex={-1} className="flex-grow focus:outline-none">
        <Outlet
          context={{
            onOpenStatuten: handleOpenStatuten,
            onOpenModal: handleOpenModal
          }}
        />
      </main>

      <Footer onOpenModal={(type) => handleOpenModal(type)} />

      <InfoModals
        type={infoModal}
        onClose={() => setInfoModal(null)}
        onOpenStatutes={() => {
          setInfoModal(null);
          setIsStatutenOpen(true);
        }}
      />

      <StatutenModal
        isOpen={isStatutenOpen}
        onClose={() => setIsStatutenOpen(false)}
      />
    </div>
  );
};
