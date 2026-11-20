import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  Database,
  Edit2,
  FileText,
  LogOut,
  QrCode,
  ShieldCheck,
  Users,
  Vote
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { LOGO_URL } from '../../constants';
import { checkBootstrapStatus } from '../../lib/firestoreBootstrap';
import { AdminTabId } from '../../types';
import { LanguageSelector } from '../LanguageSelector';
import { getPermittedAdminTabs, StaffRoleFlags } from './AdminRouteGuard';

export interface AdminLayoutProps {
  children?: React.ReactNode;
  isBootstrapped?: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  isBootstrapped
}) => {
  const { currentUser, hasFullAdmin, isSuperAdmin, canManageBoard, canScanQR, signOut } =
    useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [fetchedBootstrapped, setFetchedBootstrapped] = useState(false);

  useEffect(() => {
    if (isBootstrapped !== undefined || !isSuperAdmin) {
      return;
    }

    let cancelled = false;
    checkBootstrapStatus()
      .then((meta) => {
        if (!cancelled) {
          setFetchedBootstrapped(Boolean(meta));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchedBootstrapped(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isBootstrapped, isSuperAdmin]);

  const effectiveBootstrapped =
    isBootstrapped !== undefined ? isBootstrapped : fetchedBootstrapped;

  const roles: StaffRoleFlags = useMemo(
    () => ({
      isAdmin: currentUser?.isAdmin,
      isSuperAdmin: currentUser?.isSuperAdmin,
      canManageBoard: currentUser?.canManageBoard,
      canScanQR: currentUser?.canScanQR
    }),
    [
      currentUser?.isAdmin,
      currentUser?.isSuperAdmin,
      currentUser?.canManageBoard,
      currentUser?.canScanQR
    ]
  );

  const visibleTabs = useMemo(() => {
    const allPermitted = getPermittedAdminTabs(roles);
    if (effectiveBootstrapped) {
      return allPermitted.filter((tab) => tab !== 'bootstrap');
    }
    return allPermitted;
  }, [roles, effectiveBootstrapped]);

  const tabConfigs = useMemo<
    Record<AdminTabId, { label: string; icon: React.ReactNode }>
  >(
    () => ({
      programs: {
        label: t.admin.tabPrograms,
        icon: <Calendar className="w-4 h-4" />
      },
      events: {
        label: t.admin.tabEvents,
        icon: <CalendarDays className="w-4 h-4" />
      },
      content: {
        label: t.admin.tabContent,
        icon: <Edit2 className="w-4 h-4" />
      },
      board: {
        label: t.admin.tabBoard,
        icon: <Users className="w-4 h-4" />
      },
      donations: {
        label: t.admin.tabDonations,
        icon: <FileText className="w-4 h-4" />
      },
      members: {
        label: t.admin.tabMembers,
        icon: <ShieldCheck className="w-4 h-4" />
      },
      attendance: {
        label: t.admin.tabAttendance,
        icon: <QrCode className="w-4 h-4" />
      },
      assembly: {
        label: t.admin.tabAssembly,
        icon: <Vote className="w-4 h-4" />
      },
      bootstrap: {
        label: t.admin.tabBootstrap,
        icon: <Database className="w-4 h-4" />
      }
    }),
    [t]
  );

  const roleBadgeLabel = useMemo(() => {
    if (isSuperAdmin) return 'Super Administrator';
    if (hasFullAdmin) return 'Board Administrator';
    if (canManageBoard && canScanQR) return 'Board & QR Operator';
    if (canManageBoard) return 'Board Management Officer';
    if (canScanQR) return 'Event QR Scanner';
    return 'Authorized Staff';
  }, [isSuperAdmin, hasFullAdmin, canManageBoard, canScanQR]);

  useEffect(() => {
    const normalized = location.pathname.replace(/\/+$/, '');
    const segment = normalized.split('/')[2] as AdminTabId | undefined;
    const activeLabel =
      segment && tabConfigs[segment] ? tabConfigs[segment].label : t.admin.dashboardTitle;
    document.title = `${activeLabel} — ${t.nav.admin} | Verein Percikan Iman Schweiz`;
  }, [location.pathname, tabConfigs, t.admin.dashboardTitle, t.nav.admin]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f6f7f4] flex flex-col">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-[#006191] focus:text-white focus:rounded-lg focus:text-xs focus:font-bold"
      >
        Skip to main content
      </a>

      {/* Isolated Admin Top Bar */}
      <header className="bg-white border-b border-[#dce2df] sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Verein Percikan Iman Schweiz"
              className="w-9 h-9 object-contain"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-[#121c2a]">
                  {t.nav.admin}
                </span>
                <span
                  data-testid="admin-role-badge"
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    canScanQR && !hasFullAdmin && !canManageBoard
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-[#eff3ff] text-[#006191] border-[#d3e5f1]'
                  }`}
                >
                  {roleBadgeLabel}
                </span>
              </div>
              {currentUser && (
                <p className="text-[11px] text-[#566771] mt-0.5">
                  {currentUser.name}
                  {currentUser.memberCode ? ` (${currentUser.memberCode})` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <LanguageSelector variant="navbar" />

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#bec7d2] bg-white hover:bg-[#eff3ff] text-xs font-semibold text-[#121c2a] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#006191]" />
              <span>{t.nav.returnToPublicSite}</span>
            </Link>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fbeae9] hover:bg-[#f8d7d5] text-[#ba1a1a] text-xs font-bold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.nav.logout}</span>
            </button>
          </div>
        </div>

        {/* Permitted Admin Navigation Tabs */}
        <nav
          aria-label="Admin sections"
          className="max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-[#eef2f0]"
        >
          {visibleTabs.map((tabId) => {
            const config = tabConfigs[tabId];
            return (
              <NavLink
                key={tabId}
                to={`/admin/${tabId}`}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'text-[#006191] border-[#006191] bg-[#f9fbff]'
                      : 'text-[#566771] border-transparent hover:text-[#121c2a] hover:bg-gray-50'
                  }`
                }
              >
                {config.icon}
                <span>{config.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </header>

      {/* Main Admin Workspace Content */}
      <main
        id="admin-main-content"
        tabIndex={-1}
        className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 outline-none"
      >
        {children ?? <Outlet />}
      </main>
    </div>
  );
};
