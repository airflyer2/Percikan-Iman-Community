import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Gavel,
  Lock,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
  Vote,
  X
} from 'lucide-react';
import { collection, doc, getDoc, getDocsFromServer } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n';
import {
  batchUpdateVerifiedVoteWeights,
  subscribeToFirestoreMembers,
  VerifiedVoteWeightUpdate
} from '../../lib/authService';
import { getFirebaseServices } from '../../lib/firebase';
import {
  closeMotionWithFinalResults,
  convertInquiryToMotion,
  deleteAssemblyQuestion,
  deleteBoardInquiry,
  fetchQuestionBallotsFromServer,
  placeMotionOnFloor,
  respondToBoardInquiry,
  saveAssemblyQuestion,
  saveGaSessionState,
  subscribeAssemblyQuestions,
  subscribeBoardInquiries,
  subscribeGaSession,
  subscribeQuestionBallots
} from '../../lib/firestoreAssembly';
import { formatFirestoreError } from '../../lib/firestoreContent';
import {
  AssemblyQuestion,
  BoardInquiry,
  BoardInquiryCategory,
  CastBallot,
  GASessionState,
  QuestionCategory,
  QuestionType,
  UserAccount,
  VotingOption
} from '../../types';
import { calculateVotingPower } from '../../utils/votingPower';

const QUESTION_CATEGORIES: ReadonlyArray<QuestionCategory> = [
  'Budget & Financial',
  'Statute Amendment',
  'Board Election',
  'Community Project',
  'General Resolution'
];

export const AdminAssemblyTab: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const { t } = useLanguage();

  const actorName = (
    currentUser?.name ||
    currentUser?.email ||
    'Board Administrator'
  ).slice(0, 150);

  // Live Firestore subscriptions
  const [gaSession, setGaSession] = useState<GASessionState | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [questions, setQuestions] = useState<AssemblyQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [inquiries, setInquiries] = useState<BoardInquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [members, setMembers] = useState<UserAccount[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const isMutatingRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session form draft
  const [sessionTitleDraft, setSessionTitleDraft] = useState('Ordentliche Generalversammlung 2026');
  const [scheduledDateDraft, setScheduledDateDraft] = useState('2026-09-15');
  const [locationDraft, setLocationDraft] = useState('Zürich, Schweiz');

  // Ballots subcollection state keyed by questionId
  const [ballotsByQid, setBallotsByQid] = useState<Record<string, CastBallot[]>>({});
  const [ballotsLoadingByQid, setBallotsLoadingByQid] = useState<Record<string, boolean>>({});
  const [ballotsErrorByQid, setBallotsErrorByQid] = useState<Record<string, string | null>>({});
  const [expandedAuditQid, setExpandedAuditQid] = useState<string | null>(null);

  // Motion filters & modal
  const [motionStatusFilter, setMotionStatusFilter] = useState<string>('all');
  const [motionCategoryFilter, setMotionCategoryFilter] = useState<string>('all');
  const [isMotionModalOpen, setIsMotionModalOpen] = useState(false);
  const [motionModalError, setMotionModalError] = useState<string | null>(null);
  const [editingMotion, setEditingMotion] = useState<AssemblyQuestion | null>(null);
  const [motionTitle, setMotionTitle] = useState('');
  const [motionDescription, setMotionDescription] = useState('');
  const [motionCategory, setMotionCategory] = useState<QuestionCategory>('Budget & Financial');
  const [motionType, setMotionType] = useState<QuestionType>('yes_no_abstain');
  const [motionQuorum, setMotionQuorum] = useState<number>(50);
  const [motionStatuteRef, setMotionStatuteRef] = useState('Art. 12 Verein Statuten');
  const [motionAgendaOrder, setMotionAgendaOrder] = useState<string>('1');
  const [customOptions, setCustomOptions] = useState<string[]>([
    'Option A',
    'Option B',
    'Enthaltung / Abstain'
  ]);
  const [newOptionInput, setNewOptionInput] = useState('');

  // Inquiry filters & reply modal
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<string>('all');
  const [inquiryCategoryFilter, setInquiryCategoryFilter] = useState<string>('all');
  const [answeringInquiry, setAnsweringInquiry] = useState<BoardInquiry | null>(null);
  const [boardAnswerText, setBoardAnswerText] = useState('');
  const [inquiryModalError, setInquiryModalError] = useState<string | null>(null);

  useEffect(() => {
    const unsubSession = subscribeGaSession((res) => {
      setGaSession(res.data);
      setSessionLoading(res.loading);
      if (res.error) setLoadError(res.error);
    });
    const unsubQuestions = subscribeAssemblyQuestions((res) => {
      setQuestions(res.data);
      setQuestionsLoading(res.loading);
      if (res.error) setLoadError(res.error);
    });
    const unsubInquiries = subscribeBoardInquiries((res) => {
      setInquiries(res.data);
      setInquiriesLoading(res.loading);
      if (res.error) setLoadError(res.error);
    });
    setMembersLoading(true);
    const unsubMembers = subscribeToFirestoreMembers(
      (list) => {
        setMembers(list);
        setMembersLoading(false);
      },
      (err) => {
        setMembersLoading(false);
        setLoadError(formatFirestoreError(err));
      }
    );

    return () => {
      unsubSession();
      unsubQuestions();
      unsubInquiries();
      unsubMembers();
    };
  }, []);

  useEffect(() => {
    if (gaSession) {
      setSessionTitleDraft(gaSession.sessionTitle);
      setScheduledDateDraft(gaSession.scheduledDate);
      setLocationDraft(gaSession.location || '');
    }
  }, [gaSession]);

  const subscribedBallotIds = useMemo(() => {
    const ids = new Set<string>();
    for (const q of questions) {
      if (q.status === 'on_floor') {
        ids.add(q.id);
      }
    }
    if (gaSession?.activeQuestionId) ids.add(gaSession.activeQuestionId);
    if (expandedAuditQid) ids.add(expandedAuditQid);
    return Array.from(ids);
  }, [questions, gaSession?.activeQuestionId, expandedAuditQid]);

  useEffect(() => {
    if (subscribedBallotIds.length === 0) return;

    const unsubs = subscribedBallotIds.map((qid) =>
      subscribeQuestionBallots(qid, (res) => {
        setBallotsByQid((prev) => ({ ...prev, [qid]: res.data }));
        setBallotsLoadingByQid((prev) => ({ ...prev, [qid]: res.loading }));
        setBallotsErrorByQid((prev) => ({ ...prev, [qid]: res.error }));
        if (res.error) setLoadError(res.error);
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [subscribedBallotIds.join('|')]);

  const showSuccess = (msg: string) => {
    setActionSuccess(msg);
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = setTimeout(() => {
      setActionSuccess(null);
      successTimerRef.current = null;
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  // Voter Roll Certification metrics
  const voterRollStats = useMemo(() => {
    let eligibleCount = 0;
    let certifiedCount = 0;
    let pendingOrMismatchCount = 0;
    let totalExpectedWeight = 0;
    let totalCertifiedWeight = 0;

    for (const m of members) {
      const vp = calculateVotingPower(m);
      const expected = Math.max(0, Math.min(20, Math.trunc(vp.totalVotes)));
      if (vp.isEligibleToVote) {
        eligibleCount += 1;
      }
      totalExpectedWeight += expected;

      if (typeof m.verifiedVoteWeight === 'number' && m.verifiedVoteWeight === expected) {
        certifiedCount += 1;
        totalCertifiedWeight += m.verifiedVoteWeight;
      } else {
        pendingOrMismatchCount += 1;
      }
    }

    return {
      totalMembers: members.length,
      eligibleCount,
      certifiedCount,
      pendingOrMismatchCount,
      totalExpectedWeight,
      totalCertifiedWeight
    };
  }, [members]);

  const ensureGaSessionExists = async (): Promise<GASessionState> => {
    const services = getFirebaseServices();
    if (services) {
      const snap = await getDoc(doc(services.db, 'siteConfig', 'gaSession'));
      if (snap.exists()) {
        return snap.data() as GASessionState;
      }
    } else if (gaSession) {
      return gaSession;
    }
    return saveGaSessionState({
      isOpen: false,
      sessionTitle: sessionTitleDraft.trim() || 'Ordentliche Generalversammlung 2026',
      scheduledDate: scheduledDateDraft.trim() || '2026-09-15',
      location: locationDraft.trim() || undefined,
      activeQuestionId: null
    });
  };

  const handleSaveSessionMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMutatingRef.current) return;
    setActionError(null);
    isMutatingRef.current = true;
    setIsMutating(true);
    try {
      await saveGaSessionState({
        isOpen: Boolean(gaSession?.isOpen),
        sessionTitle: sessionTitleDraft.trim(),
        scheduledDate: scheduledDateDraft.trim(),
        location: locationDraft.trim() || undefined,
        activeQuestionId: gaSession?.activeQuestionId ?? null,
        openedAt: gaSession?.openedAt,
        closedAt: gaSession?.closedAt,
        openedBy: gaSession?.openedBy
      });
      showSuccess('General Assembly session metadata saved.');
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to save GA session metadata.'));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const handleToggleGaSession = async () => {
    if (isMutatingRef.current) return;
    setActionError(null);
    isMutatingRef.current = true;
    setIsMutating(true);
    try {
      const nextOpen = !gaSession?.isOpen;
      const nowIso = new Date().toISOString();
      await saveGaSessionState({
        isOpen: nextOpen,
        sessionTitle: sessionTitleDraft.trim() || 'Ordentliche Generalversammlung 2026',
        scheduledDate: scheduledDateDraft.trim() || '2026-09-15',
        location: locationDraft.trim() || undefined,
        activeQuestionId: nextOpen ? gaSession?.activeQuestionId ?? null : null,
        openedAt: nextOpen ? nowIso : gaSession?.openedAt,
        closedAt: nextOpen ? gaSession?.closedAt : nowIso,
        openedBy: nextOpen ? actorName : gaSession?.openedBy
      });
      showSuccess(
        nextOpen
          ? 'General Assembly chamber is now OPEN for live member voting.'
          : 'General Assembly chamber has been CLOSED.'
      );
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to update GA session status.'));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const handleCertifyVoterRoll = async () => {
    if (isMutatingRef.current) return;
    if (membersLoading) {
      setActionError('Voter roll is still synchronizing from Firestore. Please wait a moment.');
      return;
    }
    setActionError(null);
    isMutatingRef.current = true;
    setIsMutating(true);
    try {
      const services = getFirebaseServices();
      if (!services) {
        setActionError('Firebase is not configured.');
        return;
      }
      const serverSnapshot = await getDocsFromServer(collection(services.db, 'members'));
      const authoritativeMembers: UserAccount[] = serverSnapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as UserAccount),
        uid: docSnap.id
      }));

      const nowIso = new Date().toISOString();
      let skippedSuperAdmins = 0;
      const updates: VerifiedVoteWeightUpdate[] = [];

      for (const m of authoritativeMembers) {
        if (!m.uid) continue;
        // firestore.rules:506 prevents non-SuperAdmin isAdmin from modifying SuperAdmin docs
        if (!isSuperAdmin && m.isSuperAdmin) {
          skippedSuperAdmins += 1;
          continue;
        }
        const expected = Math.max(
          0,
          Math.min(20, Math.trunc(calculateVotingPower(m).totalVotes))
        );
        updates.push({
          uid: m.uid,
          verifiedVoteWeight: expected,
          voteWeightVerifiedAt: nowIso,
          voteWeightVerifiedBy: actorName
        });
      }

      if (updates.length === 0) {
        setActionError('No modifiable member documents found to certify.');
        return;
      }

      await batchUpdateVerifiedVoteWeights(updates);
      showSuccess(
        `Certified voting weights for ${updates.length} member profile(s)${
          skippedSuperAdmins > 0
            ? ` (${skippedSuperAdmins} Super Admin record skipped — requires Super Admin)`
            : ''
        }.`
      );
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to certify voter roll.'));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const openCreateMotionModal = () => {
    setMotionModalError(null);
    setEditingMotion(null);
    setMotionTitle('');
    setMotionDescription('');
    setMotionCategory('Budget & Financial');
    setMotionType('yes_no_abstain');
    setMotionQuorum(50);
    setMotionStatuteRef('Art. 12 Verein Statuten');
    setMotionAgendaOrder(String(questions.length + 1));
    setCustomOptions(['Option A', 'Option B', 'Enthaltung / Abstain']);
    setNewOptionInput('');
    setIsMotionModalOpen(true);
  };

  const openEditMotionModal = (q: AssemblyQuestion) => {
    setMotionModalError(null);
    setEditingMotion(q);
    setMotionTitle(q.title);
    setMotionDescription(q.description);
    setMotionCategory(q.category);
    setMotionType(q.type);
    setMotionQuorum(q.quorumRequiredPercent);
    setMotionStatuteRef(q.statuteArticleRef || '');
    setMotionAgendaOrder(q.agendaOrder !== undefined ? String(q.agendaOrder) : '1');
    setCustomOptions(q.options.map((o) => o.text));
    setNewOptionInput('');
    setIsMotionModalOpen(true);
  };

  const handleSaveMotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setMotionModalError(null);
    setActionError(null);
    if (!motionTitle.trim() || !motionDescription.trim()) {
      setMotionModalError('Motion title and description are required.');
      return;
    }

    let options: VotingOption[] = [];
    if (motionType === 'yes_no_abstain') {
      options = [
        { id: 'opt-yes', text: 'Ja / Setuju / In Favor', votesWeighted: 0, ballotCount: 0 },
        { id: 'opt-no', text: 'Nein / Menolak / Reject', votesWeighted: 0, ballotCount: 0 },
        { id: 'opt-abstain', text: 'Enthaltung / Abstain', votesWeighted: 0, ballotCount: 0 }
      ];
    } else {
      const cleaned = customOptions.map((o) => o.trim()).filter(Boolean);
      if (cleaned.length < 2 || cleaned.length > 20) {
        setMotionModalError('Multiple-choice motions must define between 2 and 20 options.');
        return;
      }
      options = cleaned.map((text, idx) => ({
        id: `opt-${idx + 1}`,
        text,
        votesWeighted: 0,
        ballotCount: 0
      }));
    }

    if (isMutatingRef.current) return;
    isMutatingRef.current = true;
    setIsMutating(true);
    try {
      const parsedOrder = Number(motionAgendaOrder);
      await saveAssemblyQuestion(
        {
          id: editingMotion?.id || `ga-q-${Date.now()}`,
          title: motionTitle.trim(),
          description: motionDescription.trim(),
          category: motionCategory,
          status: editingMotion ? (editingMotion.status === 'closed' ? 'closed' : 'draft') : 'draft',
          type: motionType,
          options,
          totalVotesWeighted: editingMotion?.totalVotesWeighted ?? 0,
          totalBallots: editingMotion?.totalBallots ?? 0,
          agendaOrder: Number.isFinite(parsedOrder) ? parsedOrder : undefined,
          createdAt: editingMotion?.createdAt || new Date().toISOString(),
          createdBy: editingMotion?.createdBy || actorName,
          quorumRequiredPercent: motionQuorum,
          statuteArticleRef: motionStatuteRef.trim() || undefined
        },
        !editingMotion
      );
      setIsMotionModalOpen(false);
      setMotionModalError(null);
      showSuccess(editingMotion ? 'Draft motion updated.' : 'New draft motion prepared.');
    } catch (err) {
      setMotionModalError(formatFirestoreError(err, 'Failed to save assembly motion.'));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const handlePlaceOnFloor = async (q: AssemblyQuestion) => {
    if (isMutatingRef.current) return;
    if (sessionLoading) {
      setActionError('Please wait for the General Assembly session status to finish loading.');
      return;
    }
    if (
      q.status === 'closed' &&
      !window.confirm(
        `Re-open "${q.title}" onto the floor? Existing member ballots in /ballots/{uid} remain immutable.`
      )
    ) {
      return;
    }

    setActionError(null);
    isMutatingRef.current = true;
    setIsMutating(true);
    try {
      await ensureGaSessionExists();
      await placeMotionOnFloor(q.id, questions);
      showSuccess(`Motion "${q.title}" is now ON FLOOR for voting.`);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to place motion on floor.'));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const handleCloseMotion = async (q: AssemblyQuestion) => {
    if (isMutatingRef.current) return;
    setActionError(null);
    isMutatingRef.current = true;
    setIsMutating(true);
    try {
      const authoritativeBallots = await fetchQuestionBallotsFromServer(q.id);
      await closeMotionWithFinalResults(q.id, authoritativeBallots, q.options, actorName, true);
      showSuccess(
        `Motion "${q.title}" closed with ${authoritativeBallots.length} ballot(s) tallied into finalResults.`
      );
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to close assembly motion.'));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const handleDeleteMotion = async (q: AssemblyQuestion) => {
    if (isMutatingRef.current) return;
    if (!window.confirm(`Delete assembly motion "${q.title}"?`)) return;
    setActionError(null);
    isMutatingRef.current = true;
    setIsMutating(true);
    try {
      await deleteAssemblyQuestion(q.id);
      showSuccess(`Deleted motion "${q.title}".`);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to delete motion.'));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const handleRespondInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answeringInquiry || isMutatingRef.current) return;
    if (!boardAnswerText.trim()) {
      setInquiryModalError('Please enter an official board response before publishing.');
      return;
    }
    setInquiryModalError(null);
    setActionError(null);
    isMutatingRef.current = true;
    setIsMutating(true);
    try {
      const nextStatus =
        answeringInquiry.status === 'agenda_item' ? 'agenda_item' : 'answered';
      await respondToBoardInquiry(
        answeringInquiry.id,
        {
          answeredBy: actorName,
          answeredAt: new Date().toISOString(),
          responseText: boardAnswerText.trim()
        },
        nextStatus
      );
      setAnsweringInquiry(null);
      setBoardAnswerText('');
      setInquiryModalError(null);
      showSuccess('Official board response published.');
    } catch (err) {
      setInquiryModalError(formatFirestoreError(err, 'Failed to publish board response.'));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const handleConvertInquiry = async (inq: BoardInquiry) => {
    if (isMutatingRef.current) return;
    setActionError(null);
    isMutatingRef.current = true;
    setIsMutating(true);
    try {
      await convertInquiryToMotion(inq, actorName, {
        status: 'draft',
        quorumRequiredPercent: 50,
        statuteArticleRef: 'Art. 67 ZGB (Mitgliederantrag an die Versammlung)'
      });
      showSuccess(`Escalated inquiry "${inq.title}" into a draft assembly motion.`);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to convert inquiry to motion.'));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const handleDeleteInquiry = async (inq: BoardInquiry) => {
    if (isMutatingRef.current) return;
    if (!window.confirm(`Delete board inquiry "${inq.title}"?`)) return;
    setActionError(null);
    isMutatingRef.current = true;
    setIsMutating(true);
    try {
      await deleteBoardInquiry(inq.id);
      showSuccess(`Deleted inquiry "${inq.title}".`);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to delete inquiry.'));
    } finally {
      isMutatingRef.current = false;
      setIsMutating(false);
    }
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const normalizedStatus = q.status;
      const matchStatus = motionStatusFilter === 'all' || normalizedStatus === motionStatusFilter;
      const matchCategory =
        motionCategoryFilter === 'all' || q.category === motionCategoryFilter;
      return matchStatus && matchCategory;
    });
  }, [questions, motionStatusFilter, motionCategoryFilter]);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const matchStatus = inquiryStatusFilter === 'all' || inq.status === inquiryStatusFilter;
      const matchCat = inquiryCategoryFilter === 'all' || inq.category === inquiryCategoryFilter;
      return matchStatus && matchCat;
    });
  }, [inquiries, inquiryStatusFilter, inquiryCategoryFilter]);

  return (
    <div className="space-y-8">
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {(loadError || actionError) && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{loadError || actionError}</span>
        </div>
      )}

      {/* SECTION 1: GA SESSION CONTROL & VOTER ROLL CERTIFICATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Session Control Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6eeff] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#eff3ff] text-[#006191] flex items-center justify-center">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#121c2a]">
                  General Assembly Chamber Control
                </h2>
                <p className="text-xs text-[#566771]">
                  Controls <code className="font-mono">/siteConfig/gaSession</code> live voting access
                </p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                gaSession?.isOpen
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              {gaSession?.isOpen ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Chamber OPEN</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Chamber CLOSED</span>
                </>
              )}
            </span>
          </div>

          <form onSubmit={(e) => void handleSaveSessionMetadata(e)} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-[#121c2a] uppercase mb-1">
                Assembly Session Title
              </label>
              <input
                type="text"
                required
                value={sessionTitleDraft}
                onChange={(e) => setSessionTitleDraft(e.target.value)}
                className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#121c2a] uppercase mb-1">
                  Scheduled Date
                </label>
                <input
                  type="text"
                  required
                  value={scheduledDateDraft}
                  onChange={(e) => setScheduledDateDraft(e.target.value)}
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#121c2a] uppercase mb-1">
                  Location / Venue
                </label>
                <input
                  type="text"
                  value={locationDraft}
                  onChange={(e) => setLocationDraft(e.target.value)}
                  placeholder="Zürich, Schweiz"
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg outline-none focus:border-[#006191]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#e6eeff]">
              <button
                type="submit"
                disabled={isMutating || sessionLoading}
                className="px-4 py-2 border border-[#bec7d2] rounded-lg font-bold text-[#121c2a] hover:bg-gray-50 disabled:opacity-60 cursor-pointer"
              >
                Save Session Details
              </button>

              <button
                type="button"
                disabled={isMutating || sessionLoading}
                onClick={() => void handleToggleGaSession()}
                className={`px-4 py-2 rounded-lg font-bold text-white shadow-xs disabled:opacity-60 cursor-pointer inline-flex items-center gap-1.5 ${
                  gaSession?.isOpen
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {gaSession?.isOpen ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>End Day &amp; Close GA Portal</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Open GA Portal for Assembly Day</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Voter Roll Certification Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-[#e6eeff] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#006191]" />
                <h3 className="text-base font-bold text-[#121c2a]">{t.admin.voterRollTitle}</h3>
              </div>
              {voterRollStats.pendingOrMismatchCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                  {voterRollStats.pendingOrMismatchCount} {t.admin.voteWeightMismatch}
                </span>
              )}
            </div>

            <p className="text-xs text-[#566771] leading-relaxed">
              Certifies <code className="font-mono">verifiedVoteWeight</code> on member documents
              using <code className="font-mono">calculateVotingPower()</code> so Firestore security
              rules allow eligible members to cast ballots.
            </p>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-[#f9f9ff] rounded-xl border border-[#e6eeff]">
                <span className="text-[11px] text-[#566771] block">Eligible Voters</span>
                <span className="text-lg font-bold text-[#121c2a]">
                  {voterRollStats.eligibleCount} / {voterRollStats.totalMembers}
                </span>
              </div>
              <div className="p-3 bg-[#f9f9ff] rounded-xl border border-[#e6eeff]">
                <span className="text-[11px] text-[#566771] block">Certified Up-to-Date</span>
                <span className="text-lg font-bold text-emerald-700">
                  {voterRollStats.certifiedCount} / {voterRollStats.totalMembers}
                </span>
              </div>
              <div className="p-3 bg-[#f9f9ff] rounded-xl border border-[#e6eeff] col-span-2 flex items-center justify-between">
                <span className="text-[11px] text-[#566771]">Total Voting Power (Expected / Certified)</span>
                <span className="font-bold text-[#006191]">
                  {voterRollStats.totalExpectedWeight} / {voterRollStats.totalCertifiedWeight} votes
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isMutating || membersLoading || members.length === 0}
            onClick={() => void handleCertifyVoterRoll()}
            className="w-full py-2.5 px-4 bg-[#006191] hover:bg-[#007bb6] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-60 cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isMutating ? 'animate-spin' : ''}`} />
            <span>{t.admin.certifyVoterRoll}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: ASSEMBLY MOTIONS MODERATION */}
      <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e6eeff] pb-4">
          <div>
            <h3 className="text-lg font-bold text-[#121c2a] flex items-center gap-2">
              <Vote className="w-5 h-5 text-[#006191]" />
              <span>Assembly Motions &amp; Floor Moderation ({questions.length})</span>
            </h3>
            <p className="text-xs text-[#566771] mt-0.5">
              Prepare draft motions, raise one motion onto the floor at a time, and freeze final
              ballot tallies.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateMotionModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#006191] hover:bg-[#007bb6] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Prepare / Draft Question</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            value={motionStatusFilter}
            onChange={(e) => setMotionStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg font-semibold"
          >
            <option value="all">All Statuses</option>
            <option value="on_floor">On Floor (Live)</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={motionCategoryFilter}
            onChange={(e) => setMotionCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg font-semibold"
          >
            <option value="all">All Categories</option>
            {QUESTION_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {questionsLoading ? (
          <div className="py-8 text-center text-xs text-[#566771]">Loading motions...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-[#bec7d2]/60 rounded-xl text-xs text-[#566771]">
            No assembly motions match the selected filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const normalizedStatus = q.status;
              const liveBallots = ballotsByQid[q.id];
              const isBallotsLoading = Boolean(ballotsLoadingByQid[q.id]);
              const ballotsError = ballotsErrorByQid[q.id] || null;
              const hasLoadedBallots = Array.isArray(liveBallots);
              const isExpanded = expandedAuditQid === q.id;

              const optionWeightMap: Record<string, number> = {};
              const optionCountMap: Record<string, number> = {};
              if (normalizedStatus === 'on_floor' && Array.isArray(liveBallots)) {
                for (const b of liveBallots) {
                  optionWeightMap[b.votedOptionId] =
                    (optionWeightMap[b.votedOptionId] || 0) + (b.voteWeight || 0);
                  optionCountMap[b.votedOptionId] = (optionCountMap[b.votedOptionId] || 0) + 1;
                }
              }

              const totalWeight =
                normalizedStatus === 'on_floor' && Array.isArray(liveBallots)
                  ? liveBallots.reduce((sum, b) => sum + (b.voteWeight || 0), 0)
                  : q.finalResults?.totalWeight ?? q.totalVotesWeighted;
              const totalBallots =
                normalizedStatus === 'on_floor' && Array.isArray(liveBallots)
                  ? liveBallots.length
                  : q.finalResults?.totalBallots ?? q.totalBallots;

              return (
                <div
                  key={q.id}
                  data-testid={`assembly-motion-card-${q.id}`}
                  className={`p-5 rounded-xl border ${
                    normalizedStatus === 'on_floor'
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-[#bec7d2]/70 bg-[#f9f9ff]'
                  } space-y-3`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            normalizedStatus === 'on_floor'
                              ? 'bg-emerald-600 text-white'
                              : normalizedStatus === 'closed'
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {normalizedStatus === 'on_floor'
                            ? 'ON FLOOR'
                            : normalizedStatus.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-semibold text-[#006191] bg-[#eff3ff] px-2 py-0.5 rounded">
                          {q.category}
                        </span>
                        {q.statuteArticleRef && (
                          <span className="text-[11px] text-[#566771]">{q.statuteArticleRef}</span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-[#121c2a]">{q.title}</h4>
                      <p className="text-xs text-[#3f4850] leading-relaxed">{q.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
                      {normalizedStatus === 'draft' && (
                        <>
                          <button
                            type="button"
                            disabled={isMutating || sessionLoading}
                            onClick={() => void handlePlaceOnFloor(q)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer inline-flex items-center gap-1 disabled:opacity-60"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Raise to Floor &amp; Open Vote</span>
                          </button>
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() => openEditMotionModal(q)}
                            className="px-3 py-1.5 border border-[#bec7d2] bg-white hover:bg-gray-50 text-[#121c2a] font-semibold rounded-lg cursor-pointer inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </>
                      )}

                      {normalizedStatus === 'on_floor' && (
                        <button
                          type="button"
                          disabled={
                            isMutating ||
                            isBallotsLoading ||
                            !hasLoadedBallots ||
                            Boolean(ballotsError)
                          }
                          onClick={() => void handleCloseMotion(q)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer inline-flex items-center gap-1 disabled:opacity-60"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {isBallotsLoading || (!hasLoadedBallots && !ballotsError)
                              ? 'Loading Ballots...'
                              : 'Close Vote on Motion'}
                          </span>
                        </button>
                      )}

                      {normalizedStatus === 'closed' && (
                        <button
                          type="button"
                          disabled={isMutating || sessionLoading}
                          onClick={() => void handlePlaceOnFloor(q)}
                          className="px-3 py-1.5 border border-[#006191] text-[#006191] bg-white hover:bg-[#eff3ff] font-bold rounded-lg cursor-pointer inline-flex items-center gap-1 disabled:opacity-60"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Re-open Floor Vote</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => void handleDeleteMotion(q)}
                        className="p-1.5 text-[#ba1a1a] hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Delete Motion"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {ballotsError && (
                    <div
                      role="alert"
                      className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>Unable to load live ballots: {ballotsError}</span>
                    </div>
                  )}

                  {/* Option Tallies */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                    {q.options.map((opt) => {
                      const optWeight =
                        normalizedStatus === 'on_floor' && Array.isArray(liveBallots)
                          ? optionWeightMap[opt.id] || 0
                          : q.finalResults?.optionTotals?.[opt.id] ?? opt.votesWeighted;
                      const pct =
                        totalWeight > 0 ? Math.round((optWeight / totalWeight) * 100) : 0;

                      return (
                        <div
                          key={opt.id}
                          className="p-2.5 bg-white rounded-lg border border-[#e6eeff] text-xs"
                        >
                          <div className="flex justify-between font-semibold text-[#121c2a] mb-1">
                            <span className="truncate">{opt.text}</span>
                            <span>
                              {optWeight} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#e6eeff] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#006191] rounded-full"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#566771] pt-1">
                    <span>
                      Total: <strong>{totalWeight}</strong> weighted votes from{' '}
                      <strong>{totalBallots}</strong> ballot(s) • Quorum ≥ {q.quorumRequiredPercent}%
                    </span>

                    <button
                      type="button"
                      onClick={() => setExpandedAuditQid(isExpanded ? null : q.id)}
                      className="inline-flex items-center gap-1 font-bold text-[#006191] hover:underline cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>{isExpanded ? 'Hide Ballot Audit Log' : 'Inspect Ballot Audit Log'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 p-3 bg-white rounded-xl border border-[#bec7d2]/60 text-xs space-y-2">
                      {isBallotsLoading ? (
                        <p className="text-[#566771]">Loading /ballots subcollection...</p>
                      ) : !liveBallots || liveBallots.length === 0 ? (
                        <p className="text-[#566771]">No ballots recorded in Firestore yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="border-b border-[#e6eeff] text-[#566771] uppercase">
                                <th className="py-1.5 pr-3">Member</th>
                                <th className="py-1.5 pr-3">Code</th>
                                <th className="py-1.5 pr-3">Option</th>
                                <th className="py-1.5 pr-3">Weight</th>
                                <th className="py-1.5">Timestamp</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f1f5f9]">
                              {liveBallots.map((b) => (
                                <tr key={b.id}>
                                  <td className="py-1.5 pr-3 font-semibold text-[#121c2a]">
                                    {b.memberName}
                                  </td>
                                  <td className="py-1.5 pr-3 font-mono text-[#006191]">
                                    {b.memberCode}
                                  </td>
                                  <td className="py-1.5 pr-3">{b.votedOptionId}</td>
                                  <td className="py-1.5 pr-3 font-bold">{b.voteWeight}</td>
                                  <td className="py-1.5 text-[#566771]">{b.timestamp}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: BOARD INQUIRIES MODERATION */}
      <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6eeff] pb-4">
          <div>
            <h3 className="text-lg font-bold text-[#121c2a] flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#006191]" />
              <span>Board Inquiries &amp; Art. 67 ZGB Interpellations ({inquiries.length})</span>
            </h3>
            <p className="text-xs text-[#566771] mt-0.5">
              Publish official board answers or escalate member inquiries into assembly voting motions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={inquiryStatusFilter}
              onChange={(e) => setInquiryStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="answered">Answered</option>
              <option value="agenda_item">Agenda Item</option>
            </select>

            <select
              value={inquiryCategoryFilter}
              onChange={(e) => setInquiryCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg font-semibold"
            >
              <option value="all">All Categories</option>
              {(
                [
                  'Finance & Audit',
                  'Programs & Tarbiyah',
                  'Mosque & Facility',
                  'Statute & Governance',
                  'General'
                ] as BoardInquiryCategory[]
              ).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {inquiriesLoading ? (
          <div className="py-8 text-center text-xs text-[#566771]">Loading board inquiries...</div>
        ) : filteredInquiries.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-[#bec7d2]/60 rounded-xl text-xs text-[#566771]">
            No board inquiries match the current filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInquiries.map((inq) => (
              <div
                key={inq.id}
                className="p-4 rounded-xl border border-[#bec7d2]/70 bg-[#f9f9ff] space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-[#eff3ff] text-[#006191] text-[10px] font-bold uppercase">
                        {inq.status.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] font-semibold text-[#566771]">
                        {inq.category}
                      </span>
                      <span className="text-[11px] font-mono text-[#6f7881]">
                        {inq.authorName} ({inq.authorMemberCode})
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-[#121c2a]">{inq.title}</h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => {
                        setInquiryModalError(null);
                        setAnsweringInquiry(inq);
                        setBoardAnswerText(inq.boardResponse?.responseText || '');
                      }}
                      className="px-3 py-1.5 bg-[#006191] hover:bg-[#007bb6] text-white font-bold rounded-lg cursor-pointer"
                    >
                      {inq.boardResponse ? 'Edit Board Reply' : 'Answer Question'}
                    </button>

                    {!inq.convertedToQuestionId && (
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => void handleConvertInquiry(inq)}
                        className="px-3 py-1.5 border border-[#006191] text-[#006191] bg-white hover:bg-[#eff3ff] font-bold rounded-lg cursor-pointer"
                      >
                        + Convert to Assembly Vote
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => void handleDeleteInquiry(inq)}
                      className="p-1.5 text-[#ba1a1a] hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Delete Inquiry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#3f4850] leading-relaxed">{inq.content}</p>

                {inq.boardResponse && (
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs">
                    <p className="font-bold text-emerald-900 mb-0.5">
                      Board Reply by {inq.boardResponse.answeredBy}
                    </p>
                    <p className="text-[#3f4850]">{inq.boardResponse.responseText}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MOTION MODAL */}
      {isMotionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#bec7d2] relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsMotionModalOpen(false)}
              className="absolute top-4 right-4 text-[#566771] hover:text-[#121c2a] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#121c2a] mb-1">
              {editingMotion ? 'Edit Draft Motion' : 'Prepare New Assembly Motion'}
            </h3>
            <p className="text-xs text-[#566771] mb-4">
              Draft motions can be reviewed before raising onto the floor for live member voting.
            </p>

            {motionModalError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{motionModalError}</span>
              </div>
            )}

            <form onSubmit={(e) => void handleSaveMotion(e)} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="motion-title" className="block font-bold text-[#121c2a] mb-1">
                  Motion Title *
                </label>
                <input
                  id="motion-title"
                  name="title"
                  type="text"
                  required
                  value={motionTitle}
                  onChange={(e) => setMotionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#121c2a] mb-1">Category</label>
                  <select
                    value={motionCategory}
                    onChange={(e) => setMotionCategory(e.target.value as QuestionCategory)}
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg bg-white"
                  >
                    {QUESTION_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#121c2a] mb-1">Voting Format</label>
                  <select
                    value={motionType}
                    onChange={(e) => setMotionType(e.target.value as QuestionType)}
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg bg-white"
                  >
                    <option value="yes_no_abstain">Ja / Nein / Enthaltung</option>
                    <option value="multiple_choice">Multiple Choice</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#121c2a] mb-1">Quorum (%)</label>
                  <select
                    value={motionQuorum}
                    onChange={(e) => setMotionQuorum(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg bg-white"
                  >
                    <option value={50}>Simple Majority (&gt; 50%)</option>
                    <option value={66.7}>Qualified 2/3 (≥ 66.7%)</option>
                    <option value={75}>Three-Quarters (≥ 75%)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#121c2a] mb-1">Agenda Order</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={motionAgendaOrder}
                    onChange={(e) => setMotionAgendaOrder(e.target.value)}
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#121c2a] mb-1">Statute Ref</label>
                  <input
                    type="text"
                    value={motionStatuteRef}
                    onChange={(e) => setMotionStatuteRef(e.target.value)}
                    className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#121c2a] mb-1">
                  Resolution Explanation *
                </label>
                <textarea
                  rows={4}
                  required
                  value={motionDescription}
                  onChange={(e) => setMotionDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg"
                />
              </div>

              {motionType === 'multiple_choice' && (
                <div className="p-3 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl space-y-2">
                  <label className="block font-bold text-[#121c2a]">
                    Multiple Choice Options (2–20)
                  </label>
                  {customOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...customOptions];
                          next[idx] = e.target.value;
                          setCustomOptions(next);
                        }}
                        className="flex-1 px-3 py-1.5 border border-[#bec7d2] rounded-md"
                      />
                      {customOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            setCustomOptions(customOptions.filter((_, i) => i !== idx))
                          }
                          className="text-rose-600 p-1 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {customOptions.length < 20 && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newOptionInput}
                        onChange={(e) => setNewOptionInput(e.target.value)}
                        placeholder="Add another option..."
                        className="flex-1 px-3 py-1.5 border border-[#bec7d2] rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newOptionInput.trim()) {
                            setCustomOptions([...customOptions, newOptionInput.trim()]);
                            setNewOptionInput('');
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 font-bold rounded-md cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e6eeff]">
                <button
                  type="button"
                  onClick={() => setIsMotionModalOpen(false)}
                  className="px-4 py-2 border border-[#bec7d2] rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMutating}
                  className="px-5 py-2 bg-[#006191] text-white font-bold rounded-lg hover:bg-[#007bb6] disabled:opacity-60 cursor-pointer"
                >
                  {editingMotion ? 'Save Draft Changes' : 'Save Draft Motion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOARD RESPONSE MODAL */}
      {answeringInquiry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#bec7d2] relative">
            <button
              type="button"
              onClick={() => setAnsweringInquiry(null)}
              className="absolute top-4 right-4 text-[#566771] hover:text-[#121c2a] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-[#121c2a] mb-1">Official Board Response</h3>
            <p className="text-xs text-[#566771] mb-4 italic">
              “{answeringInquiry.title}” — {answeringInquiry.authorName}
            </p>

            {inquiryModalError && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{inquiryModalError}</span>
              </div>
            )}

            <form onSubmit={(e) => void handleRespondInquiry(e)} className="space-y-4 text-xs">
              <textarea
                rows={5}
                required
                value={boardAnswerText}
                onChange={(e) => setBoardAnswerText(e.target.value)}
                placeholder="Enter official board clarification or resolution..."
                className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAnsweringInquiry(null)}
                  className="px-4 py-2 border border-[#bec7d2] rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMutating}
                  className="px-4 py-2 bg-[#006191] text-white font-bold rounded-lg hover:bg-[#007bb6] disabled:opacity-60 cursor-pointer"
                >
                  Publish Board Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
