import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LOGO_URL } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import { subscribeGaSession } from '../lib/firestoreAssembly';
import { LanguageSelector } from './LanguageSelector';
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
  Palette
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { t } = useLanguage();
  const { currentUser, hasFullAdmin, canManageBoard, canScanQR, hasAnyStaffRole, signOut } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isGASessionOpen, setIsGASessionOpen] = useState(false);

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
  }, [location.pathname]);

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

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `min-h-10 px-1.5 xl:px-2 py-1.5 rounded-lg text-[13px] whitespace-nowrap shrink-0 cursor-pointer transition-colors inline-flex items-center gap-1 ${
      isActive
        ? 'text-[#132435] font-bold bg-[#E1DDD4]'
        : 'text-[#4A5E72] font-medium hover:text-[#132435] hover:bg-[#F4F2ED]'
    }`;

  const isRouteActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header className="bg-[#FAF9F6]/95 backdrop-blur-md fixed top-0 inset-x-0 z-50 border-b border-[#D5CFC4]">
      <nav
        aria-label="Primary"
        className="max-w-[1360px] mx-auto px-4 lg:px-5 h-20 lg:h-22 flex justify-between items-center w-full gap-2 lg:gap-3"
      >
        {/* Institutional Logo Lockup (kept as <button> for brandStyleguide.test.tsx) */}
        <button
          type="button"
          onClick={() => handleNav('/')}
          aria-label="Verein Percikan Iman Schweiz — Home"
          className="flex items-center gap-3 text-left group cursor-pointer shrink-0 py-1 rounded-lg"
        >
          <img
            src={LOGO_URL}
            alt="Percikan Iman Schweiz"
            className="h-11 sm:h-12 lg:h-13 w-auto object-contain transition-transform group-hover:scale-102"
          />
          <div className="hidden 2xl:flex flex-col border-l border-[#D5CFC4] pl-3">
            <span className="font-editorial text-[17px] font-bold text-[#132435] leading-tight tracking-tight">
              Percikan Iman
            </span>
            <span className="font-mono text-[11px] text-[#4A5E72] tracking-tight">
              Zürich · ZGB Art. 60–79
            </span>
          </div>
        </button>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-0.5 lg:gap-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <Camera className="w-3.5 h-3.5 text-[#1D5B8C]" aria-hidden="true" />
            <span>Galerie</span>
          </NavLink>

          {currentUser && (isGASessionOpen || hasFullAdmin) && (
            <NavLink to="/assembly" className={navLinkClass}>
              <Vote className="w-4 h-4 text-[#1D5B8C]" aria-hidden="true" />
              <span>General Assembly</span>
              {isGASessionOpen ? (
                <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#F3E8DF] text-[#8C5327]">
                  Live
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-[#DFE8F0] text-[#1D5B8C]">
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
              <Users className="w-4 h-4 text-[#1D5B8C]" aria-hidden="true" />
              <span>{t.nav.myMembership}</span>
              {currentUser.membershipCategory === 'family' && (
                <span className="text-[11px] px-1.5 py-0.5 bg-[#DFE8F0] text-[#1D5B8C] rounded font-semibold">
                  {t.nav.familyTag}
                </span>
              )}
            </NavLink>
          )}
        </div>

        {/* Action Controls & Account Dropdown */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <LanguageSelector variant="navbar" />

          {currentUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-expanded={userDropdownOpen}
                className="min-h-10 flex items-center gap-2 px-3 py-1.5 bg-[#E1DDD4] text-[#132435] rounded-lg text-xs font-semibold border border-[#D5CFC4] hover:border-[#B8B0A2] transition-colors cursor-pointer"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover border border-[#1D5B8C]"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="w-6 h-6 rounded-full bg-[#1D5B8C] text-white flex items-center justify-center text-xs font-bold"
                  >
                    {currentUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[110px] truncate">{currentUser.name}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#8C5327]" aria-hidden="true" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#FAF9F6] rounded-xl shadow-lg border border-[#D5CFC4] p-2 z-50">
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
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleNav('/brand');
                    }}
                    className="w-full min-h-9 flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#132435] hover:bg-[#EAE6DF] rounded-lg text-left transition-colors cursor-pointer mb-1"
                  >
                    <Palette className="w-3.5 h-3.5 text-[#1D5B8C]" aria-hidden="true" />
                    <span>{t.nav.brandKit}</span>
                  </button>
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
            <button
              type="button"
              onClick={() => handleNav('/login')}
              className="min-h-10 bg-[#1D5B8C] hover:bg-[#15466E] text-white px-4 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
            >
              {t.nav.login}
            </button>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
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
            className="min-h-10 min-w-10 p-2 text-[#132435] hover:bg-[#E1DDD4] rounded-lg inline-flex items-center justify-center"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#FAF9F6] border-t border-[#D5CFC4] px-6 py-4 space-y-2 shadow-lg">
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
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F3E8DF] text-[#8C5327]">
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
          <button
            type="button"
            onClick={() => handleNav('/brand')}
            aria-current={isRouteActive('/brand') ? 'page' : undefined}
            className={`block w-full text-left py-2.5 px-3 rounded-lg font-medium flex items-center gap-2 ${
              isRouteActive('/brand')
                ? 'bg-[#E1DDD4] text-[#132435] font-bold'
                : 'text-[#4A5E72]'
            }`}
          >
            <Palette className="w-4 h-4 text-[#1D5B8C]" aria-hidden="true" />
            <span>{t.nav.brandKit}</span>
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
                <span className="text-[11px] px-1.5 py-0.5 bg-[#DFE8F0] text-[#1D5B8C] rounded font-semibold">
                  {t.nav.familyTag}
                </span>
              )}
            </button>
          )}

          <div className="pt-3 border-t border-[#E1DDD4] flex flex-col gap-2">
            {currentUser ? (
              <div className="flex items-center justify-between pt-1">
                <div className="text-sm">
                  <p className="font-semibold text-[#132435]">{currentUser.name}</p>
                  <p className="text-xs text-[#4A5E72]">{currentUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="min-h-9 px-3.5 py-1.5 text-xs text-[#8C5327] bg-[#F3E8DF] rounded-lg font-semibold"
                >
                  {t.nav.logout}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleNav('/login')}
                className="w-full min-h-11 py-2.5 bg-[#1D5B8C] text-white rounded-lg font-semibold text-sm"
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
