import React, { useSyncExternalStore } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthContextValue } from '../src/context/AuthContext';
import { LanguageProvider } from '../src/i18n';
import { isSafeHttpUrl } from '../src/lib/urlValidation';
import { UserAccount } from '../src/types';

let mockAuthState: AuthContextValue;
const authListeners = new Set<() => void>();

function setMockAuthState(next: AuthContextValue) {
  mockAuthState = next;
  authListeners.forEach((listener) => listener());
}

const mockSignInMember = vi.fn();
const mockAuthenticateWithGoogle = vi.fn();
const mockSendMemberPasswordReset = vi.fn();
const mockSignOutMember = vi.fn();

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () =>
    useSyncExternalStore(
      (listener) => {
        authListeners.add(listener);
        return () => authListeners.delete(listener);
      },
      () => mockAuthState
    )
}));

vi.mock('../src/lib/authService', () => ({
  signInMember: (...args: unknown[]) => mockSignInMember(...args),
  authenticateWithGoogle: (...args: unknown[]) => mockAuthenticateWithGoogle(...args),
  sendMemberPasswordReset: (...args: unknown[]) => mockSendMemberPasswordReset(...args),
  signOutMember: (...args: unknown[]) => mockSignOutMember(...args)
}));

vi.mock('../src/lib/firebase', () => ({
  getFirebaseServices: vi.fn(() => null),
  isFirebaseConfigured: vi.fn(() => false),
  getFirebaseOptions: vi.fn(() => null)
}));

import {
  AdminRouteGuard,
  canAccessAdminPath,
  getFirstPermittedAdminPath,
  getPermittedAdminTabs,
  hasAnyStaffPermission
} from '../src/components/admin/AdminRouteGuard';

function makeUser(overrides: Partial<UserAccount> = {}): UserAccount {
  return {
    uid: 'uid-test-user',
    name: 'Test User',
    email: 'test@percikaniman.org',
    memberCode: 'PI-TEST-01',
    membershipCategory: 'personal',
    membershipStatus: 'active',
    ...overrides
  };
}

const LocationEcho: React.FC<{ label: string }> = ({ label }) => {
  const location = useLocation();
  return (
    <div data-testid="route-content">
      <span>{label}</span>
      <span data-testid="current-path">{`${location.pathname}${location.search}`}</span>
    </div>
  );
};

function renderGuardedRoutes(initialEntry: string) {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/" element={<div data-testid="public-home">Public Home</div>} />
          <Route path="/admin/*" element={<AdminRouteGuard />}>
            <Route index element={<LocationEcho label="Admin Index" />} />
            <Route path="programs" element={<LocationEcho label="Programs Admin" />} />
            <Route path="events" element={<LocationEcho label="Events Admin" />} />
            <Route path="content" element={<LocationEcho label="Content Admin" />} />
            <Route path="board" element={<LocationEcho label="Board Admin" />} />
            <Route path="donations" element={<LocationEcho label="Donations Admin" />} />
            <Route path="members" element={<LocationEcho label="Members Admin" />} />
            <Route path="attendance" element={<LocationEcho label="Attendance Scanner" />} />
            <Route path="assembly" element={<LocationEcho label="Assembly Admin" />} />
            <Route path="bootstrap" element={<LocationEcho label="Bootstrap Panel" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </LanguageProvider>
  );
}

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

describe('AdminRouteGuard & Role Helpers', () => {
  beforeEach(() => {
    ensureTestLocalStorage();
    window.localStorage.setItem('percikan_iman_language', 'en');
    mockAuthState = {
      authStatus: 'unauthenticated',
      currentUser: null,
      firebaseUser: null,
      hasFullAdmin: false,
      isSuperAdmin: false,
      canManageBoard: false,
      canScanQR: false,
      hasAnyStaffRole: false,
      signOut: mockSignOutMember
    };
  });

  afterEach(() => {
    cleanup();
    authListeners.clear();
    vi.clearAllMocks();
  });

  it('renders a neutral loading indicator while authStatus is loading', () => {
    mockAuthState = {
      ...mockAuthState,
      authStatus: 'loading'
    };

    renderGuardedRoutes('/admin/programs');

    expect(screen.getByTestId('admin-guard-loading')).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('admin-login-gate')).not.toBeInTheDocument();
    expect(screen.queryByTestId('route-content')).not.toBeInTheDocument();
  });

  it('renders isolated AdminLoginGate for unauthenticated users and preserves /admin/attendance path', async () => {
    mockAuthenticateWithGoogle.mockResolvedValueOnce({
      status: 'needs_registration_completion',
      googleProfile: { email: 'new@example.com' }
    });

    renderGuardedRoutes('/admin/attendance?event=evt-1');

    expect(screen.getByTestId('admin-login-gate')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to Public Site/i })).toHaveAttribute('href', '/');

    // Public sign-up tabs, paywalls, and runtime Firebase config modal must NOT exist
    expect(screen.queryByText(/Register Now/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Firebase Configuration/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Seeded Member/i)).not.toBeInTheDocument();

    // Unprofiled Google sign-in signs out and shows a clear error
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));
    await waitFor(() => {
      expect(mockSignOutMember).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('new@example.com');
  });

  it('preserves AdminLoginGate error alert across AuthContext loading unmount/remount during Google needs_registration_completion', async () => {
    let sawLoadingState = false;
    mockSignOutMember.mockResolvedValueOnce(undefined);
    mockAuthenticateWithGoogle.mockImplementationOnce(async () => {
      // Yield a tick so fireEvent.click's synchronous act() completes before our state transitions
      await Promise.resolve();
      act(() => {
        setMockAuthState({
          ...mockAuthState,
          authStatus: 'loading',
          currentUser: null
        });
      });
      sawLoadingState = Boolean(screen.queryByTestId('admin-guard-loading'));
      expect(screen.queryByTestId('admin-login-gate')).not.toBeInTheDocument();

      act(() => {
        setMockAuthState({
          ...mockAuthState,
          authStatus: 'unauthenticated',
          currentUser: null
        });
      });

      return {
        status: 'needs_registration_completion',
        googleProfile: { email: 'unregistered@example.com' }
      };
    });

    renderGuardedRoutes('/admin/attendance');

    expect(screen.getByTestId('admin-login-gate')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));

    await waitFor(() => {
      expect(mockSignOutMember).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('alert')).toHaveTextContent('unregistered@example.com');
    });
    expect(sawLoadingState).toBe(true);
    expect(screen.getByTestId('admin-login-gate')).toBeInTheDocument();
  });

  it('renders Access Denied with return link to "/" for authenticated non-staff members', () => {
    const standardMember = makeUser();
    mockAuthState = {
      ...mockAuthState,
      authStatus: 'authenticated',
      currentUser: standardMember,
      hasAnyStaffRole: false
    };

    renderGuardedRoutes('/admin/programs');

    expect(screen.getByTestId('admin-access-denied')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Access Denied/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Return to Public Site/i })).toHaveAttribute('href', '/');
    expect(screen.queryByTestId('route-content')).not.toBeInTheDocument();
  });

  it('redirects canScanQR-only operators from /admin/members to /admin/attendance and allows /admin/attendance', () => {
    const scannerUser = makeUser({ canScanQR: true });
    mockAuthState = {
      ...mockAuthState,
      authStatus: 'authenticated',
      currentUser: scannerUser,
      canScanQR: true,
      hasAnyStaffRole: true
    };

    renderGuardedRoutes('/admin/members');
    expect(screen.getByTestId('route-content')).toHaveTextContent('Attendance Scanner');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/admin/attendance');

    cleanup();
    renderGuardedRoutes('/admin/attendance');
    expect(screen.getByTestId('route-content')).toHaveTextContent('Attendance Scanner');
  });

  it('limits canManageBoard-only operators strictly to /admin/board', () => {
    const boardOfficer = makeUser({ canManageBoard: true });
    mockAuthState = {
      ...mockAuthState,
      authStatus: 'authenticated',
      currentUser: boardOfficer,
      canManageBoard: true,
      hasAnyStaffRole: true
    };

    renderGuardedRoutes('/admin/programs');
    expect(screen.getByTestId('route-content')).toHaveTextContent('Board Admin');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/admin/board');

    cleanup();
    renderGuardedRoutes('/admin/board');
    expect(screen.getByTestId('route-content')).toHaveTextContent('Board Admin');
  });

  it('supports combined delegated roles (canManageBoard + canScanQR) without full admin access', () => {
    const dualOfficer = makeUser({ canManageBoard: true, canScanQR: true });
    mockAuthState = {
      ...mockAuthState,
      authStatus: 'authenticated',
      currentUser: dualOfficer,
      canManageBoard: true,
      canScanQR: true,
      hasAnyStaffRole: true
    };

    renderGuardedRoutes('/admin/programs');
    expect(screen.getByTestId('route-content')).toHaveTextContent('Board Admin');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/admin/board');

    cleanup();
    renderGuardedRoutes('/admin/attendance');
    expect(screen.getByTestId('route-content')).toHaveTextContent('Attendance Scanner');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/admin/attendance');

    expect(getPermittedAdminTabs({ canManageBoard: true, canScanQR: true })).toEqual([
      'board',
      'attendance'
    ]);
    expect(getFirstPermittedAdminPath({ canManageBoard: true, canScanQR: true })).toBe(
      '/admin/board'
    );
    expect(canAccessAdminPath('/admin/board', { canManageBoard: true, canScanQR: true })).toBe(true);
    expect(
      canAccessAdminPath('/admin/attendance', { canManageBoard: true, canScanQR: true })
    ).toBe(true);
    expect(
      canAccessAdminPath('/admin/donations', { canManageBoard: true, canScanQR: true })
    ).toBe(false);
    expect(
      canAccessAdminPath('/admin/bootstrap', { canManageBoard: true, canScanQR: true })
    ).toBe(false);
  });

  it('blocks standard isAdmin from /admin/bootstrap while allowing isSuperAdmin', () => {
    const regularAdmin = makeUser({ isAdmin: true, isSuperAdmin: false });
    mockAuthState = {
      ...mockAuthState,
      authStatus: 'authenticated',
      currentUser: regularAdmin,
      hasFullAdmin: true,
      isSuperAdmin: false,
      hasAnyStaffRole: true
    };

    renderGuardedRoutes('/admin/bootstrap');
    expect(screen.getByTestId('route-content')).toHaveTextContent('Programs Admin');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/admin/programs');

    cleanup();
    const superAdmin = makeUser({ isAdmin: true, isSuperAdmin: true });
    mockAuthState = {
      ...mockAuthState,
      authStatus: 'authenticated',
      currentUser: superAdmin,
      hasFullAdmin: true,
      isSuperAdmin: true,
      hasAnyStaffRole: true
    };

    renderGuardedRoutes('/admin/bootstrap');
    expect(screen.getByTestId('route-content')).toHaveTextContent('Bootstrap Panel');
    expect(screen.getByTestId('current-path')).toHaveTextContent('/admin/bootstrap');
  });

  it('evaluates pure role-routing helper functions accurately', () => {
    expect(hasAnyStaffPermission({})).toBe(false);
    expect(hasAnyStaffPermission({ canScanQR: true })).toBe(true);

    expect(getPermittedAdminTabs({ canScanQR: true })).toEqual(['attendance']);
    expect(getPermittedAdminTabs({ canManageBoard: true })).toEqual(['board']);
    expect(getPermittedAdminTabs({ isAdmin: true })).not.toContain('bootstrap');
    expect(getPermittedAdminTabs({ isSuperAdmin: true })).toContain('bootstrap');

    expect(getFirstPermittedAdminPath({ canScanQR: true })).toBe('/admin/attendance');
    expect(getFirstPermittedAdminPath({ canManageBoard: true })).toBe('/admin/board');
    expect(getFirstPermittedAdminPath({ isAdmin: true })).toBe('/admin/programs');
    expect(getFirstPermittedAdminPath({})).toBe('/');

    expect(canAccessAdminPath('/admin/attendance/', { canScanQR: true })).toBe(true);
    expect(canAccessAdminPath('/admin/donations', { canManageBoard: true })).toBe(false);
    expect(canAccessAdminPath('/admin/bootstrap', { isAdmin: true })).toBe(false);
    expect(canAccessAdminPath('/admin/bootstrap', { isSuperAdmin: true })).toBe(true);
  });
});

describe('isSafeHttpUrl (Admin Guard Regression Suite)', () => {
  it('accepts valid http:// and https:// URLs including @ handles in paths', () => {
    expect(isSafeHttpUrl('https://percikaniman.ch/events/ramadan')).toBe(true);
    expect(isSafeHttpUrl('http://localhost:3000/admin')).toBe(true);
    expect(isSafeHttpUrl('https://zoom.us/j/987654321?pwd=abc')).toBe(true);
    expect(isSafeHttpUrl('https://www.youtube.com/@percikanimanch')).toBe(true);
  });

  it('rejects dangerous schemes, relative paths, credentials, @ in authority, and control characters', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeHttpUrl('vbscript:msgbox("x")')).toBe(false);
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeHttpUrl('/admin/programs')).toBe(false);
    expect(isSafeHttpUrl('//evil.example/script.js')).toBe(false);
    expect(isSafeHttpUrl('https://user:pass@evil.example')).toBe(false);
    expect(isSafeHttpUrl('https://user@evil.example')).toBe(false);
    expect(isSafeHttpUrl('https://@evil.example')).toBe(false);
    expect(isSafeHttpUrl('https://example.com/\u0000bad')).toBe(false);
  });
});
