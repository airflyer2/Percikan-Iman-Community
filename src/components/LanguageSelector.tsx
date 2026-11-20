import React, { useState, useRef, useEffect } from 'react';
import { useLanguage, LANGUAGE_OPTIONS } from '../i18n';
import { SupportedLanguage } from '../i18n/types';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'navbar' | 'footer' | 'mobile';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'navbar',
  className = ''
}) => {
  const { language, setLanguage, currentOption } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'footer') {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        <span className="text-xs text-[#566771] dark:text-[#a0b0c0] mr-1 inline-flex items-center gap-1">
          <Globe className="w-3.5 h-3.5" />
          <span>Sprache / Language:</span>
        </span>
        {LANGUAGE_OPTIONS.map((opt) => (
          <button
            key={opt.code}
            onClick={() => handleSelect(opt.code)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 border ${
              language === opt.code
                ? 'bg-[#006191] text-white border-[#006191] shadow-2xs'
                : 'bg-white text-[#566771] border-gray-200 hover:bg-gray-50'
            }`}
            title={`${opt.nativeName} (${opt.name})${opt.isMain ? ' - Hauptsprache / Main' : ''}`}
          >
            <span>{opt.flag}</span>
            <span className="uppercase font-semibold tracking-wider">{opt.code}</span>
            {opt.isMain && (
              <span className="text-[9px] opacity-75 font-normal">DE</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'mobile') {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="text-xs font-semibold text-[#566771] uppercase tracking-wider flex items-center gap-1.5 px-2 mb-1">
          <Globe className="w-3.5 h-3.5 text-[#006191]" />
          <span>Sprache wählen / Select Language</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => handleSelect(opt.code)}
              className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                language === opt.code
                  ? 'bg-blue-50 border-[#006191] text-[#006191] font-bold shadow-2xs'
                  : 'bg-white border-gray-200 text-[#3f4850] hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{opt.flag}</span>
                <div className="text-left">
                  <div className="leading-none">{opt.nativeName}</div>
                  <div className="text-[10px] text-gray-400 font-normal">
                    {opt.code.toUpperCase()}
                    {opt.isMain ? ' • Hauptsprache' : ''}
                  </div>
                </div>
              </div>
              {language === opt.code && <Check className="w-3.5 h-3.5 text-[#006191]" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Default navbar dropdown
  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[#bec7d2]/70 bg-white/90 hover:bg-white text-[#121c2a] text-xs font-medium transition-all shadow-2xs hover:border-[#006191] cursor-pointer"
        title="Sprache wechseln / Switch Language"
        aria-label="Language selector"
      >
        <span className="text-sm">{currentOption.flag}</span>
        <span className="font-semibold uppercase tracking-wider text-[#006191]">
          {currentOption.code}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-[#566771] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-[#bec7d2]/40 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#566771] border-b border-gray-100 flex items-center justify-between">
            <span>Sprache / Language</span>
            <Globe className="w-3 h-3 text-[#006191]" />
          </div>
          <div className="py-1">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                onClick={() => handleSelect(opt.code)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors cursor-pointer text-left ${
                  language === opt.code
                    ? 'bg-[#eff3ff] text-[#006191] font-bold'
                    : 'text-[#3f4850] hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base leading-none">{opt.flag}</span>
                  <div>
                    <div className="leading-tight flex items-center gap-1.5">
                      <span>{opt.nativeName}</span>
                      {opt.isMain && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          Hauptsprache
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 font-normal">
                      {opt.name} ({opt.code.toUpperCase()})
                    </div>
                  </div>
                </div>
                {language === opt.code && (
                  <Check className="w-4 h-4 text-[#006191] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
