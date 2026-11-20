import React, { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import { AdminTabId } from '../../types';
import { AdminLoginGate } from './AdminLoginGate';

export interface StaffRoleFlags {
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  canManageBoard?: boolean;
  canScanQR?: boolean;
}

export function hasAnyStaffPermission(roles: StaffRoleFlags): boolean {
  return Boolean(
    roles.isSuperAdmin ||
      roles.isAdmin ||
      roles.canManageBoard ||
      roles.canScanQR
  );
}

export function getPermittedAdminTabs(roles: StaffRoleFlags): AdminTabId[] {
  const hasFullAdmin = Boolean(roles.isAdmin || roles.isSuperAdmin);
  if (hasFullAdmin) {
    const tabs: AdminTabId[] = [
      'programs',
      'events',
      'content',
      'board',
      'donations',
      'members',
      'attendance',
      'assembly'
    ];
    if (roles.isSuperAdmin) {
      tabs.push('bootstrap');
    }
    return tabs;
  }

  const delegatedTabs: AdminTabId[] = [];
  if (roles.canManageBoard) {
    delegatedTabs.push('board');
  }
  if (roles.canScanQR) {
    delegatedTabs.push('attendance');
  }
  return delegatedTabs;
}

export function getFirstPermittedAdminPath(roles: StaffRoleFlags): string {
  if (roles.isAdmin || roles.isSuperAdmin) {
    return '/admin/programs';
  }
  if (roles.canManageBoard) {
    return '/admin/board';
  }
  if (roles.canScanQR) {
    return '/admin/attendance';
  }
  return '/';
}

export function canAccessAdminPath(
  pathname: string,
  roles: StaffRoleFlags
): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  const hasFullAdmin = Boolean(roles.isAdmin || roles.isSuperAdmin);

  if (normalized === '/admin') {
    return hasAnyStaffPermission(roles);
  }

  switch (normalized) {
    case '/admin/programs':
    case '/admin/events':
    case '/admin/content':
    case '/admin/donations':
    case '/admin/members':
    case '/admin/assembly':
      return hasFullAdmin;
    case '/admin/board':
      return Boolean(hasFullAdmin || roles.canManageBoard);
    case '/admin/attendance':
      return Boolean(hasFullAdmin || roles.canScanQR);
    case '/admin/bootstrap':
      return Boolean(roles.isSuperAdmin);
    default:
      return false;
  }
}

export interface AdminRouteGuardProps {
  children?: React.ReactNode;
}

export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const { authStatus, currentUser, hasAnyStaffRole, signOut } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [loginGateError, setLoginGateError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === 'authenticated' && currentUser) {
      setLoginGateError(null);
    }
  }, [authStatus, currentUser]);

  if (authStatus === 'loading') {
    return (
      <div
        data-testid="admin-guard-loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="min-h-screen bg-[#f6f7f4] flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-10 h-10 border-4 border-[#006191] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#121c2a]">
          Verifying staff session...
        </p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated' || !currentUser) {
    return (
      <AdminLoginGate
        redirectPath={`${location.pathname}${location.search}`}
        persistedError={loginGateError}
        onErrorChange={setLoginGateError}
      />
    );
  }

  const roles: StaffRoleFlags = {
    isAdmin: currentUser.isAdmin,
    isSuperAdmin: currentUser.isSuperAdmin,
    canManageBoard: currentUser.canManageBoard,
    canScanQR: currentUser.canScanQR
  };

  if (!hasAnyStaffRole || !hasAnyStaffPermission(roles)) {
    return (
      <div
        data-testid="admin-access-denied"
        className="min-h-screen bg-[#f6f7f4] flex items-center justify-center p-6"
      >
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-sm p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-[#121c2a]">
              {t.nav.accessDenied}
            </h1>
            <p className="text-sm text-[#566771] leading-relaxed">
              {t.nav.accessDeniedDesc}
            </p>
            <p className="text-xs text-[#6f7881] font-mono">
              {currentUser.email}
              {currentUser.memberCode ? ` • ${currentUser.memberCode}` : ''}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#006191] text-white text-xs font-bold rounded-xl hover:bg-[#007bb6] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.nav.returnToPublicSite}</span>
            </Link>

            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-[#bec7d2] text-xs font-semibold text-[#3f4850] rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.nav.logout}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccessAdminPath(location.pathname, roles)) {
    return <Navigate to={getFirstPermittedAdminPath(roles)} replace />;
  }

  return <>{children ?? <Outlet />}</>;
};
