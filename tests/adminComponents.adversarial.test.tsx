import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n';
import type {
  AssemblyQuestion,
  BoardInquiry,
  CommunityEvent,
  GASessionState,
  UserAccount
} from '../src/types';

// --- Mocks ---
const mockAuthState = {
  authStatus: 'authenticated' as const,
  currentUser: {
    uid: 'super-1',
    name: 'Super Admin',
    email: 'super@percikaniman.org',
    memberCode: 'PI-SUPERADMIN',
    isAdmin: true,
    isSuperAdmin: true,
    canManageBoard: true,
    canScanQR: true
  } as UserAccount,
  firebaseUser: null,
  hasFullAdmin: true,
  isSuperAdmin: true,
  canManageBoard: true,
  canScanQR: true,
  hasAnyStaffRole: true,
  signOut: vi.fn(async () => {})
};

const mockSubscribeEvents = vi.fn();
const mockSaveEvent = vi.fn();
const mockDeleteEvent = vi.fn();

const mockSubscribeGaSession = vi.fn();
const mockSubscribeAssemblyQuestions = vi.fn();
const mockSubscribeBoardInquiries = vi.fn();
const mockSubscribeQuestionBallots = vi.fn();
const mockFetchQuestionBallotsFromServer = vi.fn();
const mockCloseMotionWithFinalResults = vi.fn();
const mockRespondToBoardInquiry = vi.fn();
const mockSubscribeToFirestoreMembers = vi.fn();
const mockBatchUpdateVerifiedVoteWeights = vi.fn();
const mockGetDocsFromServer = vi.fn();

const mockCheckBootstrapStatus = vi.fn();
const mockRunInitialBootstrap = vi.fn();
const mockGetCountFromServer = vi.fn();
const mockGetDocs = vi.fn();

const mockSignInMember = vi.fn();
const mockSendMemberPasswordReset = vi.fn();
const mockAuthenticateWithGoogle = vi.fn();
const mockSignOutMember = vi.fn();

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => mockAuthState
}));

vi.mock('../src/lib/firebase', () => ({
  getFirebaseServices: () => ({ db: { kind: 'mock-db' }, auth: {} }),
  getFirebaseOptions: () => null,
  isFirebaseConfigured: () => true,
  googleProvider: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  doc: (_db: unknown, col: string, id: string) => ({ col, id }),
  getDoc: vi.fn(),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDocsFromServer: (...args: unknown[]) => mockGetDocsFromServer(...args),
  getCountFromServer: (...args: unknown[]) => mockGetCountFromServer(...args)
}));

vi.mock('../src/lib/firestoreContent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/firestoreContent')>();
  return {
    ...actual,
    subscribeEvents: (cb: (res: { data: CommunityEvent[]; loading: boolean; error: string | null }) => void) =>
      mockSubscribeEvents(cb),
    saveEvent: (...args: unknown[]) => mockSaveEvent(...args),
    deleteEvent: (...args: unknown[]) => mockDeleteEvent(...args)
  };
});

vi.mock('../src/lib/firestoreAssembly', () => ({
  subscribeGaSession: (cb: (res: { data: GASessionState | null; loading: boolean; error: string | null }) => void) =>
    mockSubscribeGaSession(cb),
  subscribeAssemblyQuestions: (cb: (res: { data: AssemblyQuestion[]; loading: boolean; error: string | null }) => void) =>
    mockSubscribeAssemblyQuestions(cb),
  subscribeBoardInquiries: (cb: (res: { data: BoardInquiry[]; loading: boolean; error: string | null }) => void) =>
    mockSubscribeBoardInquiries(cb),
  subscribeQuestionBallots: (...args: unknown[]) => mockSubscribeQuestionBallots(...args),
  fetchQuestionBallotsFromServer: (...args: unknown[]) => mockFetchQuestionBallotsFromServer(...args),
  closeMotionWithFinalResults: (...args: unknown[]) => mockCloseMotionWithFinalResults(...args),
  respondToBoardInquiry: (...args: unknown[]) => mockRespondToBoardInquiry(...args),
  saveGaSessionState: vi.fn(),
  saveAssemblyQuestion: vi.fn(),
  deleteAssemblyQuestion: vi.fn(),
  placeMotionOnFloor: vi.fn(),
  convertInquiryToMotion: vi.fn(),
  deleteBoardInquiry: vi.fn()
}));

vi.mock('../src/lib/authService', () => ({
  subscribeToFirestoreMembers: (onList: (list: UserAccount[]) => void) =>
    mockSubscribeToFirestoreMembers(onList),
  batchUpdateVerifiedVoteWeights: (...args: unknown[]) =>
    mockBatchUpdateVerifiedVoteWeights(...args),
  signInMember: (...args: unknown[]) => mockSignInMember(...args),
  sendMemberPasswordReset: (...args: unknown[]) => mockSendMemberPasswordReset(...args),
  authenticateWithGoogle: (...args: unknown[]) => mockAuthenticateWithGoogle(...args),
  signOutMember: (...args: unknown[]) => mockSignOutMember(...args)
}));

vi.mock('../src/lib/firestoreBootstrap', () => ({
  BOOTSTRAP_VERSION: '1.0.0',
  checkBootstrapStatus: () => mockCheckBootstrapStatus(),
  runInitialBootstrap: (...args: unknown[]) => mockRunInitialBootstrap(...args)
}));

import { AdminEventsTab } from '../src/components/admin/AdminEventsTab';
import { AdminAssemblyTab } from '../src/components/admin/AdminAssemblyTab';
import { AdminBootstrapPanel } from '../src/components/admin/AdminBootstrapPanel';
import { AdminLayout } from '../src/components/admin/AdminLayout';
import { AdminLoginGate } from '../src/components/admin/AdminLoginGate';

describe('Admin Components Adversarial Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.currentUser = {
      uid: 'super-1',
      name: 'Super Admin',
      email: 'super@percikaniman.org',
      memberCode: 'PI-SUPERADMIN',
      isAdmin: true,
      isSuperAdmin: true,
      canManageBoard: true,
      canScanQR: true
    };
    mockAuthState.hasFullAdmin = true;
    mockAuthState.isSuperAdmin = true;
    mockAuthState.canManageBoard = true;
    mockAuthState.canScanQR = true;
    mockAuthState.hasAnyStaffRole = true;
  });

  afterEach(() => {
    cleanup();
  });

  it('AdminEventsTab: filters events, validates modal URLs/capacity, blocks synchronous double-submit, and honors delete confirm', async () => {
    const sampleEvents: CommunityEvent[] = [
      {
        id: 'evt-1',
        title: 'Ramadan Lecture',
        date: '2026-10-01',
        time: '18:00',
        category: 'Majelis & Spiritual',
        location: 'Zürich',
        description: 'Monthly lecture'
      },
      {
        id: 'evt-2',
        title: 'Youth Camp',
        date: '2026-11-01',
        time: '09:00',
        category: 'Youth & Education',
        location: 'Bern',
        description: 'Camp'
      }
    ];

    mockSubscribeEvents.mockImplementation((cb) => {
      cb({ data: sampleEvents, loading: false, error: null });
      return () => {};
    });

    let resolveSave!: (evt: CommunityEvent) => void;
    mockSaveEvent.mockImplementation(
      () =>
        new Promise<CommunityEvent>((res) => {
          resolveSave = res;
        })
    );

    render(
      <LanguageProvider>
        <AdminEventsTab />
      </LanguageProvider>
    );

    expect(screen.getByText('Ramadan Lecture')).toBeInTheDocument();
    expect(screen.getByText('Youth Camp')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Youth & Education' }));
    expect(screen.queryByText('Ramadan Lecture')).toBeNull();
    expect(screen.getByText('Youth Camp')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    fireEvent.change(screen.getByPlaceholderText(/Search events/i), {
      target: { value: 'Ramadan' }
    });
    expect(screen.getByText('Ramadan Lecture')).toBeInTheDocument();
    expect(screen.queryByText('Youth Camp')).toBeNull();

    // Open Create Event modal & validate unsafe links + capacity 0
    fireEvent.click(screen.getByRole('button', { name: /Add Event/i }));
    const dialog = screen.getByRole('dialog');
    const form = dialog.querySelector('form')!;
    const titleInput = dialog.querySelector('input[name="title"]') as HTMLInputElement;
    const onlineLinkInput = dialog.querySelector('input[name="onlineLink"]') as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: 'Adversarial Event' } });
    fireEvent.change(onlineLinkInput, { target: { value: 'javascript:alert(1)' } });
    fireEvent.submit(form);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/Online Link/i);
    expect(mockSaveEvent).not.toHaveBeenCalled();

    // Valid link + SVG imageUrl -> rejected
    fireEvent.change(onlineLinkInput, { target: { value: 'https://zoom.us/j/12345' } });
    const imgUrlInput = within(dialog).getByPlaceholderText(/images\.unsplash/i);
    fireEvent.change(imgUrlInput, { target: { value: 'data:image/svg+xml;base64,PHN2Zz4=' } });
    fireEvent.submit(form);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/Cover Image/i);
    expect(mockSaveEvent).not.toHaveBeenCalled();

    // Capacity 0 -> rejected
    fireEvent.change(imgUrlInput, { target: { value: 'https://example.com/cover.jpg' } });
    const capInput = within(dialog).getByDisplayValue('150');
    fireEvent.change(capInput, { target: { value: '0' } });
    fireEvent.submit(form);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/Capacity/i);
    expect(mockSaveEvent).not.toHaveBeenCalled();

    // Valid submit fired twice synchronously -> only 1 saveEvent call
    fireEvent.change(capInput, { target: { value: '100' } });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mockSaveEvent).toHaveBeenCalledTimes(1);

    resolveSave({
      id: 'evt-new',
      title: 'Adversarial Event',
      date: '2026-11-19',
      time: '09:00',
      category: 'Majelis & Spiritual',
      location: 'Zürich',
      description: ''
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // Delete confirm cancel vs accept
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const deleteBtns = screen.getAllByTitle('Delete Event');
    fireEvent.click(deleteBtns[0]);
    expect(mockDeleteEvent).not.toHaveBeenCalled();

    fireEvent.click(deleteBtns[0]);
    await waitFor(() => {
      expect(mockDeleteEvent).toHaveBeenCalledTimes(1);
    });
    confirmSpy.mockRestore();
  });

  it('AdminAssemblyTab: fetches authoritative ballots from server on close, skips SuperAdmin for standard Admin certify, and validates whitespace inquiry reply', async () => {
    const floorQuestion: AssemblyQuestion = {
      id: 'q-floor',
      title: 'Budget Motion',
      description: 'Approve budget',
      category: 'Budget & Financial',
      status: 'on_floor',
      type: 'yes_no_abstain',
      options: [
        { id: 'opt-yes', text: 'Yes', votesWeighted: 0, ballotCount: 0 },
        { id: 'opt-no', text: 'No', votesWeighted: 0, ballotCount: 0 }
      ],
      optionIds: ['opt-yes', 'opt-no'],
      totalVotesWeighted: 0,
      totalBallots: 0,
      createdAt: '2026-11-19T09:00:00Z',
      createdBy: 'Admin',
      quorumRequiredPercent: 50
    };
    const sampleInquiry: BoardInquiry = {
      id: 'inq-1',
      title: 'Audit Inquiry',
      content: 'Details?',
      category: 'Finance & Audit',
      authorUid: 'u-1',
      authorName: 'Member',
      authorMemberCode: 'PI-1',
      authorCategory: 'personal',
      submittedAt: '2026-11-19T09:00:00Z',
      status: 'submitted'
    };

    mockAuthState.currentUser = {
      uid: 'adm-1',
      name: 'Standard Admin',
      email: 'admin@percikaniman.org',
      isAdmin: true,
      isSuperAdmin: false
    };
    mockAuthState.isSuperAdmin = false;

    mockSubscribeGaSession.mockImplementation((cb) => {
      cb({
        data: {
          isOpen: true,
          sessionTitle: 'GV 2026',
          scheduledDate: '2026-09-15',
          activeQuestionId: 'q-floor'
        },
        loading: false,
        error: null
      });
      return () => {};
    });
    mockSubscribeAssemblyQuestions.mockImplementation((cb) => {
      cb({ data: [floorQuestion], loading: false, error: null });
      return () => {};
    });
    mockSubscribeBoardInquiries.mockImplementation((cb) => {
      cb({ data: [sampleInquiry], loading: false, error: null });
      return () => {};
    });
    mockSubscribeQuestionBallots.mockImplementation((_qid, cb) => {
      cb({ data: [], loading: false, error: null }); // stale empty cache!
      return () => {};
    });
    mockSubscribeToFirestoreMembers.mockImplementation((cb) => {
      cb([
        {
          uid: 'm-1',
          name: 'Regular',
          email: 'reg@percikaniman.org',
          membershipStatus: 'active',
          membershipCategory: 'personal'
        },
        {
          uid: 'sa-1',
          name: 'Super',
          email: 'sa@percikaniman.org',
          membershipStatus: 'active',
          membershipCategory: 'personal',
          isSuperAdmin: true
        }
      ]);
      return () => {};
    });

    const serverBallot = {
      id: 'm-1',
      questionId: 'q-floor',
      memberCode: 'PI-1',
      memberName: 'Regular',
      membershipCategory: 'personal',
      votedOptionId: 'opt-yes',
      voteWeight: 1,
      timestamp: '2026-11-19T10:00:00Z',
      breakdown: {
        primaryEligible: true,
        spouseEligible: false,
        eligibleChildrenNames: [],
        ineligibleChildrenNames: []
      }
    };
    mockFetchQuestionBallotsFromServer.mockResolvedValue([serverBallot]);
    mockCloseMotionWithFinalResults.mockResolvedValue({
      totalWeight: 1,
      totalBallots: 1,
      closedAt: '2026-11-19T11:00:00Z',
      closedBy: 'Standard Admin',
      optionTotals: { 'opt-yes': 1, 'opt-no': 0 }
    });

    mockGetDocsFromServer.mockResolvedValue({
      docs: [
        {
          id: 'm-1',
          data: () => ({
            name: 'Regular',
            email: 'reg@percikaniman.org',
            membershipStatus: 'active',
            membershipCategory: 'personal'
          })
        },
        {
          id: 'sa-1',
          data: () => ({
            name: 'Super',
            email: 'sa@percikaniman.org',
            membershipStatus: 'active',
            membershipCategory: 'personal',
            isSuperAdmin: true
          })
        }
      ]
    });

    render(
      <LanguageProvider>
        <AdminAssemblyTab />
      </LanguageProvider>
    );

    // 1. Close Motion uses fetchQuestionBallotsFromServer instead of empty cached ballotsByQid
    fireEvent.click(screen.getByRole('button', { name: /Close Vote/i }));
    await waitFor(() => {
      expect(mockFetchQuestionBallotsFromServer).toHaveBeenCalledWith('q-floor');
      expect(mockCloseMotionWithFinalResults).toHaveBeenCalledWith(
        'q-floor',
        [serverBallot],
        floorQuestion.options,
        'Standard Admin',
        true
      );
    });

    // 2. Certify Voter Roll skips isSuperAdmin docs when caller is standard Admin
    fireEvent.click(
      screen.getByRole('button', { name: /Certify Voter Roll|Wählerverzeichnis zertifizieren/i })
    );
    await waitFor(() => {
      expect(mockBatchUpdateVerifiedVoteWeights).toHaveBeenCalledTimes(1);
    });
    const updates = mockBatchUpdateVerifiedVoteWeights.mock.calls[0][0] as Array<{ uid: string }>;
    expect(updates.map((u) => u.uid)).toEqual(['m-1']);

    // 3. Respond inquiry with whitespace displays error instead of silent no-op
    fireEvent.click(screen.getByRole('button', { name: /Answer Question/i }));
    const replyDialog = screen.getByRole('dialog');
    const textarea = replyDialog.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: '    ' } });
    fireEvent.submit(replyDialog.querySelector('form')!);
    expect(within(replyDialog).getByRole('alert')).toHaveTextContent(/enter an official board response/i);
    expect(mockRespondToBoardInquiry).not.toHaveBeenCalled();
  });

  it('AdminBootstrapPanel: denies non-SuperAdmin, blocks on status check failure, and preserves success state if count refresh fails', async () => {
    // 1. Non-SuperAdmin
    mockAuthState.currentUser = {
      uid: 'adm-1',
      name: 'Standard Admin',
      email: 'admin@percikaniman.org',
      isAdmin: true,
      isSuperAdmin: false
    };
    render(
      <LanguageProvider>
        <AdminBootstrapPanel />
      </LanguageProvider>
    );
    expect(screen.getByTestId('bootstrap-access-denied')).toBeInTheDocument();

    // 2. SuperAdmin with checkBootstrapStatus failure
    cleanup();
    mockAuthState.currentUser = {
      uid: 'sa-1',
      name: 'Super Admin',
      email: 'sa@percikaniman.org',
      isAdmin: true,
      isSuperAdmin: true
    };
    mockCheckBootstrapStatus.mockRejectedValueOnce(new Error('network-error'));
    mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 0 }) });

    render(
      <LanguageProvider>
        <AdminBootstrapPanel />
      </LanguageProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/Bootstrap Status Verification Required/i)).toBeInTheDocument();
    });

    // 3. Successful bootstrap followed by transient count refresh failure keeps success state without role="alert" error
    cleanup();
    mockCheckBootstrapStatus.mockResolvedValueOnce(null);
    mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 0 }) });
    mockRunInitialBootstrap.mockResolvedValueOnce({
      seededAt: '2026-11-19T22:00:00Z',
      seededBy: 'Super Admin',
      version: '1.0.0'
    });

    render(
      <LanguageProvider>
        <AdminBootstrapPanel />
      </LanguageProvider>
    );

    const seedBtnMatcher = /Run Initial Seed|Initialisierung jetzt ausführen/i;
    await waitFor(() => {
      expect(screen.getByRole('button', { name: seedBtnMatcher })).toBeInTheDocument();
    });

    // Make subsequent loadLiveCollectionCounts fail
    mockGetCountFromServer.mockRejectedValue(new Error('transient-count-err'));
    mockGetDocs.mockRejectedValue(new Error('transient-count-err'));

    fireEvent.click(screen.getByRole('button', { name: seedBtnMatcher }));

    await waitFor(() => {
      expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/transient-count-err/i);
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('AdminLayout: renders role badges across all 5 role combinations, hides bootstrap when bootstrapped, updates title, and signs out', async () => {
    const roleCases: Array<{ flags: Partial<UserAccount>; badge: string }> = [
      { flags: { isSuperAdmin: true, isAdmin: true }, badge: 'Super Administrator' },
      { flags: { isSuperAdmin: false, isAdmin: true }, badge: 'Board Administrator' },
      { flags: { isSuperAdmin: false, isAdmin: false, canManageBoard: true, canScanQR: true }, badge: 'Board & QR Operator' },
      { flags: { isSuperAdmin: false, isAdmin: false, canManageBoard: true, canScanQR: false }, badge: 'Board Management Officer' },
      { flags: { isSuperAdmin: false, isAdmin: false, canManageBoard: false, canScanQR: true }, badge: 'Event QR Scanner' }
    ];

    for (const c of roleCases) {
      mockAuthState.currentUser = {
        uid: 'u-role',
        name: 'Staff',
        email: 'staff@percikaniman.org',
        ...c.flags
      };
      mockAuthState.isSuperAdmin = Boolean(c.flags.isSuperAdmin);
      mockAuthState.hasFullAdmin = Boolean(c.flags.isAdmin || c.flags.isSuperAdmin);
      mockAuthState.canManageBoard = Boolean(c.flags.canManageBoard);
      mockAuthState.canScanQR = Boolean(c.flags.canScanQR);
      mockAuthState.hasAnyStaffRole = true;

      render(
        <MemoryRouter initialEntries={['/admin/events']}>
          <LanguageProvider>
            <Routes>
              <Route
                path="/admin/*"
                element={
                  <AdminLayout isBootstrapped={true}>
                    <div>Child</div>
                  </AdminLayout>
                }
              />
            </Routes>
          </LanguageProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('admin-role-badge')).toHaveTextContent(c.badge);
      expect(document.querySelector('a[href="/admin/bootstrap"]')).toBeNull();
      expect(document.title).toContain('Verein Percikan Iman Schweiz');
      cleanup();
    }

    // Sign Out triggers signOut() and SuperAdmin sees bootstrap link when unbootstrapped
    mockAuthState.currentUser = {
      uid: 'sa-role',
      name: 'Super',
      email: 'sa@percikaniman.org',
      isSuperAdmin: true,
      isAdmin: true
    };
    mockAuthState.isSuperAdmin = true;
    mockAuthState.hasFullAdmin = true;
    render(
      <MemoryRouter initialEntries={['/admin/programs']}>
        <LanguageProvider>
          <AdminLayout isBootstrapped={false}>
            <div>Workspace</div>
          </AdminLayout>
        </LanguageProvider>
      </MemoryRouter>
    );
    expect(document.querySelector('a[href="/admin/bootstrap"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Log Out|Abmelden|Keluar/i }));
    await waitFor(() => {
      expect(mockAuthState.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it('AdminLoginGate: validates empty fields, handles password login & visibility toggle, and exercises forgot-password modal', async () => {
    mockSignInMember.mockRejectedValueOnce(new Error('Invalid credentials')).mockResolvedValueOnce({});
    mockSendMemberPasswordReset
      .mockRejectedValueOnce(new Error('Reset failed'))
      .mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={['/admin/programs']}>
        <LanguageProvider>
          <AdminLoginGate redirectPath="/admin/programs" />
        </LanguageProvider>
      </MemoryRouter>
    );

    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(screen.getByRole('alert')).toHaveTextContent(/email/i);
    expect(mockSignInMember).not.toHaveBeenCalled();

    const idInput = document.querySelector('#admin_login_identifier') as HTMLInputElement;
    const pwInput = document.querySelector('#admin_login_password') as HTMLInputElement;
    expect(pwInput.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: /Show password/i }));
    expect(pwInput.type).toBe('text');

    fireEvent.change(idInput, { target: { value: 'admin@percikaniman.org' } });
    fireEvent.change(pwInput, { target: { value: 'Wrong123' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
    });

    fireEvent.change(pwInput, { target: { value: 'Correct123' } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(mockSignInMember).toHaveBeenCalledTimes(2);
    });

    // Forgot password modal open -> error -> success -> close
    fireEvent.click(screen.getByRole('button', { name: /Forgot password/i }));
    const resetDialog = screen.getByRole('dialog');
    const resetForm = resetDialog.querySelector('form')!;
    fireEvent.submit(resetForm);
    await waitFor(() => {
      expect(within(resetDialog).getByText('Reset failed')).toBeInTheDocument();
    });

    fireEvent.submit(resetForm);
    await waitFor(() => {
      expect(within(resetDialog).getByText(/Password reset email sent/i)).toBeInTheDocument();
    });

    fireEvent.click(within(resetDialog).getByRole('button', { name: /Close password reset/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
