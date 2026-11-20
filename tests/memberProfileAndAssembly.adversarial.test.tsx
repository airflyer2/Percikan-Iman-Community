import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/i18n';
import type {
  AssemblyQuestion,
  BoardInquiry,
  CastBallot,
  GASessionState,
  UserAccount
} from '../src/types';

const mockMemberUser: UserAccount = {
  uid: 'm-active',
  name: 'Active Member',
  email: 'active@percikaniman.org',
  memberCode: 'PI-7740',
  membershipCategory: 'personal',
  membershipStatus: 'active',
  verifiedVoteWeight: 1,
  address: { street: '', city: 'Zürich', postalCode: '8001', country: 'Switzerland' },
  children: []
};

const mockUpdateMemberDocument = vi.fn();
const mockCastMemberBallot = vi.fn();
const mockCreateBoardInquiry = vi.fn();
const mockToggleInquiryUpvote = vi.fn();
const mockSubscribeGaSession = vi.fn();
const mockSubscribeAssemblyQuestions = vi.fn();
const mockSubscribeBoardInquiries = vi.fn();
const mockSubscribeQuestionBallots = vi.fn();
const mockSubscribeInquiryUpvotes = vi.fn();

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async () => 'data:image/png;base64,iVBORw0KGgo=')
  }
}));

vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    authStatus: 'authenticated',
    currentUser: mockMemberUser,
    firebaseUser: null,
    hasFullAdmin: false,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: false,
    hasAnyStaffRole: false,
    signOut: vi.fn()
  })
}));

vi.mock('../src/lib/authService', () => ({
  updateMemberDocument: (...args: unknown[]) => mockUpdateMemberDocument(...args)
}));

vi.mock('../src/lib/firestoreAssembly', () => ({
  subscribeGaSession: (cb: (res: { data: GASessionState | null; loading: boolean; error: string | null }) => void) =>
    mockSubscribeGaSession(cb),
  subscribeAssemblyQuestions: (cb: (res: { data: AssemblyQuestion[]; loading: boolean; error: string | null }) => void) =>
    mockSubscribeAssemblyQuestions(cb),
  subscribeBoardInquiries: (cb: (res: { data: BoardInquiry[]; loading: boolean; error: string | null }) => void) =>
    mockSubscribeBoardInquiries(cb),
  subscribeQuestionBallots: (qid: string, cb: (res: { data: CastBallot[]; loading: boolean; error: string | null }) => void) =>
    mockSubscribeQuestionBallots(qid, cb),
  subscribeInquiryUpvotes: (inqId: string, uid: string, cb: (res: { data: { count: number; hasUpvoted: boolean } | null; loading: boolean; error: string | null }) => void) =>
    mockSubscribeInquiryUpvotes(inqId, uid, cb),
  castMemberBallot: (...args: unknown[]) => mockCastMemberBallot(...args),
  createBoardInquiry: (...args: unknown[]) => mockCreateBoardInquiry(...args),
  toggleInquiryUpvote: (...args: unknown[]) => mockToggleInquiryUpvote(...args)
}));

import { MemberProfileView } from '../src/components/MemberProfileView';
import { GeneralAssemblyView } from '../src/components/GeneralAssemblyView';

describe('MemberProfileView & GeneralAssemblyView Adversarial Suite (T10–T13)', () => {
  const q1: AssemblyQuestion = {
    id: 'q1',
    title: 'Motion One',
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

  const q2: AssemblyQuestion = {
    ...q1,
    id: 'q2',
    title: 'Motion Two'
  };

  const inq1: BoardInquiry = {
    id: 'inq-1',
    title: 'Facility Lease',
    content: 'Lease details?',
    category: 'Mosque & Facility',
    authorUid: 'm-other',
    authorName: 'Other Member',
    authorMemberCode: 'PI-0002',
    authorCategory: 'personal',
    submittedAt: '2026-11-19T09:00:00Z',
    status: 'submitted'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeGaSession.mockImplementation((cb) => {
      cb({
        data: {
          isOpen: true,
          sessionTitle: 'GV 2026',
          scheduledDate: '2026-09-15',
          activeQuestionId: 'q1'
        },
        loading: false,
        error: null
      });
      return () => {};
    });
    mockSubscribeAssemblyQuestions.mockImplementation((cb) => {
      cb({ data: [q1, q2], loading: false, error: null });
      return () => {};
    });
    mockSubscribeBoardInquiries.mockImplementation((cb) => {
      cb({ data: [inq1], loading: false, error: null });
      return () => {};
    });
    mockSubscribeQuestionBallots.mockImplementation((_qid, cb) => {
      cb({ data: [], loading: false, error: null });
      return () => {};
    });
    mockSubscribeInquiryUpvotes.mockImplementation((_id, _uid, cb) => {
      cb({ data: { count: 0, hasUpvoted: false }, loading: false, error: null });
      return () => {};
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('T10: MemberProfileView renders Category Change validation alert inside [role="dialog"] and blocks rapid double-submit', async () => {
    let resolveCat!: () => void;
    mockUpdateMemberDocument.mockImplementation(
      () =>
        new Promise<void>((res) => {
          resolveCat = res;
        })
    );

    render(
      <MemoryRouter>
        <LanguageProvider>
          <MemberProfileView />
        </LanguageProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Request Upgrade to Family Tier/i }));
    const dlg = screen.getByRole('dialog');
    const form = dlg.querySelector('form')!;

    // Empty submit shows alert INSIDE [role="dialog"]
    fireEvent.submit(form);
    expect(within(dlg).getByRole('alert')).toHaveTextContent(/formal reason/i);
    expect(mockUpdateMemberDocument).not.toHaveBeenCalled();

    // Valid double-submit calls updateMemberDocument once
    const textarea = dlg.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Got married recently.' } });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(mockUpdateMemberDocument).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCat();
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('T11: MemberProfileView enforces 500KB limit & lowercase data URI parity with firestore.rules', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <MemberProfileView />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Open PhotoUpload external URL input and supply oversized 550KB base64 PNG
    fireEvent.click(screen.getByRole('button', { name: /Paste external image URL instead/i }));
    const urlInput = document.querySelector('input[type="url"]') as HTMLInputElement;
    fireEvent.change(urlInput, {
      target: { value: `data:image/png;base64,${'A'.repeat(550000)}` }
    });
    fireEvent.click(screen.getByRole('button', { name: /Apply URL/i }));

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(mockUpdateMemberDocument).not.toHaveBeenCalled();
    expect(screen.getByText(/under 500 KB/i)).toBeInTheDocument();
  });

  it('T12: GeneralAssemblyView resets showBallotSuccess on modal close/reopen and blocks handleConfirmVote double-submit', async () => {
    let resolveVote!: () => void;
    mockCastMemberBallot.mockImplementation(
      () =>
        new Promise<void>((res) => {
          resolveVote = res;
        })
    );

    render(
      <MemoryRouter>
        <LanguageProvider>
          <GeneralAssemblyView />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Open modal for q1
    fireEvent.click(screen.getAllByRole('button', { name: /Cast Ballot/i })[0]);
    const dlg = screen.getByRole('dialog');
    fireEvent.click(within(dlg).getByText('Yes'));
    fireEvent.click(dlg.querySelector('input[type="checkbox"]')!);

    const submitVoteBtn = within(dlg).getByRole('button', { name: /Submit 1 Weighted Votes/i });
    fireEvent.click(submitVoteBtn);
    fireEvent.click(submitVoteBtn);
    expect(mockCastMemberBallot).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveVote();
    });
    expect(within(dlg).getByText(/Ballot Successfully Recorded/i)).toBeInTheDocument();

    // Close modal immediately BEFORE 1500ms timeout, then reopen -> must NOT leak success screen!
    fireEvent.click(dlg.querySelector('button')!);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: /Cast Ballot/i })[0]);
    const reopened = screen.getByRole('dialog');
    expect(within(reopened).queryByText(/Ballot Successfully Recorded/i)).toBeNull();
    expect(within(reopened).getByText(/Official General Assembly Ballot/i)).toBeInTheDocument();
  });

  it('T13: GeneralAssemblyView enforces per-inquiry lock on toggleInquiryUpvote while in flight', async () => {
    let resolveUpvote!: () => void;
    mockToggleInquiryUpvote.mockImplementation(
      () =>
        new Promise<boolean>((res) => {
          resolveUpvote = () => res(true);
        })
    );

    render(
      <MemoryRouter>
        <LanguageProvider>
          <GeneralAssemblyView />
        </LanguageProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Questions to the Board/i }));
    const endorseBtn = screen.getByRole('button', { name: /Endorse/i });

    fireEvent.click(endorseBtn);
    fireEvent.click(endorseBtn);
    expect(mockToggleInquiryUpvote).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpvote();
    });
  });
});
