import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
} from 'firebase/firestore';

const RULES_PROJECT_ID = 'percikan-iman-rules-test';

function resolveEmulatorHostPort(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const lastColon = raw.lastIndexOf(':');
  if (lastColon === -1) {
    return { host: raw, port: 8080 };
  }
  const host = raw.slice(0, lastColon) || '127.0.0.1';
  const port = Number.parseInt(raw.slice(lastColon + 1), 10) || 8080;
  return { host, port };
}

let testEnv: RulesTestEnvironment;

const MEMBER_ACTIVE_UID = 'member-active';
const MEMBER_INACTIVE_UID = 'member-inactive';
const MEMBER_EXEMPT_UID = 'member-exempt';
const SCANNER_UID = 'scanner-1';
const BOARD_MGR_UID = 'board-mgr-1';
const ADMIN_UID = 'admin-1';
const SUPER_ADMIN_UID = 'superadmin-1';

async function seedStandardMembers() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'members', MEMBER_ACTIVE_UID), {
      uid: MEMBER_ACTIVE_UID,
      name: 'Active Member',
      email: 'active@percikaniman.org',
      memberCode: 'PI-1001',
      membershipCategory: 'family',
      membershipStatus: 'active',
      paymentStatus: 'paid',
      verifiedVoteWeight: 3,
      isAdmin: false,
      isSuperAdmin: false,
      canScanQR: false,
      canManageBoard: false,
    });

    await setDoc(doc(db, 'members', MEMBER_INACTIVE_UID), {
      uid: MEMBER_INACTIVE_UID,
      name: 'Inactive Member',
      email: 'inactive@percikaniman.org',
      memberCode: 'PI-1002',
      membershipCategory: 'personal',
      membershipStatus: 'pending_payment',
      paymentStatus: 'pending_payment',
      feeExemption: { isExempt: false, retainsBenefits: true },
      verifiedVoteWeight: 1,
      isAdmin: false,
    });

    await setDoc(doc(db, 'members', MEMBER_EXEMPT_UID), {
      uid: MEMBER_EXEMPT_UID,
      name: 'Exempt Member',
      email: 'exempt@percikaniman.org',
      memberCode: 'PI-1003',
      membershipCategory: 'personal',
      membershipStatus: 'pending_payment',
      paymentStatus: 'exempt',
      feeExemption: { isExempt: true, retainsBenefits: true },
      verifiedVoteWeight: 1,
      isAdmin: false,
    });

    await setDoc(doc(db, 'members', SCANNER_UID), {
      uid: SCANNER_UID,
      name: 'QR Scanner Operator',
      email: 'scanner@percikaniman.org',
      memberCode: 'PI-2001',
      membershipCategory: 'personal',
      membershipStatus: 'active',
      canScanQR: true,
      isAdmin: false,
    });

    await setDoc(doc(db, 'members', BOARD_MGR_UID), {
      uid: BOARD_MGR_UID,
      name: 'Board Manager',
      email: 'boardmgr@percikaniman.org',
      memberCode: 'PI-2002',
      membershipCategory: 'personal',
      membershipStatus: 'active',
      canManageBoard: true,
      isAdmin: false,
    });

    await setDoc(doc(db, 'members', ADMIN_UID), {
      uid: ADMIN_UID,
      name: 'Standard Admin',
      email: 'admin@percikaniman.org',
      memberCode: 'PI-9001',
      membershipCategory: 'personal',
      membershipStatus: 'active',
      isAdmin: true,
      isSuperAdmin: false,
      verifiedVoteWeight: 1,
    });

    await setDoc(doc(db, 'members', SUPER_ADMIN_UID), {
      uid: SUPER_ADMIN_UID,
      name: 'Super Admin',
      email: 'superadmin@percikaniman.org',
      memberCode: 'PI-9999',
      membershipCategory: 'personal',
      membershipStatus: 'active',
      isAdmin: true,
      isSuperAdmin: true,
      verifiedVoteWeight: 1,
    });
  });
}

function contexts() {
  return {
    unauth: testEnv.unauthenticatedContext(),
    memberActive: testEnv.authenticatedContext(MEMBER_ACTIVE_UID, {
      email: 'active@percikaniman.org',
    }),
    memberInactive: testEnv.authenticatedContext(MEMBER_INACTIVE_UID, {
      email: 'inactive@percikaniman.org',
    }),
    memberExempt: testEnv.authenticatedContext(MEMBER_EXEMPT_UID, {
      email: 'exempt@percikaniman.org',
    }),
    scanner: testEnv.authenticatedContext(SCANNER_UID, {
      email: 'scanner@percikaniman.org',
    }),
    boardMgr: testEnv.authenticatedContext(BOARD_MGR_UID, {
      email: 'boardmgr@percikaniman.org',
    }),
    admin: testEnv.authenticatedContext(ADMIN_UID, {
      email: 'admin@percikaniman.org',
    }),
    superAdmin: testEnv.authenticatedContext(SUPER_ADMIN_UID, {
      email: 'superadmin@percikaniman.org',
    }),
  };
}

describe('Firestore Security Rules (Local Emulator)', () => {
  beforeAll(async () => {
    const { host, port } = resolveEmulatorHostPort();
    const rules = fs.readFileSync(
      path.resolve(process.cwd(), 'firestore.rules'),
      'utf8',
    );
    testEnv = await initializeTestEnvironment({
      projectId: RULES_PROJECT_ID,
      firestore: {
        rules,
        host,
        port,
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedStandardMembers();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('1. Default-Deny Catch-All', () => {
    it('denies read and write on unknown collections and unknown siteConfig docs for all roles', async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), 'unknown', 'doc1'), { foo: 'bar' });
        await setDoc(doc(ctx.firestore(), 'siteConfig', 'unknown'), { foo: 'bar' });
      });

      const c = contexts();
      for (const ctx of [c.unauth, c.memberActive, c.admin, c.superAdmin]) {
        const db = ctx.firestore();
        await assertFails(getDoc(doc(db, 'unknown', 'doc1')));
        await assertFails(getDocs(collection(db, 'unknown')));
        await assertFails(setDoc(doc(db, 'unknown', 'doc2'), { foo: 'bar' }));
        await assertFails(getDoc(doc(db, 'siteConfig', 'unknown')));
        await assertFails(setDoc(doc(db, 'siteConfig', 'unknown2'), { foo: 'bar' }));
      }
    });
  });

  describe('2. /members/{uid}', () => {
    it('enforces owner-only get for regular members, list only for staff, and privilege/vote-weight protections', async () => {
      const c = contexts();

      // get & list
      await assertFails(getDoc(doc(c.unauth.firestore(), 'members', MEMBER_ACTIVE_UID)));
      await assertSucceeds(getDoc(doc(c.memberActive.firestore(), 'members', MEMBER_ACTIVE_UID)));
      await assertFails(getDoc(doc(c.memberActive.firestore(), 'members', MEMBER_INACTIVE_UID)));
      await assertFails(getDocs(collection(c.memberActive.firestore(), 'members')));

      for (const staff of [c.scanner, c.boardMgr, c.admin, c.superAdmin]) {
        await assertSucceeds(getDoc(doc(staff.firestore(), 'members', MEMBER_ACTIVE_UID)));
        await assertSucceeds(getDocs(collection(staff.firestore(), 'members')));
      }

      // self-create
      const newUid = 'new-user-1';
      const newCtx = testEnv.authenticatedContext(newUid, {
        email: 'NewUser@PercikanIman.org',
      });
      await assertSucceeds(
        setDoc(doc(newCtx.firestore(), 'members', newUid), {
          uid: newUid,
          name: 'New User',
          email: 'newuser@percikaniman.org',
          membershipCategory: 'personal',
          membershipStatus: 'pending_payment',
        }),
      );

      // self-create privilege escalation & invalid cases
      const badUid = 'new-user-bad';
      const badCtx = testEnv.authenticatedContext(badUid, {
        email: 'bad@percikaniman.org',
      });
      await assertFails(
        setDoc(doc(badCtx.firestore(), 'members', badUid), {
          uid: badUid,
          name: 'Bad Admin',
          email: 'bad@percikaniman.org',
          isAdmin: true,
        }),
      );
      await assertFails(
        setDoc(doc(badCtx.firestore(), 'members', badUid), {
          uid: badUid,
          name: 'Bad SuperAdmin',
          email: 'bad@percikaniman.org',
          isSuperAdmin: true,
        }),
      );
      await assertFails(
        setDoc(doc(badCtx.firestore(), 'members', badUid), {
          uid: badUid,
          name: 'Bad Scanner',
          email: 'bad@percikaniman.org',
          canScanQR: true,
        }),
      );
      await assertFails(
        setDoc(doc(badCtx.firestore(), 'members', badUid), {
          uid: badUid,
          name: 'Bad BoardMgr',
          email: 'bad@percikaniman.org',
          canManageBoard: true,
        }),
      );
      await assertFails(
        setDoc(doc(badCtx.firestore(), 'members', badUid), {
          uid: badUid,
          name: 'Bad VoteWeight',
          email: 'bad@percikaniman.org',
          verifiedVoteWeight: 5,
        }),
      );
      await assertFails(
        setDoc(doc(badCtx.firestore(), 'members', badUid), {
          uid: badUid,
          name: 'Bad FeeExemption',
          email: 'bad@percikaniman.org',
          feeExemption: { isExempt: true, retainsBenefits: true },
        }),
      );
      await assertFails(
        setDoc(doc(badCtx.firestore(), 'members', badUid), {
          uid: badUid,
          name: 'Bad ExemptStatus',
          email: 'bad@percikaniman.org',
          paymentStatus: 'exempt',
        }),
      );
      await assertFails(
        setDoc(doc(badCtx.firestore(), 'members', badUid), {
          uid: badUid,
          name: 'Wrong Email',
          email: 'other@percikaniman.org',
        }),
      );
      await assertFails(
        setDoc(doc(badCtx.firestore(), 'members', badUid), {
          uid: badUid,
          name: 'Extra Field',
          email: 'bad@percikaniman.org',
          hacked: true,
        }),
      );

      // self-update allowed fields + valid avatarUrl
      await assertSucceeds(
        updateDoc(doc(c.memberActive.firestore(), 'members', MEMBER_ACTIVE_UID), {
          name: 'Active Member Updated',
          phone: '+41 79 000 00 00',
          spouse: { name: 'Spouse Name' },
          children: [{ id: 'c1', name: 'Child One', birthYear: '2008' }],
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        }),
      );
      await assertSucceeds(
        updateDoc(doc(c.memberActive.firestore(), 'members', MEMBER_ACTIVE_UID), {
          avatarUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        }),
      );

      // self-update unsafe avatarUrl & protected fields
      await assertFails(
        updateDoc(doc(c.memberActive.firestore(), 'members', MEMBER_ACTIVE_UID), {
          avatarUrl: 'javascript:alert(1)',
        }),
      );
      await assertFails(
        updateDoc(doc(c.memberActive.firestore(), 'members', MEMBER_ACTIVE_UID), {
          avatarUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
        }),
      );
      await assertFails(
        updateDoc(doc(c.memberActive.firestore(), 'members', MEMBER_ACTIVE_UID), {
          avatarUrl: `data:image/png;base64,${'A'.repeat(500001)}`,
        }),
      );

      for (const forbiddenPatch of [
        { verifiedVoteWeight: 10 },
        { voteWeightVerifiedAt: '2026-01-01T00:00:00Z' },
        { voteWeightVerifiedBy: 'Self' },
        { isAdmin: true },
        { isSuperAdmin: true },
        { membershipStatus: 'inactive' },
        { paymentStatus: 'exempt' },
        { feeExemption: { isExempt: true, retainsBenefits: true } },
        { memberCode: 'PI-0000' },
        { yearlyContribution: 0 },
        { email: 'changed@percikaniman.org' },
        { uid: 'other-uid' },
        {
          categoryChangeRequest: {
            requestedCategory: 'family',
            requestedAt: '2026-11-19T09:00:00Z',
            reason: 'Self-approve attempt',
            status: 'approved',
          },
        },
        {
          pendingStatusRequest: {
            requestedStatus: 'fee_paused',
            reason: 'Self-approve attempt',
            effectiveDate: '2026-12-01',
            submittedAt: '2026-11-19T09:00:00Z',
            status: 'approved',
          },
        },
        {
          phone: '1'.repeat(51),
        },
        {
          categoryChangeRequest: {
            requestedCategory: 'family',
            requestedAt: '2026-11-19T09:00:00Z',
            reason: 'Injected review metadata',
            status: 'pending',
            reviewedBy: 'Spoofed Admin',
          },
        },
        {
          categoryChangeRequest: {
            requestedCategory: 'family',
            requestedAt: '2026-11-19T09:00:00Z',
            reason: 'Injected review notes',
            status: 'pending',
            reviewNotes: 'Auto-approved',
            reviewedAt: '2026-11-19T10:00:00Z',
          },
        },
      ]) {
        await assertFails(
          updateDoc(doc(c.memberActive.firestore(), 'members', MEMBER_ACTIVE_UID), forbiddenPatch),
        );
      }

      // scanner door settlement update (6 fields only, non-self, non-admin/superadmin, active+paid+cash only)
      await assertSucceeds(
        updateDoc(doc(c.scanner.firestore(), 'members', MEMBER_INACTIVE_UID), {
          membershipStatus: 'active',
          paymentStatus: 'paid',
          paymentMethod: 'cash',
          paidAt: '2026-11-19T10:00:00Z',
          paymentVerifiedBy: 'QR Scanner Operator',
          formalStatusHistory: [{ id: 'h1', status: 'active' }],
        }),
      );
      await assertFails(
        updateDoc(doc(c.scanner.firestore(), 'members', SCANNER_UID), {
          membershipStatus: 'active',
          paymentStatus: 'paid',
          paymentMethod: 'cash',
          paidAt: '2026-11-19T10:00:00Z',
          paymentVerifiedBy: 'QR Scanner Operator',
          formalStatusHistory: [{ id: 'h-self', status: 'active' }],
        }),
      );
      await assertFails(
        updateDoc(doc(c.scanner.firestore(), 'members', SUPER_ADMIN_UID), {
          membershipStatus: 'active',
          paymentStatus: 'paid',
          paymentMethod: 'cash',
          paidAt: '2026-11-19T10:00:00Z',
          paymentVerifiedBy: 'QR Scanner Operator',
          formalStatusHistory: [{ id: 'h-sa', status: 'active' }],
        }),
      );
      await assertFails(
        updateDoc(doc(c.scanner.firestore(), 'members', ADMIN_UID), {
          membershipStatus: 'active',
          paymentStatus: 'paid',
          paymentMethod: 'cash',
          paidAt: '2026-11-19T10:00:00Z',
          paymentVerifiedBy: 'QR Scanner Operator',
          formalStatusHistory: [{ id: 'h-adm', status: 'active' }],
        }),
      );
      await assertFails(
        updateDoc(doc(c.scanner.firestore(), 'members', MEMBER_ACTIVE_UID), {
          membershipStatus: 'inactive',
          paymentStatus: 'paid',
          paymentMethod: 'cash',
          paidAt: '2026-11-19T10:00:00Z',
          paymentVerifiedBy: 'QR Scanner Operator',
          formalStatusHistory: [{ id: 'h-inact', status: 'inactive' }],
        }),
      );
      await assertFails(
        updateDoc(doc(c.scanner.firestore(), 'members', MEMBER_ACTIVE_UID), {
          membershipStatus: 'active',
          paymentStatus: 'paid',
          paymentMethod: 'twint',
          paidAt: '2026-11-19T10:00:00Z',
          paymentVerifiedBy: 'QR Scanner Operator',
          formalStatusHistory: [{ id: 'h-twint', status: 'active' }],
        }),
      );
      await assertFails(
        updateDoc(doc(c.scanner.firestore(), 'members', MEMBER_INACTIVE_UID), {
          membershipStatus: 'active',
          verifiedVoteWeight: 4,
        }),
      );
      await assertFails(
        updateDoc(doc(c.scanner.firestore(), 'members', MEMBER_INACTIVE_UID), {
          isAdmin: true,
        }),
      );
      await assertFails(
        updateDoc(doc(c.scanner.firestore(), 'members', MEMBER_INACTIVE_UID), {
          name: 'Renamed By Scanner',
        }),
      );

      // boardMgr cannot update other members
      await assertFails(
        updateDoc(doc(c.boardMgr.firestore(), 'members', MEMBER_ACTIVE_UID), {
          name: 'BoardMgr Edit',
        }),
      );

      // admin create/update vs superAdmin restriction & delete
      await assertSucceeds(
        updateDoc(doc(c.admin.firestore(), 'members', MEMBER_ACTIVE_UID), {
          verifiedVoteWeight: 4,
          voteWeightVerifiedAt: '2026-11-19T10:00:00Z',
          voteWeightVerifiedBy: 'Standard Admin',
        }),
      );
      await assertSucceeds(
        updateDoc(doc(c.admin.firestore(), 'members', MEMBER_ACTIVE_UID), {
          address: { street: 'Bahnhofstrasse 1', city: 'Zürich', postalCode: '8001', country: 'Switzerland' },
          categoryChangeRequest: {
            requestedCategory: 'family',
            requestedAt: '2026-11-19T09:00:00Z',
            reason: 'Married',
            status: 'approved',
            reviewedBy: 'Standard Admin',
            reviewedAt: '2026-11-19T10:00:00Z',
            reviewNotes: 'Approved',
          },
          feeExemption: {
            isExempt: false,
            votedYear: 2026,
            exemptionYear: 2026,
            approvedByGA: false,
            resolutionRef: 'GA-2026-01',
            exemptionReason: 'None',
            validUntil: '2026-12-31',
            retainsBenefits: true,
          },
          pendingStatusRequest: {
            requestedStatus: 'active',
            reason: 'Renewed',
            effectiveDate: '2026-11-19',
            submittedAt: '2026-11-19T09:00:00Z',
            destinationCountry: 'Switzerland',
            status: 'approved',
            notes: 'Verified',
          },
          formalStatusHistory: [{ id: 'h1', status: 'active' }],
          paymentMethod: 'twint',
          paidAt: '2026-11-19T10:00:00Z',
          paymentVerifiedBy: 'Standard Admin',
          paymentReference: 'REF-001',
        }),
      );
      // Worst-case CEL expression ceiling check: standard admin updates their own
      // fully-populated 42-field + 5-nested-map document (isOwner(uid) == true,
      // failing self-update allowlist and falling through to staff update + full isValidMember)
      await assertSucceeds(
        updateDoc(doc(c.admin.firestore(), 'members', ADMIN_UID), {
          uid: ADMIN_UID,
          emailVerified: true,
          authProvider: 'password',
          name: 'Standard Admin Full Profile',
          email: 'admin@percikaniman.org',
          phone: '+41 79 123 45 67',
          address: {
            street: 'Seestrasse 10',
            city: 'Zürich',
            postalCode: '8002',
            country: 'Switzerland',
          },
          interest: 'Board Governance & Youth',
          memberCode: 'PI-9001',
          role: 'Board Treasurer',
          isAdmin: true,
          isSuperAdmin: false,
          canScanQR: true,
          canManageBoard: true,
          joinedAt: '2024-01-15',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          membershipCategory: 'family',
          membershipStatus: 'active',
          statusReason: 'Annual renewal confirmed',
          statusChangeDate: '2026-11-19',
          spouse: {
            name: 'Admin Spouse',
            email: 'spouse@percikaniman.org',
            phone: '+41 79 765 43 21',
          },
          children: [{ id: 'c1', name: 'Child Admin', birthYear: '2010' }],
          yearlyContribution: 120,
          monthlyFee: 10,
          membershipYear: 2026,
          validUntil: '2026-12-31',
          gaApprovalStatus: 'approved_current_year',
          lastGaResolutionRef: 'GA-2026-01',
          categoryChangeRequest: {
            requestedCategory: 'family',
            requestedAt: '2026-11-19T09:00:00Z',
            reason: 'Family update',
            status: 'approved',
            reviewedBy: 'Super Admin',
            reviewedAt: '2026-11-19T10:00:00Z',
            reviewNotes: 'Approved',
          },
          feeExemption: {
            isExempt: false,
            votedYear: 2026,
            exemptionYear: 2026,
            approvedByGA: false,
            resolutionRef: 'GA-2026-02',
            exemptionReason: 'Standard member',
            validUntil: '2026-12-31',
            retainsBenefits: true,
          },
          pendingStatusRequest: {
            requestedStatus: 'active',
            reason: 'Active confirmation',
            effectiveDate: '2026-11-19',
            submittedAt: '2026-11-19T09:00:00Z',
            destinationCountry: 'Switzerland',
            status: 'approved',
            notes: 'Verified',
          },
          formalStatusHistory: [{ id: 'h1', status: 'active' }],
          acknowledgedEmailNotices: true,
          acknowledgedMembershipFee: true,
          paymentStatus: 'paid',
          paymentMethod: 'twint',
          paidAt: '2026-11-19T10:00:00Z',
          paymentVerifiedBy: 'Standard Admin',
          paymentReference: 'TWINT-9001',
          verifiedVoteWeight: 2,
          voteWeightVerifiedAt: '2026-11-19T10:00:00Z',
          voteWeightVerifiedBy: 'Standard Admin',
        }),
      );

      // Worst-case CEL expression ceiling check for create: standard admin creates
      // a fully-populated 42-field + 5-nested-map member document
      await assertSucceeds(
        setDoc(doc(c.admin.firestore(), 'members', 'full-member-created'), {
          uid: 'full-member-created',
          emailVerified: true,
          authProvider: 'password',
          name: 'Full Created Member',
          email: 'fullcreated@percikaniman.org',
          phone: '+41 79 123 45 67',
          address: {
            street: 'Seestrasse 10',
            city: 'Zürich',
            postalCode: '8002',
            country: 'Switzerland',
          },
          interest: 'Board Governance & Youth',
          memberCode: 'PI-9002',
          role: 'Registered Member',
          isAdmin: false,
          isSuperAdmin: false,
          canScanQR: true,
          canManageBoard: true,
          joinedAt: '2024-01-15',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          membershipCategory: 'family',
          membershipStatus: 'active',
          statusReason: 'Annual renewal confirmed',
          statusChangeDate: '2026-11-19',
          spouse: {
            name: 'Created Spouse',
            email: 'createdspouse@percikaniman.org',
            phone: '+41 79 765 43 21',
          },
          children: [{ id: 'c1', name: 'Child One', birthYear: '2010' }],
          yearlyContribution: 120,
          monthlyFee: 10,
          membershipYear: 2026,
          validUntil: '2026-12-31',
          gaApprovalStatus: 'approved_current_year',
          lastGaResolutionRef: 'GA-2026-01',
          categoryChangeRequest: {
            requestedCategory: 'family',
            requestedAt: '2026-11-19T09:00:00Z',
            reason: 'Family update',
            status: 'approved',
            reviewedBy: 'Standard Admin',
            reviewedAt: '2026-11-19T10:00:00Z',
            reviewNotes: 'Approved',
          },
          feeExemption: {
            isExempt: false,
            votedYear: 2026,
            exemptionYear: 2026,
            approvedByGA: false,
            resolutionRef: 'GA-2026-02',
            exemptionReason: 'Standard member',
            validUntil: '2026-12-31',
            retainsBenefits: true,
          },
          pendingStatusRequest: {
            requestedStatus: 'active',
            reason: 'Active confirmation',
            effectiveDate: '2026-11-19',
            submittedAt: '2026-11-19T09:00:00Z',
            destinationCountry: 'Switzerland',
            status: 'approved',
            notes: 'Verified',
          },
          formalStatusHistory: [{ id: 'h1', status: 'active' }],
          acknowledgedEmailNotices: true,
          acknowledgedMembershipFee: true,
          paymentStatus: 'paid',
          paymentMethod: 'twint',
          paidAt: '2026-11-19T10:00:00Z',
          paymentVerifiedBy: 'Standard Admin',
          paymentReference: 'TWINT-9002',
          verifiedVoteWeight: 2,
          voteWeightVerifiedAt: '2026-11-19T10:00:00Z',
          voteWeightVerifiedBy: 'Standard Admin',
        }),
      );

      // Standard admin cannot modify an existing superAdmin document
      await assertFails(
        updateDoc(doc(c.admin.firestore(), 'members', SUPER_ADMIN_UID), {
          isAdmin: false,
          membershipStatus: 'inactive',
        }),
      );
      await assertFails(
        updateDoc(doc(c.admin.firestore(), 'members', SUPER_ADMIN_UID), {
          name: 'Tampered SuperAdmin',
        }),
      );

      await assertFails(
        setDoc(doc(c.admin.firestore(), 'members', 'escalated-admin'), {
          uid: 'escalated-admin',
          name: 'Escalated',
          email: 'esc@percikaniman.org',
          isSuperAdmin: true,
        }),
      );
      await assertFails(
        setDoc(doc(c.admin.firestore(), 'members', 'missing-uid-doc'), {
          name: 'Missing UID',
          email: 'missinguid@percikaniman.org',
        }),
      );
      await assertFails(
        setDoc(doc(c.admin.firestore(), 'members', 'missing-email-doc'), {
          uid: 'missing-email-doc',
          name: 'Missing Email',
        }),
      );
      await assertFails(
        updateDoc(doc(c.admin.firestore(), 'members', MEMBER_ACTIVE_UID), {
          isSuperAdmin: true,
        }),
      );
      await assertFails(deleteDoc(doc(c.admin.firestore(), 'members', MEMBER_INACTIVE_UID)));

      // superAdmin can set isSuperAdmin and delete
      await assertSucceeds(
        updateDoc(doc(c.superAdmin.firestore(), 'members', ADMIN_UID), {
          isSuperAdmin: true,
        }),
      );
      await assertSucceeds(deleteDoc(doc(c.superAdmin.firestore(), 'members', MEMBER_INACTIVE_UID)));
    });
  });

  describe('3. /attendance/{recordId}', () => {
    it('allows scanner/admin/superAdmin read/create/update (with immutable fields), admin+ delete, denies others', async () => {
      const c = contexts();
      const baseRecord = {
        id: 'att-1',
        eventId: 'evt-1',
        eventTitle: 'Pengajian',
        memberCode: 'PI-1001',
        memberName: 'Active Member',
        category: 'family',
        status: 'active',
        isFeeExempt: false,
        partyCount: 2,
        partyMembers: ['Active Member', 'Spouse'],
        scannedAt: '2026-11-19T11:00:00Z',
        scannedBy: 'QR Scanner Operator',
        feePaidChf: 0,
        verified: true,
      };

      await assertFails(setDoc(doc(c.unauth.firestore(), 'attendance', 'att-1'), baseRecord));
      await assertFails(setDoc(doc(c.memberActive.firestore(), 'attendance', 'att-1'), baseRecord));
      await assertFails(setDoc(doc(c.boardMgr.firestore(), 'attendance', 'att-1'), baseRecord));

      await assertSucceeds(setDoc(doc(c.scanner.firestore(), 'attendance', 'att-1'), baseRecord));
      await assertSucceeds(getDoc(doc(c.scanner.firestore(), 'attendance', 'att-1')));
      await assertSucceeds(
        getDocs(
          query(
            collection(c.admin.firestore(), 'attendance'),
            where('eventId', '==', 'evt-1'),
            orderBy('scannedAt', 'desc'),
          ),
        ),
      );
      await assertFails(getDoc(doc(c.memberActive.firestore(), 'attendance', 'att-1')));
      await assertFails(getDoc(doc(c.boardMgr.firestore(), 'attendance', 'att-1')));

      await assertSucceeds(
        updateDoc(doc(c.scanner.firestore(), 'attendance', 'att-1'), {
          notes: 'Checked in at door',
        }),
      );
      await assertFails(
        updateDoc(doc(c.scanner.firestore(), 'attendance', 'att-1'), {
          eventId: 'evt-other',
        }),
      );
      await assertFails(
        updateDoc(doc(c.admin.firestore(), 'attendance', 'att-1'), {
          memberCode: 'PI-9999',
        }),
      );

      await assertFails(deleteDoc(doc(c.scanner.firestore(), 'attendance', 'att-1')));
      await assertSucceeds(deleteDoc(doc(c.admin.firestore(), 'attendance', 'att-1')));
    });
  });

  describe('4. Public Content (/programs, /campaigns, /destinations, /events, /siteConfig/notice)', () => {
    it('allows public read, admin/superAdmin CRUD with strict schema & URL checks, denies member/scanner/boardMgr writes', async () => {
      const c = contexts();

      const validProgram = {
        id: 'prog-1',
        title: 'Monatliches Pengajian',
        category: 'Religious',
        tag: 'Monatlich',
        iconName: 'volunteer_activism',
        description: 'Monthly gathering',
        imageUrl: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=800',
        dateOrSchedule: 'Monthly',
        location: 'Volketswil',
        detailedOverview: 'Details',
      };
      await assertSucceeds(setDoc(doc(c.admin.firestore(), 'programs', 'prog-1'), validProgram));
      await assertSucceeds(getDoc(doc(c.unauth.firestore(), 'programs', 'prog-1')));
      await assertSucceeds(getDocs(collection(c.memberActive.firestore(), 'programs')));
      await assertFails(setDoc(doc(c.memberActive.firestore(), 'programs', 'prog-2'), validProgram));
      await assertFails(setDoc(doc(c.scanner.firestore(), 'programs', 'prog-2'), validProgram));
      await assertFails(setDoc(doc(c.boardMgr.firestore(), 'programs', 'prog-2'), validProgram));
      await assertFails(updateDoc(doc(c.admin.firestore(), 'programs', 'prog-1'), { id: 'prog-new' }));
      await assertFails(
        setDoc(doc(c.admin.firestore(), 'programs', 'prog-bad-img'), {
          ...validProgram,
          id: 'prog-bad-img',
          imageUrl: 'data:image/svg+xml;base64,PHN2Zz4=',
        }),
      );

      const validCampaign = {
        id: 'camp-1',
        title: 'Zakat 2026',
        description: 'Zakat campaign',
        progressPercent: 50,
        currentAmount: 2500,
        goalAmount: 5000,
      };
      await assertSucceeds(setDoc(doc(c.admin.firestore(), 'campaigns', 'camp-1'), validCampaign));
      await assertFails(
        setDoc(doc(c.admin.firestore(), 'campaigns', 'camp-bad'), {
          ...validCampaign,
          id: 'camp-bad',
          goalAmount: 0,
        }),
      );
      await assertFails(
        setDoc(doc(c.admin.firestore(), 'campaigns', 'camp-extra'), {
          ...validCampaign,
          id: 'camp-extra',
          extra: 'nope',
        }),
      );

      await assertSucceeds(
        setDoc(doc(c.admin.firestore(), 'destinations', 'dest-1'), {
          id: 'dest-1',
          name: 'Infaq',
          shortLabel: 'Infaq',
          category: 'General',
          description: 'General fund',
        }),
      );
      await assertSucceeds(getDoc(doc(c.unauth.firestore(), 'destinations', 'dest-1')));

      const validEvent = {
        id: 'evt-1',
        title: 'Quran Circle',
        date: '2026-12-01',
        time: '10:00 - 12:00',
        category: 'Majelis & Spiritual',
        location: 'Online',
        isOnline: true,
        onlineLink: 'https://zoom.us/j/123456',
        description: 'Monthly study',
      };
      await assertSucceeds(setDoc(doc(c.admin.firestore(), 'events', 'evt-1'), validEvent));
      await assertSucceeds(getDoc(doc(c.unauth.firestore(), 'events', 'evt-1')));
      await assertFails(
        setDoc(doc(c.admin.firestore(), 'events', 'evt-xss'), {
          ...validEvent,
          id: 'evt-xss',
          onlineLink: 'javascript:alert(1)',
        }),
      );
      for (const badLink of [
        'https://',
        'http:// ',
        'https://\tfoo',
        'https:///path',
        'https://zoom.us@evil.com/join',
        'https://.',
        'https://example.com/\u0085c1',
        'https://ex\u200Bample.com',
        'https://example.com/\u00A0path',
        'https://ex\uFEFFample.com',
      ]) {
        await assertFails(
          setDoc(doc(c.admin.firestore(), 'events', 'evt-bad-link'), {
            ...validEvent,
            id: 'evt-bad-link',
            onlineLink: badLink,
          }),
        );
      }

      await assertSucceeds(
        setDoc(doc(c.superAdmin.firestore(), 'siteConfig', 'notice'), {
          enabled: true,
          message: 'GA Notice',
          badge: 'INFO',
          linkText: 'Go',
          linkScreen: 'assembly',
        }),
      );
      await assertSucceeds(
        setDoc(doc(c.admin.firestore(), 'siteConfig', 'notice'), {
          enabled: true,
          message: 'Brand Notice',
          badge: 'BRAND',
          linkText: 'Brand',
          linkScreen: 'brand',
        }),
      );
      await assertFails(
        setDoc(doc(c.admin.firestore(), 'siteConfig', 'notice'), {
          enabled: true,
          message: 'Admin Link',
          badge: 'BAD',
          linkScreen: 'admin',
        }),
      );
      await assertSucceeds(getDoc(doc(c.unauth.firestore(), 'siteConfig', 'notice')));
      await assertFails(
        setDoc(doc(c.boardMgr.firestore(), 'siteConfig', 'notice'), {
          enabled: false,
          message: 'Hack',
          badge: 'X',
        }),
      );
    });
  });

  describe('5. /boardMembers/{memberId}', () => {
    it('allows public read and CRUD for boardMgr, admin, superAdmin only', async () => {
      const c = contexts();
      const boardDoc = {
        id: 'bm-1',
        name: 'Sister Lusi',
        role: 'Secretary',
        department: 'Executive Leadership',
        imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500',
        bio: 'Board secretary',
        email: '',
        order: 1,
      };

      await assertSucceeds(setDoc(doc(c.boardMgr.firestore(), 'boardMembers', 'bm-1'), boardDoc));
      await assertSucceeds(getDoc(doc(c.unauth.firestore(), 'boardMembers', 'bm-1')));
      await assertSucceeds(
        updateDoc(doc(c.boardMgr.firestore(), 'boardMembers', 'bm-1'), { role: 'Lead Secretary' }),
      );
      await assertFails(
        updateDoc(doc(c.boardMgr.firestore(), 'boardMembers', 'bm-1'), { id: 'bm-2' }),
      );
      await assertFails(setDoc(doc(c.scanner.firestore(), 'boardMembers', 'bm-2'), boardDoc));
      await assertFails(setDoc(doc(c.memberActive.firestore(), 'boardMembers', 'bm-2'), boardDoc));
      await assertSucceeds(deleteDoc(doc(c.boardMgr.firestore(), 'boardMembers', 'bm-1')));
    });
  });

  describe('6. /siteConfig/bootstrap', () => {
    it('allows superAdmin create-once and get, denies update/delete and denies all other roles', async () => {
      const c = contexts();
      const bootstrapData = {
        seededAt: '2026-11-19T12:00:00Z',
        seededBy: SUPER_ADMIN_UID,
        version: '1.0.0',
      };

      for (const ctx of [c.unauth, c.memberActive, c.scanner, c.boardMgr, c.admin]) {
        await assertFails(setDoc(doc(ctx.firestore(), 'siteConfig', 'bootstrap'), bootstrapData));
        await assertFails(getDoc(doc(ctx.firestore(), 'siteConfig', 'bootstrap')));
      }

      await assertSucceeds(
        setDoc(doc(c.superAdmin.firestore(), 'siteConfig', 'bootstrap'), bootstrapData),
      );
      await assertSucceeds(getDoc(doc(c.superAdmin.firestore(), 'siteConfig', 'bootstrap')));
      await assertFails(
        updateDoc(doc(c.superAdmin.firestore(), 'siteConfig', 'bootstrap'), { version: '2.0.0' }),
      );
      await assertFails(deleteDoc(doc(c.superAdmin.firestore(), 'siteConfig', 'bootstrap')));
      for (const ctx of [c.unauth, c.memberActive, c.admin]) {
        await assertFails(getDoc(doc(ctx.firestore(), 'siteConfig', 'bootstrap')));
      }
    });
  });

  describe('7. /donationPledges/{pledgeId} & /donationReports/{reportId}', () => {
    it('allows public Processing CHF pledge create, admin+ read/update/delete, and admin-only donationReports', async () => {
      const c = contexts();
      const validPledge = {
        id: 'pledge-1',
        donorName: 'Amina Muster',
        email: 'amina@example.ch',
        amount: 50,
        currency: 'CHF',
        destination: 'vpi-infaq-verein',
        date: '2026-11-19',
        paymentMethod: 'TWINT',
        status: 'Processing',
      };

      await assertSucceeds(
        setDoc(doc(c.unauth.firestore(), 'donationPledges', 'pledge-1'), validPledge),
      );
      await assertSucceeds(
        setDoc(doc(c.memberActive.firestore(), 'donationPledges', 'pledge-2'), {
          ...validPledge,
          id: 'pledge-2',
        }),
      );

      // Invalid pledge creates
      await assertFails(
        setDoc(doc(c.unauth.firestore(), 'donationPledges', 'pledge-bad-status'), {
          ...validPledge,
          id: 'pledge-bad-status',
          status: 'Promoted',
        }),
      );
      await assertFails(
        setDoc(doc(c.unauth.firestore(), 'donationPledges', 'pledge-bad-curr'), {
          ...validPledge,
          id: 'pledge-bad-curr',
          currency: 'USD',
        }),
      );
      await assertFails(
        setDoc(doc(c.unauth.firestore(), 'donationPledges', 'pledge-0'), {
          ...validPledge,
          id: 'pledge-0',
          amount: 0,
        }),
      );
      await assertFails(
        setDoc(doc(c.unauth.firestore(), 'donationPledges', 'pledge-big'), {
          ...validPledge,
          id: 'pledge-big',
          amount: 100001,
        }),
      );
      await assertFails(
        setDoc(doc(c.unauth.firestore(), 'donationPledges', 'pledge-promo'), {
          ...validPledge,
          id: 'pledge-promo',
          promotedReportId: 'rep-1',
        }),
      );
      await assertFails(
        setDoc(doc(c.unauth.firestore(), 'donationPledges', 'pledge-extra'), {
          ...validPledge,
          id: 'pledge-extra',
          extra: 'nope',
        }),
      );

      // Non-admin cannot read/update/delete pledges
      for (const ctx of [c.unauth, c.memberActive, c.scanner, c.boardMgr]) {
        await assertFails(getDoc(doc(ctx.firestore(), 'donationPledges', 'pledge-1')));
        await assertFails(
          updateDoc(doc(ctx.firestore(), 'donationPledges', 'pledge-1'), { status: 'Promoted' }),
        );
        await assertFails(deleteDoc(doc(ctx.firestore(), 'donationPledges', 'pledge-1')));
      }

      // Admin can read, promote, and delete
      await assertSucceeds(getDoc(doc(c.admin.firestore(), 'donationPledges', 'pledge-1')));
      await assertSucceeds(
        getDocs(
          query(
            collection(c.admin.firestore(), 'donationPledges'),
            where('status', '==', 'Processing'),
            orderBy('date', 'desc'),
          ),
        ),
      );
      await assertSucceeds(
        updateDoc(doc(c.admin.firestore(), 'donationPledges', 'pledge-1'), {
          status: 'Promoted',
          promotedReportId: 'rep-1',
        }),
      );
      // Admin cannot mutate immutable fields or violate schema on donationPledges update
      for (const immutablePatch of [
        { amount: 9999 },
        { donorName: 'Tampered Donor' },
        { email: 'tampered@example.ch' },
        { currency: 'EUR' },
        { destination: 'other-dest' },
        { date: '2026-01-01' },
        { paymentMethod: 'Cash' },
        { id: 'pledge-other' },
        { status: 'Completed' },
        { extraField: 'nope' },
      ]) {
        await assertFails(
          updateDoc(doc(c.admin.firestore(), 'donationPledges', 'pledge-1'), immutablePatch),
        );
      }
      await assertSucceeds(deleteDoc(doc(c.superAdmin.firestore(), 'donationPledges', 'pledge-2')));

      // donationReports: admin+ only + schema & immutability validation
      const report = {
        id: 'rep-1',
        donorName: 'Amina Muster',
        email: 'amina@example.ch',
        amount: 50,
        currency: 'CHF',
        destination: 'vpi-infaq-verein',
        date: '2026-11-19',
        paymentMethod: 'TWINT',
        status: 'Completed',
        sourcePledgeId: 'pledge-1',
      };
      await assertSucceeds(setDoc(doc(c.admin.firestore(), 'donationReports', 'rep-1'), report));
      await assertSucceeds(getDoc(doc(c.admin.firestore(), 'donationReports', 'rep-1')));
      for (const badReport of [
        { ...report, id: 'rep-bad-0', amount: 0 },
        { ...report, id: 'rep-bad-big', amount: 100001 },
        { ...report, id: 'rep-bad-curr', currency: 'GBP' },
        { ...report, id: 'rep-bad-stat', status: 'Rejected' },
        { ...report, id: 'rep-bad-extra', extra: 'nope' },
      ]) {
        await assertFails(
          setDoc(doc(c.admin.firestore(), 'donationReports', badReport.id), badReport),
        );
      }
      await assertFails(
        updateDoc(doc(c.admin.firestore(), 'donationReports', 'rep-1'), { id: 'rep-renamed' }),
      );
      for (const ctx of [c.unauth, c.memberActive, c.scanner, c.boardMgr]) {
        await assertFails(getDoc(doc(ctx.firestore(), 'donationReports', 'rep-1')));
        await assertFails(setDoc(doc(ctx.firestore(), 'donationReports', 'rep-x'), report));
      }
      await assertSucceeds(deleteDoc(doc(c.admin.firestore(), 'donationReports', 'rep-1')));
    });
  });

  describe('8. /siteConfig/gaSession, /assemblyQuestions/{qid}, and /ballots/{uid}', () => {
    it('enforces GA session/question rules and immutable verified-weight ballots without memberEmail', async () => {
      const c = contexts();

      const gaSession = {
        isOpen: true,
        sessionTitle: 'GV 2026',
        scheduledDate: '2026-11-19',
        activeQuestionId: 'q-1',
        openedAt: '2026-11-19T10:00:00Z',
        openedBy: 'Standard Admin',
      };
      await assertSucceeds(setDoc(doc(c.admin.firestore(), 'siteConfig', 'gaSession'), gaSession));
      await assertFails(getDoc(doc(c.unauth.firestore(), 'siteConfig', 'gaSession')));
      await assertSucceeds(getDoc(doc(c.memberActive.firestore(), 'siteConfig', 'gaSession')));
      await assertFails(
        updateDoc(doc(c.memberActive.firestore(), 'siteConfig', 'gaSession'), { isOpen: false }),
      );

      const question = {
        id: 'q-1',
        title: 'Approve 2027 Budget',
        description: 'Annual budget vote',
        category: 'Budget & Financial',
        status: 'on_floor',
        type: 'yes_no_abstain',
        options: [
          { id: 'opt-yes', text: 'Yes', votesWeighted: 0, ballotCount: 0 },
          { id: 'opt-no', text: 'No', votesWeighted: 0, ballotCount: 0 },
        ],
        optionIds: ['opt-yes', 'opt-no'],
        totalVotesWeighted: 0,
        totalBallots: 0,
        createdAt: '2026-11-19T09:00:00Z',
        createdBy: 'Standard Admin',
        quorumRequiredPercent: 50,
      };
      await assertSucceeds(setDoc(doc(c.admin.firestore(), 'assemblyQuestions', 'q-1'), question));
      await assertFails(getDoc(doc(c.unauth.firestore(), 'assemblyQuestions', 'q-1')));
      await assertSucceeds(getDoc(doc(c.memberActive.firestore(), 'assemblyQuestions', 'q-1')));

      // Reject legacy embedded ballots and legacy status 'open'
      await assertFails(
        setDoc(doc(c.admin.firestore(), 'assemblyQuestions', 'q-legacy-ballots'), {
          ...question,
          id: 'q-legacy-ballots',
          ballots: [],
        }),
      );
      await assertFails(
        setDoc(doc(c.admin.firestore(), 'assemblyQuestions', 'q-legacy-status'), {
          ...question,
          id: 'q-legacy-status',
          status: 'open',
        }),
      );
      await assertFails(
        updateDoc(doc(c.admin.firestore(), 'assemblyQuestions', 'q-1'), { createdBy: 'Other' }),
      );
      await assertFails(
        setDoc(doc(c.admin.firestore(), 'assemblyQuestions', 'q-bad-opts'), {
          ...question,
          id: 'q-bad-opts',
          optionIds: ['opt-yes'],
        }),
      );
      await assertFails(
        setDoc(doc(c.admin.firestore(), 'assemblyQuestions', 'q-bad-final'), {
          ...question,
          id: 'q-bad-final',
          finalResults: {
            totalWeight: -1,
            totalBallots: 0,
            closedAt: '2026-11-19T12:00:00Z',
            closedBy: 'Admin',
            optionTotals: {},
          },
        }),
      );

      // Valid ballot for memberActive (verifiedVoteWeight == 3) and memberExempt (verifiedVoteWeight == 1)
      const validBallotActive = {
        id: MEMBER_ACTIVE_UID,
        questionId: 'q-1',
        memberCode: 'PI-1001',
        memberName: 'Active Member',
        membershipCategory: 'family',
        votedOptionId: 'opt-yes',
        voteWeight: 3,
        timestamp: '2026-11-19T10:05:00Z',
        breakdown: {
          primaryEligible: true,
          spouseEligible: true,
          eligibleChildrenNames: ['Child One'],
          ineligibleChildrenNames: [],
        },
      };
      await assertSucceeds(
        setDoc(
          doc(c.memberActive.firestore(), 'assemblyQuestions', 'q-1', 'ballots', MEMBER_ACTIVE_UID),
          validBallotActive,
        ),
      );
      await assertSucceeds(
        setDoc(
          doc(c.memberExempt.firestore(), 'assemblyQuestions', 'q-1', 'ballots', MEMBER_EXEMPT_UID),
          {
            ...validBallotActive,
            id: MEMBER_EXEMPT_UID,
            memberCode: 'PI-1003',
            memberName: 'Exempt Member',
            membershipCategory: 'personal',
            voteWeight: 1,
          },
        ),
      );

      // Unauth cannot read ballots; authenticated members can
      await assertFails(
        getDoc(doc(c.unauth.firestore(), 'assemblyQuestions', 'q-1', 'ballots', MEMBER_ACTIVE_UID)),
      );
      await assertSucceeds(
        getDoc(doc(c.memberExempt.firestore(), 'assemblyQuestions', 'q-1', 'ballots', MEMBER_ACTIVE_UID)),
      );

      // Immutable ballots: update, duplicate setDoc, & delete fail even for admin & superAdmin
      await assertFails(
        setDoc(
          doc(c.memberActive.firestore(), 'assemblyQuestions', 'q-1', 'ballots', MEMBER_ACTIVE_UID),
          { ...validBallotActive, votedOptionId: 'opt-no' },
        ),
      );
      await assertFails(
        updateDoc(
          doc(c.memberActive.firestore(), 'assemblyQuestions', 'q-1', 'ballots', MEMBER_ACTIVE_UID),
          { votedOptionId: 'opt-no' },
        ),
      );
      await assertFails(
        deleteDoc(
          doc(c.superAdmin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', MEMBER_ACTIVE_UID),
        ),
      );

      // Invalid ballots:
      const validBallotAdmin = {
        ...validBallotActive,
        id: ADMIN_UID,
        memberCode: 'PI-9001',
        memberName: 'Standard Admin',
        membershipCategory: 'personal',
        voteWeight: 1,
      };
      // 1) Wrong uid path, questionId mismatch, or extra unknown field
      await assertFails(
        setDoc(
          doc(c.memberActive.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          validBallotAdmin,
        ),
      );
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          { ...validBallotAdmin, questionId: 'q-other' },
        ),
      );
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          { ...validBallotAdmin, extraField: 'tamper' },
        ),
      );
      // 2) Includes memberEmail PII
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          {
            ...validBallotAdmin,
            memberEmail: 'admin@percikaniman.org',
          },
        ),
      );
      // 2b) Spoofed ballot id, memberCode, or membershipCategory against /members/{uid}
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          {
            ...validBallotAdmin,
            id: 'spoofed-id',
          },
        ),
      );
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          {
            ...validBallotAdmin,
            memberCode: 'PI-9999',
          },
        ),
      );
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          {
            ...validBallotAdmin,
            membershipCategory: 'family',
          },
        ),
      );
      // 3) Forged voteWeight != verifiedVoteWeight
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          { ...validBallotAdmin, voteWeight: 5 },
        ),
      );
      // 4) Invalid votedOptionId not in optionIds
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          { ...validBallotAdmin, votedOptionId: 'opt-fake' },
        ),
      );
      // 5) Inactive member cannot vote
      await assertFails(
        setDoc(
          doc(c.memberInactive.firestore(), 'assemblyQuestions', 'q-1', 'ballots', MEMBER_INACTIVE_UID),
          {
            ...validBallotActive,
            id: MEMBER_INACTIVE_UID,
            memberCode: 'PI-1002',
            memberName: 'Inactive Member',
            membershipCategory: 'personal',
            voteWeight: 1,
          },
        ),
      );
      // 6) Member with missing or 0 verifiedVoteWeight cannot vote
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'members', ADMIN_UID), {
          verifiedVoteWeight: deleteField(),
        });
      });
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          { ...validBallotAdmin, voteWeight: 1 },
        ),
      );
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'members', ADMIN_UID), { verifiedVoteWeight: 0 });
      });
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          { ...validBallotAdmin, voteWeight: 0 },
        ),
      );
      // 7) Closed GA session / non-active question / non-on_floor status
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'members', ADMIN_UID), { verifiedVoteWeight: 1 });
        await updateDoc(doc(ctx.firestore(), 'siteConfig', 'gaSession'), { isOpen: false });
      });
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          validBallotAdmin,
        ),
      );
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'siteConfig', 'gaSession'), {
          isOpen: true,
          activeQuestionId: 'q-other',
        });
      });
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          validBallotAdmin,
        ),
      );
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await updateDoc(doc(ctx.firestore(), 'siteConfig', 'gaSession'), {
          isOpen: true,
          activeQuestionId: 'q-1',
        });
        await updateDoc(doc(ctx.firestore(), 'assemblyQuestions', 'q-1'), { status: 'closed' });
      });
      await assertFails(
        setDoc(
          doc(c.admin.firestore(), 'assemblyQuestions', 'q-1', 'ballots', ADMIN_UID),
          validBallotAdmin,
        ),
      );
    });
  });

  describe('9. /boardInquiries/{id} & /upvotes/{uid}', () => {
    it('enforces active/exempt creation, PII omission, admin moderation, and owner-only upvotes', async () => {
      const c = contexts();

      const validInquiry = {
        id: 'inq-1',
        title: 'Financial Audit Schedule',
        content: 'When will the audit report be shared?',
        category: 'Finance & Audit',
        authorUid: MEMBER_ACTIVE_UID,
        authorName: 'Active Member',
        authorMemberCode: 'PI-1001',
        authorCategory: 'family',
        submittedAt: '2026-11-19T12:00:00Z',
        status: 'submitted',
      };

      await assertSucceeds(
        setDoc(doc(c.memberActive.firestore(), 'boardInquiries', 'inq-1'), validInquiry),
      );
      await assertSucceeds(
        setDoc(doc(c.memberExempt.firestore(), 'boardInquiries', 'inq-2'), {
          ...validInquiry,
          id: 'inq-2',
          authorUid: MEMBER_EXEMPT_UID,
          authorName: 'Exempt Member',
          authorMemberCode: 'PI-1003',
          authorCategory: 'personal',
        }),
      );

      // Unauth cannot read; authenticated can
      await assertFails(getDoc(doc(c.unauth.firestore(), 'boardInquiries', 'inq-1')));
      await assertSucceeds(getDoc(doc(c.memberInactive.firestore(), 'boardInquiries', 'inq-1')));

      // Inactive member cannot create
      await assertFails(
        setDoc(doc(c.memberInactive.firestore(), 'boardInquiries', 'inq-inactive'), {
          ...validInquiry,
          id: 'inq-inactive',
          authorUid: MEMBER_INACTIVE_UID,
        }),
      );

      // Member cannot spoof authorUid, pre-answer, or inject authorEmail/upvotes[]
      await assertFails(
        setDoc(doc(c.memberActive.firestore(), 'boardInquiries', 'inq-spoof'), {
          ...validInquiry,
          id: 'inq-spoof',
          authorUid: ADMIN_UID,
        }),
      );
      await assertFails(
        setDoc(doc(c.memberActive.firestore(), 'boardInquiries', 'inq-ans'), {
          ...validInquiry,
          id: 'inq-ans',
          status: 'answered',
        }),
      );
      await assertFails(
        setDoc(doc(c.memberActive.firestore(), 'boardInquiries', 'inq-email'), {
          ...validInquiry,
          id: 'inq-email',
          authorEmail: 'active@percikaniman.org',
        }),
      );

      // SuperAdmin can create pre-answered seeded inquiry during bootstrap
      await assertSucceeds(
        setDoc(doc(c.superAdmin.firestore(), 'boardInquiries', 'inq-seeded'), {
          ...validInquiry,
          id: 'inq-seeded',
          status: 'answered',
          boardResponse: {
            answeredBy: 'Board',
            answeredAt: '2026-11-19T12:10:00Z',
            responseText: 'Shared in Q1 GA.',
          },
        }),
      );

      // Member cannot update or delete; admin can update & delete
      await assertFails(
        updateDoc(doc(c.memberActive.firestore(), 'boardInquiries', 'inq-1'), {
          content: 'Edited',
        }),
      );
      await assertFails(deleteDoc(doc(c.memberActive.firestore(), 'boardInquiries', 'inq-1')));
      await assertSucceeds(
        updateDoc(doc(c.admin.firestore(), 'boardInquiries', 'inq-1'), {
          status: 'answered',
          boardResponse: {
            answeredBy: 'Standard Admin',
            answeredAt: '2026-11-19T13:00:00Z',
            responseText: 'Published in members portal.',
          },
        }),
      );

      // Upvotes subcollection
      await assertSucceeds(
        setDoc(
          doc(c.memberActive.firestore(), 'boardInquiries', 'inq-1', 'upvotes', MEMBER_ACTIVE_UID),
          { uid: MEMBER_ACTIVE_UID, createdAt: '2026-11-19T12:05:00Z' },
        ),
      );
      await assertSucceeds(
        setDoc(
          doc(c.memberExempt.firestore(), 'boardInquiries', 'inq-1', 'upvotes', MEMBER_EXEMPT_UID),
          { uid: MEMBER_EXEMPT_UID },
        ),
      );
      await assertFails(
        getDoc(doc(c.unauth.firestore(), 'boardInquiries', 'inq-1', 'upvotes', MEMBER_ACTIVE_UID)),
      );
      await assertSucceeds(
        getDoc(doc(c.memberInactive.firestore(), 'boardInquiries', 'inq-1', 'upvotes', MEMBER_ACTIVE_UID)),
      );
      await assertFails(
        setDoc(
          doc(c.memberInactive.firestore(), 'boardInquiries', 'inq-1', 'upvotes', MEMBER_INACTIVE_UID),
          { uid: MEMBER_INACTIVE_UID },
        ),
      );
      await assertFails(
        setDoc(
          doc(c.memberActive.firestore(), 'boardInquiries', 'inq-1', 'upvotes', MEMBER_EXEMPT_UID),
          { uid: MEMBER_EXEMPT_UID },
        ),
      );
      await assertFails(
        setDoc(
          doc(c.memberActive.firestore(), 'boardInquiries', 'inq-missing', 'upvotes', MEMBER_ACTIVE_UID),
          { uid: MEMBER_ACTIVE_UID },
        ),
      );
      await assertFails(
        updateDoc(
          doc(c.memberActive.firestore(), 'boardInquiries', 'inq-1', 'upvotes', MEMBER_ACTIVE_UID),
          { createdAt: '2026-11-19T14:00:00Z' },
        ),
      );
      await assertFails(
        deleteDoc(
          doc(c.memberActive.firestore(), 'boardInquiries', 'inq-1', 'upvotes', MEMBER_EXEMPT_UID),
        ),
      );
      await assertSucceeds(
        deleteDoc(
          doc(c.memberActive.firestore(), 'boardInquiries', 'inq-1', 'upvotes', MEMBER_ACTIVE_UID),
        ),
      );
      await assertSucceeds(deleteDoc(doc(c.admin.firestore(), 'boardInquiries', 'inq-1')));
    });
  });
});
