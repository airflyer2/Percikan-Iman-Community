import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { LOGO_URL } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import { subscribeGaSession } from '../lib/firestoreAssembly';
import { LanguageSelector } from './LanguageSelector';
import { RollingTextButton } from './RollingTextButton';
import {
  Menu,
  X,
  Users,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  QrCode,
  Vote,
  Camera,
} from 'lucide-react';

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export const Navbar: React.FC = () => {
  const { t } = useLanguage();
  const { currentUser, hasFullAdmin, canManageBoard, canScanQR, hasAnyStaffRole, signOut } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isGASessionOpen, setIsGASessionOpen] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuOpenRef = useRef(mobileMenuOpen);
  const userDropdownOpenRef = useRef(userDropdownOpen);
  const isHiddenRef = useRef(false);

  mobileMenuOpenRef.current = mobileMenuOpen;
  userDropdownOpenRef.current = userDropdownOpen;

  useEffect(() => {
    if (!currentUser?.uid) {
      setIsGASessionOpen(false);
      return;
    }

    const unsub = subscribeGaSession((res) => {
      setIsGASessionOpen(Boolean(res.data?.isOpen));
    });
    return () => unsub();
  }, [currentUser?.uid]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      headerRef.current &&
      isHiddenRef.current
    ) {
      isHiddenRef.current = false;
      gsap.to(headerRef.current, {
        yPercent: 0,
        opacity: 1,
        duration: 0.28,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!userDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userDropdownOpen]);

  // Force header visible whenever either menu opens
  useEffect(() => {
    if (!mobileMenuOpen && !userDropdownOpen) return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    if (!headerRef.current) return;

    isHiddenRef.current = false;
    gsap.to(headerRef.current, {
      yPercent: 0,
      opacity: 1,
      duration: 0.28,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  }, [mobileMenuOpen, userDropdownOpen]);

  // GSAP ScrollTrigger directional auto-hide
  useGSAP(
    () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      if (!headerRef.current) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          motionOk: '(prefers-reduced-motion: no-preference)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { reduceMotion } = context.conditions ?? {};
          if (reduceMotion) return;

          const showHeader = () => {
            if (!headerRef.current || !isHiddenRef.current) return;
            isHiddenRef.current = false;
            gsap.to(headerRef.current, {
              yPercent: 0,
              opacity: 1,
              duration: 0.28,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          };

          const hideHeader = () => {
            if (!headerRef.current || isHiddenRef.current) return;
            isHiddenRef.current = true;
            gsap.to(headerRef.current, {
              yPercent: -135,
              opacity: 0,
              duration: 0.32,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          };

          const trigger = ScrollTrigger.create({
            start: 0,
            end: 'max',
            onUpdate: (self) => {
              if (mobileMenuOpenRef.current || userDropdownOpenRef.current) {
                showHeader();
                return;
              }
              const scrollY = self.scroll();
              if (scrollY > 90 && self.direction === 1) {
                hideHeader();
              } else if (self.direction === -1 || scrollY <= 80) {
                showHeader();
              }
            },
          });

          return () => {
            trigger.kill();
            isHiddenRef.current = false;
            if (headerRef.current) {
              gsap.set(headerRef.current, { yPercent: 0, opacity: 1 });
            }
          };
        }
      );

      return () => mm.revert();
    },
    { scope: headerRef }
  );

  const handleRevealOnFocus = () => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function' ||
      !headerRef.current ||
      !isHiddenRef.current
    ) {
      return;
    }
    isHiddenRef.current = false;
    gsap.to(headerRef.current, {
      yPercent: 0,
      opacity: 1,
      duration: 0.28,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  };

  const handleNav = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    await signOut();
    if (location.pathname === '/member' || location.pathname === '/assembly') {
      navigate('/programs', { replace: true });
    }
  };

  const hasDenseNav = Boolean(currentUser && (isGASessionOpen || hasFullAdmin));

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `min-h-9 ${
      hasDenseNav
        ? 'px-1.5 min-[1380px]:px-2 py-1.5 text-xs min-[1440px]:text-[13px]'
        : 'px-2.5 py-1.5 text-xs xl:text-[13px]'
    } rounded-full whitespace-nowrap shrink-0 cursor-pointer transition-colors inline-flex items-center gap-1 ${
      isActive
        ? 'text-[#132435] font-bold bg-[#E1DDD4]'
        : 'text-[#4A5E72] font-medium hover:text-[#132435] hover:bg-[#F4F2ED]'
    }`;

  const navIconClass = hasDenseNav
    ? 'w-3.5 h-3.5 text-[#1D5B8C] shrink-0 hidden min-[1380px]:inline-block'
    : 'w-3.5 h-3.5 text-[#1D5B8C] shrink-0';

  const isRouteActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header
      ref={headerRef}
      onFocusCapture={handleRevealOnFocus}
      className="fixed top-3 inset-x-0 z-50 px-3 sm:px-6 pointer-events-none"
    >
      <nav
        aria-label="Primary"
        className="pointer-events-auto max-w-[1360px] mx-auto rounded-2xl lg:rounded-full bg-white/94 backdrop-blur-md border border-[#DCE2DF] shadow-[0_10px_30px_-10px_rgba(15,29,38,0.16),0_2px_8px_-2px_rgba(15,29,38,0.06)] px-3 sm:px-5 h-16 lg:h-[68px] flex justify-between items-center w-full gap-2"
      >
        {/* Institutional Logo Lockup */}
        <button
          type="button"
          onClick={() => handleNav('/')}
          aria-label="Verein Percikan Iman Schweiz — Home"
          className="flex items-center gap-2.5 text-left group cursor-pointer shrink-0 py-1 rounded-full"
        >
          <img
            src={LOGO_URL}
            alt="Percikan Iman Schweiz"
            className={`${
              hasDenseNav ? 'h-8 2xl:h-9' : 'h-8 sm:h-9 lg:h-10'
            } w-auto object-contain transition-transform group-hover:scale-102`}
          />
        </button>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-0.5 xl:gap-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLink to="/" end className={navLinkClass}>
            {t.nav.home}
          </NavLink>

          <NavLink to="/programs" className={navLinkClass}>
            {t.nav.programs}
          </NavLink>

          <NavLink to="/donate" className={navLinkClass}>
            {t.nav.donate}
          </NavLink>

          <NavLink to="/gallery" className={navLinkClass}>
            <Camera className={navIconClass} aria-hidden="true" />
            <span>Galerie</span>
          </NavLink>

          {currentUser && (isGASessionOpen || hasFullAdmin) && (
            <NavLink to="/assembly" className={navLinkClass}>
              <Vote className={navIconClass} aria-hidden="true" />
              <span>General Assembly</span>
              {isGASessionOpen ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F3E8DF] text-[#8C5327]">
                  Live
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#DFE8F0] text-[#1D5B8C]">
                  Prep
                </span>
              )}
            </NavLink>
          )}

          <NavLink to="/about" className={navLinkClass}>
            {t.nav.about}
          </NavLink>

          <NavLink to="/contact" className={navLinkClass}>
            {t.nav.contact}
          </NavLink>

          {/* Member Profile Link (Visible when logged in) */}
          {currentUser && (
            <NavLink to="/member" className={navLinkClass}>
              <Users className={navIconClass} aria-hidden="true" />
              <span>{t.nav.myMembership}</span>
              {currentUser.membershipCategory === 'family' && (
                <span className="text-[10px] px-1.5 py-0.5 bg-[#DFE8F0] text-[#1D5B8C] rounded-full font-semibold">
                  {t.nav.familyTag}
                </span>
              )}
            </NavLink>
          )}
        </div>

        {/* Action Controls & Account Dropdown */}
        <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0">
          <LanguageSelector variant="navbar" />

          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-expanded={userDropdownOpen}
                className="min-h-9 flex items-center gap-1.5 px-2.5 py-1.5 bg-[#E1DDD4] text-[#132435] rounded-full text-xs font-semibold border border-[#D5CFC4] hover:border-[#B8B0A2] transition-colors cursor-pointer"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover border border-[#1D5B8C] shrink-0"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="w-6 h-6 rounded-full bg-[#1D5B8C] text-white flex items-center justify-center text-xs font-bold shrink-0"
                  >
                    {currentUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span
                  className={`${
                    hasDenseNav ? 'max-w-[96px] min-[1380px]:max-w-[130px]' : 'max-w-[130px]'
                  } truncate`}
                >
                  {currentUser.name}
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#8C5327] shrink-0" aria-hidden="true" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#FAF9F6] rounded-2xl shadow-lg border border-[#D5CFC4] p-2 z-50">
                  <div className="px-3 py-2 border-b border-[#E1DDD4] mb-1">
                    <p className="text-xs text-[#4A5E72]">{t.nav.welcomeBack}</p>
                    <p className="text-sm font-semibold text-[#132435] truncate">
                      {currentUser.email}
                    </p>
                    {currentUser.memberCode && (
                      <span className="inline-block mt-1 text-[11px] font-mono font-semibold px-2 py-0.5 bg-[#DFE8F0] text-[#1D5B8C] rounded">
                        ID: {currentUser.memberCode}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleNav('/member');
                    }}
                    className="w-full min-h-9 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#132435] hover:bg-[#EAE6DF] rounded-lg text-left transition-colors cursor-pointer mb-1"
                  >
                    <Users className="w-3.5 h-3.5 text-[#1D5B8C]" aria-hidden="true" />
                    <span>{t.nav.myMembership}</span>
                  </button>
                  {hasAnyStaffRole && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleNav('/admin');
                      }}
                      className="w-full min-h-9 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#132435] hover:bg-[#EAE6DF] rounded-lg text-left transition-colors cursor-pointer mb-1"
                    >
                      {canScanQR && !hasFullAdmin ? (
                        <>
                          <QrCode className="w-3.5 h-3.5 text-[#8C5327]" aria-hidden="true" />
                          <span>Event QR Scanner</span>
                        </>
                      ) : canManageBoard && !hasFullAdmin ? (
                        <>
                          <Users className="w-3.5 h-3.5 text-[#1D5B8C]" aria-hidden="true" />
                          <span>Board Management</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-[#1D5B8C]" aria-hidden="true" />
                          <span>{t.nav.admin}</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="w-full min-h-9 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#8C5327] hover:bg-[#F3E8DF] rounded-lg text-left transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.nav.logout}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <RollingTextButton
              label={t.nav.login}
              magnetic={false}
              onClick={() => handleNav('/login')}
              className="min-h-9 bg-[#1D5B8C] hover:bg-[#15466E] text-white px-4 py-1.5 rounded-full font-semibold text-xs inline-flex items-center justify-center transition-colors cursor-pointer shrink-0"
            />
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          {currentUser && (
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-[#1D5B8C] text-white flex items-center justify-center text-xs font-bold"
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="min-h-10 min-w-10 p-2 text-[#132435] hover:bg-[#E1DDD4] rounded-full inline-flex items-center justify-center cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto lg:hidden mt-2 max-w-[1360px] mx-auto bg-white/96 backdrop-blur-md border border-[#DCE2DF] rounded-2xl px-5 py-4 space-y-2 shadow-[0_16px_40px_-12px_rgba(15,29,38,0.2)] max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="pb-3 border-b border-[#E1DDD4]">
            <LanguageSelector variant="mobile" />
          </div>

          <button
            type="button"
            onClick={() => handleNav('/')}
            className={`block w-full text-left py-2.5 px-3 rounded-lg font-medium ${
              isRouteActive('/') ? 'bg-[#E1DDD4] text-[#132435] font-bold' : 'text-[#4A5E72]'
            }`}
          >
            {t.nav.home}
          </button>
          <button
            type="button"
            onClick={() => handleNav('/programs')}
            className={`block w-full text-left py-2.5 px-3 rounded-lg font-medium ${
              isRouteActive('/programs')
                ? 'bg-[#E1DDD4] text-[#132435] font-bold'
                : 'text-[#4A5E72]'
            }`}
          >
            {t.nav.programs}
          </button>
          <button
            type="button"
            onClick={() => handleNav('/donate')}
            className={`block w-full text-left py-2.5 px-3 rounded-lg font-medium ${
              isRouteActive('/donate')
                ? 'bg-[#E1DDD4] text-[#132435] font-bold'
                : 'text-[#4A5E72]'
            }`}
          >
            {t.nav.donate}
          </button>
          <button
            type="button"
            onClick={() => handleNav('/gallery')}
            className={`block w-full text-left py-2.5 px-3 rounded-lg font-medium flex items-center gap-2 ${
              isRouteActive('/gallery')
                ? 'bg-[#E1DDD4] text-[#132435] font-bold'
                : 'text-[#4A5E72]'
            }`}
          >
            <Camera className="w-4 h-4 text-[#1D5B8C]" aria-hidden="true" />
            <span>Fotokatalog (Galerie)</span>
          </button>
          {currentUser && (isGASessionOpen || hasFullAdmin) && (
            <button
              type="button"
              onClick={() => handleNav('/assembly')}
              className={`block w-full text-left py-2.5 px-3 rounded-lg font-medium flex items-center justify-between ${
                isRouteActive('/assembly')
                  ? 'bg-[#E1DDD4] text-[#132435] font-bold'
                  : 'text-[#4A5E72]'
              }`}
            >
              <span className="flex items-center gap-2">
                <Vote className="w-4 h-4 text-[#1D5B8C]" aria-hidden="true" />
                <span>General Assembly</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3E8DF] text-[#8C5327]">
                {isGASessionOpen ? 'Live' : 'Prep'}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleNav('/about')}
            className={`block w-full text-left py-2.5 px-3 rounded-lg font-medium ${
              isRouteActive('/about') ? 'bg-[#E1DDD4] text-[#132435] font-bold' : 'text-[#4A5E72]'
            }`}
          >
            {t.nav.about}
          </button>
          <button
            type="button"
            onClick={() => handleNav('/contact')}
            className={`block w-full text-left py-2.5 px-3 rounded-lg font-medium ${
              isRouteActive('/contact')
                ? 'bg-[#E1DDD4] text-[#132435] font-bold'
                : 'text-[#4A5E72]'
            }`}
          >
            {t.nav.contact}
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={() => handleNav('/member')}
              className={`block w-full text-left py-2.5 px-3 rounded-lg font-medium flex items-center gap-2 ${
                isRouteActive('/member')
                  ? 'bg-[#E1DDD4] text-[#132435] font-bold'
                  : 'text-[#4A5E72]'
              }`}
            >
              <Users className="w-4 h-4 text-[#1D5B8C]" aria-hidden="true" />
              <span>{t.nav.myMembership}</span>
              {currentUser.membershipCategory === 'family' && (
                <span className="text-[11px] px-1.5 py-0.5 bg-[#DFE8F0] text-[#1D5B8C] rounded-full font-semibold">
                  {t.nav.familyTag}
                </span>
              )}
            </button>
          )}

          <div className="pt-3 border-t border-[#E1DDD4] flex flex-col gap-2">
            {currentUser ? (
              <div className="flex items-center justify-between pt-1">
                <div className="text-sm min-w-0 pr-2">
                  <p className="font-semibold text-[#132435] truncate">{currentUser.name}</p>
                  <p className="text-xs text-[#4A5E72] truncate">{currentUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="min-h-9 px-3.5 py-1.5 text-xs text-[#8C5327] bg-[#F3E8DF] rounded-full font-semibold shrink-0"
                >
                  {t.nav.logout}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleNav('/login')}
                className="w-full min-h-11 py-2.5 bg-[#1D5B8C] text-white rounded-full font-semibold text-sm"
              >
                {t.nav.login}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
