import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetFirebaseServices = vi.fn();
const mockWriteBatch = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockGetDocsFromServer = vi.fn();
const mockDoc = vi.fn((_db: unknown, ...segs: string[]) => ({ path: segs.join('/') }));
const mockCollection = vi.fn((_db: unknown, ...segs: string[]) => ({ path: segs.join('/') }));
const mockQuery = vi.fn((col: unknown) => col);
const mockWhere = vi.fn();

vi.mock('../src/lib/firebase', () => ({
  getFirebaseServices: () => mockGetFirebaseServices(),
  getFirebaseOptions: () => null,
  isFirebaseConfigured: () => Boolean(mockGetFirebaseServices()),
  googleProvider: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: (db: unknown, ...segs: string[]) => mockCollection(db, ...segs),
  deleteDoc: vi.fn(),
  doc: (db: unknown, ...segs: string[]) => mockDoc(db, ...segs),
  getDoc: (ref: unknown) => mockGetDoc(ref),
  getDocs: (q: unknown) => mockGetDocs(q),
  getDocsFromServer: (q: unknown) => mockGetDocsFromServer(q),
  onSnapshot: vi.fn(() => () => {}),
  orderBy: vi.fn(),
  query: (col: unknown) => mockQuery(col),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: (...args: unknown[]) => mockWhere(...args),
  writeBatch: (db: unknown) => mockWriteBatch(db)
}));

import { buildDoorSettlementPatch } from '../src/lib/firestoreAttendance';
import {
  buildPromotedReportPayload,
  rejectDonationPledge
} from '../src/lib/firestoreDonations';
import {
  buildAssemblyQuestionPayload,
  closeMotionWithFinalResults,
  convertInquiryToMotion,
  placeMotionOnFloor
} from '../src/lib/firestoreAssembly';
import {
  buildBoardMemberPayload,
  buildProgramPayload,
  buildSiteNoticePayload
} from '../src/lib/firestoreContent';
import { batchUpdateVerifiedVoteWeights } from '../src/lib/authService';

describe('Domain Services Adversarial Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFirebaseServices.mockReturnValue({ db: { kind: 'mock-db' }, auth: {} });
  });

  it('firestoreAttendance.buildDoorSettlementPatch retains the newest 100 formalStatusHistory entries', () => {
    const entries = Array.from({ length: 105 }, (_, i) => ({
      id: `h-${i + 1}`,
      status: 'active' as const,
      effectiveDate: '2026-11-19',
      reason: `Entry ${i + 1}`,
      recordedBy: 'Scanner',
      dateLogged: '2026-11-19'
    }));

    const patch = buildDoorSettlementPatch({
      membershipStatus: 'active',
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      paidAt: '2026-11-19',
      paymentVerifiedBy: 'Scanner',
      formalStatusHistory: entries
    });

    expect(patch.formalStatusHistory).toHaveLength(100);
    expect(patch.formalStatusHistory[0].id).toBe('h-6');
    expect(patch.formalStatusHistory[99].id).toBe('h-105');
  });

  it('firestoreDonations rejects promoting Rejected pledges, avoids wiping donor notes on empty adminNotes, and validates pledgeId on reject', async () => {
    expect(() =>
      buildPromotedReportPayload(
        {
          id: 'pl-rej',
          donorName: 'Donor',
          email: 'donor@example.ch',
          amount: 50,
          currency: 'CHF',
          destination: 'Infaq',
          date: '2026-11-19',
          paymentMethod: 'TWINT',
          status: 'Rejected',
          notes: 'Donor note'
        },
        'Treasurer'
      )
    ).toThrow(/Rejected/i);

    const { pledgeUpdate } = buildPromotedReportPayload(
      {
        id: 'pl-ok',
        donorName: 'Donor',
        email: 'donor@example.ch',
        amount: 50,
        currency: 'CHF',
        destination: 'Infaq',
        date: '2026-11-19',
        paymentMethod: 'TWINT',
        status: 'Processing',
        notes: 'Keep me'
      },
      'Treasurer',
      '   '
    );
    expect('notes' in pledgeUpdate).toBe(false);

    await expect(rejectDonationPledge('   ')).rejects.toThrow(/ID is required/i);
  });

  it('firestoreAssembly rejects duplicate optionIds, blank option text, double escalation, and ignores unknown votedOptionId on close', async () => {
    expect(() =>
      buildAssemblyQuestionPayload({
        id: 'q-dup',
        title: 'Dup Options',
        description: 'Desc',
        category: 'General Resolution',
        status: 'draft',
        type: 'multiple_choice',
        options: [
          { id: 'opt-1', text: 'A', votesWeighted: 0, ballotCount: 0 },
          { id: 'opt-1', text: 'B', votesWeighted: 0, ballotCount: 0 }
        ],
        totalVotesWeighted: 0,
        totalBallots: 0,
        createdAt: '2026-11-19T10:00:00Z',
        createdBy: 'Admin',
        quorumRequiredPercent: 50
      })
    ).toThrow(/unique/i);

    expect(() =>
      buildAssemblyQuestionPayload({
        id: 'q-blank',
        title: 'Blank Option',
        description: 'Desc',
        category: 'General Resolution',
        status: 'draft',
        type: 'multiple_choice',
        options: [
          { id: 'opt-1', text: 'A', votesWeighted: 0, ballotCount: 0 },
          { id: 'opt-2', text: '   ', votesWeighted: 0, ballotCount: 0 }
        ],
        totalVotesWeighted: 0,
        totalBallots: 0,
        createdAt: '2026-11-19T10:00:00Z',
        createdBy: 'Admin',
        quorumRequiredPercent: 50
      })
    ).toThrow(/non-empty text/i);

    const batchOps: Array<{ type: string; path: string; data: Record<string, unknown> }> = [];
    const mockBatch = {
      update: (ref: { path: string }, data: Record<string, unknown>) => {
        batchOps.push({ type: 'update', path: ref.path, data });
      },
      set: (ref: { path: string }, data: Record<string, unknown>) => {
        batchOps.push({ type: 'set', path: ref.path, data });
      },
      commit: vi.fn(async () => {})
    };
    mockWriteBatch.mockReturnValue(mockBatch);
    mockGetDoc.mockResolvedValue({ exists: () => false });

    const finalResults = await closeMotionWithFinalResults(
      'q-1',
      [
        {
          id: 'u1',
          questionId: 'q-1',
          memberCode: 'PI-1',
          memberName: 'One',
          membershipCategory: 'personal',
          votedOptionId: 'opt-yes',
          voteWeight: 2,
          timestamp: '2026-11-19T10:00:00Z',
          breakdown: {
            primaryEligible: true,
            spouseEligible: false,
            eligibleChildrenNames: [],
            ineligibleChildrenNames: []
          }
        },
        {
          id: 'u2',
          questionId: 'q-1',
          memberCode: 'PI-2',
          memberName: 'Two',
          membershipCategory: 'personal',
          votedOptionId: 'opt-stale-invalid',
          voteWeight: 5,
          timestamp: '2026-11-19T10:01:00Z',
          breakdown: {
            primaryEligible: true,
            spouseEligible: false,
            eligibleChildrenNames: [],
            ineligibleChildrenNames: []
          }
        }
      ],
      [
        { id: 'opt-yes', text: 'Yes', votesWeighted: 0, ballotCount: 0 },
        { id: 'opt-no', text: 'No', votesWeighted: 0, ballotCount: 0 }
      ],
      'Admin'
    );

    expect(finalResults.totalWeight).toBe(2);
    expect(finalResults.totalBallots).toBe(1);
    expect(finalResults.optionTotals).toEqual({ 'opt-yes': 2, 'opt-no': 0 });
    expect(batchOps[0].data.totalVotesWeighted).toBe(2);

    // placeMotionOnFloor queries live Firestore on_floor motions and safely creates gaSession if missing
    batchOps.length = 0;
    mockGetDocs.mockResolvedValue({ docs: [{ id: 'q-stale-floor' }] });
    mockGetDoc.mockResolvedValue({ exists: () => false });
    await placeMotionOnFloor('q-next', []);
    expect(batchOps.some((op) => op.path === 'assemblyQuestions/q-stale-floor' && op.data.status === 'draft')).toBe(true);
    expect(batchOps.some((op) => op.path === 'siteConfig/gaSession' && op.type === 'set')).toBe(true);

    // convertInquiryToMotion blocks double-escalation
    await expect(
      convertInquiryToMotion(
        {
          id: 'inq-1',
          title: 'Escalated',
          content: 'Already escalated',
          category: 'General',
          authorUid: 'u1',
          authorName: 'Member',
          authorMemberCode: 'PI-1',
          authorCategory: 'personal',
          submittedAt: '2026-11-19T10:00:00Z',
          status: 'agenda_item',
          convertedToQuestionId: 'ga-q-existing'
        },
        'Admin'
      )
    ).rejects.toThrow(/already been escalated/i);
  });

  it('firestoreContent accepts brand linkScreen, skips empty-string board order, and checks UTF-8 byte length <= 2048', () => {
    const notice = buildSiteNoticePayload({
      enabled: true,
      badge: 'Brand',
      message: 'View styleguide',
      linkText: 'Open',
      linkScreen: 'brand'
    });
    expect(notice.linkScreen).toBe('brand');

    const board = buildBoardMemberPayload({
      id: 'bm-1',
      name: 'Board Member',
      role: 'Treasurer',
      department: 'Finance',
      imageUrl: 'https://example.com/a.jpg',
      bio: 'Bio',
      order: '' as unknown as number
    });
    expect('order' in board).toBe(false);

    const multiByteUrl = `https://example.com/${'ü'.repeat(1500)}`; // 1520 chars, 3020 UTF-8 bytes
    expect(multiByteUrl.length).toBeLessThan(2048);
    expect(() =>
      buildProgramPayload({
        id: 'prog-utf8',
        title: 'UTF8 Test',
        category: 'Youth',
        tag: 'Weekly',
        iconName: 'groups',
        description: 'Desc',
        imageUrl: multiByteUrl,
        dateOrSchedule: 'Sundays',
        location: 'Zürich',
        detailedOverview: 'Details'
      })
    ).toThrow(/valid HTTP/i);
  });

  it('authService.batchUpdateVerifiedVoteWeights validates NaN even with whitespace UID and exits cleanly if all UIDs are blank', async () => {
    mockGetFirebaseServices.mockReturnValue(null);

    await expect(
      batchUpdateVerifiedVoteWeights([
        {
          uid: '   ',
          verifiedVoteWeight: Number.NaN,
          voteWeightVerifiedAt: '2026-11-19T10:00:00Z',
          voteWeightVerifiedBy: 'Admin'
        }
      ])
    ).rejects.toThrow(/Invalid verifiedVoteWeight/i);

    await expect(
      batchUpdateVerifiedVoteWeights([
        {
          uid: '   ',
          verifiedVoteWeight: 2,
          voteWeightVerifiedAt: '2026-11-19T10:00:00Z',
          voteWeightVerifiedBy: 'Admin'
        }
      ])
    ).resolves.toBeUndefined();
  });
});
