import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOGO_URL, INSTAGRAM_URL, INSTAGRAM_HANDLE } from '../constants';
import { useLanguage } from '../i18n';
import { LanguageSelector } from './LanguageSelector';
import { Instagram, Camera, ExternalLink, Share2, Palette } from 'lucide-react';

interface FooterProps {
  onOpenModal: (type: 'terms' | 'privacy' | 'faq' | 'volunteer' | 'report') => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenModal }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  return (
    <footer className="bg-[#FAF9F6] border-t border-[#D5CFC4] mt-auto text-[#132435]">
      <div className="max-w-[1200px] mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-start gap-10">
        {/* Brand Col */}
        <div className="flex flex-col gap-3 max-w-sm">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="cursor-pointer self-start text-left"
          >
            <img
              src={LOGO_URL}
              alt="Percikan Iman Schweiz"
              className="h-12 w-auto object-contain inline-block"
            />
          </button>
          <p className="text-sm leading-relaxed text-[#4A5E72]">
            {t.footer.aboutText}
          </p>
          <div className="text-xs font-mono text-[#1D5B8C] font-semibold mt-1">
            {t.footer.registeredEvNotice} • UID CHE-382.914.820
          </div>
        </div>

        {/* Links Grid */}
        <nav aria-label="Footer" className="grid grid-cols-2 sm:grid-cols-3 gap-x-12 gap-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-bold text-[#132435] tracking-wide">
              {t.footer.legalSection}
            </h2>
            <button
              type="button"
              onClick={() => onOpenModal('privacy')}
              className="text-sm text-[#4A5E72] hover:text-[#1D5B8C] text-left transition-colors cursor-pointer py-0.5"
            >
              {t.footer.privacy}
            </button>
            <button
              type="button"
              onClick={() => onOpenModal('terms')}
              className="text-sm text-[#4A5E72] hover:text-[#1D5B8C] text-left transition-colors cursor-pointer py-0.5"
            >
              {t.footer.statutes}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-bold text-[#132435] tracking-wide">
              {t.footer.quickLinks}
            </h2>
            <button
              type="button"
              onClick={() => navigate('/programs')}
              className="text-sm text-[#4A5E72] hover:text-[#1D5B8C] text-left transition-colors cursor-pointer py-0.5"
            >
              {t.nav.programs}
            </button>
            <button
              type="button"
              onClick={() => navigate('/donate')}
              className="text-sm text-[#4A5E72] hover:text-[#1D5B8C] text-left transition-colors cursor-pointer py-0.5"
            >
              {t.nav.donate}
            </button>
            <button
              type="button"
              onClick={() => navigate('/gallery')}
              className="text-sm text-[#4A5E72] hover:text-[#1D5B8C] text-left transition-colors cursor-pointer flex items-center gap-1.5 py-0.5"
            >
              <Camera className="w-3.5 h-3.5 text-[#1D5B8C]" aria-hidden="true" />
              <span>Fotokatalog (Events)</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/brand')}
              className="text-sm text-[#4A5E72] hover:text-[#1D5B8C] text-left transition-colors cursor-pointer flex items-center gap-1.5 py-0.5"
            >
              <Palette className="w-3.5 h-3.5 text-[#1D5B8C]" aria-hidden="true" />
              <span>{t.nav.brandKit}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenModal('report')}
              className="text-sm text-[#4A5E72] hover:text-[#1D5B8C] text-left transition-colors cursor-pointer py-0.5"
            >
              {t.footer.transparencyReport}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-bold text-[#132435] tracking-wide">
              {t.nav.about}
            </h2>
            <button
              type="button"
              onClick={() => onOpenModal('faq')}
              className="text-sm text-[#4A5E72] hover:text-[#1D5B8C] text-left transition-colors cursor-pointer py-0.5"
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="text-sm text-[#4A5E72] hover:text-[#1D5B8C] text-left transition-colors cursor-pointer py-0.5"
            >
              {t.nav.contact}
            </button>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#132435] hover:text-[#1D5B8C] hover:underline text-left transition-colors inline-flex items-center gap-1.5 font-medium py-0.5"
            >
              <Instagram className="w-4 h-4 text-[#8C5327]" aria-hidden="true" />
              <span>{INSTAGRAM_HANDLE}</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        </nav>
      </div>

      {/* Bottom Bar with Language Selector */}
      <div className="max-w-[1200px] mx-auto px-6 py-5 border-t border-[#E1DDD4] flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#4A5E72]">
        <p className="text-xs sm:text-sm text-center md:text-left">
          © {new Date().getFullYear()} Verein Percikan Iman Schweiz. {t.footer.rightsReserved}
        </p>

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <LanguageSelector variant="footer" />

          <button
            type="button"
            onClick={handleShare}
            className="min-h-9 min-w-9 text-[#4A5E72] hover:text-[#132435] transition-colors px-3 py-1.5 rounded-lg bg-[#EAE6DF] hover:bg-[#E1DDD4] border border-[#D5CFC4] relative cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium"
          >
            <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{shareCopied ? 'Link kopiert' : 'Link teilen'}</span>
          </button>
        </div>
      </div>
    </footer>
  );
};
