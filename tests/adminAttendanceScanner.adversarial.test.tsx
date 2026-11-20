import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CommunityEvent, EventAttendanceRecord, UserAccount } from '../src/types';

const mockRecordAttendanceCheckIn = vi.fn();
const mockSettleDoorCashFee = vi.fn();
const mockDeleteAttendanceRecord = vi.fn();
const mockSubscribeEvents = vi.fn();
const mockSubscribeAttendanceRecords = vi.fn();
const mockSubscribeToFirestoreMembers = vi.fn();

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    authStatus: 'authenticated',
    currentUser: {
      uid: 'scanner-1',
      name: 'Scanner Operator',
      email: 'scanner@percikaniman.org',
      canScanQR: true,
      isAdmin: false
    },
    firebaseUser: null,
    hasFullAdmin: false,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: true,
    hasAnyStaffRole: true,
    signOut: vi.fn()
  })
}));

vi.mock('../src/lib/firestoreContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/firestoreContent')>();
  return {
    ...actual,
    subscribeEvents: (cb: (res: { data: CommunityEvent[]; loading: boolean; error: string | null }) => void) =>
      mockSubscribeEvents(cb)
  };
});

vi.mock('../src/lib/firestoreAttendance', () => ({
  subscribeAttendanceRecords: (cb: (res: { data: EventAttendanceRecord[]; loading: boolean; error: string | null }) => void) =>
    mockSubscribeAttendanceRecords(cb),
  recordAttendanceCheckIn: (...args: unknown[]) => mockRecordAttendanceCheckIn(...args),
  settleDoorCashFee: (...args: unknown[]) => mockSettleDoorCashFee(...args),
  deleteAttendanceRecord: (...args: unknown[]) => mockDeleteAttendanceRecord(...args)
}));

vi.mock('../src/lib/authService', () => ({
  subscribeToFirestoreMembers: (cb: (list: UserAccount[]) => void) =>
    mockSubscribeToFirestoreMembers(cb)
}));

import { AdminEventAttendanceScanner } from '../src/components/AdminEventAttendanceScanner';

describe('AdminEventAttendanceScanner Adversarial Suite (T1–T5)', () => {
  const sampleEvents: CommunityEvent[] = [
    {
      id: 'e1',
      title: 'Event One',
      date: '2026-11-19',
      time: '10:00',
      category: 'Majelis & Spiritual',
      location: 'Zürich',
      description: 'First'
    },
    {
      id: 'e2',
      title: 'Event Two',
      date: '2026-11-20',
      time: '14:00',
      category: 'Community Gathering',
      location: 'Bern',
      description: 'Second'
    }
  ];

  const activeRidwan: UserAccount = {
    uid: 'm1',
    memberCode: 'PI-001',
    name: 'Ridwan Kamil Santoso',
    email: 'ridwan@percikaniman.org',
    membershipCategory: 'family',
    membershipStatus: 'active'
  };

  const numericMember: UserAccount = {
    uid: 'm-num',
    memberCode: '12345',
    name: 'Numeric Code Member',
    email: 'num@percikaniman.org',
    membershipCategory: 'personal',
    membershipStatus: 'active'
  };

  const pendingMember: UserAccount = {
    uid: 'm-pend',
    memberCode: 'PI-9552',
    name: 'Taufik Pending',
    email: 'taufik@percikaniman.org',
    membershipCategory: 'personal',
    membershipStatus: 'pending_payment',
    paymentStatus: 'pending_payment',
    formalStatusHistory: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeEvents.mockImplementation((cb) => {
      cb({ data: sampleEvents, loading: false, error: null });
      return () => {};
    });
    mockSubscribeAttendanceRecords.mockImplementation((cb) => {
      cb({ data: [], loading: false, error: null });
      return () => {};
    });
    mockSubscribeToFirestoreMembers.mockImplementation((cb) => {
      cb([activeRidwan, numericMember, pendingMember]);
      return () => {};
    });
    mockRecordAttendanceCheckIn.mockResolvedValue({});
    mockSettleDoorCashFee.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('T1: rejects forged QR JSON spoofing display name with invalid memberId', async () => {
    render(<AdminEventAttendanceScanner />);

    const input = screen.getByPlaceholderText(/PI-FAM-2021/i);
    const form = input.closest('form')!;
    fireEvent.change(input, {
      target: { value: JSON.stringify({ memberId: 'FAKE-999', name: 'Ridwan Kamil Santoso' }) }
    });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockRecordAttendanceCheckIn).not.toHaveBeenCalled();
    expect(screen.getByTestId('last-scan-result')).toHaveTextContent(/Zutritt verweigert/i);
  });

  it('T2: allows scanning the same memberCode across two different events within 3 seconds', async () => {
    render(<AdminEventAttendanceScanner />);

    const input = screen.getByPlaceholderText(/PI-FAM-2021/i);
    const form = input.closest('form')!;
    const select = document.querySelector('select') as HTMLSelectElement;

    // Scan PI-001 on e1
    fireEvent.change(input, { target: { value: 'PI-001' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    // Immediately switch to e2 and scan PI-001 again
    fireEvent.change(select, { target: { value: 'e2' } });
    fireEvent.change(input, { target: { value: 'PI-001' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockRecordAttendanceCheckIn).toHaveBeenCalledTimes(2);
    expect(mockRecordAttendanceCheckIn.mock.calls[0][0].eventId).toBe('e1');
    expect(mockRecordAttendanceCheckIn.mock.calls[1][0].eventId).toBe('e2');
  });

  it('T3: accepts numeric memberCode 12345 without JSON.parse swallowing it', async () => {
    render(<AdminEventAttendanceScanner />);

    const input = screen.getByPlaceholderText(/PI-FAM-2021/i);
    const form = input.closest('form')!;
    fireEvent.change(input, { target: { value: '12345' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockRecordAttendanceCheckIn).toHaveBeenCalledTimes(1);
    expect(mockRecordAttendanceCheckIn.mock.calls[0][0].memberCode).toBe('12345');
  });

  it('T4: handles partial door cash settlement failure idempotently and blocks double-click', async () => {
    mockRecordAttendanceCheckIn
      .mockRejectedValueOnce(new Error('network-write-failed'))
      .mockResolvedValueOnce({});

    render(<AdminEventAttendanceScanner />);

    const input = screen.getByPlaceholderText(/PI-FAM-2021/i);
    const form = input.closest('form')!;
    fireEvent.change(input, { target: { value: 'PI-9552' } });
    await act(async () => {
      fireEvent.submit(form);
    });

    const settleBtn = screen.getByRole('button', { name: /bar erhalten & einchecken/i });
    // First click: settleDoorCashFee resolves, recordAttendanceCheckIn rejects
    await act(async () => {
      fireEvent.click(settleBtn);
    });

    expect(mockSettleDoorCashFee).toHaveBeenCalledTimes(1);
    expect(mockRecordAttendanceCheckIn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent(/network-write-failed/i);

    // Retry click (and synchronous double-click): must NOT call settleDoorCashFee again!
    await act(async () => {
      fireEvent.click(settleBtn);
      fireEvent.click(settleBtn);
    });

    expect(mockSettleDoorCashFee).toHaveBeenCalledTimes(1);
    expect(mockRecordAttendanceCheckIn).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('last-scan-result')).toHaveTextContent(/aktiviert und eingecheckt/i);
  });

  it('T5: safely searches attendance log when optional fields like memberCode or eventTitle are missing', () => {
    mockSubscribeAttendanceRecords.mockImplementation((cb) => {
      cb({
        data: [
          {
            id: 'att-incomplete',
            eventId: 'e1',
            eventTitle: undefined as unknown as string,
            memberCode: undefined as unknown as string,
            memberName: 'Partial Record',
            category: 'personal',
            status: 'active',
            isFeeExempt: false,
            partyCount: 1,
            partyMembers: undefined as unknown as string[],
            scannedAt: '2026-11-19T10:00:00Z',
            scannedBy: 'Scanner',
            feePaidChf: 0,
            verified: true
          }
        ],
        loading: false,
        error: null
      });
      return () => {};
    });

    render(<AdminEventAttendanceScanner />);

    const logSearch = screen.getByPlaceholderText(/Name oder Code filtern/i);
    expect(() => {
      fireEvent.change(logSearch, { target: { value: 'Partial' } });
    }).not.toThrow();
    expect(screen.getByText('Partial Record')).toBeInTheDocument();
  });
});
