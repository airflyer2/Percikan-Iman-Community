import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '../src/i18n';
import type {
  BoardMember,
  Campaign,
  ContributionDestination,
  DonationPledge,
  DonationReport,
  Program,
  SiteNotice,
  UserAccount
} from '../src/types';

const mockUpdateMemberDocument = vi.fn();
const mockDeleteMemberDocument = vi.fn();
const mockSubscribeToFirestoreMembers = vi.fn();
const mockBatchUpdateVerifiedVoteWeights = vi.fn();

const mockSaveSiteNotice = vi.fn();
const mockSaveProgram = vi.fn();
const mockCreateManualDonationReport = vi.fn();
const mockSubscribePrograms = vi.fn();
const mockSubscribeCampaigns = vi.fn();
const mockSubscribeDestinations = vi.fn();
const mockSubscribeBoardMembers = vi.fn();
const mockSubscribeSiteNotice = vi.fn();
const mockSubscribeDonationPledges = vi.fn();
const mockSubscribeDonationReports = vi.fn();

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    authStatus: 'authenticated',
    currentUser: {
      uid: 'sa-1',
      name: 'Super Admin',
      email: 'super@percikaniman.org',
      isAdmin: true,
      isSuperAdmin: true
    },
    firebaseUser: null,
    hasFullAdmin: true,
    isSuperAdmin: true,
    canManageBoard: true,
    canScanQR: true,
    hasAnyStaffRole: true,
    signOut: vi.fn()
  })
}));

vi.mock('../src/lib/firebase', () => ({
  getFirebaseServices: () => ({ db: {}, auth: {} }),
  getFirebaseOptions: () => null,
  isFirebaseConfigured: () => true,
  googleProvider: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocsFromServer: vi.fn(async () => ({ docs: [] }))
}));

vi.mock('../src/lib/authService', () => ({
  subscribeToFirestoreMembers: (cb: (list: UserAccount[]) => void) =>
    mockSubscribeToFirestoreMembers(cb),
  updateMemberDocument: (...args: unknown[]) => mockUpdateMemberDocument(...args),
  deleteMemberDocument: (...args: unknown[]) => mockDeleteMemberDocument(...args),
  batchUpdateVerifiedVoteWeights: (...args: unknown[]) =>
    mockBatchUpdateVerifiedVoteWeights(...args)
}));

vi.mock('../src/lib/firestoreContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/firestoreContent')>();
  return {
    ...actual,
    subscribePrograms: (cb: (res: { data: Program[]; loading: boolean; error: string | null }) => void) =>
      mockSubscribePrograms(cb),
    subscribeCampaigns: (cb: (res: { data: Campaign[]; loading: boolean; error: string | null }) => void) =>
      mockSubscribeCampaigns(cb),
    subscribeDestinations: (cb: (res: { data: ContributionDestination[]; loading: boolean; error: string | null }) => void) =>
      mockSubscribeDestinations(cb),
    subscribeBoardMembers: (cb: (res: { data: BoardMember[]; loading: boolean; error: string | null }) => void) =>
      mockSubscribeBoardMembers(cb),
    subscribeSiteNotice: (cb: (res: { data: SiteNotice | null; loading: boolean; error: string | null }) => void) =>
      mockSubscribeSiteNotice(cb),
    saveSiteNotice: (...args: unknown[]) => mockSaveSiteNotice(...args),
    saveProgram: (...args: unknown[]) => mockSaveProgram(...args),
    deleteProgram: vi.fn(),
    saveCampaign: vi.fn(),
    deleteCampaign: vi.fn(),
    saveDestination: vi.fn(),
    deleteDestination: vi.fn(),
    saveBoardMember: vi.fn(),
    deleteBoardMember: vi.fn(),
    reorderBoardMembers: vi.fn(),
    computeReorderedBoardMembers: vi.fn((list: BoardMember[]) => list)
  };
});

vi.mock('../src/lib/firestoreDonations', () => ({
  subscribeDonationPledges: (cb: (res: { data: DonationPledge[]; loading: boolean; error: string | null }) => void) =>
    mockSubscribeDonationPledges(cb),
  subscribeDonationReports: (cb: (res: { data: DonationReport[]; loading: boolean; error: string | null }) => void) =>
    mockSubscribeDonationReports(cb),
  createManualDonationReport: (...args: unknown[]) =>
    mockCreateManualDonationReport(...args),
  promotePledgeToReport: vi.fn(),
  rejectDonationPledge: vi.fn()
}));

import { AdminMembersTab } from '../src/components/AdminMembersTab';
import { AdminDashboard } from '../src/components/AdminDashboard';

describe('AdminMembersTab & AdminDashboard Adversarial Suite (T6–T9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribePrograms.mockImplementation((cb) => {
      cb({
        data: [
          {
            id: 'p1',
            title: 'Weekly Study',
            category: 'Religious',
            tag: 'Weekly',
            iconName: 'groups',
            description: 'Desc',
            imageUrl: 'https://example.com/p1.jpg',
            dateOrSchedule: 'Sundays',
            location: undefined as unknown as string,
            detailedOverview: 'Details'
          }
        ],
        loading: false,
        error: null
      });
      return () => {};
    });
    mockSubscribeCampaigns.mockImplementation((cb) => {
      cb({ data: [], loading: false, error: null });
      return () => {};
    });
    mockSubscribeDestinations.mockImplementation((cb) => {
      cb({
        data: [
          {
            id: 'd1',
            name: 'INFAQ',
            shortLabel: 'INFAQ',
            category: 'General',
            description: 'General'
          }
        ],
        loading: false,
        error: null
      });
      return () => {};
    });
    mockSubscribeBoardMembers.mockImplementation((cb) => {
      cb({ data: [], loading: false, error: null });
      return () => {};
    });
    mockSubscribeSiteNotice.mockImplementation((cb) => {
      cb({
        data: { enabled: true, badge: 'Notice', message: 'Hello' },
        loading: false,
        error: null
      });
      return () => {};
    });
    mockSubscribeDonationPledges.mockImplementation((cb) => {
      cb({ data: [], loading: false, error: null });
      return () => {};
    });
    mockSubscribeDonationReports.mockImplementation((cb) => {
      cb({ data: [], loading: false, error: null });
      return () => {};
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('T6: AdminMembersTab keeps per-row busy lock isolated and blocks rapid double-click on same row', async () => {
    const members: UserAccount[] = [
      {
        uid: 'm1',
        name: 'Member One',
        email: 'm1@percikaniman.org',
        memberCode: 'PI-001',
        membershipCategory: 'personal',
        membershipStatus: 'active'
      },
      {
        uid: 'm2',
        name: 'Member Two',
        email: 'm2@percikaniman.org',
        memberCode: 'PI-002',
        membershipCategory: 'personal',
        membershipStatus: 'active'
      }
    ];
    mockSubscribeToFirestoreMembers.mockImplementation((cb) => {
      cb(members);
      return () => {};
    });

    let resolveM1!: () => void;
    let resolveM2!: () => void;
    mockUpdateMemberDocument
      .mockImplementationOnce(
        () =>
          new Promise<void>((res) => {
            resolveM1 = res;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>((res) => {
            resolveM2 = res;
          })
      );

    render(
      <LanguageProvider>
        <AdminMembersTab />
      </LanguageProvider>
    );

    const qrButtons = screen.getAllByRole('button', { name: /QR \+/i }) as HTMLButtonElement[];
    expect(qrButtons).toHaveLength(2);

    // Click m1 twice synchronously -> only 1 call, button disabled
    fireEvent.click(qrButtons[0]);
    fireEvent.click(qrButtons[0]);
    expect(mockUpdateMemberDocument).toHaveBeenCalledTimes(1);
    expect(qrButtons[0].disabled).toBe(true);

    // Click m2 while m1 is still pending -> m1 stays disabled while m2 starts
    fireEvent.click(qrButtons[1]);
    expect(mockUpdateMemberDocument).toHaveBeenCalledTimes(2);
    expect(qrButtons[0].disabled).toBe(true);
    expect(qrButtons[1].disabled).toBe(true);

    await act(async () => {
      resolveM2();
    });
    expect(qrButtons[0].disabled).toBe(true);
    expect(qrButtons[1].disabled).toBe(false);

    await act(async () => {
      resolveM1();
    });
    expect(qrButtons[0].disabled).toBe(false);
  });

  it('T7: AdminDashboard blocks synchronous double-submit on Site Notice, Program, and Manual Donation forms', async () => {
    let resolveNotice!: (v: SiteNotice) => void;
    mockSaveSiteNotice.mockImplementation(
      () =>
        new Promise<SiteNotice>((res) => {
          resolveNotice = res;
        })
    );
    mockSaveProgram.mockImplementation(
      () =>
        new Promise<Program>((res) => {
          setTimeout(
            () =>
              res({
                id: 'p-new',
                title: 'New Prog',
                category: 'Religious',
                tag: 'New',
                iconName: 'groups',
                description: 'Desc',
                imageUrl: 'https://example.com/a.jpg',
                dateOrSchedule: 'Sat',
                location: 'Zürich',
                detailedOverview: 'Details'
              }),
            50
          );
        })
    );

    const { rerender } = render(
      <LanguageProvider>
        <AdminDashboard activeTab="content" />
      </LanguageProvider>
    );

    const noticeForm = document.querySelector('input[name="badge"]')!.closest('form')!;
    fireEvent.submit(noticeForm);
    fireEvent.submit(noticeForm);
    expect(mockSaveSiteNotice).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveNotice({ enabled: true, badge: 'Notice', message: 'Hello' });
    });

    // Program modal double-submit
    rerender(
      <LanguageProvider>
        <AdminDashboard activeTab="programs" />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Add New Program/i }));
    const progDialog = screen.getByRole('dialog');
    const progForm = progDialog.querySelector('form')!;
    fireEvent.change(progDialog.querySelector('input[name="title"]')!, {
      target: { value: 'New Prog' }
    });
    fireEvent.submit(progForm);
    fireEvent.submit(progForm);
    expect(mockSaveProgram).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('T8: AdminDashboard manual donation rejects negative/out-of-range amount and invalid email', () => {
    render(
      <LanguageProvider>
        <AdminDashboard activeTab="donations" />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Record Offline Donation/i }));
    const dialog = screen.getByRole('dialog');
    const form = dialog.querySelector('form')!;
    const inputs = dialog.querySelectorAll('input');
    // First input: donorName, second: email, third: amount
    fireEvent.change(inputs[0], { target: { value: 'Cash Donor' } });
    fireEvent.change(inputs[2], { target: { value: '-50' } });
    fireEvent.submit(form);

    expect(dialog.querySelector('[role="alert"]')).toHaveTextContent(/between CHF 1 and CHF 100,000/i);
    expect(mockCreateManualDonationReport).not.toHaveBeenCalled();

    fireEvent.change(inputs[2], { target: { value: '50' } });
    fireEvent.change(inputs[1], { target: { value: 'not-an-email' } });
    fireEvent.submit(form);
    expect(dialog.querySelector('[role="alert"]')).toHaveTextContent(/valid donor email/i);
    expect(mockCreateManualDonationReport).not.toHaveBeenCalled();
  });

  it('T9: AdminDashboard closes open modal on activeTab change and safely searches programs missing location', () => {
    const { rerender } = render(
      <LanguageProvider>
        <AdminDashboard activeTab="programs" />
      </LanguageProvider>
    );

    // Search when p1 lacks location -> must not crash
    const searchInput = screen.getByPlaceholderText(/Search program listings/i);
    expect(() => {
      fireEvent.change(searchInput, { target: { value: 'zzz' } });
    }).not.toThrow();

    // Open Program modal, then switch activeTab -> dialog unmounts
    fireEvent.click(screen.getByRole('button', { name: /Add New Program/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <LanguageProvider>
        <AdminDashboard activeTab="content" />
      </LanguageProvider>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
