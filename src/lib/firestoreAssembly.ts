import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseServices } from './firebase';
import {
  DocSubscriptionResult,
  formatFirestoreError,
  stripUndefined,
  SubscriptionResult
} from './firestoreContent';
import {
  AssemblyQuestion,
  AssemblyQuestionFinalResults,
  BoardInquiry,
  BoardInquiryCategory,
  BoardResponse,
  CastBallot,
  GASessionState,
  MembershipCategory,
  QuestionCategory,
  QuestionType,
  VotingOption
} from '../types';

export type { DocSubscriptionResult, SubscriptionResult } from './firestoreContent';

const VALID_QUESTION_STATUSES: ReadonlyArray<'draft' | 'on_floor' | 'closed'> = [
  'draft',
  'on_floor',
  'closed'
];

const VALID_QUESTION_CATEGORIES: ReadonlyArray<QuestionCategory> = [
  'Budget & Financial',
  'Statute Amendment',
  'Board Election',
  'Community Project',
  'General Resolution'
];

const VALID_INQUIRY_CATEGORIES: ReadonlyArray<BoardInquiryCategory> = [
  'Finance & Audit',
  'Programs & Tarbiyah',
  'Mosque & Facility',
  'Statute & Governance',
  'General'
];

// --- Pure Payload Builders ---

export function buildGaSessionPayload(state: GASessionState): GASessionState {
  const sessionTitle = (state.sessionTitle || '').trim().slice(0, 200);
  const scheduledDate = (state.scheduledDate || '').trim().slice(0, 100);
  if (!sessionTitle || !scheduledDate) {
    throw new Error('GA session title and scheduled date are required.');
  }

  const activeQuestionId =
    typeof state.activeQuestionId === 'string' && state.activeQuestionId.trim()
      ? state.activeQuestionId.trim().slice(0, 128)
      : null;

  const payload: GASessionState = {
    isOpen: Boolean(state.isOpen),
    sessionTitle,
    scheduledDate,
    activeQuestionId
  };

  if (typeof state.openedAt === 'string' && state.openedAt.trim()) {
    payload.openedAt = state.openedAt.trim().slice(0, 64);
  }
  if (typeof state.closedAt === 'string' && state.closedAt.trim()) {
    payload.closedAt = state.closedAt.trim().slice(0, 64);
  }
  if (typeof state.openedBy === 'string' && state.openedBy.trim()) {
    payload.openedBy = state.openedBy.trim().slice(0, 150);
  }
  if (typeof state.location === 'string' && state.location.trim()) {
    payload.location = state.location.trim().slice(0, 200);
  }

  return stripUndefined(payload);
}

export function buildAssemblyQuestionPayload(
  question: Omit<AssemblyQuestion, 'optionIds'> & { optionIds?: string[] }
): AssemblyQuestion {
  const statusStr = String(question.status || '');
  if (!VALID_QUESTION_STATUSES.includes(statusStr as 'draft' | 'on_floor' | 'closed')) {
    throw new Error(
      `Invalid motion status "${statusStr}". Must be 'draft', 'on_floor', or 'closed'.`
    );
  }
  if (!VALID_QUESTION_CATEGORIES.includes(question.category)) {
    throw new Error(`Invalid motion category: ${question.category}`);
  }
  if (question.type !== 'yes_no_abstain' && question.type !== 'multiple_choice') {
    throw new Error(`Invalid motion type: ${question.type}`);
  }

  const rawOptions = Array.isArray(question.options) ? question.options : [];
  if (rawOptions.length < 2) {
    throw new Error('Assembly motion must have at least 2 voting options.');
  }
  if (rawOptions.length > 20) {
    throw new Error('Assembly motion cannot have more than 20 voting options.');
  }

  const cleanOptions: VotingOption[] = rawOptions.map((opt, idx) => {
    const text = (opt.text || '').trim().slice(0, 300);
    if (!text) {
      throw new Error(`Voting option #${idx + 1} must have non-empty text.`);
    }
    return {
      id: (opt.id?.trim() || `opt-${idx + 1}`).slice(0, 128),
      text,
      votesWeighted: Math.max(0, Number(opt.votesWeighted) || 0),
      ballotCount: Math.max(0, Number(opt.ballotCount) || 0)
    };
  });

  const optionIds = cleanOptions.map((o) => o.id);
  if (new Set(optionIds).size !== optionIds.length) {
    throw new Error('Assembly motion optionIds must be unique.');
  }
  const id = (question.id?.trim() || `ga-q-${Date.now()}`).slice(0, 128);
  const title = (question.title || '').trim().slice(0, 250);
  const createdBy = (question.createdBy || '').trim().slice(0, 150);
  const createdAt = (question.createdAt?.trim() || new Date().toISOString()).slice(0, 64);

  if (!title || !createdBy) {
    throw new Error('Motion title and createdBy are required.');
  }

  const rawQuorum = question.quorumRequiredPercent;
  let quorumRequiredPercent = 50;
  if (
    rawQuorum !== undefined &&
    rawQuorum !== null &&
    String(rawQuorum).trim() !== ''
  ) {
    const parsedQuorum = Number(rawQuorum);
    if (!Number.isFinite(parsedQuorum)) {
      throw new Error('Motion quorumRequiredPercent must be a finite number between 0 and 100.');
    }
    quorumRequiredPercent = Math.max(0, Math.min(100, parsedQuorum));
  }

  const payload: AssemblyQuestion = {
    id,
    title,
    description: (question.description || '').trim().slice(0, 5000),
    category: question.category,
    status: statusStr as 'draft' | 'on_floor' | 'closed',
    type: question.type as QuestionType,
    options: cleanOptions,
    optionIds,
    totalVotesWeighted: Math.max(0, Math.min(100_000, Number(question.totalVotesWeighted) || 0)),
    totalBallots: Math.max(0, Math.min(100_000, Number(question.totalBallots) || 0)),
    createdAt,
    createdBy,
    quorumRequiredPercent
  };

  if (
    question.agendaOrder !== undefined &&
    question.agendaOrder !== null &&
    Number.isFinite(Number(question.agendaOrder))
  ) {
    payload.agendaOrder = Math.max(0, Math.min(1000, Number(question.agendaOrder)));
  }
  if (typeof question.openedAt === 'string' && question.openedAt.trim()) {
    payload.openedAt = question.openedAt.trim().slice(0, 64);
  }
  if (typeof question.closedAt === 'string' && question.closedAt.trim()) {
    payload.closedAt = question.closedAt.trim().slice(0, 64);
  }
  if (typeof question.statuteArticleRef === 'string' && question.statuteArticleRef.trim()) {
    payload.statuteArticleRef = question.statuteArticleRef.trim().slice(0, 200);
  }
  if (question.finalResults) {
    payload.finalResults = {
      totalWeight: Math.max(0, Math.min(100_000, Number(question.finalResults.totalWeight) || 0)),
      totalBallots: Math.max(0, Math.min(100_000, Number(question.finalResults.totalBallots) || 0)),
      closedAt: (question.finalResults.closedAt || new Date().toISOString()).slice(0, 64),
      closedBy: (question.finalResults.closedBy || createdBy).slice(0, 150),
      optionTotals: { ...(question.finalResults.optionTotals || {}) }
    };
  }

  // Note: `ballots` is intentionally never included on /assemblyQuestions/{id}
  return stripUndefined(payload);
}

export function buildBallotPayload(
  questionId: string,
  uid: string,
  ballot: Omit<CastBallot, 'id' | 'questionId'>
): CastBallot {
  const cleanQuestionId = questionId.trim().slice(0, 128);
  const cleanUid = uid.trim().slice(0, 128);
  if (!cleanQuestionId || !cleanUid) {
    throw new Error('Question ID and member UID are required to cast a ballot.');
  }
  if (!Number.isInteger(ballot.voteWeight) || ballot.voteWeight < 1 || ballot.voteWeight > 20) {
    throw new Error('Ballot voteWeight must be a certified integer between 1 and 20.');
  }
  if (ballot.membershipCategory !== 'personal' && ballot.membershipCategory !== 'family') {
    throw new Error(`Invalid membership category: ${ballot.membershipCategory}`);
  }
  const votedOptionId = (ballot.votedOptionId || '').trim().slice(0, 128);
  const memberCode = (ballot.memberCode || '').trim().slice(0, 64);
  const memberName = (ballot.memberName || '').trim().slice(0, 150);
  if (!votedOptionId || !memberCode || !memberName) {
    throw new Error('Ballot requires votedOptionId, memberCode, and memberName.');
  }

  // Strictly 9 fields; `memberEmail` is omitted per firestore.rules
  return {
    id: cleanUid,
    questionId: cleanQuestionId,
    memberCode,
    memberName,
    membershipCategory: ballot.membershipCategory,
    votedOptionId,
    voteWeight: ballot.voteWeight,
    timestamp: (ballot.timestamp?.trim() || new Date().toISOString()).slice(0, 64),
    breakdown: {
      primaryEligible: Boolean(ballot.breakdown?.primaryEligible),
      spouseEligible: Boolean(ballot.breakdown?.spouseEligible),
      eligibleChildrenNames: Array.isArray(ballot.breakdown?.eligibleChildrenNames)
        ? ballot.breakdown.eligibleChildrenNames.map((n) => String(n).slice(0, 150)).slice(0, 15)
        : [],
      ineligibleChildrenNames: Array.isArray(ballot.breakdown?.ineligibleChildrenNames)
        ? ballot.breakdown.ineligibleChildrenNames.map((n) => String(n).slice(0, 150)).slice(0, 15)
        : []
    }
  };
}

export interface CreateBoardInquiryInput {
  id?: string;
  title: string;
  content: string;
  category: BoardInquiryCategory;
  authorUid: string;
  authorName: string;
  authorMemberCode: string;
  authorCategory: MembershipCategory;
  submittedAt?: string;
}

export function buildBoardInquiryCreatePayload(
  input: CreateBoardInquiryInput
): BoardInquiry {
  const title = (input.title || '').trim().slice(0, 200);
  const content = (input.content || '').trim().slice(0, 4000);
  const authorUid = (input.authorUid || '').trim().slice(0, 128);
  const authorName = (input.authorName || '').trim().slice(0, 150);
  const authorMemberCode = (input.authorMemberCode || '').trim().slice(0, 64);

  if (!title || !content || !authorUid || !authorName || !authorMemberCode) {
    throw new Error('Inquiry title, content, and authenticated member identity are required.');
  }
  if (!VALID_INQUIRY_CATEGORIES.includes(input.category)) {
    throw new Error(`Invalid inquiry category: ${input.category}`);
  }
  if (input.authorCategory !== 'personal' && input.authorCategory !== 'family') {
    throw new Error(`Invalid author category: ${input.authorCategory}`);
  }

  // Strictly 10 fields; no authorEmail, upvotes, boardResponse, or convertedToQuestionId
  return {
    id: (
      input.id?.trim() ||
      `inq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    ).slice(0, 128),
    title,
    content,
    category: input.category,
    authorUid,
    authorName,
    authorMemberCode,
    authorCategory: input.authorCategory,
    submittedAt: (input.submittedAt?.trim() || new Date().toISOString()).slice(0, 64),
    status: 'submitted'
  };
}

// --- GA Session ---

export function subscribeGaSession(
  onUpdate: (res: DocSubscriptionResult<GASessionState>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: null, loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: null, loading: true, error: null });
  return onSnapshot(
    doc(services.db, 'siteConfig', 'gaSession'),
    (snap) => {
      onUpdate({
        data: snap.exists() ? (snap.data() as GASessionState) : null,
        loading: false,
        error: null
      });
    },
    (err) => {
      onUpdate({ data: null, loading: false, error: formatFirestoreError(err) });
    }
  );
}

export async function saveGaSessionState(state: GASessionState): Promise<GASessionState> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const payload = buildGaSessionPayload(state);
  await setDoc(doc(services.db, 'siteConfig', 'gaSession'), payload);
  return payload;
}

// --- Assembly Questions & Motions ---

export function subscribeAssemblyQuestions(
  onUpdate: (res: SubscriptionResult<AssemblyQuestion>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: [], loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: [], loading: true, error: null });
  return onSnapshot(
    collection(services.db, 'assemblyQuestions'),
    (snapshot) => {
      const data = snapshot.docs
        .map((docSnap) => {
          const raw = docSnap.data() as AssemblyQuestion & { ballots?: unknown };
          const { ballots: _ignoredBallots, ...rest } = raw;
          return {
            ...rest,
            id: docSnap.id,
            optionIds: raw.optionIds || raw.options?.map((o) => o.id) || []
          } as AssemblyQuestion;
        })
        .sort((a, b) => {
          const orderDiff =
            (a.agendaOrder ?? Number.MAX_SAFE_INTEGER) -
            (b.agendaOrder ?? Number.MAX_SAFE_INTEGER);
          if (orderDiff !== 0) return orderDiff;
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
      onUpdate({ data, loading: false, error: null });
    },
    (err) => {
      onUpdate({ data: [], loading: false, error: formatFirestoreError(err) });
    }
  );
}

export async function saveAssemblyQuestion(
  question: Omit<AssemblyQuestion, 'optionIds'> & { optionIds?: string[] },
  isNew?: boolean
): Promise<AssemblyQuestion> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const payload = buildAssemblyQuestionPayload(question);
  const docRef = doc(services.db, 'assemblyQuestions', payload.id);

  let shouldCreate = isNew;
  if (shouldCreate === undefined) {
    const existing = await getDoc(docRef);
    shouldCreate = !existing.exists();
  }

  if (shouldCreate) {
    await setDoc(docRef, payload);
  } else {
    const {
      id: _immutableId,
      createdAt: _immutableCreatedAt,
      createdBy: _immutableCreatedBy,
      ...mutableFields
    } = payload;
    await updateDoc(docRef, mutableFields as Record<string, unknown>);
  }

  return payload;
}

export async function deleteAssemblyQuestion(questionId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'assemblyQuestions', questionId));
}

export async function placeMotionOnFloor(
  questionId: string,
  existingQuestions?: AssemblyQuestion[]
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const cleanId = questionId.trim();
  if (!cleanId) throw new Error('Question ID is required.');

  const nowIso = new Date().toISOString();
  const snap = await getDocs(
    query(collection(services.db, 'assemblyQuestions'), where('status', '==', 'on_floor'))
  );
  const floorIds = new Set<string>(snap.docs.map((d) => d.id));
  if (existingQuestions) {
    for (const q of existingQuestions) {
      if (q.status === 'on_floor') {
        floorIds.add(q.id);
      }
    }
  }
  floorIds.delete(cleanId);

  const batch = writeBatch(services.db);
  for (const otherId of floorIds) {
    batch.update(doc(services.db, 'assemblyQuestions', otherId), { status: 'draft' });
  }
  batch.update(doc(services.db, 'assemblyQuestions', cleanId), {
    status: 'on_floor',
    openedAt: nowIso
  });

  const gaSessionRef = doc(services.db, 'siteConfig', 'gaSession');
  const gaSessionSnap = await getDoc(gaSessionRef);
  if (gaSessionSnap.exists()) {
    batch.update(gaSessionRef, {
      activeQuestionId: cleanId
    });
  } else {
    batch.set(
      gaSessionRef,
      buildGaSessionPayload({
        isOpen: false,
        sessionTitle: 'General Assembly',
        scheduledDate: nowIso.slice(0, 10),
        activeQuestionId: cleanId
      })
    );
  }
  await batch.commit();
}

export async function closeMotionWithFinalResults(
  questionId: string,
  ballots: CastBallot[],
  options: VotingOption[],
  closedBy: string,
  clearActiveIfMatches = true
): Promise<AssemblyQuestionFinalResults> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const cleanId = questionId.trim();
  if (!cleanId) throw new Error('Question ID is required.');

  const nowIso = new Date().toISOString();
  const optionTotals: Record<string, number> = {};
  const optionBallotCounts: Record<string, number> = {};
  for (const opt of options) {
    optionTotals[opt.id] = 0;
    optionBallotCounts[opt.id] = 0;
  }

  let totalWeight = 0;
  let countedBallots = 0;
  for (const ballot of ballots) {
    if (!Object.prototype.hasOwnProperty.call(optionTotals, ballot.votedOptionId)) {
      continue;
    }
    const weight = Math.max(0, Math.trunc(Number(ballot.voteWeight) || 0));
    totalWeight += weight;
    countedBallots += 1;
    optionTotals[ballot.votedOptionId] += weight;
    optionBallotCounts[ballot.votedOptionId] += 1;
  }

  const updatedOptions: VotingOption[] = options.map((opt) => ({
    ...opt,
    votesWeighted: optionTotals[opt.id] || 0,
    ballotCount: optionBallotCounts[opt.id] || 0
  }));

  const finalResults: AssemblyQuestionFinalResults = {
    totalWeight,
    totalBallots: countedBallots,
    closedAt: nowIso,
    closedBy: (closedBy.trim() || 'Board Administrator').slice(0, 150),
    optionTotals
  };

  const batch = writeBatch(services.db);
  batch.update(doc(services.db, 'assemblyQuestions', cleanId), {
    status: 'closed',
    closedAt: nowIso,
    options: updatedOptions,
    totalVotesWeighted: totalWeight,
    totalBallots: countedBallots,
    finalResults
  });

  if (clearActiveIfMatches) {
    const sessionSnap = await getDoc(doc(services.db, 'siteConfig', 'gaSession'));
    if (sessionSnap.exists() && sessionSnap.data().activeQuestionId === cleanId) {
      batch.update(doc(services.db, 'siteConfig', 'gaSession'), {
        activeQuestionId: null
      });
    }
  }

  await batch.commit();
  return finalResults;
}

export async function fetchQuestionBallotsFromServer(
  questionId: string
): Promise<CastBallot[]> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const cleanQuestionId = questionId.trim();
  if (!cleanQuestionId) return [];

  const ballotsCol = collection(services.db, 'assemblyQuestions', cleanQuestionId, 'ballots');
  const snapshot = await getDocsFromServer(ballotsCol);
  return snapshot.docs
    .map((docSnap) => ({
      ...(docSnap.data() as CastBallot),
      id: docSnap.id
    }))
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

// --- Ballots (/assemblyQuestions/{questionId}/ballots/{uid}) ---

export function subscribeQuestionBallots(
  questionId: string,
  onUpdate: (res: SubscriptionResult<CastBallot>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: [], loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }
  const cleanQuestionId = questionId.trim();
  if (!cleanQuestionId) {
    onUpdate({ data: [], loading: false, error: null });
    return () => {};
  }

  onUpdate({ data: [], loading: true, error: null });
  return onSnapshot(
    collection(services.db, 'assemblyQuestions', cleanQuestionId, 'ballots'),
    (snapshot) => {
      const data = snapshot.docs
        .map((docSnap) => ({
          ...(docSnap.data() as CastBallot),
          id: docSnap.id
        }))
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      onUpdate({ data, loading: false, error: null });
    },
    (err) => {
      onUpdate({ data: [], loading: false, error: formatFirestoreError(err) });
    }
  );
}

export async function castMemberBallot(
  questionId: string,
  uid: string,
  ballot: Omit<CastBallot, 'id' | 'questionId'>
): Promise<CastBallot> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const payload = buildBallotPayload(questionId, uid, ballot);
  const ballotRef = doc(services.db, 'assemblyQuestions', payload.questionId, 'ballots', payload.id);

  try {
    await setDoc(ballotRef, payload);
    return payload;
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'permission-denied') {
      throw new Error(
        'Ballot submission was rejected by security rules. Ensure the GA session is open, this motion is on the floor, you have not already voted, and your vote weight is Board-certified.'
      );
    }
    throw new Error(formatFirestoreError(err));
  }
}

// --- Board Inquiries & Upvotes ---

export function subscribeBoardInquiries(
  onUpdate: (res: SubscriptionResult<BoardInquiry>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: [], loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: [], loading: true, error: null });
  const q = query(collection(services.db, 'boardInquiries'), orderBy('submittedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as BoardInquiry),
        id: docSnap.id
      }));
      onUpdate({ data, loading: false, error: null });
    },
    (err) => {
      onUpdate({ data: [], loading: false, error: formatFirestoreError(err) });
    }
  );
}

export async function createBoardInquiry(
  input: CreateBoardInquiryInput
): Promise<BoardInquiry> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const payload = buildBoardInquiryCreatePayload(input);
  await setDoc(doc(services.db, 'boardInquiries', payload.id), payload);
  return payload;
}

export async function respondToBoardInquiry(
  inquiryId: string,
  response: BoardResponse,
  status: 'answered' | 'agenda_item' = 'answered'
): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const cleanResponse: BoardResponse = {
    answeredBy: (response.answeredBy || '').trim().slice(0, 150),
    answeredAt: (response.answeredAt?.trim() || new Date().toISOString()).slice(0, 64),
    responseText: (response.responseText || '').trim().slice(0, 4000)
  };
  if (!cleanResponse.answeredBy || !cleanResponse.responseText) {
    throw new Error('Board response requires answeredBy and responseText.');
  }

  await updateDoc(doc(services.db, 'boardInquiries', inquiryId), {
    status,
    boardResponse: cleanResponse
  });
}

export async function convertInquiryToMotion(
  inquiry: BoardInquiry,
  createdBy: string,
  options?: {
    status?: 'draft' | 'on_floor';
    quorumRequiredPercent?: number;
    statuteArticleRef?: string;
  }
): Promise<AssemblyQuestion> {
  if (inquiry.convertedToQuestionId?.trim() || inquiry.status === 'agenda_item') {
    throw new Error('This board inquiry has already been escalated to an Assembly motion.');
  }

  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const nowIso = new Date().toISOString();
  const questionId = `ga-q-inq-${Date.now()}`.slice(0, 128);
  const motionPayload = buildAssemblyQuestionPayload({
    id: questionId,
    title: inquiry.title.slice(0, 250),
    description: inquiry.content.slice(0, 5000),
    category: 'General Resolution',
    status: options?.status ?? 'draft',
    type: 'yes_no_abstain',
    options: [
      { id: 'opt-yes', text: 'Ja / Setuju / Approve (In Favor)', votesWeighted: 0, ballotCount: 0 },
      { id: 'opt-no', text: 'Nein / Menolak / Reject (Against)', votesWeighted: 0, ballotCount: 0 },
      { id: 'opt-abstain', text: 'Enthaltung / Abstain', votesWeighted: 0, ballotCount: 0 }
    ],
    totalVotesWeighted: 0,
    totalBallots: 0,
    createdAt: nowIso,
    createdBy: createdBy.trim().slice(0, 150) || 'Board Administrator',
    quorumRequiredPercent: options?.quorumRequiredPercent ?? 50,
    statuteArticleRef: options?.statuteArticleRef
  });

  const boardResponse: BoardResponse = inquiry.boardResponse?.responseText
    ? {
        answeredBy: inquiry.boardResponse.answeredBy.slice(0, 150),
        answeredAt: inquiry.boardResponse.answeredAt.slice(0, 64),
        responseText: inquiry.boardResponse.responseText.slice(0, 4000)
      }
    : {
        answeredBy: (createdBy.trim() || 'Board Administrator').slice(0, 150),
        answeredAt: nowIso.slice(0, 64),
        responseText: `Escalated to General Assembly agenda motion (${questionId}).`
      };

  const batch = writeBatch(services.db);
  batch.set(doc(services.db, 'assemblyQuestions', questionId), motionPayload);
  batch.update(doc(services.db, 'boardInquiries', inquiry.id), {
    status: 'agenda_item',
    convertedToQuestionId: questionId,
    boardResponse
  });
  await batch.commit();

  return motionPayload;
}

export async function deleteBoardInquiry(inquiryId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'boardInquiries', inquiryId));
}

export function subscribeInquiryUpvotes(
  inquiryId: string,
  currentUid: string | null | undefined,
  onUpdate: (res: DocSubscriptionResult<{ count: number; hasUpvoted: boolean }>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: null, loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }
  const cleanId = inquiryId.trim();
  if (!cleanId) {
    onUpdate({ data: { count: 0, hasUpvoted: false }, loading: false, error: null });
    return () => {};
  }

  onUpdate({ data: null, loading: true, error: null });
  return onSnapshot(
    collection(services.db, 'boardInquiries', cleanId, 'upvotes'),
    (snapshot) => {
      const hasUpvoted = Boolean(
        currentUid && snapshot.docs.some((docSnap) => docSnap.id === currentUid)
      );
      onUpdate({
        data: { count: snapshot.size, hasUpvoted },
        loading: false,
        error: null
      });
    },
    (err) => {
      onUpdate({ data: null, loading: false, error: formatFirestoreError(err) });
    }
  );
}

export async function toggleInquiryUpvote(
  inquiryId: string,
  uid: string,
  currentlyUpvoted?: boolean
): Promise<boolean> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const cleanInquiryId = inquiryId.trim();
  const cleanUid = uid.trim();
  if (!cleanInquiryId || !cleanUid) {
    throw new Error('Inquiry ID and user UID are required to upvote.');
  }

  const upvoteRef = doc(services.db, 'boardInquiries', cleanInquiryId, 'upvotes', cleanUid);
  let exists = currentlyUpvoted;
  if (exists === undefined) {
    const snap = await getDoc(upvoteRef);
    exists = snap.exists();
  }

  if (exists) {
    await deleteDoc(upvoteRef);
    return false;
  }

  await setDoc(upvoteRef, {
    uid: cleanUid,
    createdAt: new Date().toISOString()
  });
  return true;
}
