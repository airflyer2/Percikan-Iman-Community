import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AssemblyQuestion,
  BoardInquiry,
  BoardInquiryCategory,
  CastBallot,
  GASessionState
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import {
  castMemberBallot,
  createBoardInquiry,
  subscribeAssemblyQuestions,
  subscribeBoardInquiries,
  subscribeGaSession,
  subscribeInquiryUpvotes,
  subscribeQuestionBallots,
  toggleInquiryUpvote
} from '../lib/firestoreAssembly';
import { formatFirestoreError } from '../lib/firestoreContent';
import { calculateVotingPower, CURRENT_ASSEMBLY_YEAR, MINIMUM_VOTING_AGE } from '../utils/votingPower';
import {
  Vote,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  Lock,
  MessageSquare,
  Plus,
  ThumbsUp,
  Scale,
  BookOpen,
  Filter,
  Check,
  X,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BarChart3,
  FileText
} from 'lucide-react';

interface GeneralAssemblyViewProps {
  onOpenStatuten?: () => void;
}

export const GeneralAssemblyView: React.FC<GeneralAssemblyViewProps> = ({
  onOpenStatuten
}) => {
  const { authStatus, currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Live Firestore state
  const [gaSessionState, setGaSessionState] = useState<GASessionState | null>(null);
  const [gaSessionLoading, setGaSessionLoading] = useState(true);

  const [questions, setQuestions] = useState<AssemblyQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  const [inquiries, setInquiries] = useState<BoardInquiry[]>([]);
  const [ballotsByQid, setBallotsByQid] = useState<Record<string, CastBallot[]>>({});
  const [upvoteStateByInq, setUpvoteStateByInq] = useState<
    Record<string, { count: number; hasUpvoted: boolean }>
  >({});

  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'motions' | 'inquiries' | 'rules'>('motions');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'on_floor' | 'draft' | 'closed'>('all');
  const [inquiryCategoryFilter, setInquiryCategoryFilter] = useState<string>('all');

  // Voting Modal State
  const [selectedQuestionForVote, setSelectedQuestionForVote] = useState<AssemblyQuestion | null>(null);
  const [chosenOptionId, setChosenOptionId] = useState<string>('');
  const [voteConfirmed, setVoteConfirmed] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [showBallotSuccess, setShowBallotSuccess] = useState(false);

  // Member: Pose Question to Board Modal State
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryTitle, setInquiryTitle] = useState('');
  const [inquiryContent, setInquiryContent] = useState('');
  const [inquiryCategory, setInquiryCategory] = useState<BoardInquiryCategory>('Programs & Tarbiyah');
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [inquiryError, setInquiryError] = useState<string | null>(null);
  const [inquirySuccessMsg, setInquirySuccessMsg] = useState(false);

  // Synchronous concurrency & timer guards
  const isSubmittingVoteRef = useRef(false);
  const isSubmittingInquiryRef = useRef(false);
  const upvotingIdsRef = useRef<Set<string>>(new Set());
  const ballotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inquiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (ballotTimerRef.current) clearTimeout(ballotTimerRef.current);
      if (inquiryTimerRef.current) clearTimeout(inquiryTimerRef.current);
    };
  }, []);

  const closeVoteModal = () => {
    if (ballotTimerRef.current) {
      clearTimeout(ballotTimerRef.current);
      ballotTimerRef.current = null;
    }
    setShowBallotSuccess(false);
    setSelectedQuestionForVote(null);
    setChosenOptionId('');
    setVoteConfirmed(false);
    setVoteError(null);
  };

  const closeInquiryModal = () => {
    if (inquiryTimerRef.current) {
      clearTimeout(inquiryTimerRef.current);
      inquiryTimerRef.current = null;
    }
    setInquirySuccessMsg(false);
    setIsInquiryModalOpen(false);
    setInquiryError(null);
  };

  // Expanded card IDs for viewing audit log ballots
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  // Gate all GA Firestore subscriptions strictly on authenticated user
  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser?.uid) {
      setGaSessionState(null);
      setQuestions([]);
      setInquiries([]);
      setBallotsByQid({});
      setUpvoteStateByInq({});
      setGaSessionLoading(false);
      setQuestionsLoading(false);
      return;
    }

    setGaSessionLoading(true);
    setQuestionsLoading(true);
    setLoadError(null);

    const unsubSession = subscribeGaSession((res) => {
      setGaSessionState(res.data);
      setGaSessionLoading(res.loading);
      if (res.error) setLoadError(res.error);
    });

    const unsubQuestions = subscribeAssemblyQuestions((res) => {
      setQuestions(res.data);
      setQuestionsLoading(res.loading);
      if (res.error) setLoadError(res.error);
    });

    const unsubInquiries = subscribeBoardInquiries((res) => {
      setInquiries(res.data);
      if (res.error) setLoadError(res.error);
    });

    return () => {
      unsubSession();
      unsubQuestions();
      unsubInquiries();
    };
  }, [authStatus, currentUser?.uid]);

  // Subscribe to /ballots subcollection for on_floor motions, active floor motion, and expanded audit logs
  const subscribedBallotIds = useMemo(() => {
    const ids = new Set<string>();
    for (const q of questions) {
      if (q.status === 'on_floor') {
        ids.add(q.id);
      }
    }
    if (gaSessionState?.activeQuestionId) ids.add(gaSessionState.activeQuestionId);
    if (expandedQuestionId) ids.add(expandedQuestionId);
    return Array.from(ids);
  }, [questions, gaSessionState?.activeQuestionId, expandedQuestionId]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser?.uid || subscribedBallotIds.length === 0) {
      return;
    }

    const unsubs = subscribedBallotIds.map((qid) =>
      subscribeQuestionBallots(qid, (res) => {
        setBallotsByQid((prev) => ({ ...prev, [qid]: res.data }));
        if (res.error) setLoadError(res.error);
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authStatus, currentUser?.uid, subscribedBallotIds.join('|')]);

  // Subscribe to /upvotes subcollection per board inquiry
  const inquiryIdsKey = useMemo(() => inquiries.map((i) => i.id).join('|'), [inquiries]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser?.uid || inquiries.length === 0) {
      return;
    }

    const unsubs = inquiries.map((inq) =>
      subscribeInquiryUpvotes(inq.id, currentUser.uid, (res) => {
        if (res.data) {
          setUpvoteStateByInq((prev) => ({
            ...prev,
            [inq.id]: res.data!
          }));
        }
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authStatus, currentUser?.uid, inquiryIdsKey]);

  const votingPower = useMemo(() => calculateVotingPower(currentUser), [currentUser]);

  const certifiedWeight = useMemo(() => {
    if (
      currentUser &&
      typeof currentUser.verifiedVoteWeight === 'number' &&
      Number.isInteger(currentUser.verifiedVoteWeight) &&
      currentUser.verifiedVoteWeight >= 1
    ) {
      return currentUser.verifiedVoteWeight;
    }
    return null;
  }, [currentUser]);

  const canCastBallot = Boolean(votingPower.isEligibleToVote && certifiedWeight !== null);

  const isActiveOrExemptMember = Boolean(
    currentUser &&
      (currentUser.membershipStatus === 'active' || currentUser.feeExemption?.isExempt)
  );

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      let matchStatus = true;
      if (filterStatus === 'on_floor') {
        matchStatus = q.status === 'on_floor';
      } else if (filterStatus === 'draft') {
        matchStatus = q.status === 'draft';
      } else if (filterStatus === 'closed') {
        matchStatus = q.status === 'closed';
      }
      const matchCat = filterCategory === 'all' ? true : q.category === filterCategory;
      return matchStatus && matchCat;
    });
  }, [questions, filterStatus, filterCategory]);

  // Filtered Inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (inquiryCategoryFilter === 'all') return true;
      return inq.category === inquiryCategoryFilter;
    });
  }, [inquiries, inquiryCategoryFilter]);

  // Handle Casting Ballot via firestoreAssembly
  const handleConfirmVote = async () => {
    if (isSubmittingVoteRef.current) return;
    if (!selectedQuestionForVote || !chosenOptionId || !currentUser?.uid) return;
    if (!votingPower.isEligibleToVote || certifiedWeight === null) return;

    const liveQuestion =
      questions.find((q) => q.id === selectedQuestionForVote.id) || selectedQuestionForVote;
    if (
      !gaSessionState?.isOpen ||
      liveQuestion.status !== 'on_floor' ||
      gaSessionState.activeQuestionId !== liveQuestion.id
    ) {
      setVoteError('This motion is no longer open on the General Assembly floor.');
      return;
    }

    const eligibleChildren = votingPower.persons
      .filter(
        (p) =>
          p.relation.toLowerCase().includes('son') ||
          p.relation.toLowerCase().includes('daughter') ||
          p.relation.toLowerCase().includes('child') ||
          p.relation.toLowerCase().includes('family')
      )
      .filter((p) => p.isEligible)
      .map((p) => p.name);

    const ineligibleChildren = votingPower.persons
      .filter((p) => !p.isEligible)
      .map((p) => p.name);

    isSubmittingVoteRef.current = true;
    setIsSubmittingVote(true);
    setVoteError(null);
    try {
      await castMemberBallot(selectedQuestionForVote.id, currentUser.uid, {
        memberName: currentUser.name,
        memberCode: currentUser.memberCode || 'PI-MEMBER',
        membershipCategory: currentUser.membershipCategory || 'personal',
        voteWeight: certifiedWeight,
        votedOptionId: chosenOptionId,
        timestamp: new Date().toISOString(),
        breakdown: {
          primaryEligible: true,
          spouseEligible: Boolean(currentUser.spouse?.name?.trim()),
          eligibleChildrenNames: eligibleChildren,
          ineligibleChildrenNames: ineligibleChildren
        }
      });

      setShowBallotSuccess(true);
      if (ballotTimerRef.current) clearTimeout(ballotTimerRef.current);
      ballotTimerRef.current = setTimeout(() => {
        ballotTimerRef.current = null;
        closeVoteModal();
      }, 1500);
    } catch (err) {
      setVoteError(formatFirestoreError(err, 'Failed to submit ballot.'));
    } finally {
      isSubmittingVoteRef.current = false;
      setIsSubmittingVote(false);
    }
  };

  // Handle Member Submit Inquiry via firestoreAssembly
  const handleSubmitInquiryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingInquiryRef.current) return;
    if (!inquiryTitle.trim() || !inquiryContent.trim() || !currentUser?.uid) return;

    isSubmittingInquiryRef.current = true;
    setIsSubmittingInquiry(true);
    setInquiryError(null);
    try {
      await createBoardInquiry({
        title: inquiryTitle.trim(),
        content: inquiryContent.trim(),
        category: inquiryCategory,
        authorUid: currentUser.uid,
        authorName: currentUser.name,
        authorMemberCode: currentUser.memberCode || 'PI-MEMBER',
        authorCategory: currentUser.membershipCategory || 'personal'
      });

      setInquirySuccessMsg(true);
      if (inquiryTimerRef.current) clearTimeout(inquiryTimerRef.current);
      inquiryTimerRef.current = setTimeout(() => {
        inquiryTimerRef.current = null;
        closeInquiryModal();
        setInquiryTitle('');
        setInquiryContent('');
      }, 1400);
    } catch (err) {
      setInquiryError(formatFirestoreError(err, 'Failed to submit board inquiry.'));
    } finally {
      isSubmittingInquiryRef.current = false;
      setIsSubmittingInquiry(false);
    }
  };

  const handleToggleUpvote = async (inq: BoardInquiry) => {
    if (!currentUser?.uid || upvotingIdsRef.current.has(inq.id)) return;
    upvotingIdsRef.current.add(inq.id);
    setActionError(null);
    const currentUpvote = upvoteStateByInq[inq.id];
    try {
      await toggleInquiryUpvote(inq.id, currentUser.uid, currentUpvote?.hasUpvoted);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Failed to update inquiry endorsement.'));
    } finally {
      upvotingIdsRef.current.delete(inq.id);
    }
  };

  // 1. Auth loading
  if (authStatus === 'loading') {
    return (
      <div className="bg-[#f9f9ff] min-h-screen flex items-center justify-center py-20">
        <div
          aria-busy="true"
          className="flex flex-col items-center gap-3 text-slate-600"
          role="status"
        >
          <div className="w-8 h-8 border-3 border-[#006191] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading General Assembly session...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated visitor gate (zero Firestore GA reads!)
  if (authStatus === 'unauthenticated' || !currentUser?.uid) {
    return (
      <div className="bg-[#f9f9ff] min-h-screen pb-24 pt-20">
        <div className="max-w-2xl mx-auto px-6 py-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#eff3ff] text-[#006191] flex items-center justify-center mx-auto mb-4 border border-[#d3e5f1]">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-serif text-[#121c2a] mb-2">
            General Assembly &amp; Member Voting Portal
          </h1>
          <p className="text-sm text-slate-600 mb-6 max-w-lg mx-auto leading-relaxed">
            Access to the Verein Percikan Iman General Assembly chamber, ballots, and board inquiries is restricted to authenticated association members.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/login', { state: { from: location } })}
              className="px-5 py-2.5 bg-[#006191] hover:bg-[#004f76] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Sign In to Enter Assembly
            </button>
            {onOpenStatuten && (
              <button
                type="button"
                onClick={onOpenStatuten}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                View Verein Statuten
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated GA data loading
  if (gaSessionLoading || questionsLoading) {
    return (
      <div className="bg-[#f9f9ff] min-h-screen flex items-center justify-center py-20">
        <div
          aria-busy="true"
          className="flex flex-col items-center gap-3 text-slate-600"
          role="status"
        >
          <div className="w-8 h-8 border-3 border-[#006191] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Synchronizing assembly floor...</p>
        </div>
      </div>
    );
  }

  // 4. Closed Chamber state (no isAdmin bypass — admins moderate via /admin/assembly)
  if (!gaSessionState?.isOpen) {
    return (
      <div className="bg-[#f9f9ff] min-h-screen pb-24 pt-20">
        <div className="max-w-2xl mx-auto px-6 py-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Lock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>Scheduled Date: {gaSessionState?.scheduledDate || '15. September 2026'}</span>
          </div>
          <h2 className="text-2xl font-bold font-serif text-[#121c2a] mb-2">
            General Assembly Chamber is Currently Closed
          </h2>
          <p className="text-sm text-slate-600 mb-6 max-w-lg mx-auto leading-relaxed">
            The General Assembly portal is closed outside official assembly sessions. The Board prepares motions in advance via the administration portal and opens the floor on the date of the General Assembly.
          </p>

          <div className="p-4 bg-[#f8fbfe] rounded-2xl border border-sky-100 text-xs text-slate-700 mb-6 text-left space-y-2.5 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Session Name:</span>
              <span>{gaSessionState?.sessionTitle || 'Ordentliche Generalversammlung'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Portal Status:</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px]">
                Pre-Session Preparation
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Your Family Voting Weight:</span>
              <span className="font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full text-[11px]">
                {certifiedWeight ?? votingPower.totalVotes}{' '}
                {(certifiedWeight ?? votingPower.totalVotes) === 1 ? 'Vote' : 'Votes'} (Age ≥ 16)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/member')}
              className="px-5 py-2.5 bg-[#006191] hover:bg-[#004f76] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              ← Return to Member Portal
            </button>
            {onOpenStatuten && (
              <button
                type="button"
                onClick={onOpenStatuten}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                View Verein Statuten
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f9f9ff] min-h-screen pb-24">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#003b59] to-[#006191] text-white pt-12 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-[1240px] mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-sky-200 text-xs font-semibold backdrop-blur-xs mb-3">
                <Vote className="w-3.5 h-3.5" />
                <span>Generalversammlung {CURRENT_ASSEMBLY_YEAR} • Swiss Verein Sovereign Body</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-serif">
                General Assembly &amp; Member Voting Portal
              </h1>
              <p className="mt-2 text-sky-100 max-w-2xl text-sm md:text-base leading-relaxed">
                The official legislative session of Verein Percikan Iman. Under Swiss Law (Art. 60–79 ZGB), members
                ratify resolutions, approve budgets, and directly shape community governance.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 flex flex-col gap-2 shrink-0">
              <div className="text-xs text-sky-200 font-medium">Statutory Legal Framework</div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Scale className="w-4 h-4 text-amber-300" />
                <span>Art. 64–68 ZGB &amp; Art. 12–16 Statuten</span>
              </div>
              {onOpenStatuten && (
                <button
                  type="button"
                  onClick={onOpenStatuten}
                  className="mt-1 text-xs text-sky-300 hover:text-white underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Read Official Verein Statuten</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-[1240px] mx-auto px-6 -mt-8 relative z-20">
        {(loadError || actionError) && (
          <div
            role="alert"
            className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError || actionError}</span>
          </div>
        )}

        {/* Voting Rights & Family Power Manifest Card */}
        <div className="bg-white rounded-2xl shadow-md border border-[#e2ecf5] p-6 mb-8 transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={`p-3.5 rounded-xl shrink-0 ${
                  canCastBallot
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {canCastBallot ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : (
                  <Lock className="w-7 h-7" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-[#121c2a]">
                    Your General Assembly Voting Standing
                  </h3>
                  {canCastBallot ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      {t.member.voteWeightVerifiedBadge}
                    </span>
                  ) : votingPower.isEligibleToVote ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                      {t.member.voteWeightPendingBadge}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      Voting Rights Locked
                    </span>
                  )}
                  {currentUser.membershipCategory === 'family' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                      Family Tier Rule: 1 Vote per person ≥ 16 yrs
                    </span>
                  )}
                </div>

                <p className="text-sm text-slate-600 mt-1">
                  {votingPower.summaryText}
                </p>

                {votingPower.isEligibleToVote &&
                  (certifiedWeight === null || certifiedWeight !== votingPower.totalVotes) && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <span>{t.member.voteWeightPendingNotice}</span>
                    </div>
                  )}

                {!votingPower.isEligibleToVote && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <strong>Voting is exclusive to active members:</strong> {votingPower.ineligibilityReason}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Voting Weight Counter */}
            <div className="flex items-center gap-4 bg-[#f0f6fa] p-4 rounded-xl border border-[#d6e5ef] shrink-0">
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Certified Votes
                </div>
                <div className="text-3xl font-extrabold text-[#006191]">
                  {certifiedWeight ?? 0}{' '}
                  <span className="text-sm font-normal text-slate-600">
                    {(certifiedWeight ?? 0) === 1 ? 'ballot' : 'ballots'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#006191] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {certifiedWeight ?? 0}
              </div>
            </div>
          </div>

          {/* Itemized Family Manifest (Shown for Family Category) */}
          {currentUser.membershipCategory === 'family' && votingPower.persons.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>Itemized Family Member Voting Rights Manifest (Age ≥ 16 Rule)</span>
                </h4>
                <span className="text-xs text-slate-500">
                  Cutoff Year: Born on or before {CURRENT_ASSEMBLY_YEAR - MINIMUM_VOTING_AGE} ({CURRENT_ASSEMBLY_YEAR})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {votingPower.persons.map((person, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                      person.isEligible
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50 border-slate-200 text-slate-600 opacity-75'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="font-bold truncate text-[13px]">{person.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {person.relation}
                        {person.age !== undefined && ` • ${person.age} yrs`}
                        {person.birthYear && ` (b. ${person.birthYear})`}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {person.isEligible ? (
                        <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-200 text-emerald-900 flex items-center gap-1">
                          <Check className="w-3 h-3" /> 1 Vote
                        </span>
                      ) : (
                        <span
                          className="px-2 py-0.5 rounded-full font-medium bg-slate-200 text-slate-700 flex items-center gap-1"
                          title={person.ineligibleReason}
                        >
                          <X className="w-3 h-3" /> Under 16
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab Selection Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 mb-6">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('motions')}
              className={`pb-3 font-semibold text-sm cursor-pointer transition-colors flex items-center gap-2 relative ${
                activeTab === 'motions'
                  ? 'text-[#006191] border-b-2 border-[#006191]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Vote className="w-4 h-4" />
              <span>Assembly Voting Motions</span>
              <span className="px-2 py-0.5 rounded-full bg-[#e1edf5] text-[#006191] text-xs font-bold">
                {questions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inquiries')}
              className={`pb-3 font-semibold text-sm cursor-pointer transition-colors flex items-center gap-2 relative ${
                activeTab === 'inquiries'
                  ? 'text-[#006191] border-b-2 border-[#006191]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Questions to the Board</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                {inquiries.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`pb-3 font-semibold text-sm cursor-pointer transition-colors flex items-center gap-2 relative ${
                activeTab === 'rules'
                  ? 'text-[#006191] border-b-2 border-[#006191]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Statutory Rules &amp; Quorum</span>
            </button>
          </div>

          {/* Action CTA (Member Inquiries only — Board moderation lives in /admin/assembly) */}
          <div className="pb-2 flex items-center gap-2">
            {activeTab === 'inquiries' && isActiveOrExemptMember && (
              <button
                type="button"
                onClick={() => {
                  if (inquiryTimerRef.current) {
                    clearTimeout(inquiryTimerRef.current);
                    inquiryTimerRef.current = null;
                  }
                  setInquirySuccessMsg(false);
                  setInquiryError(null);
                  setIsInquiryModalOpen(true);
                }}
                className="px-3.5 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ask Question to Board</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: ASSEMBLY VOTING MOTIONS */}
        {activeTab === 'motions' && (
          <div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-500 font-semibold flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Status:
                </span>
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-[#006191] text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({questions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('on_floor')}
                  className={`px-3 py-1 rounded-md font-medium cursor-pointer flex items-center gap-1.5 ${
                    filterStatus === 'on_floor'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active on Floor ({questions.filter((q) => q.status === 'on_floor').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('draft')}
                  className={`px-3 py-1 rounded-md font-medium cursor-pointer flex items-center gap-1.5 ${
                    filterStatus === 'draft'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-3 h-3 text-amber-500" />
                  Prepared Agenda ({questions.filter((q) => q.status === 'draft').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('closed')}
                  className={`px-3 py-1 rounded-md font-medium cursor-pointer ${
                    filterStatus === 'closed'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Concluded ({questions.filter((q) => q.status === 'closed').length})
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
                <span className="text-slate-500 font-semibold shrink-0">Category:</span>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#006191] cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="Budget & Financial">Budget &amp; Financial</option>
                  <option value="Statute Amendment">Statute Amendment</option>
                  <option value="Community Project">Community Project</option>
                  <option value="Board Election">Board Election</option>
                  <option value="General Resolution">General Resolution</option>
                </select>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {filteredQuestions.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                  <Vote className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h4 className="text-base font-bold text-slate-700">No questions found</h4>
                  <p className="text-xs text-slate-500 mt-1">Adjust your filters to see more assembly motions.</p>
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const liveBallots = ballotsByQid[q.id] || [];
                  const userBallot = liveBallots.find((b) => b.id === currentUser.uid);
                  const hasVoted = Boolean(userBallot);
                  const isExpanded = expandedQuestionId === q.id;

                  // Live tallies for on_floor vs frozen finalResults for closed
                  const optionWeightMap: Record<string, number> = {};
                  const optionCountMap: Record<string, number> = {};
                  if (q.status === 'on_floor') {
                    for (const b of liveBallots) {
                      optionWeightMap[b.votedOptionId] =
                        (optionWeightMap[b.votedOptionId] || 0) + (b.voteWeight || 0);
                      optionCountMap[b.votedOptionId] =
                        (optionCountMap[b.votedOptionId] || 0) + 1;
                    }
                  }

                  const totalWeight =
                    q.status === 'on_floor'
                      ? liveBallots.reduce((sum, b) => sum + (b.voteWeight || 0), 0)
                      : q.finalResults?.totalWeight ?? q.totalVotesWeighted;
                  const totalBallots =
                    q.status === 'on_floor'
                      ? liveBallots.length
                      : q.finalResults?.totalBallots ?? q.totalBallots;

                  return (
                    <div
                      key={q.id}
                      className={`bg-white rounded-2xl border transition-all ${
                        q.status === 'on_floor'
                          ? 'border-emerald-400 shadow-md ring-1 ring-emerald-300'
                          : q.status === 'draft'
                          ? 'border-amber-200 shadow-xs'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="p-6">
                        {/* Header Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {q.status === 'on_floor' && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Active on Floor (Voting Open)
                              </span>
                            )}
                            {q.status === 'draft' && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Prepared Agenda Item (Awaiting Floor Call)
                              </span>
                            )}
                            {q.status === 'closed' && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                                Resolution Concluded &amp; Certified
                              </span>
                            )}

                            {q.agendaOrder && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                                Item #{q.agendaOrder}
                              </span>
                            )}

                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f0f6fa] text-[#006191]">
                              {q.category}
                            </span>

                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Scale className="w-3 h-3 text-slate-400" />
                              {q.statuteArticleRef || 'Art. 12 Verein Statuten'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>Quorum: ≥ {q.quorumRequiredPercent}% Majority</span>
                            <span>•</span>
                            <span>Posed by {q.createdBy}</span>
                          </div>
                        </div>

                        {/* Question Title & Description */}
                        <h3 className="text-xl font-bold text-[#121c2a] font-serif mb-2">
                          {q.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed mb-6">
                          {q.description}
                        </p>

                        {/* Options & Results Display */}
                        <div className="space-y-3 mb-6">
                          {q.options.map((opt) => {
                            const optVotesWeighted =
                              q.status === 'on_floor'
                                ? optionWeightMap[opt.id] || 0
                                : q.finalResults?.optionTotals[opt.id] ?? opt.votesWeighted;
                            const optBallotCount =
                              q.status === 'on_floor'
                                ? optionCountMap[opt.id] || 0
                                : opt.ballotCount;
                            const percent =
                              totalWeight > 0
                                ? Math.round((optVotesWeighted / totalWeight) * 100)
                                : 0;
                            const isUserPick = userBallot?.votedOptionId === opt.id;

                            return (
                              <div
                                key={opt.id}
                                className={`p-3.5 rounded-xl border relative overflow-hidden transition-all ${
                                  isUserPick
                                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-400'
                                    : 'border-slate-200 bg-slate-50/70'
                                }`}
                              >
                                <div
                                  className="absolute top-0 bottom-0 left-0 bg-[#d9ecf7]/50 -z-0 transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                ></div>

                                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    {isUserPick && (
                                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-bold shrink-0">
                                        Your Family's Choice
                                      </span>
                                    )}
                                    <span className="text-sm font-semibold text-slate-800">
                                      {opt.text}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs shrink-0 self-end sm:self-auto">
                                    <span className="font-mono font-bold text-slate-800 text-sm">
                                      {optVotesWeighted} {optVotesWeighted === 1 ? 'vote' : 'votes'}
                                    </span>
                                    <span className="text-slate-500">
                                      ({optBallotCount} {optBallotCount === 1 ? 'ballot' : 'ballots'})
                                    </span>
                                    <span className="font-bold text-[#006191] bg-white px-2 py-0.5 rounded border border-slate-200 min-w-[42px] text-center">
                                      {percent}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer Status & Actions */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <BarChart3 className="w-4 h-4 text-[#006191]" />
                              <span>
                                Total Weighted Votes: <strong>{totalWeight}</strong>
                              </span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-4 h-4 text-slate-500" />
                              <span>
                                Ballots Cast: <strong>{totalBallots}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {/* View Ballots Breakdown Toggle */}
                            {(liveBallots.length > 0 || totalBallots > 0) && (
                              <button
                                type="button"
                                onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>Audit Log ({liveBallots.length || totalBallots})</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Voting Button or Deliberation Status */}
                            {q.status === 'on_floor' ? (
                              <>
                                {hasVoted ? (
                                  <div className="px-3.5 py-1.5 bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-300">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                    <span>
                                      Voted with {userBallot?.voteWeight} {userBallot?.voteWeight === 1 ? 'Vote' : 'Votes'}
                                    </span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (ballotTimerRef.current) {
                                        clearTimeout(ballotTimerRef.current);
                                        ballotTimerRef.current = null;
                                      }
                                      setShowBallotSuccess(false);
                                      setSelectedQuestionForVote(q);
                                      setChosenOptionId('');
                                      setVoteConfirmed(false);
                                      setVoteError(null);
                                    }}
                                    disabled={!canCastBallot || gaSessionState.activeQuestionId !== q.id}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                                      canCastBallot && gaSessionState.activeQuestionId === q.id
                                        ? 'bg-[#006191] hover:bg-[#004f76] text-white'
                                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                    }`}
                                  >
                                    <Vote className="w-4 h-4" />
                                    <span>
                                      Cast Ballot ({certifiedWeight ?? votingPower.totalVotes}{' '}
                                      {(certifiedWeight ?? votingPower.totalVotes) === 1 ? 'Vote' : 'Votes'})
                                    </span>
                                  </button>
                                )}
                              </>
                            ) : q.status === 'draft' ? (
                              <div className="px-3 py-1.5 bg-amber-50 text-amber-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-amber-200">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Awaiting Floor Call</span>
                              </div>
                            ) : (
                              <div className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Vote Concluded</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Audit Log / Ballots Inspection (Accordion) */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-100 bg-[#f8fbfe] -mx-6 -mb-6 p-6 rounded-b-2xl">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#006191]" />
                              <span>Verified Member Ballots &amp; Family Weight Allocation</span>
                            </h5>
                            {liveBallots.length === 0 ? (
                              <p className="text-xs text-slate-500">
                                {totalBallots > 0
                                  ? 'Certified totals are recorded above; no individual subcollection ballots in this archive.'
                                  : 'No individual ballots have been cast on this motion yet.'}
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {liveBallots.map((b) => (
                                  <div
                                    key={b.id}
                                    className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-800">{b.memberName}</span>{' '}
                                      <span className="text-slate-500 font-mono">({b.memberCode})</span> •{' '}
                                      <span className="text-purple-700 font-medium capitalize">
                                        {b.membershipCategory} Tier
                                      </span>
                                      {b.breakdown?.eligibleChildrenNames?.length > 0 && (
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                          Includes 16+ members:{' '}
                                          <span className="text-slate-700 font-medium">
                                            {b.breakdown.eligibleChildrenNames.join(', ')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="px-2 py-0.5 rounded bg-sky-100 text-[#006191] font-bold">
                                        Weight: {b.voteWeight}
                                      </span>
                                      <span className="text-slate-400 font-mono text-[11px]">
                                        {new Date(b.timestamp).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MEMBER INQUIRIES & QUESTIONS TO THE BOARD */}
        {activeTab === 'inquiries' && (
          <div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#121c2a] font-serif">
                  Member Inquiries &amp; Motions to the Board
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pursuant to Art. 67 ZGB, every active member has the right to pose questions to the Vorstand and
                  submit formal proposals for the assembly agenda.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold shrink-0">Filter:</span>
                <select
                  value={inquiryCategoryFilter}
                  onChange={(e) => setInquiryCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Topics</option>
                  <option value="Finance & Audit">Finance &amp; Audit</option>
                  <option value="Programs & Tarbiyah">Programs &amp; Tarbiyah</option>
                  <option value="Mosque & Facility">Mosque &amp; Facility</option>
                  <option value="Statute & Governance">Statute &amp; Governance</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* Inquiries Cards */}
            <div className="space-y-4">
              {filteredInquiries.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h4 className="text-base font-bold text-slate-700">No inquiries in this category</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Have a topic you want the board to address? Click "Ask Question to Board" above.
                  </p>
                </div>
              ) : (
                filteredInquiries.map((inq) => {
                  const upvoteInfo = upvoteStateByInq[inq.id];
                  const hasUpvoted = Boolean(upvoteInfo?.hasUpvoted);
                  const upvoteCount = upvoteInfo?.count ?? inq.upvoteCount ?? 0;

                  return (
                    <div
                      key={inq.id}
                      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-[#b8d6ec] transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                inq.status === 'answered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inq.status === 'agenda_item'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {inq.status === 'answered'
                                ? 'Answered by Board'
                                : inq.status === 'agenda_item'
                                ? 'Adopted to GA Agenda'
                                : 'Under Board Review'}
                            </span>

                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f0f6fa] text-[#006191]">
                              {inq.category}
                            </span>

                            <span className="text-xs text-slate-400">
                              Submitted {new Date(inq.submittedAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h4 className="text-base font-bold text-slate-900 font-serif mb-1.5">
                            {inq.title}
                          </h4>
                          <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
                            {inq.content}
                          </p>

                          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                            <span>
                              From: <strong>{inq.authorName}</strong> ({inq.authorMemberCode})
                            </span>
                            <span>•</span>
                            <span className="capitalize">{inq.authorCategory} Member</span>
                          </div>

                          {/* Official Board Response Callout */}
                          {inq.boardResponse && (
                            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-sky-50 to-[#eff7fb] border border-sky-200 text-xs">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 font-bold text-[#006191]">
                                  <ShieldCheck className="w-4 h-4 text-[#006191]" />
                                  <span>Official Board Response</span>
                                  <span className="text-slate-500 font-normal">
                                    • {inq.boardResponse.answeredBy}
                                  </span>
                                </div>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  {new Date(inq.boardResponse.answeredAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-slate-800 leading-relaxed">
                                {inq.boardResponse.responseText}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Side Actions (Endorse / Upvote only — moderation is in /admin/assembly) */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
                          <button
                            type="button"
                            disabled={!isActiveOrExemptMember}
                            onClick={() => void handleToggleUpvote(inq)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                              hasUpvoted
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="Endorse this question for the General Assembly"
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-amber-600 text-amber-600' : ''}`} />
                            <span>{upvoteCount}</span>
                            <span className="hidden sm:inline">Endorse</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STATUTORY RULES & QUORUM */}
        {activeTab === 'rules' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e6f1f8] text-[#006191] text-xs font-bold mb-2">
                <Scale className="w-3.5 h-3.5" />
                <span>Swiss Civil Code (Art. 60–79 ZGB) Statutory Guidelines</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-serif">
                General Assembly Voting Constitution &amp; Rights
              </h3>
              <p className="text-xs md:text-sm text-slate-600 mt-1 leading-relaxed">
                The Verein "Percikan Iman" is established under the Swiss Civil Code (Schweizerisches Zivilgesetzbuch).
                These provisions govern how ballots, family representations, and quorum calculations are legally executed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Voting Age &amp; Family Allocation Rule (Art. 12)</span>
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed mb-3">
                  Every active member who has attained their <strong>16th year of age (ab dem 16. Altersjahr)</strong> is
                  endowed with an active vote in the General Assembly.
                </p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Personal Tier:</span>
                    <span className="font-bold text-slate-900">1 Vote</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Family Tier Primary:</span>
                    <span className="font-bold text-slate-900">1 Vote</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Family Tier Registered Spouse:</span>
                    <span className="font-bold text-slate-900">1 Vote</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Each Child / Youth ≥ 16 Years:</span>
                    <span className="font-bold text-purple-700">+1 Vote per eligible youth</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Children under 16 Years:</span>
                    <span>0 Votes (Statutory non-voting minors)</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Exclusivity &amp; Membership Standing</span>
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed mb-3">
                  Voting is strictly exclusive to recognized members whose standing is in active compliance:
                </p>
                <ul className="text-xs text-slate-700 space-y-2 list-disc pl-4">
                  <li>
                    <strong>Active Members:</strong> Annual membership fee paid or verified.
                  </li>
                  <li>
                    <strong>Fee-Exempt Members:</strong> Retain 100% full voting rights voted annually by the GA.
                  </li>
                  <li>
                    <strong>Pending Payment / Relocated:</strong> Voting rights are suspended until formal settlement or
                    re-activation.
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-[#006191]" />
                  <span>Quorum &amp; Majority Thresholds</span>
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed mb-2">
                  Unless otherwise stipulated in the Statuten:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <span className="font-bold text-slate-900">Simple Majority (&gt; 50%):</span> Standard annual motions,
                    budget approvals, event schedules, and ordinary elections.
                  </div>
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <span className="font-bold text-slate-900">Qualified Majority (≥ 66.7% / 2/3):</span> Statute
                    amendments (Art. 79 ZGB) or dissolution of the Verein.
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  <span>Right to Interpellate (Art. 67 ZGB)</span>
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Every member has the statutory right to request information from the Board of Directors on the affairs
                  of the Verein and submit motions for deliberation at the annual assembly.
                </p>
                {onOpenStatuten && (
                  <button
                    type="button"
                    onClick={onOpenStatuten}
                    className="mt-4 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#006191]" />
                    <span>Open Full Verein Statuten Viewer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: CAST VOTE BALLOT MODAL */}
      {selectedQuestionForVote && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={closeVoteModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {showBallotSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-serif">
                  Ballot Successfully Recorded!
                </h3>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Your certified weight of <strong>{certifiedWeight ?? 0} votes</strong> has been tallied into the
                  official assembly quorum.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-xs text-[#006191] font-bold uppercase tracking-wider mb-2">
                  <Vote className="w-4 h-4" />
                  <span>Official General Assembly Ballot</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 font-serif mb-2">
                  {selectedQuestionForVote.title}
                </h3>
                <p className="text-xs text-slate-600 mb-4 line-clamp-2">
                  {selectedQuestionForVote.description}
                </p>

                {voteError && (
                  <div
                    role="alert"
                    className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{voteError}</span>
                  </div>
                )}

                {/* Certified Weight Confirmation Box */}
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-950 mb-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Certified Voting Weight:</span>{' '}
                    <span>{votingPower.summaryText}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-bold font-mono text-xs shrink-0">
                    +{certifiedWeight ?? 0} Votes
                  </span>
                </div>

                {/* Options Selection */}
                <div className="space-y-2 mb-6">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select your ballot position:
                  </label>
                  {selectedQuestionForVote.options.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        chosenOptionId === opt.id
                          ? 'border-[#006191] bg-sky-50/60 ring-1 ring-[#006191]'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="assembly-ballot-opt"
                          checked={chosenOptionId === opt.id}
                          onChange={() => setChosenOptionId(opt.id)}
                          className="accent-[#006191] w-4 h-4"
                        />
                        <span className="text-xs font-semibold text-slate-900">{opt.text}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        +{certifiedWeight ?? 0}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Confirmation Checkbox */}
                <div className="mb-6">
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voteConfirmed}
                      onChange={(e) => setVoteConfirmed(e.target.checked)}
                      className="mt-0.5 accent-[#006191]"
                    />
                    <span>
                      I certify under Swiss Vereinsrecht that this ballot represents our family members over 16 years of
                      age in good faith.
                    </span>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeVoteModal}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!chosenOptionId || !voteConfirmed || isSubmittingVote || certifiedWeight === null}
                    onClick={() => void handleConfirmVote()}
                    className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      chosenOptionId && voteConfirmed && !isSubmittingVote && certifiedWeight !== null
                        ? 'bg-[#006191] hover:bg-[#004f76] text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isSubmittingVote
                        ? 'Recording Ballot...'
                        : `Submit ${certifiedWeight ?? 0} Weighted Votes`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: MEMBER POSE QUESTION TO BOARD MODAL */}
      {isInquiryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={closeInquiryModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {inquirySuccessMsg ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-serif">
                  Question Submitted to Board!
                </h3>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Your question has been forwarded to the Vorstand. Fellow members can endorse it, and the board will
                  provide an official answer.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-xs text-amber-700 font-bold uppercase tracking-wider mb-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Art. 67 ZGB Member Interpellation</span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 font-serif mb-1">
                  Pose Question or Motion to the Board
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Submit a topic, inquiry, or agenda item for the upcoming General Assembly.
                </p>

                {inquiryError && (
                  <div
                    role="alert"
                    className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{inquiryError}</span>
                  </div>
                )}

                <form onSubmit={(e) => void handleSubmitInquiryForm(e)} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Inquiry Topic Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Request for bilingual youth halaqah in Zurich / Frankfurt"
                      value={inquiryTitle}
                      onChange={(e) => setInquiryTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category</label>
                    <select
                      value={inquiryCategory}
                      onChange={(e) => setInquiryCategory(e.target.value as BoardInquiryCategory)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
                    >
                      <option value="Programs & Tarbiyah">Programs &amp; Tarbiyah</option>
                      <option value="Finance & Audit">Finance &amp; Audit</option>
                      <option value="Mosque & Facility">Mosque &amp; Facility</option>
                      <option value="Statute & Governance">Statute &amp; Governance</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Detailed Question / Proposal for the Board *
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Explain your inquiry, context, and any specific requests for the board..."
                      value={inquiryContent}
                      onChange={(e) => setInquiryContent(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-[11px]">
                    Submitting as: <strong>{currentUser.name}</strong> ({currentUser.memberCode}) •{' '}
                    <span className="capitalize">{currentUser.membershipCategory} Member</span>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={closeInquiryModal}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingInquiry}
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>
                        {isSubmittingInquiry ? 'Submitting...' : 'Submit Question to Board'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
