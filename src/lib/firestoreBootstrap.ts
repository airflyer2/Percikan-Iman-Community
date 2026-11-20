import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { getFirebaseServices } from './firebase';
import {
  buildBoardMemberPayload,
  buildCampaignPayload,
  buildDestinationPayload,
  buildEventPayload,
  buildProgramPayload,
  buildSiteNoticePayload,
  stripUndefined
} from './firestoreContent';
import { buildManualDonationReportPayload } from './firestoreDonations';
import { buildAssemblyQuestionPayload, buildGaSessionPayload } from './firestoreAssembly';
import { calculateVotingPower } from '../utils/votingPower';
import {
  AssemblyQuestion,
  BoardInquiry,
  BoardMember,
  BootstrapMetadata,
  Campaign,
  CommunityEvent,
  ContributionDestination,
  DonationReport,
  GASessionState,
  Program,
  SiteNotice,
  UserAccount
} from '../types';

export const BOOTSTRAP_VERSION = '1.0.0';

export const INITIAL_SITE_NOTICE: SiteNotice = {
  enabled: true,
  badge: 'Community Announcement',
  message:
    'Ramadan 1447H preparation meeting this Saturday at 18:00 CET. All members and families welcome!',
  linkText: 'View Programs',
  linkScreen: 'programs'
};

const SEEDED_MEMBER_UID_BY_EMAIL: Record<string, string> = {
  'superadmin@percikaniman.org': 'uid-superadmin',
  'admin@percikaniman.org': 'uid-admin',
  'ridwan.santoso@percikaniman.org': 'uid-ridwan',
  'bambang.s@percikaniman.org': 'uid-bambang',
  'taufik.hidayat@percikaniman.org': 'uid-taufik',
  'ahmad.fauzi@percikaniman.org': 'uid-ahmad',
  'indira.pratiwi@percikaniman.org': 'uid-indira'
};

const SEEDED_INQUIRY_AUTHOR_UID_BY_CODE: Record<string, string> = {
  'PI-7740': 'uid-bambang',
  'PI-FAM-2021': 'uid-ridwan',
  'PI-STU-8821': 'uid-ahmad',
  'PI-9552': 'uid-taufik',
  'PI-ALUM-309': 'uid-indira',
  'PI-ADMIN': 'uid-admin',
  'PI-SUPERADMIN': 'uid-superadmin'
};

export interface BootstrapWriteOp {
  collectionPath: string;
  docId: string;
  path: string;
  data: Record<string, unknown>;
  merge?: boolean;
}

export interface BootstrapSeedData {
  programs: Program[];
  campaigns: Campaign[];
  otherProjects: Campaign[];
  destinations: ContributionDestination[];
  donationReports: DonationReport[];
  boardMembers: BoardMember[];
  events: CommunityEvent[];
  members: UserAccount[];
  gaSessionState: GASessionState;
  assemblyQuestions: AssemblyQuestion[];
  boardInquiries: BoardInquiry[];
  siteNotice?: SiteNotice;
}

export interface BootstrapBuildResult {
  writes: BootstrapWriteOp[];
  counts: Record<string, number>;
  metadata: BootstrapMetadata;
}

export function chunkOperations<T>(items: T[], maxPerBatch = 450): T[][] {
  if (maxPerBatch < 1) {
    throw new Error('Batch size must be at least 1.');
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += maxPerBatch) {
    chunks.push(items.slice(i, i + maxPerBatch));
  }
  return chunks;
}

async function loadBootstrapSeedData(): Promise<BootstrapSeedData> {
  const [contentMod, donationsMod, boardMod, eventsMod, assemblyMod, membersMod] =
    await Promise.all([
      import('../data/content'),
      import('../data/donations'),
      import('../data/board'),
      import('../data/events'),
      import('../data/assembly'),
      import('../data/members')
    ]);

  return {
    programs: contentMod.PROGRAMS_DATA,
    campaigns: contentMod.CAMPAIGNS_DATA,
    otherProjects: contentMod.OTHER_PROJECTS,
    destinations: donationsMod.INITIAL_DESTINATIONS,
    donationReports: donationsMod.INITIAL_DONATION_REPORTS,
    boardMembers: boardMod.INITIAL_BOARD_MEMBERS,
    events: eventsMod.INITIAL_COMMUNITY_EVENTS,
    members: membersMod.INITIAL_MEMBERS_LIST,
    gaSessionState: assemblyMod.INITIAL_GA_SESSION_STATE,
    assemblyQuestions: assemblyMod.INITIAL_ASSEMBLY_QUESTIONS,
    boardInquiries: assemblyMod.INITIAL_BOARD_INQUIRIES,
    siteNotice: INITIAL_SITE_NOTICE
  };
}

export async function buildBootstrapOperations(
  adminUser: UserAccount,
  nowIso: string = new Date().toISOString(),
  loadedData?: BootstrapSeedData
): Promise<BootstrapBuildResult> {
  const data = loadedData ?? (await loadBootstrapSeedData());
  const cleanNowIso = nowIso.slice(0, 64);
  const adminActor = (adminUser.name || adminUser.email || 'Super Administrator').slice(0, 150);
  const adminEmailLower = (adminUser.email || '').trim().toLowerCase();

  const writes: BootstrapWriteOp[] = [];
  const counts: Record<string, number> = {
    programs: 0,
    campaigns: 0,
    destinations: 0,
    donationReports: 0,
    boardMembers: 0,
    events: 0,
    members: 0,
    assemblyQuestions: 0,
    boardInquiries: 0,
    siteConfig: 0
  };

  for (const program of data.programs) {
    const clean = buildProgramPayload(program);
    writes.push({
      collectionPath: 'programs',
      docId: clean.id,
      path: `programs/${clean.id}`,
      data: clean as unknown as Record<string, unknown>
    });
    counts.programs += 1;
  }

  for (const campaign of [...data.campaigns, ...data.otherProjects]) {
    const clean = buildCampaignPayload(campaign);
    writes.push({
      collectionPath: 'campaigns',
      docId: clean.id,
      path: `campaigns/${clean.id}`,
      data: clean as unknown as Record<string, unknown>
    });
    counts.campaigns += 1;
  }

  for (const dest of data.destinations) {
    const clean = buildDestinationPayload(dest);
    writes.push({
      collectionPath: 'destinations',
      docId: clean.id,
      path: `destinations/${clean.id}`,
      data: clean as unknown as Record<string, unknown>
    });
    counts.destinations += 1;
  }

  for (const report of data.donationReports) {
    const clean = buildManualDonationReportPayload({
      id: report.id,
      donorName: report.donorName,
      email: report.email,
      amount: report.amount,
      currency: (report.currency as 'CHF' | 'EUR' | 'USD') || 'CHF',
      destination: report.destination,
      paymentMethod: report.paymentMethod,
      date: report.date,
      status: report.status,
      notes: report.notes
    });
    writes.push({
      collectionPath: 'donationReports',
      docId: clean.id,
      path: `donationReports/${clean.id}`,
      data: clean as unknown as Record<string, unknown>
    });
    counts.donationReports += 1;
  }

  for (const bm of data.boardMembers) {
    const clean = buildBoardMemberPayload(bm);
    writes.push({
      collectionPath: 'boardMembers',
      docId: clean.id,
      path: `boardMembers/${clean.id}`,
      data: clean as unknown as Record<string, unknown>
    });
    counts.boardMembers += 1;
  }

  for (const evt of data.events) {
    const clean = buildEventPayload(evt);
    writes.push({
      collectionPath: 'events',
      docId: clean.id,
      path: `events/${clean.id}`,
      data: clean as unknown as Record<string, unknown>
    });
    counts.events += 1;
  }

  for (const member of data.members) {
    const emailLower = member.email.trim().toLowerCase();
    const matchesCurrentAdmin = Boolean(adminUser.uid && emailLower === adminEmailLower);
    const docId = matchesCurrentAdmin
      ? adminUser.uid!
      : member.uid ||
        SEEDED_MEMBER_UID_BY_EMAIL[emailLower] ||
        `uid-${emailLower.replace(/[^a-z0-9]+/g, '-')}`;

    const votingPower = calculateVotingPower(member);
    const verifiedWeight = Math.max(0, Math.min(20, Math.trunc(votingPower.totalVotes)));

    const cleanMember = stripUndefined({
      ...member,
      uid: docId,
      verifiedVoteWeight: verifiedWeight,
      voteWeightVerifiedAt: cleanNowIso,
      voteWeightVerifiedBy: adminActor
    });

    writes.push({
      collectionPath: 'members',
      docId,
      path: `members/${docId}`,
      data: cleanMember as unknown as Record<string, unknown>,
      merge: matchesCurrentAdmin
    });
    counts.members += 1;
  }

  for (const question of data.assemblyQuestions) {
    const { ballots: _ignoredBallots, ...questionWithoutBallots } =
      question as AssemblyQuestion & { ballots?: unknown };

    if (question.status === 'on_floor') {
      questionWithoutBallots.totalVotesWeighted = 0;
      questionWithoutBallots.totalBallots = 0;
      questionWithoutBallots.options = question.options.map((opt) => ({
        ...opt,
        votesWeighted: 0,
        ballotCount: 0
      }));
    } else if (question.status === 'closed' && !questionWithoutBallots.finalResults) {
      const optionTotals: Record<string, number> = {};
      for (const opt of question.options) {
        optionTotals[opt.id] = opt.votesWeighted;
      }
      questionWithoutBallots.finalResults = {
        totalWeight: question.totalVotesWeighted,
        totalBallots: question.totalBallots,
        closedAt: question.closedAt || cleanNowIso,
        closedBy: question.createdBy,
        optionTotals
      };
    }

    const cleanQuestion = buildAssemblyQuestionPayload(questionWithoutBallots);
    writes.push({
      collectionPath: 'assemblyQuestions',
      docId: cleanQuestion.id,
      path: `assemblyQuestions/${cleanQuestion.id}`,
      data: cleanQuestion as unknown as Record<string, unknown>
    });
    counts.assemblyQuestions += 1;
  }

  for (const inq of data.boardInquiries) {
    const mappedAuthorUid =
      inq.authorUid ||
      SEEDED_INQUIRY_AUTHOR_UID_BY_CODE[inq.authorMemberCode] ||
      adminUser.uid ||
      'uid-superadmin';

    const cleanInquiry: Record<string, unknown> = {
      id: inq.id.slice(0, 128),
      title: inq.title.slice(0, 200),
      content: inq.content.slice(0, 4000),
      category: inq.category,
      authorUid: mappedAuthorUid.slice(0, 128),
      authorName: inq.authorName.slice(0, 150),
      authorMemberCode: inq.authorMemberCode.slice(0, 64),
      authorCategory: inq.authorCategory,
      submittedAt: inq.submittedAt.slice(0, 64),
      status: inq.status
    };

    if (inq.boardResponse) {
      cleanInquiry.boardResponse = {
        answeredBy: inq.boardResponse.answeredBy.slice(0, 150),
        answeredAt: inq.boardResponse.answeredAt.slice(0, 64),
        responseText: inq.boardResponse.responseText.slice(0, 4000)
      };
    }
    if (typeof inq.convertedToQuestionId === 'string' && inq.convertedToQuestionId.trim()) {
      cleanInquiry.convertedToQuestionId = inq.convertedToQuestionId.trim().slice(0, 128);
    }

    writes.push({
      collectionPath: 'boardInquiries',
      docId: inq.id.slice(0, 128),
      path: `boardInquiries/${inq.id.slice(0, 128)}`,
      data: cleanInquiry
    });
    counts.boardInquiries += 1;
  }

  const noticePayload = buildSiteNoticePayload(data.siteNotice ?? INITIAL_SITE_NOTICE);
  writes.push({
    collectionPath: 'siteConfig',
    docId: 'notice',
    path: 'siteConfig/notice',
    data: noticePayload as unknown as Record<string, unknown>
  });
  counts.siteConfig += 1;

  const gaSessionPayload = buildGaSessionPayload(data.gaSessionState);
  writes.push({
    collectionPath: 'siteConfig',
    docId: 'gaSession',
    path: 'siteConfig/gaSession',
    data: gaSessionPayload as unknown as Record<string, unknown>
  });
  counts.siteConfig += 1;

  const metadata: BootstrapMetadata = {
    seededAt: cleanNowIso,
    seededBy: (adminUser.email || adminUser.name || 'superadmin').slice(0, 150),
    version: BOOTSTRAP_VERSION
  };

  // `/siteConfig/bootstrap` MUST be last so it lands in the final batch
  writes.push({
    collectionPath: 'siteConfig',
    docId: 'bootstrap',
    path: 'siteConfig/bootstrap',
    data: metadata as unknown as Record<string, unknown>
  });
  counts.siteConfig += 1;

  return { writes, counts, metadata };
}

export async function checkBootstrapStatus(): Promise<BootstrapMetadata | null> {
  const services = getFirebaseServices();
  if (!services) return null;

  const snap = await getDoc(doc(services.db, 'siteConfig', 'bootstrap'));
  return snap.exists() ? (snap.data() as BootstrapMetadata) : null;
}

export async function runInitialBootstrap(
  adminUser: UserAccount
): Promise<BootstrapMetadata> {
  if (!adminUser?.isSuperAdmin) {
    throw new Error('Unauthorized: Only a Super Administrator may execute initial bootstrap seeding.');
  }

  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const existing = await checkBootstrapStatus();
  if (existing) {
    throw new Error(
      `Firestore has already been bootstrapped (version ${existing.version || '1.0.0'} on ${existing.seededAt}).`
    );
  }

  const { writes, metadata } = await buildBootstrapOperations(adminUser);
  const chunks = chunkOperations(writes, 450);

  for (const chunk of chunks) {
    const batch = writeBatch(services.db);
    for (const op of chunk) {
      const ref = doc(services.db, op.collectionPath, op.docId);
      if (op.merge) {
        batch.set(ref, op.data, { merge: true });
      } else {
        batch.set(ref, op.data);
      }
    }
    await batch.commit();
  }

  return metadata;
}
