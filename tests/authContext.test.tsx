import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { UserAccount } from '../src/types';

type MockFbUser = { uid: string; email?: string; emailVerified?: boolean };
type AuthCallback = (user: MockFbUser | null) => void;
type SnapshotNext = (snap: {
  id: string;
  exists: () => boolean;
  data: () => UserAccount;
}) => void;
type SnapshotErr = (err: Error) => void;

const mockGetFirebaseServices = vi.fn();
const mockOnAuthStateChanged = vi.fn();
const mockDoc = vi.fn((_db: unknown, col: string, id: string) => ({ col, id }));
const mockOnSnapshot = vi.fn();
const mockSignOutMember = vi.fn(async () => {});

vi.mock('../src/lib/firebase', () => ({
  getFirebaseServices: () => mockGetFirebaseServices(),
  getFirebaseOptions: () => null,
  isFirebaseConfigured: () => Boolean(mockGetFirebaseServices()),
  googleProvider: {}
}));

vi.mock('../src/lib/authService', () => ({
  signOutMember: () => mockSignOutMember()
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: AuthCallback) => mockOnAuthStateChanged(cb)
}));

vi.mock('firebase/firestore', () => ({
  doc: (db: unknown, col: string, id: string) => mockDoc(db, col, id),
  onSnapshot: (ref: unknown, onNext: SnapshotNext, onError: SnapshotErr) =>
    mockOnSnapshot(ref, onNext, onError)
}));

import { AuthProvider, useAuth } from '../src/context/AuthContext';

function ProbeConsumer() {
  const auth = useAuth();
  return (
    <div
      data-testid="auth-probe"
      data-status={auth.authStatus}
      data-uid={auth.currentUser?.uid ?? 'none'}
      data-fbuid={auth.firebaseUser?.uid ?? 'none'}
      data-full-admin={String(auth.hasFullAdmin)}
      data-super-admin={String(auth.isSuperAdmin)}
      data-board={String(auth.canManageBoard)}
      data-scanner={String(auth.canScanQR)}
      data-staff={String(auth.hasAnyStaffRole)}
    >
      <button type="button" onClick={() => void auth.signOut()}>
        SignOut
      </button>
    </div>
  );
}

describe('AuthContext (real AuthProvider & useAuth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('sets unauthenticated with null currentUser/firebaseUser and false role flags when Firebase is unconfigured', async () => {
    mockGetFirebaseServices.mockReturnValue(null);

    render(
      <AuthProvider>
        <ProbeConsumer />
      </AuthProvider>
    );

    const probe = screen.getByTestId('auth-probe');
    await waitFor(() => {
      expect(probe.getAttribute('data-status')).toBe('unauthenticated');
    });
    expect(probe.getAttribute('data-uid')).toBe('none');
    expect(probe.getAttribute('data-fbuid')).toBe('none');
    expect(probe.getAttribute('data-full-admin')).toBe('false');
    expect(probe.getAttribute('data-super-admin')).toBe('false');
    expect(probe.getAttribute('data-board')).toBe('false');
    expect(probe.getAttribute('data-scanner')).toBe('false');
    expect(probe.getAttribute('data-staff')).toBe('false');

    screen.getByRole('button', { name: 'SignOut' }).click();
    await waitFor(() => {
      expect(mockSignOutMember).toHaveBeenCalledTimes(1);
    });
  });

  it('transitions loading -> authenticated, overrides uid with docSnap.id, computes roles, and unsubscribes prior listener on user switch', async () => {
    let authCb: AuthCallback | null = null;
    const authUnsub = vi.fn();
    const profileUnsub1 = vi.fn();
    const profileUnsub2 = vi.fn();
    let snapNext: SnapshotNext | null = null;

    mockGetFirebaseServices.mockReturnValue({ auth: { kind: 'auth' }, db: { kind: 'db' } });
    mockOnAuthStateChanged.mockImplementation((cb: AuthCallback) => {
      authCb = cb;
      return authUnsub;
    });

    let snapCallCount = 0;
    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: SnapshotNext) => {
      snapCallCount += 1;
      snapNext = onNext;
      return snapCallCount === 1 ? profileUnsub1 : profileUnsub2;
    });

    const { unmount } = render(
      <AuthProvider>
        <ProbeConsumer />
      </AuthProvider>
    );

    const probe = screen.getByTestId('auth-probe');
    expect(probe.getAttribute('data-status')).toBe('loading');

    // First sign-in: unauthenticated -> fbUser
    act(() => {
      authCb!({ uid: 'u-1', email: 'board@percikaniman.org', emailVerified: true });
    });
    expect(probe.getAttribute('data-status')).toBe('loading');
    expect(probe.getAttribute('data-fbuid')).toBe('u-1');
    expect(mockDoc).toHaveBeenCalledWith({ kind: 'db' }, 'members', 'u-1');

    act(() => {
      snapNext!({
        id: 'u-1',
        exists: () => true,
        data: () => ({
          uid: 'wrong-embedded-uid',
          name: 'Board Officer',
          email: 'board@percikaniman.org',
          canManageBoard: true,
          canScanQR: true
        })
      });
    });

    expect(probe.getAttribute('data-status')).toBe('authenticated');
    expect(probe.getAttribute('data-uid')).toBe('u-1');
    expect(probe.getAttribute('data-full-admin')).toBe('false');
    expect(probe.getAttribute('data-super-admin')).toBe('false');
    expect(probe.getAttribute('data-board')).toBe('true');
    expect(probe.getAttribute('data-scanner')).toBe('true');
    expect(probe.getAttribute('data-staff')).toBe('true');

    // Switch user -> must unsubscribe profileUnsub1 before subscribing to u-2
    act(() => {
      authCb!({ uid: 'u-2', email: 'super@percikaniman.org', emailVerified: true });
    });
    expect(profileUnsub1).toHaveBeenCalledTimes(1);

    act(() => {
      snapNext!({
        id: 'u-2',
        exists: () => true,
        data: () => ({
          name: 'Super Admin',
          email: 'super@percikaniman.org',
          isSuperAdmin: true
        })
      });
    });
    expect(probe.getAttribute('data-status')).toBe('authenticated');
    expect(probe.getAttribute('data-uid')).toBe('u-2');
    expect(probe.getAttribute('data-super-admin')).toBe('true');
    expect(probe.getAttribute('data-full-admin')).toBe('true');

    // Sign out -> unsubscribes profileUnsub2 and resets state
    act(() => {
      authCb!(null);
    });
    expect(profileUnsub2).toHaveBeenCalledTimes(1);
    expect(probe.getAttribute('data-status')).toBe('unauthenticated');
    expect(probe.getAttribute('data-uid')).toBe('none');
    expect(probe.getAttribute('data-fbuid')).toBe('none');

    unmount();
    expect(authUnsub).toHaveBeenCalledTimes(1);
  });

  it('clears firebaseUser to null when /members/{uid} does not exist or onSnapshot errors', () => {
    let authCb: AuthCallback | null = null;
    let snapNext: SnapshotNext | null = null;
    let snapErr: SnapshotErr | null = null;

    mockGetFirebaseServices.mockReturnValue({ auth: {}, db: {} });
    mockOnAuthStateChanged.mockImplementation((cb: AuthCallback) => {
      authCb = cb;
      return vi.fn();
    });
    mockOnSnapshot.mockImplementation((_ref: unknown, onNext: SnapshotNext, onError: SnapshotErr) => {
      snapNext = onNext;
      snapErr = onError;
      return vi.fn();
    });

    render(
      <AuthProvider>
        <ProbeConsumer />
      </AuthProvider>
    );

    // Case 1: missing /members/{uid} document
    act(() => {
      authCb!({ uid: 'orphan-uid', email: 'orphan@percikaniman.org', emailVerified: false });
    });
    act(() => {
      snapNext!({
        id: 'orphan-uid',
        exists: () => false,
        data: () => ({} as UserAccount)
      });
    });

    const probe = screen.getByTestId('auth-probe');
    expect(probe.getAttribute('data-status')).toBe('unauthenticated');
    expect(probe.getAttribute('data-uid')).toBe('none');
    expect(probe.getAttribute('data-fbuid')).toBe('none');

    // Case 2: onSnapshot error
    act(() => {
      authCb!({ uid: 'err-uid', email: 'err@percikaniman.org', emailVerified: true });
    });
    act(() => {
      snapErr!(new Error('permission-denied'));
    });

    expect(probe.getAttribute('data-status')).toBe('unauthenticated');
    expect(probe.getAttribute('data-uid')).toBe('none');
    expect(probe.getAttribute('data-fbuid')).toBe('none');
  });

  it('throws descriptive error when useAuth is called outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ProbeConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );
    spy.mockRestore();
  });
});
