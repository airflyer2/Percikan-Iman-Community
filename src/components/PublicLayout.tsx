import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { NavScreen } from '../types';
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

  const [infoModal, setInfoModal] = useState<InfoModalProps['type']>(null);
  const [isStatutenOpen, setIsStatutenOpen] = useState(false);

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': `${t.nav.home} | Verein Percikan Iman Schweiz`,
      '/programs': `${t.nav.programs} | Verein Percikan Iman Schweiz`,
      '/donate': `${t.nav.donate} | Verein Percikan Iman Schweiz`,
      '/about': `${t.nav.about} | Verein Percikan Iman Schweiz`,
      '/contact': `${t.nav.contact} | Verein Percikan Iman Schweiz`,
      '/gallery': 'Fotokatalog | Verein Percikan Iman Schweiz',
      '/login': `${t.nav.login} | Verein Percikan Iman Schweiz`,
      '/member': `${t.nav.myMembership} | Verein Percikan Iman Schweiz`,
      '/assembly': 'Vereinsversammlung (GA) | Verein Percikan Iman Schweiz',
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

      <div className="bg-white pt-22 lg:pt-24" aria-hidden="true" />

      <main id="main-content" tabIndex={-1} className="flex-grow focus:outline-none">
        <Outlet
          context={{
            onOpenStatuten: handleOpenStatuten,
            onOpenModal: handleOpenModal,
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
