import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as nodeModule from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { calculateVotingPower } from '../src/utils/votingPower';
import { INITIAL_MEMBERS_LIST } from '../src/data/members';
import { isSafeHttpUrl } from '../src/lib/urlValidation';
import { de } from '../src/i18n/translations/de';
import { en } from '../src/i18n/translations/en';
import { id } from '../src/i18n/translations/id';
import { ms } from '../src/i18n/translations/ms';
import type { TranslationDictionary } from '../src/i18n/types';
import type { NavScreen, QuestionStatus, UserAccount } from '../src/types';

// Stub `src/lib/firebase.ts` under Node/tsx where Vite's `import.meta.env` is undefined
const registerHooksFn = (
  nodeModule as unknown as {
    registerHooks?: (hooks: {
      load: (
        url: string,
        context: Record<string, unknown>,
        nextLoad: (url: string, context: Record<string, unknown>) => unknown
      ) => unknown;
    }) => void;
  }
).registerHooks;

if (typeof registerHooksFn === 'function') {
  registerHooksFn({
    load(url, context, nextLoad) {
      if (url.endsWith('/src/lib/firebase.ts')) {
        return {
          format: 'module',
          shortCircuit: true,
          source: `
            export const googleProvider = {};
            export function getFirebaseOptions() { return null; }
            export function isFirebaseConfigured() { return false; }
            export function getFirebaseServices() { return null; }
            export function getAppCheckStatus() { return { configured: false, initialized: false, debugMode: false }; }
          `
        };
      }
      return nextLoad(url, context);
    }
  });
}

const authService = await import('../src/lib/authService');
const firestoreContent = await import('../src/lib/firestoreContent');
const firestoreDonations = await import('../src/lib/firestoreDonations');
const firestoreAttendance = await import('../src/lib/firestoreAttendance');
const firestoreAssembly = await import('../src/lib/firestoreAssembly');
const firestoreBootstrap = await import('../src/lib/firestoreBootstrap');

const SUPER_ADMIN_TEST_USER: UserAccount = {
  uid: 'live-superadmin-uid',
  name: 'Super Administrator',
  email: 'superadmin@percikaniman.org',
  isAdmin: true,
  isSuperAdmin: true,
  canManageBoard: true,
  canScanQR: true
};

describe('M2 Voting Power & Seed Integrity', () => {
  it('computes expected vote weights for all 7 INITIAL_MEMBERS_LIST entries', () => {
    const weights = INITIAL_MEMBERS_LIST.map((m) => ({
      code: m.memberCode,
      votes: calculateVotingPower(m).totalVotes
    }));

    assert.deepEqual(weights, [
      { code: 'PI-FAM-2021', votes: 2 },
      { code: 'PI-7740', votes: 1 },
      { code: 'PI-9552', votes: 0 },
      { code: 'PI-STU-8821', votes: 1 },
      { code: 'PI-ALUM-309', votes: 0 },
      { code: 'PI-ADMIN', votes: 4 },
      { code: 'PI-SUPERADMIN', votes: 1 }
    ]);
  });
});

describe('M2 Bootstrap Builder & Batch Chunking', () => {
  it('builds rule-compliant bootstrap operations from src/data/*', async () => {
    const nowIso = '2026-11-19T15:00:00Z';
    const result = await firestoreBootstrap.buildBootstrapOperations(
      SUPER_ADMIN_TEST_USER,
      nowIso
    );

    assert.equal(result.counts.programs, 8);
    assert.equal(result.counts.campaigns, 8); // 4 CAMPAIGNS_DATA + 4 OTHER_PROJECTS
    assert.equal(result.counts.destinations, 7);
    assert.equal(result.counts.donationReports, 5);
    assert.equal(result.counts.boardMembers, 12);
    assert.equal(result.counts.events, 8);
    assert.equal(result.counts.members, 7);
    assert.equal(result.counts.assemblyQuestions, 4);
    assert.equal(result.counts.boardInquiries, 3);
    assert.equal(result.counts.siteConfig, 3);
    assert.equal(result.writes.length, 65);

    // `/siteConfig/bootstrap` must be the final operation
    const lastWrite = result.writes[result.writes.length - 1];
    assert.equal(lastWrite.path, 'siteConfig/bootstrap');
    assert.equal(lastWrite.data.version, firestoreBootstrap.BOOTSTRAP_VERSION);

    // No `/ballots/*` or `/upvotes/*` subcollection writes
    assert.equal(
      result.writes.some((w) => w.path.includes('/ballots/') || w.path.includes('/upvotes/')),
      false
    );

    // Members: verifiedVoteWeight stamped and current superadmin merged under live UID
    const memberWrites = result.writes.filter((w) => w.collectionPath === 'members');
    for (const mw of memberWrites) {
      assert.equal(typeof mw.data.verifiedVoteWeight, 'number');
      assert.ok(
        (mw.data.verifiedVoteWeight as number) >= 0 &&
          (mw.data.verifiedVoteWeight as number) <= 20
      );
      assert.equal(mw.data.voteWeightVerifiedAt, nowIso);
      assert.equal(mw.data.voteWeightVerifiedBy, 'Super Administrator');
    }
    const superAdminWrite = memberWrites.find(
      (w) => w.docId === SUPER_ADMIN_TEST_USER.uid
    );
    assert.ok(superAdminWrite, 'SuperAdmin seed should target signed-in adminUser.uid');
    assert.equal(superAdminWrite?.merge, true);

    // Assembly questions: optionIds present, ballots stripped, ga-q1 reset, ga-q4 finalResults
    const questionWrites = result.writes.filter(
      (w) => w.collectionPath === 'assemblyQuestions'
    );
    for (const qw of questionWrites) {
      assert.equal('ballots' in qw.data, false);
      assert.ok(Array.isArray(qw.data.optionIds));
      assert.ok((qw.data.optionIds as string[]).length >= 2);
      assert.ok(['draft', 'on_floor', 'closed'].includes(qw.data.status as string));
    }

    const q1 = questionWrites.find((w) => w.docId === 'ga-q1');
    assert.ok(q1);
    assert.equal(q1.data.totalVotesWeighted, 0);
    assert.equal(q1.data.totalBallots, 0);
    for (const opt of q1.data.options as Array<{ votesWeighted: number; ballotCount: number }>) {
      assert.equal(opt.votesWeighted, 0);
      assert.equal(opt.ballotCount, 0);
    }

    const q4 = questionWrites.find((w) => w.docId === 'ga-q4');
    assert.ok(q4);
    assert.deepEqual(q4.data.finalResults, {
      totalWeight: 52,
      totalBallots: 18,
      closedAt: '2026-08-30T23:59:59Z',
      closedBy: 'Treasurer & Financial Board',
      optionTotals: {
        'opt-yes': 49,
        'opt-no': 1,
        'opt-abstain': 2
      }
    });

    // Board inquiries: authorUid present, authorEmail & upvotes stripped
    const inquiryWrites = result.writes.filter(
      (w) => w.collectionPath === 'boardInquiries'
    );
    for (const iw of inquiryWrites) {
      assert.equal('authorEmail' in iw.data, false);
      assert.equal('upvotes' in iw.data, false);
      assert.equal(typeof iw.data.authorUid, 'string');
      assert.ok((iw.data.authorUid as string).length >= 1);
    }
  });

  it('chunks operations strictly below Firestore 500-write batch limit', () => {
    const items = Array.from({ length: 1001 }, (_, i) => i);
    const chunks = firestoreBootstrap.chunkOperations(items, 450);
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0].length, 450);
    assert.equal(chunks[1].length, 450);
    assert.equal(chunks[2].length, 101);
    for (const chunk of chunks) {
      assert.ok(chunk.length < 500);
    }
  });
});

describe('M2 Sanitizers, URL/Image Validation & Auth Gate Helpers', () => {
  it('validates HTTP(S) URLs and Firestore image URLs strictly', () => {
    assert.equal(isSafeHttpUrl('https://percikaniman.ch/event'), true);
    assert.equal(isSafeHttpUrl('http://localhost:3000'), true);
    assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
    assert.equal(isSafeHttpUrl('data:text/html,<script>'), false);
    assert.equal(isSafeHttpUrl('/relative/path'), false);

    assert.equal(
      firestoreContent.isValidFirestoreImageUrl('https://images.unsplash.com/photo-1'),
      true
    );
    assert.equal(
      firestoreContent.isValidFirestoreImageUrl('http://localhost:3000/img.png'),
      true
    );
    assert.equal(
      firestoreContent.isValidFirestoreImageUrl('HTTPS://images.unsplash.com/photo-1'),
      false
    );
    assert.equal(
      firestoreContent.isValidFirestoreImageUrl('HTTP://localhost:3000/img.png'),
      false
    );
    assert.equal(
      firestoreContent.normalizeSafeHttpUrl('  HTTPS://Zoom.US/j/123456 '),
      'https://Zoom.US/j/123456'
    );
    assert.equal(
      firestoreContent.normalizeSafeHttpUrl('HTTP://example.com/a.png'),
      'http://example.com/a.png'
    );
    assert.equal(
      firestoreContent.isValidFirestoreImageUrl('data:image/png;base64,iVBORw0KGgo='),
      true
    );
    assert.equal(
      firestoreContent.isValidFirestoreImageUrl('data:image/svg+xml;base64,PHN2Zz4='),
      false
    );
    assert.equal(
      firestoreContent.isValidFirestoreImageUrl('javascript:alert(1)'),
      false
    );
  });

  it('rejects NaN and non-finite verifiedVoteWeight in batchUpdateVerifiedVoteWeights', async () => {
    await assert.rejects(
      () =>
        authService.batchUpdateVerifiedVoteWeights([
          {
            uid: 'u1',
            verifiedVoteWeight: Number.NaN,
            voteWeightVerifiedAt: '2026-11-19T15:00:00Z',
            voteWeightVerifiedBy: 'SuperAdmin'
          }
        ]),
      /Invalid verifiedVoteWeight/
    );
    await assert.rejects(
      () =>
        authService.batchUpdateVerifiedVoteWeights([
          {
            uid: 'u2',
            verifiedVoteWeight: Number.POSITIVE_INFINITY,
            voteWeightVerifiedAt: '2026-11-19T15:00:00Z',
            voteWeightVerifiedBy: 'SuperAdmin'
          }
        ]),
      /Invalid verifiedVoteWeight/
    );
  });

  it('evaluates dev/emulator gating strictly for production isolation', () => {
    assert.equal(authService.evaluateDevOrEmulatorGate(true, undefined, false, 'example.com'), true);
    assert.equal(authService.evaluateDevOrEmulatorGate(false, 'true', true, 'localhost'), true);
    assert.equal(authService.evaluateDevOrEmulatorGate(false, 'true', true, '127.0.0.1'), true);
    assert.equal(authService.evaluateDevOrEmulatorGate(false, 'true', true, 'percikaniman.ch'), false);
    assert.equal(authService.evaluateDevOrEmulatorGate(false, 'false', true, 'localhost'), false);
    assert.equal(authService.evaluateDevOrEmulatorGate(false, undefined, false, 'localhost'), false);
  });

  it('strips undefined recursively while preserving Date/sentinel instances', () => {
    class FakeFieldValue {
      readonly _type = 'deleteField';
    }
    const sentinel = new FakeFieldValue();
    const cleaned = authService.sanitizeFirestorePayload({
      a: 'ok',
      b: undefined,
      nested: { x: 1, y: undefined },
      arr: [1, undefined, { z: undefined, keep: true }],
      sentinel
    });
    assert.equal('b' in cleaned, false);
    assert.deepEqual(cleaned.nested, { x: 1 });
    assert.deepEqual(cleaned.arr, [1, { keep: true }]);
    assert.equal(cleaned.sentinel, sentinel);
  });
});

describe('M2 Domain Payload Builders (firestore.rules Compliance)', () => {
  it('enforces siteConfig/notice linkScreen normalization and rejection of admin', () => {
    const normalized = firestoreContent.buildSiteNoticePayload({
      enabled: true,
      badge: 'Notice',
      message: 'Test',
      linkText: undefined,
      linkScreen: 'auth' as unknown as NavScreen
    });
    assert.equal(normalized.linkScreen, 'login');
    assert.equal('linkText' in normalized, false);

    assert.throws(() =>
      firestoreContent.buildSiteNoticePayload({
        enabled: true,
        badge: 'Notice',
        message: 'Test',
        linkScreen: 'admin' as unknown as NavScreen
      })
    );
  });

  it('omits event capacity <= 0 and rejects unsafe onlineLink', () => {
    const evt = firestoreContent.buildEventPayload({
      id: 'evt-1',
      title: 'Halaqah',
      date: '2026-10-01',
      time: '18:00',
      category: 'Majelis & Spiritual',
      location: 'Zürich',
      description: 'Monthly gathering',
      capacity: 0
    });
    assert.equal('capacity' in evt, false);

    assert.throws(() =>
      firestoreContent.buildEventPayload({
        id: 'evt-2',
        title: 'Online',
        date: '2026-10-01',
        time: '18:00',
        category: 'Majelis & Spiritual',
        location: 'Online',
        description: 'Zoom',
        onlineLink: 'javascript:alert(1)'
      })
    );

    // Normalizes uppercase HTTP(S) schemes to lowercase across content payload builders
    const evtNormalized = firestoreContent.buildEventPayload({
      id: 'evt-upper',
      title: 'Online',
      date: '2026-10-01',
      time: '18:00',
      category: 'Majelis & Spiritual',
      location: 'Online',
      description: 'Zoom',
      onlineLink: 'HTTPS://zoom.us/j/123456',
      imageUrl: 'HTTP://example.com/banner.jpg'
    });
    assert.equal(evtNormalized.onlineLink, 'https://zoom.us/j/123456');
    assert.equal(evtNormalized.imageUrl, 'http://example.com/banner.jpg');

    const progNormalized = firestoreContent.buildProgramPayload({
      id: 'prog-upper',
      title: 'Youth Program',
      category: 'Youth',
      tag: 'Weekly',
      iconName: 'groups',
      description: 'Desc',
      imageUrl: 'HTTPS://cdn.example.com/prog.png',
      dateOrSchedule: 'Sundays',
      location: 'Zürich',
      detailedOverview: 'Details'
    });
    assert.equal(progNormalized.imageUrl, 'https://cdn.example.com/prog.png');

    const campNormalized = firestoreContent.buildCampaignPayload({
      id: 'camp-upper',
      title: 'Mosque Fund',
      description: 'Desc',
      progressPercent: 25,
      currentAmount: 2500,
      goalAmount: 10000,
      imageUrl: 'HTTPS://cdn.example.com/camp.png'
    });
    assert.equal(campNormalized.imageUrl, 'https://cdn.example.com/camp.png');

    const boardNormalized = firestoreContent.buildBoardMemberPayload({
      id: 'board-upper',
      name: 'Board Member',
      role: 'Treasurer',
      department: 'Finance',
      imageUrl: 'HTTP://cdn.example.com/avatar.png',
      bio: 'Bio'
    });
    assert.equal(boardNormalized.imageUrl, 'http://cdn.example.com/avatar.png');

    assert.throws(() =>
      firestoreContent.buildProgramPayload({
        id: 'prog-bad-url',
        title: 'Bad',
        category: 'Youth',
        tag: 'Weekly',
        iconName: 'groups',
        description: 'Desc',
        imageUrl: 'ftp://cdn.example.com/prog.png',
        dateOrSchedule: 'Sundays',
        location: 'Zürich',
        detailedOverview: 'Details'
      })
    );
  });

  it('enforces donationPledge create & atomic promote payloads', () => {
    const pledge = firestoreDonations.buildDonationPledgePayload({
      donorName: 'Amina',
      email: 'amina@example.ch',
      amount: 100,
      destination: 'INFAQ & Vereinsbetrieb'
    });
    assert.equal(pledge.currency, 'CHF');
    assert.equal(pledge.status, 'Processing');
    assert.equal('promotedReportId' in pledge, false);

    const { report, pledgeUpdate } = firestoreDonations.buildPromotedReportPayload(
      pledge,
      'Treasurer Carlo',
      'Confirmed on bank statement'
    );
    assert.equal(report.sourcePledgeId, pledge.id);
    assert.equal(report.currency, 'CHF');
    assert.equal(report.status, 'Completed');
    assert.deepEqual(Object.keys(pledgeUpdate).sort(), [
      'notes',
      'promotedReportId',
      'status'
    ]);

    // buildManualDonationReportPayload validates currency and status at runtime
    const manualDefault = firestoreDonations.buildManualDonationReportPayload({
      donorName: 'Cash Donor',
      amount: 50,
      destination: 'Mosque Operations',
      paymentMethod: 'Cash'
    });
    assert.equal(manualDefault.currency, 'CHF');
    assert.equal(manualDefault.status, 'Completed');

    const manualEur = firestoreDonations.buildManualDonationReportPayload({
      donorName: 'Euro Donor',
      amount: 25,
      currency: 'EUR',
      destination: 'Mosque Operations',
      paymentMethod: 'Bank Transfer',
      status: 'Flagged'
    });
    assert.equal(manualEur.currency, 'EUR');
    assert.equal(manualEur.status, 'Flagged');

    assert.throws(
      () =>
        firestoreDonations.buildManualDonationReportPayload({
          donorName: 'Bad Currency',
          amount: 50,
          currency: 'GBP' as unknown as 'CHF',
          destination: 'Mosque Operations',
          paymentMethod: 'Cash'
        }),
      /Invalid donation currency/
    );

    assert.throws(
      () =>
        firestoreDonations.buildManualDonationReportPayload({
          donorName: 'Bad Status',
          amount: 50,
          destination: 'Mosque Operations',
          paymentMethod: 'Cash',
          status: 'Rejected' as unknown as 'Completed'
        }),
      /Invalid donation report status/
    );
  });

  it('enforces attendance whitelist & strict 6-field settleDoorCashFee patch', () => {
    const att = firestoreAttendance.buildAttendanceRecordPayload({
      eventId: 'evt-1',
      eventTitle: 'Pengajian',
      memberCode: 'PI-7740',
      memberName: 'Bambang',
      memberEmail: '',
      category: 'personal',
      status: 'fee_paused',
      isFeeExempt: false,
      partyCount: 99,
      partyMembers: Array.from({ length: 30 }, (_, i) => `Person ${i}`),
      scannedAt: '2026-11-19T10:00:00Z',
      scannedBy: 'Scanner',
      feePaidChf: 0,
      verified: true,
      notes: undefined
    });
    assert.equal('memberEmail' in att, false);
    assert.equal('notes' in att, false);
    assert.equal(att.partyCount, 25);
    assert.equal(att.partyMembers.length, 25);

    assert.throws(() =>
      firestoreAttendance.buildAttendanceRecordPayload({
        eventId: 'evt-1',
        eventTitle: 'Pengajian',
        memberCode: 'PI-7740',
        memberName: 'Bambang',
        category: 'personal',
        status: 'paused' as unknown as 'fee_paused',
        isFeeExempt: false,
        partyCount: 1,
        partyMembers: ['Bambang'],
        scannedAt: '2026-11-19T10:00:00Z',
        scannedBy: 'Scanner',
        feePaidChf: 0,
        verified: true
      })
    );

    const doorPatch = firestoreAttendance.buildDoorSettlementPatch({
      membershipStatus: 'active',
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      paidAt: '19.11.2026',
      paymentVerifiedBy: 'Scanner Operator',
      formalStatusHistory: []
    });
    assert.deepEqual(Object.keys(doorPatch).sort(), [
      'formalStatusHistory',
      'membershipStatus',
      'paidAt',
      'paymentMethod',
      'paymentStatus',
      'paymentVerifiedBy'
    ]);
  });

  it('enforces GA session, motion, ballot (no memberEmail), and boardInquiry rules', () => {
    const session = firestoreAssembly.buildGaSessionPayload({
      isOpen: true,
      sessionTitle: 'GV 2026',
      scheduledDate: '2026-09-15',
      activeQuestionId: ''
    });
    assert.equal(session.activeQuestionId, null);

    assert.throws(() =>
      firestoreAssembly.buildAssemblyQuestionPayload({
        id: 'q-bad',
        title: 'Bad',
        description: 'Uses deprecated open status',
        category: 'General Resolution',
        status: 'open' as unknown as QuestionStatus,
        type: 'yes_no_abstain',
        options: [
          { id: 'opt-yes', text: 'Yes', votesWeighted: 0, ballotCount: 0 },
          { id: 'opt-no', text: 'No', votesWeighted: 0, ballotCount: 0 }
        ],
        totalVotesWeighted: 0,
        totalBallots: 0,
        createdAt: '2026-11-19T10:00:00Z',
        createdBy: 'Admin',
        quorumRequiredPercent: 50
      })
    );

    // Rejects > 20 voting options instead of silently truncating option 21+
    assert.throws(
      () =>
        firestoreAssembly.buildAssemblyQuestionPayload({
          id: 'q-too-many-opts',
          title: 'Board Election',
          description: 'Too many candidates',
          category: 'Board Election',
          status: 'draft',
          type: 'multiple_choice',
          options: Array.from({ length: 21 }, (_, idx) => ({
            id: `opt-${idx + 1}`,
            text: `Candidate ${idx + 1}`,
            votesWeighted: 0,
            ballotCount: 0
          })),
          totalVotesWeighted: 0,
          totalBallots: 0,
          createdAt: '2026-11-19T10:00:00Z',
          createdBy: 'Admin',
          quorumRequiredPercent: 50
        }),
      /more than 20 voting options/
    );

    // Preserves explicit quorumRequiredPercent: 0 and defaults undefined to 50
    const zeroQuorum = firestoreAssembly.buildAssemblyQuestionPayload({
      id: 'q-zero-quorum',
      title: 'Advisory Poll',
      description: 'Non-binding poll',
      category: 'General Resolution',
      status: 'draft',
      type: 'yes_no_abstain',
      options: [
        { id: 'opt-yes', text: 'Yes', votesWeighted: 0, ballotCount: 0 },
        { id: 'opt-no', text: 'No', votesWeighted: 0, ballotCount: 0 }
      ],
      totalVotesWeighted: 0,
      totalBallots: 0,
      createdAt: '2026-11-19T10:00:00Z',
      createdBy: 'Admin',
      quorumRequiredPercent: 0
    });
    assert.equal(zeroQuorum.quorumRequiredPercent, 0);

    const defaultQuorum = firestoreAssembly.buildAssemblyQuestionPayload({
      id: 'q-default-quorum',
      title: 'Standard Motion',
      description: 'Default quorum',
      category: 'General Resolution',
      status: 'draft',
      type: 'yes_no_abstain',
      options: [
        { id: 'opt-yes', text: 'Yes', votesWeighted: 0, ballotCount: 0 },
        { id: 'opt-no', text: 'No', votesWeighted: 0, ballotCount: 0 }
      ],
      totalVotesWeighted: 0,
      totalBallots: 0,
      createdAt: '2026-11-19T10:00:00Z',
      createdBy: 'Admin',
      quorumRequiredPercent: undefined as unknown as number
    });
    assert.equal(defaultQuorum.quorumRequiredPercent, 50);

    assert.throws(
      () =>
        firestoreAssembly.buildAssemblyQuestionPayload({
          id: 'q-nan-quorum',
          title: 'Invalid Quorum',
          description: 'NaN quorum',
          category: 'General Resolution',
          status: 'draft',
          type: 'yes_no_abstain',
          options: [
            { id: 'opt-yes', text: 'Yes', votesWeighted: 0, ballotCount: 0 },
            { id: 'opt-no', text: 'No', votesWeighted: 0, ballotCount: 0 }
          ],
          totalVotesWeighted: 0,
          totalBallots: 0,
          createdAt: '2026-11-19T10:00:00Z',
          createdBy: 'Admin',
          quorumRequiredPercent: Number.NaN
        }),
      /quorumRequiredPercent/
    );

    const ballot = firestoreAssembly.buildBallotPayload('ga-q1', 'uid-bambang', {
      memberCode: 'PI-7740',
      memberName: 'Bambang',
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
    });
    assert.equal('memberEmail' in ballot, false);
    assert.deepEqual(Object.keys(ballot).sort(), [
      'breakdown',
      'id',
      'memberCode',
      'memberName',
      'membershipCategory',
      'questionId',
      'timestamp',
      'voteWeight',
      'votedOptionId'
    ]);

    const inquiry = firestoreAssembly.buildBoardInquiryCreatePayload({
      title: 'Budget question',
      content: 'Details about budget allocation.',
      category: 'Finance & Audit',
      authorUid: 'uid-bambang',
      authorName: 'Bambang',
      authorMemberCode: 'PI-7740',
      authorCategory: 'personal'
    });
    assert.equal('authorEmail' in inquiry, false);
    assert.equal('upvotes' in inquiry, false);
    assert.equal('boardResponse' in inquiry, false);
    assert.equal('convertedToQuestionId' in inquiry, false);
    assert.equal(inquiry.status, 'submitted');
  });
});

describe('M2 4-Locale i18n Deep Key Parity & Non-Empty Checks', () => {
  function collectLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys.push(...collectLeafKeys(v as Record<string, unknown>, path));
      } else {
        keys.push(path);
      }
    }
    return keys.sort();
  }

  function getByPath(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, seg) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[seg];
      }
      return undefined;
    }, obj);
  }

  it('ensures de, en, id, ms have identical leaf keys and non-empty strings', () => {
    const locales: Array<[string, TranslationDictionary]> = [
      ['de', de],
      ['en', en],
      ['id', id],
      ['ms', ms]
    ];
    const baseKeys = collectLeafKeys(de as unknown as Record<string, unknown>);
    assert.ok(baseKeys.length > 150);

    const requiredNewKeys = [
      'nav.returnToPublicSite',
      'nav.accessDenied',
      'nav.accessDeniedDesc',
      'donate.pledgeSubmittedBadge',
      'donate.pledgeSubmittedTitle',
      'donate.pledgeSubmittedDesc',
      'member.voteWeightVerifiedBadge',
      'member.voteWeightPendingBadge',
      'member.voteWeightPendingNotice',
      'admin.tabEvents',
      'admin.tabAttendance',
      'admin.tabAssembly',
      'admin.tabBootstrap',
      'admin.pendingPledgesTitle',
      'admin.promotePledge',
      'admin.rejectPledge',
      'admin.pledgeStatusProcessing',
      'admin.pledgeStatusPromoted',
      'admin.pledgeStatusRejected',
      'admin.voterRollTitle',
      'admin.certifyVoterRoll',
      'admin.voteWeightVerified',
      'admin.voteWeightPending',
      'admin.voteWeightMismatch',
      'admin.reverifyVoteWeight',
      'admin.bootstrapTitle',
      'admin.bootstrapDesc',
      'admin.bootstrapRunAction',
      'admin.bootstrapAlreadySeeded'
    ];
    for (const reqKey of requiredNewKeys) {
      assert.ok(baseKeys.includes(reqKey), `Missing expected i18n key: ${reqKey}`);
    }

    for (const [code, dict] of locales) {
      const keys = collectLeafKeys(dict as unknown as Record<string, unknown>);
      assert.deepEqual(keys, baseKeys, `Key parity mismatch for locale "${code}"`);
      for (const key of keys) {
        const val = getByPath(dict as unknown as Record<string, unknown>, key);
        assert.equal(typeof val, 'string', `${code}.${key} must be a string`);
        assert.ok((val as string).trim().length > 0, `${code}.${key} must be non-empty`);
      }
    }
  });
});

describe('M2 Bundle Isolation Static Import Audit', () => {
  it('ensures zero static src/data/* imports in AuthContext, votingPower, and M2 services', () => {
    const root = resolve(process.cwd());
    const strictlyNoDataFiles = [
      'src/utils/votingPower.ts',
      'src/context/AuthContext.tsx',
      'src/lib/firestoreContent.ts',
      'src/lib/firestoreDonations.ts',
      'src/lib/firestoreAttendance.ts',
      'src/lib/firestoreAssembly.ts'
    ];
    for (const rel of strictlyNoDataFiles) {
      const content = readFileSync(resolve(root, rel), 'utf8');
      assert.equal(
        /data\//.test(content),
        false,
        `${rel} must not import anything from src/data/*`
      );
    }

    const dynamicOnlyFiles = ['src/lib/authService.ts', 'src/lib/firestoreBootstrap.ts'];
    for (const rel of dynamicOnlyFiles) {
      const content = readFileSync(resolve(root, rel), 'utf8');
      assert.equal(
        /^\s*import\s+.*from\s+['"][^'"]*data\//m.test(content),
        false,
        `${rel} must not contain static top-level imports from src/data/*`
      );
      assert.equal(
        /import\(\s*['"][^'"]*data\//.test(content),
        true,
        `${rel} should use dynamic import() for src/data/*`
      );
    }
  });
});
