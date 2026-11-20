import React, { useState, useEffect, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { deleteField } from 'firebase/firestore';
import {
  UserAccount,
  MembershipCategory,
  MembershipStatus,
  FamilyChild,
  FamilySpouse,
  CategoryChangeRequest,
  FormalStatusChangeRequest,
  GASessionState,
  AssemblyQuestion,
  CastBallot
} from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import { updateMemberDocument } from '../lib/authService';
import {
  castMemberBallot,
  subscribeAssemblyQuestions,
  subscribeGaSession,
  subscribeQuestionBallots
} from '../lib/firestoreAssembly';
import {
  formatFirestoreError,
  isValidFirestoreImageUrl,
  normalizeSafeHttpUrl
} from '../lib/firestoreContent';
import { isSafeHttpUrl } from '../lib/urlValidation';
import { calculateVotingPower } from '../utils/votingPower';
import { PhotoUpload } from './PhotoUpload';
import {
  User,
  Users,
  Mail,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe,
  CreditCard,
  LogOut,
  Info,
  Shield,
  BadgeCheck,
  UserCheck,
  Plane,
  PauseCircle,
  Clock,
  Sparkles,
  Award,
  FileText,
  Vote,
  Check,
  X,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  BookOpen,
  Scale,
  Camera,
  Instagram,
  Landmark,
  ExternalLink,
  QrCode,
  Smartphone
} from 'lucide-react';
import { DigitalMembershipCard } from './DigitalMembershipCard';
import { INSTAGRAM_URL, INSTAGRAM_HANDLE } from '../constants';

interface MemberProfileViewProps {
  onOpenStatuten?: () => void;
}

const EMPTY_USER_FORM: UserAccount = {
  name: '',
  email: '',
  address: {
    street: '',
    city: '',
    postalCode: '',
    country: 'Switzerland'
  },
  membershipCategory: 'personal',
  membershipStatus: 'active',
  children: []
};

function buildInitialFormData(user: UserAccount | null): UserAccount {
  if (!user) return EMPTY_USER_FORM;
  return {
    ...user,
    address: user.address
      ? {
          street: user.address.street || '',
          city: user.address.city || '',
          postalCode: user.address.postalCode || '',
          country: user.address.country || 'Switzerland'
        }
      : {
          street: '',
          city: '',
          postalCode: '',
          country: 'Switzerland'
        },
    membershipCategory: user.membershipCategory || 'personal',
    membershipStatus: user.membershipStatus || 'active',
    children: user.children || [],
    spouse: user.spouse || undefined
  };
}

export const MemberProfileView: React.FC<MemberProfileViewProps> = ({
  onOpenStatuten
}) => {
  const { authStatus, currentUser, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState<UserAccount>(() =>
    buildInitialFormData(currentUser)
  );

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const isSubmittingCategoryRef = useRef(false);
  const isSubmittingStatusRef = useRef(false);
  const isSubmittingExemptionRef = useRef(false);
  const isProcessingTwintRef = useRef(false);
  const isSubmittingBallotRef = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);
  const [statusModalError, setStatusModalError] = useState<string | null>(null);
  const [exemptionModalError, setExemptionModalError] = useState<string | null>(null);

  const scheduleSuccessClear = (ms = 5000) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setSaveSuccessMessage(null);
      successTimerRef.current = null;
    }, ms);
  };

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Live GA Session & Ballots
  const [gaSessionState, setGaSessionState] = useState<GASessionState | null>(null);
  const [questions, setQuestions] = useState<AssemblyQuestion[]>([]);
  const [activeBallots, setActiveBallots] = useState<CastBallot[]>([]);
  const [isSubmittingBallot, setIsSubmittingBallot] = useState(false);

  // New child inline modal/form state
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildBirthYear, setNewChildBirthYear] = useState('');
  const [newChildRelation, setNewChildRelation] = useState('Son');
  const [newChildNotes, setNewChildNotes] = useState('');

  // Secondary parent / spouse toggle
  const [showSpouseForm, setShowSpouseForm] = useState(Boolean(currentUser?.spouse?.name));

  // Category change request modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<MembershipCategory>(
    currentUser?.membershipCategory === 'personal' ? 'family' : 'personal'
  );
  const [categoryChangeReason, setCategoryChangeReason] = useState('');

  // Formal status change declaration modal state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<MembershipStatus>('relocated');
  const [statusReason, setStatusReason] = useState('');
  const [statusEffectiveDate, setStatusEffectiveDate] = useState('2026-10-01');
  const [destinationCountry, setDestinationCountry] = useState('Indonesia');
  const [statusTermsAccepted, setStatusTermsAccepted] = useState(false);

  // Annual Fee Exemption application modal state
  const [isExemptionModalOpen, setIsExemptionModalOpen] = useState(false);
  const [exemptionReasonInput, setExemptionReasonInput] = useState('');
  const [exemptionCategoryType, setExemptionCategoryType] = useState<
    'student' | 'hardship' | 'volunteer'
  >('student');

  // Quick TWINT Settlement Modal State
  const [showTwintPayModal, setShowTwintPayModal] = useState(false);
  const [isProcessingTwint, setIsProcessingTwint] = useState(false);

  // Live sync whenever the authenticated Firestore member snapshot updates
  useEffect(() => {
    if (!currentUser) return;
    setFormData((prev) => {
      if (!hasChanges || prev.uid !== currentUser.uid) {
        return buildInitialFormData(currentUser);
      }
      // Preserve unsaved local edits while keeping server-controlled fields live
      return {
        ...prev,
        uid: currentUser.uid,
        email: currentUser.email,
        memberCode: currentUser.memberCode,
        isAdmin: currentUser.isAdmin,
        isSuperAdmin: currentUser.isSuperAdmin,
        canManageBoard: currentUser.canManageBoard,
        canScanQR: currentUser.canScanQR,
        membershipCategory: currentUser.membershipCategory,
        membershipStatus: currentUser.membershipStatus,
        yearlyContribution: currentUser.yearlyContribution,
        paymentStatus: currentUser.paymentStatus,
        feeExemption: currentUser.feeExemption,
        categoryChangeRequest: currentUser.categoryChangeRequest,
        pendingStatusRequest: currentUser.pendingStatusRequest,
        formalStatusHistory: currentUser.formalStatusHistory,
        verifiedVoteWeight: currentUser.verifiedVoteWeight,
        voteWeightVerifiedAt: currentUser.voteWeightVerifiedAt,
        voteWeightVerifiedBy: currentUser.voteWeightVerifiedBy
      };
    });
    if (!hasChanges) {
      setShowSpouseForm(Boolean(currentUser.spouse?.name));
    }
    setTargetCategory(currentUser.membershipCategory === 'personal' ? 'family' : 'personal');
  }, [currentUser, hasChanges]);

  // Subscribe to GA session & questions strictly when authenticated
  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser?.uid) {
      setGaSessionState(null);
      setQuestions([]);
      return;
    }

    const unsubSession = subscribeGaSession((res) => {
      setGaSessionState(res.data);
    });
    const unsubQuestions = subscribeAssemblyQuestions((res) => {
      setQuestions(res.data);
    });

    return () => {
      unsubSession();
      unsubQuestions();
    };
  }, [authStatus, currentUser?.uid]);

  useEffect(() => {
    if (
      authStatus !== 'authenticated' ||
      !currentUser?.uid ||
      !gaSessionState?.isOpen ||
      !gaSessionState.activeQuestionId
    ) {
      setActiveBallots([]);
      return;
    }

    const unsubBallots = subscribeQuestionBallots(gaSessionState.activeQuestionId, (res) => {
      setActiveBallots(res.data);
    });
    return () => unsubBallots();
  }, [authStatus, currentUser?.uid, gaSessionState?.isOpen, gaSessionState?.activeQuestionId]);

  if (authStatus === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3 text-[#4A5862]" role="status" aria-live="polite">
          <div className="w-8 h-8 border-3 border-[#006191] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Loading member profile...</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated' || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const user = currentUser;

  const updateField = <K extends keyof UserAccount>(key: K, value: UserAccount[K]) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
    setSaveSuccessMessage(null);
  };

  const updateAddressField = (field: keyof NonNullable<UserAccount['address']>, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: {
        ...(prev.address || { street: '', city: '', postalCode: '', country: '' }),
        [field]: value
      }
    }));
    setHasChanges(true);
    setSaveSuccessMessage(null);
  };

  const updateSpouseField = (field: 'name' | 'email' | 'phone', value: string) => {
    setFormData((prev) => ({
      ...prev,
      spouse: {
        name: prev.spouse?.name || '',
        email: prev.spouse?.email || '',
        phone: prev.spouse?.phone || '',
        [field]: value
      }
    }));
    setHasChanges(true);
    setSaveSuccessMessage(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  // Submit Formal Category Change Request (Requires Admin Approval)
  const handleSubmitCategoryChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCategoryRef.current) return;
    if (!categoryChangeReason.trim()) {
      setCategoryModalError('Please provide a formal reason for the membership category change request.');
      return;
    }

    const newRequest: CategoryChangeRequest = {
      requestedCategory: targetCategory,
      requestedAt: new Date().toLocaleDateString('en-GB'),
      reason: categoryChangeReason.trim(),
      status: 'pending'
    };

    isSubmittingCategoryRef.current = true;
    try {
      setCategoryModalError(null);
      setErrorMessage(null);
      if (user.uid) {
        await updateMemberDocument(user.uid, { categoryChangeRequest: newRequest });
      }
      setFormData((prev) => ({ ...prev, categoryChangeRequest: newRequest }));
      setIsCategoryModalOpen(false);
      setCategoryChangeReason('');
      setSaveSuccessMessage(
        `Formal request to switch to ${targetCategory.toUpperCase()} Membership submitted. Awaiting Board Administrator approval.`
      );
      scheduleSuccessClear(6000);
    } catch (err) {
      setCategoryModalError(formatFirestoreError(err, 'Failed to submit category change request.'));
    } finally {
      isSubmittingCategoryRef.current = false;
    }
  };

  // Cancel Pending Category Change Request
  const handleCancelCategoryRequest = async () => {
    if (isSubmittingCategoryRef.current) return;
    isSubmittingCategoryRef.current = true;
    try {
      setErrorMessage(null);
      if (user.uid) {
        await updateMemberDocument(user.uid, {
          categoryChangeRequest: deleteField() as unknown as CategoryChangeRequest
        });
      }
      setFormData((prev) => ({ ...prev, categoryChangeRequest: undefined }));
      setSaveSuccessMessage('Pending category change request has been cancelled.');
    } catch (err) {
      setErrorMessage(formatFirestoreError(err, 'Failed to cancel category change request.'));
    } finally {
      isSubmittingCategoryRef.current = false;
    }
  };

  // Submit Formal Status Declaration (rule-compliant pendingStatusRequest)
  const handleSubmitFormalStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingStatusRef.current) return;
    if (!statusReason.trim()) {
      setStatusModalError('A formal explanation is required for all membership status changes.');
      return;
    }
    if (!statusTermsAccepted) {
      setStatusModalError('Please confirm your acknowledgement of the association bylaws declaration.');
      return;
    }

    const requestPayload: FormalStatusChangeRequest = {
      requestedStatus: targetStatus,
      reason: statusReason.trim().slice(0, 1000),
      effectiveDate: statusEffectiveDate.slice(0, 64),
      submittedAt: new Date().toISOString(),
      ...(targetStatus === 'relocated' && destinationCountry.trim()
        ? { destinationCountry: destinationCountry.trim().slice(0, 100) }
        : {}),
      status: 'submitted_to_board',
      notes: `Member declaration (${targetStatus.toUpperCase()})`
    };

    isSubmittingStatusRef.current = true;
    try {
      setStatusModalError(null);
      setErrorMessage(null);
      if (user.uid) {
        await updateMemberDocument(user.uid, { pendingStatusRequest: requestPayload });
      }
      setFormData((prev) => ({ ...prev, pendingStatusRequest: requestPayload }));
      setIsStatusModalOpen(false);
      setStatusReason('');
      setStatusTermsAccepted(false);
      setSaveSuccessMessage(
        `Formal status declaration "${targetStatus.toUpperCase()}" submitted to the Board for review.`
      );
      scheduleSuccessClear(6000);
    } catch (err) {
      setStatusModalError(formatFirestoreError(err, 'Failed to submit formal status request.'));
    } finally {
      isSubmittingStatusRef.current = false;
    }
  };

  const handleCancelPendingStatusRequest = async () => {
    if (isSubmittingStatusRef.current) return;
    isSubmittingStatusRef.current = true;
    try {
      setErrorMessage(null);
      if (user.uid) {
        await updateMemberDocument(user.uid, {
          pendingStatusRequest: deleteField() as unknown as FormalStatusChangeRequest
        });
      }
      setFormData((prev) => ({ ...prev, pendingStatusRequest: undefined }));
      setSaveSuccessMessage('Pending status request has been withdrawn.');
    } catch (err) {
      setErrorMessage(formatFirestoreError(err, 'Failed to cancel pending status request.'));
    } finally {
      isSubmittingStatusRef.current = false;
    }
  };

  // Submit Annual Fee Exemption Application (rule-compliant pendingStatusRequest)
  const handleSubmitFeeExemptionApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingExemptionRef.current) return;
    if (!exemptionReasonInput.trim()) {
      setExemptionModalError('Please state your justification for the annual fee exemption application.');
      return;
    }

    const requestPayload: FormalStatusChangeRequest = {
      requestedStatus: formData.membershipStatus || 'active',
      reason: `[GA Fee Exemption Application - ${exemptionCategoryType.toUpperCase()}] ${exemptionReasonInput.trim()}`.slice(
        0,
        1000
      ),
      effectiveDate: new Date().toISOString().slice(0, 10),
      submittedAt: new Date().toISOString(),
      status: 'submitted_to_board',
      notes: 'Pending GA Deliberation (APP-GA-EXEMP-2026)'
    };

    isSubmittingExemptionRef.current = true;
    try {
      setExemptionModalError(null);
      setErrorMessage(null);
      if (user.uid) {
        await updateMemberDocument(user.uid, { pendingStatusRequest: requestPayload });
      }
      setFormData((prev) => ({ ...prev, pendingStatusRequest: requestPayload }));
      setIsExemptionModalOpen(false);
      setExemptionReasonInput('');
      setSaveSuccessMessage(
        'Annual Fee Exemption application submitted to the Board & General Assembly. Full member privileges remain active.'
      );
      scheduleSuccessClear(7000);
    } catch (err) {
      setExemptionModalError(formatFirestoreError(err, 'Failed to submit fee exemption application.'));
    } finally {
      isSubmittingExemptionRef.current = false;
    }
  };

  // Add child (capped at 5 children)
  const handleAddChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName.trim()) {
      setErrorMessage('Please enter the child’s name.');
      return;
    }

    const currentChildren = formData.children || [];
    if (currentChildren.length >= 5) {
      setErrorMessage('Family tier covers up to 5 children. Maximum limit reached.');
      return;
    }

    const newChild: FamilyChild = {
      id: `child-${Date.now()}`,
      name: newChildName.trim(),
      birthYear: newChildBirthYear.trim() || undefined,
      relation: newChildRelation.trim() || 'Child',
      notes: newChildNotes.trim() || undefined
    };

    const updatedChildren = [...currentChildren, newChild];
    setFormData((prev) => ({
      ...prev,
      children: updatedChildren
    }));

    setNewChildName('');
    setNewChildBirthYear('');
    setNewChildRelation('Son');
    setNewChildNotes('');
    setIsAddingChild(false);
    setHasChanges(true);
    setErrorMessage(null);
  };

  // Drop / remove a child
  const handleDropChild = (childId: string) => {
    const currentChildren = formData.children || [];
    const updated = currentChildren.filter((c) => c.id !== childId);
    setFormData((prev) => ({
      ...prev,
      children: updated
    }));
    setHasChanges(true);
    setSaveSuccessMessage(null);
  };

  // Drop spouse / secondary parent
  const handleDropSpouse = () => {
    setFormData((prev) => ({
      ...prev,
      spouse: undefined
    }));
    setShowSpouseForm(false);
    setHasChanges(true);
    setSaveSuccessMessage(null);
  };

  // Save strictly self-editable profile fields allowed by firestore.rules
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSavingRef.current) return;

    const cleanName = formData.name.trim();
    if (!cleanName) {
      setErrorMessage('Primary member name cannot be empty.');
      return;
    }

    const rawAvatar = normalizeSafeHttpUrl((formData.avatarUrl || '').trim());
    if (rawAvatar && !isValidFirestoreImageUrl(rawAvatar)) {
      setErrorMessage(
        'Profile photo must be an HTTP(S) URL (<= 2048 bytes) or a lowercase base64 PNG/JPEG/WEBP/GIF image under 500 KB.'
      );
      return;
    }

    const spouseName = formData.spouse?.name?.trim() || '';
    const spousePatch: FamilySpouse | ReturnType<typeof deleteField> = spouseName
      ? {
          name: spouseName.slice(0, 150),
          ...(formData.spouse?.email?.trim()
            ? { email: formData.spouse.email.trim().slice(0, 200) }
            : {}),
          ...(formData.spouse?.phone?.trim()
            ? { phone: formData.spouse.phone.trim().slice(0, 40) }
            : {})
        }
      : (deleteField() as unknown as FamilySpouse);

    const selfPatch: Partial<UserAccount> = {
      name: cleanName.slice(0, 150),
      phone: (formData.phone || '').trim().slice(0, 40),
      address: {
        street: (formData.address?.street || '').trim().slice(0, 200),
        city: (formData.address?.city || '').trim().slice(0, 100),
        postalCode: (formData.address?.postalCode || '').trim().slice(0, 20),
        country: (formData.address?.country || 'Switzerland').trim().slice(0, 100)
      },
      interest: (formData.interest || '').trim().slice(0, 500),
      avatarUrl: rawAvatar,
      children: (formData.children || []).slice(0, 5),
      spouse: spousePatch as FamilySpouse
    };

    isSavingRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (user.uid) {
        await updateMemberDocument(user.uid, selfPatch);
      }
      setHasChanges(false);
      setSaveSuccessMessage('Your membership information and profile were saved successfully.');
      scheduleSuccessClear(4500);
    } catch (err) {
      setErrorMessage(formatFirestoreError(err, 'Failed to save member profile changes.'));
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // Report TWINT payment to Board Treasurer (rule-compliant pendingStatusRequest)
  const handlePayViaTwintNow = async () => {
    if (isProcessingTwintRef.current) return;
    isProcessingTwintRef.current = true;
    setIsProcessingTwint(true);
    setErrorMessage(null);
    const feeAmount =
      formData.yearlyContribution || (formData.membershipCategory === 'family' ? 120 : 80);
    const twintRef = `TWINT-${Math.floor(100000 + Math.random() * 900000)}`;

    const requestPayload: FormalStatusChangeRequest = {
      requestedStatus: 'active',
      reason: `TWINT transfer reported by member (Ref: ${twintRef}), awaiting Board Treasurer confirmation`,
      effectiveDate: new Date().toISOString().slice(0, 10),
      submittedAt: new Date().toISOString(),
      status: 'submitted_to_board',
      notes: `CHF ${feeAmount} TWINT self-report (${twintRef})`
    };

    try {
      if (user.uid) {
        await updateMemberDocument(user.uid, { pendingStatusRequest: requestPayload });
      }
      setFormData((prev) => ({ ...prev, pendingStatusRequest: requestPayload }));
      setShowTwintPayModal(false);
      setSaveSuccessMessage(
        `TWINT payment reference ${twintRef} submitted! The Board Treasurer will verify and activate your standing.`
      );
      scheduleSuccessClear(6000);
    } catch (err) {
      setErrorMessage(formatFirestoreError(err, 'Failed to report TWINT transfer.'));
    } finally {
      isProcessingTwintRef.current = false;
      setIsProcessingTwint(false);
    }
  };

  const childrenCount = formData.children?.length || 0;
  const isFamily = formData.membershipCategory === 'family';
  const isFeeExempt = Boolean(formData.feeExemption?.isExempt);
  const pendingCategory = formData.categoryChangeRequest?.status === 'pending';

  return (
    <div id="member-profile-view" className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 md:py-12">
      {/* 1. Header Banner & Member Verification Card */}
      <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 md:p-8 shadow-xs mb-8 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#d3e5f1]/40 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with status indicator */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-3 border-[#006191] bg-[#eff3ff] shadow-md">
                {formData.avatarUrl ? (
                  <img
                    src={formData.avatarUrl}
                    alt={formData.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#006191] text-white text-3xl font-bold">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : 'M'}
                  </div>
                )}
              </div>
              <span
                title={`Status: ${formData.membershipStatus}`}
                className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs text-white shadow-xs font-bold ${
                  formData.membershipStatus === 'active'
                    ? 'bg-emerald-500'
                    : formData.membershipStatus === 'pending_payment'
                    ? 'bg-amber-500 text-black'
                    : formData.membershipStatus === 'relocated'
                    ? 'bg-amber-500'
                    : formData.membershipStatus === 'fee_paused'
                    ? 'bg-sky-500'
                    : 'bg-slate-400'
                }`}
              >
                {formData.membershipStatus === 'active' && '✓'}
                {formData.membershipStatus === 'pending_payment' && '⏳'}
                {formData.membershipStatus === 'relocated' && '✈'}
                {formData.membershipStatus === 'fee_paused' && '⏸'}
                {formData.membershipStatus === 'inactive' && '•'}
              </span>
            </div>

            {/* Member Details */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#121c2a] tracking-tight">
                  {formData.name || 'Community Member'}
                </h1>
                <span className="text-xs font-mono font-semibold px-2.5 py-0.5 bg-[#eff3ff] text-[#006191] rounded-full border border-[#006191]/20">
                  ID: {formData.memberCode || 'PI-MEMBER'}
                </span>
                {formData.membershipStatus === 'pending_payment' && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-300 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-700" /> Pending Payment
                  </span>
                )}
                {formData.isSuperAdmin && (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded-full border border-indigo-200 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-700" /> Super Admin
                  </span>
                )}
                {formData.isAdmin && !formData.isSuperAdmin && (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200 inline-flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" /> Board Admin
                  </span>
                )}
                {formData.canManageBoard && (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-800 rounded-full border border-blue-200 inline-flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#006191]" /> Board Officer
                  </span>
                )}
                {formData.canScanQR && (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-emerald-600" /> QR Scanner Operator
                  </span>
                )}
                {isFeeExempt && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full border border-amber-300 inline-flex items-center gap-1">
                    <Vote className="w-3 h-3 text-amber-700" /> GA Fee-Exempt
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#566771] flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#006191]" />
                  {formData.email}
                </span>
                {formData.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#006191]" />
                    {formData.phone}
                  </span>
                )}
                {formData.address?.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#006191]" />
                    {formData.address.postalCode} {formData.address.city}, {formData.address.country || 'Germany'}
                  </span>
                )}
              </p>

              {/* Status, Category & Yearly Contribution Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${
                    isFamily
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {isFamily ? (
                    <>
                      <Users className="w-3.5 h-3.5" /> Family Membership ({childrenCount} {childrenCount === 1 ? 'child' : 'children'})
                    </>
                  ) : (
                    <>
                      <User className="w-3.5 h-3.5" /> Personal Membership (1 Person)
                    </>
                  )}
                </span>

                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${
                    formData.membershipStatus === 'active'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : formData.membershipStatus === 'pending_payment'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : formData.membershipStatus === 'relocated'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : formData.membershipStatus === 'fee_paused'
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                >
                  {formData.membershipStatus === 'active' && (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Active Member
                    </>
                  )}
                  {formData.membershipStatus === 'pending_payment' && (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Pending Fee Payment
                    </>
                  )}
                  {formData.membershipStatus === 'relocated' && (
                    <>
                      <Plane className="w-3.5 h-3.5 text-amber-600" />
                      Relocated Abroad (Fees Suspended)
                    </>
                  )}
                  {formData.membershipStatus === 'fee_paused' && (
                    <>
                      <PauseCircle className="w-3.5 h-3.5 text-sky-600" />
                      Fee Paused / Sabbatical
                    </>
                  )}
                  {formData.membershipStatus === 'inactive' && (
                    <>
                      <Info className="w-3.5 h-3.5 text-gray-500" />
                      Inactive / Resigned
                    </>
                  )}
                </span>

                {/* Yearly Contribution Indicator */}
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#eff3ff] text-[#006191] border border-[#d3e5f1] inline-flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  {isFeeExempt
                    ? 'Contribution: CHF 0 / year (GA Exemption)'
                    : formData.membershipStatus === 'pending_payment'
                    ? `Contribution: CHF ${formData.yearlyContribution || (isFamily ? 120 : 80)} / year (Pending)`
                    : formData.membershipStatus !== 'active'
                    ? 'Contribution: CHF 0 / year (Suspended)'
                    : `Contribution: CHF ${formData.yearlyContribution || (isFamily ? 120 : 80)} / year`}
                </span>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-[#bec7d2]/40">
            <button
              type="button"
              id="save-top-btn"
              onClick={() => void handleSave()}
              disabled={!hasChanges || isSaving}
              className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                hasChanges && !isSaving
                  ? 'bg-[#006191] text-white hover:bg-[#007bb6] animate-pulse'
                  : 'bg-[#eff3ff] text-[#566771] cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'All Saved'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="px-3.5 py-2 bg-white border border-[#bec7d2] hover:border-red-300 text-[#ba1a1a] hover:bg-red-50 text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Outstanding Membership Contribution Alert & TWINT Action Banner */}
      {formData.membershipStatus === 'pending_payment' && (
        <div className="bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 border-2 border-amber-300 rounded-2xl p-5 mb-8 shadow-xs animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 border border-amber-300">
                  <Clock className="w-3 h-3 text-amber-800" /> Annual Dues Pending
                </span>
                <span className="text-xs text-amber-800 font-semibold">
                  Amount Due: CHF {formData.yearlyContribution || (isFamily ? 120 : 80)}
                </span>
              </div>
              <h3 className="text-base font-bold text-amber-950">
                Annual Membership Contribution Pending Settlement
              </h3>
              <p className="text-xs text-amber-900/90 max-w-2xl leading-relaxed">
                Under Swiss Verein statutes (Art. 60 ff. ZGB), payment of the statutory annual contribution activates full voting rights and unlimited event participation. Settle now via TWINT for instant activation, or pay cash in person to an administrator.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowTwintPayModal(true)}
                className="px-4 py-2.5 bg-[#006191] hover:bg-[#007bb6] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>Pay via TWINT Now ⚡</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* General Assembly Live Session Box (Appears on Member's Portal ONLY when GA is Held Today) */}
      {gaSessionState?.isOpen ? (
        <div className="bg-gradient-to-br from-[#002f48] via-[#004f76] to-[#006191] text-white rounded-2xl p-6 mb-8 shadow-xl border-2 border-amber-400/80 relative overflow-hidden animate-in fade-in slide-in-from-top-3">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10">
            {/* Header with Live Pulsing Indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/15">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                  Live General Assembly in Session
                </span>
                <span className="text-xs text-amber-200 font-semibold">
                  {gaSessionState.sessionTitle} • {gaSessionState.scheduledDate}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-sky-200">Your Voting Rights:</span>
                {(() => {
                  const certifiedVotes =
                    typeof user.verifiedVoteWeight === 'number' &&
                    Number.isInteger(user.verifiedVoteWeight) &&
                    user.verifiedVoteWeight >= 0
                      ? user.verifiedVoteWeight
                      : null;
                  const displayVotes = certifiedVotes ?? calculateVotingPower(user).totalVotes;
                  return (
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-950 font-extrabold font-mono text-xs">
                      {displayVotes} {displayVotes === 1 ? 'Vote' : 'Votes'}{' '}
                      {certifiedVotes !== null ? '(Certified)' : '(Age ≥ 16)'}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Parliamentary Floor Motion Area */}
            {(() => {
              const activeQuestion = questions.find(
                (q) =>
                  q.id === gaSessionState.activeQuestionId &&
                  q.status === 'on_floor'
              );
              const userBallot = activeBallots.find((b) => b.id === user.uid);
              const hasVoted = Boolean(userBallot);
              const votingPower = calculateVotingPower(user);
              const certifiedWeight =
                typeof user.verifiedVoteWeight === 'number' &&
                Number.isInteger(user.verifiedVoteWeight) &&
                user.verifiedVoteWeight >= 1
                  ? user.verifiedVoteWeight
                  : null;

              if (activeQuestion) {
                return (
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-5 border border-white/20 mb-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <Vote className="w-4 h-4 text-amber-300" />
                        Active Question on Assembly Floor (Parliamentary Vote Open)
                      </span>
                      <span className="text-[11px] text-sky-200">
                        Quorum: ≥ {activeQuestion.quorumRequiredPercent}%
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-bold text-white font-serif mb-1">
                      {activeQuestion.title}
                    </h4>
                    <p className="text-xs text-sky-100/90 leading-relaxed mb-4 line-clamp-2">
                      {activeQuestion.description}
                    </p>

                    {/* Voting Action or Ballot Confirmation */}
                    {hasVoted ? (
                      <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-lg flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-emerald-200 font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>
                            Your family ballot is recorded for:{' '}
                            <strong className="text-white">
                              {activeQuestion.options.find((o) => o.id === userBallot?.votedOptionId)?.text ||
                                userBallot?.votedOptionId}
                            </strong>
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-400/30 text-emerald-100 font-mono text-[11px] font-bold">
                          +{userBallot?.voteWeight} Votes
                        </span>
                      </div>
                    ) : votingPower.isEligibleToVote && certifiedWeight !== null ? (
                      <div className="space-y-2">
                        <div className="text-xs text-amber-200 font-medium flex flex-wrap items-center gap-2">
                          <span>Cast your certified {certifiedWeight} weighted votes now:</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-100 text-[11px] font-semibold">
                            {t.member.voteWeightVerifiedBadge}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activeQuestion.options.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={isSubmittingBallot}
                              onClick={async () => {
                                if (!user.uid || isSubmittingBallotRef.current) return;
                                isSubmittingBallotRef.current = true;
                                setIsSubmittingBallot(true);
                                setErrorMessage(null);
                                try {
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

                                  await castMemberBallot(activeQuestion.id, user.uid, {
                                    memberName: user.name,
                                    memberCode: user.memberCode || 'PI-MEMBER',
                                    membershipCategory: user.membershipCategory || 'personal',
                                    voteWeight: certifiedWeight,
                                    votedOptionId: opt.id,
                                    timestamp: new Date().toISOString(),
                                    breakdown: {
                                      primaryEligible: true,
                                      spouseEligible: Boolean(user.spouse?.name?.trim()),
                                      eligibleChildrenNames: eligibleChildren,
                                      ineligibleChildrenNames: ineligibleChildren
                                    }
                                  });
                                } catch (err) {
                                  setErrorMessage(
                                    formatFirestoreError(err, 'Failed to submit ballot.')
                                  );
                                } finally {
                                  isSubmittingBallotRef.current = false;
                                  setIsSubmittingBallot(false);
                                }
                              }}
                              className="px-4 py-2 bg-white text-slate-900 hover:bg-amber-100 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer border border-white/40 active:scale-98 disabled:opacity-60"
                            >
                              <span>{opt.text}</span>
                              <span className="ml-2 font-mono text-purple-700 font-extrabold text-[11px]">
                                (+{certifiedWeight})
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : votingPower.isEligibleToVote ? (
                      <div className="p-3 bg-amber-500/20 border border-amber-400/40 rounded-lg text-xs text-amber-100 space-y-1">
                        <div className="font-bold text-amber-200">{t.member.voteWeightPendingBadge}</div>
                        <p>{t.member.voteWeightPendingNotice}</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-500/20 border border-amber-400/40 rounded-lg text-xs text-amber-200">
                        {votingPower.ineligibilityReason ||
                          'Voting is restricted to verified members with active standing.'}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mb-4 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-sky-100">
                    <Clock className="w-4 h-4 text-amber-300" />
                    <span>
                      <strong>Parliamentary Floor Deliberation:</strong> The Speaker/Board is currently discussing the
                      agenda. The next question will be raised for voting shortly.
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Bottom Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-sky-200">
                Swiss Verein Generalversammlung (Art. 60–79 ZGB) • Members may submit questions to the board.
              </div>

              <Link
                to="/assembly"
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <Vote className="w-4 h-4" />
                <span>Enter Full Assembly Chamber &amp; Inquiries</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delegated Operator Privileges Banner (Prominent Quick Launch for Roles) */}
      {(formData.canScanQR || formData.canManageBoard || formData.isAdmin || formData.isSuperAdmin) && (
        <div className="bg-gradient-to-r from-emerald-900 via-[#004f76] to-[#006191] text-white rounded-2xl p-5 md:p-6 mb-8 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-white/20 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Delegated Administrative Roles
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold">
                You have authorized administrative &amp; operator access
              </h2>
              <p className="text-xs text-white/80 max-w-2xl">
                The Super Administrator has granted your account access to specific community tools. Click a button below to launch your authorized workspace directly.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {formData.canScanQR && (
                <Link
                  to="/admin/attendance"
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Launch Live QR Scanner</span>
                </Link>
              )}
              {formData.canManageBoard && (
                <Link
                  to="/admin/board"
                  className="px-4 py-2.5 bg-[#eff3ff] text-[#006191] hover:bg-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Manage Board &amp; Leadership</span>
                </Link>
              )}
              {(formData.isAdmin || formData.isSuperAdmin) && (
                <Link
                  to="/admin/programs"
                  className="px-4 py-2.5 bg-white text-[#121c2a] hover:bg-gray-100 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Admin Dashboard</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {saveSuccessMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm flex items-center gap-3 animate-in fade-in duration-200 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{saveSuccessMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm flex items-center gap-3 animate-in fade-in duration-200 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* 2. GOVERNANCE BANNER: General Assembly (GA) & Year-End Validity */}
      <div className="mb-8 p-5 bg-gradient-to-r from-[#eff3ff] via-[#f5f8ff] to-white border border-[#006191]/30 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#006191] text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Scale className="w-3 h-3 text-sky-200" />
                Art. 60–79 ZGB • Statuten
              </span>
              <span className="text-xs font-semibold text-[#566771]">
                Term: Calendar Year {formData.membershipYear || 2026}
              </span>
            </div>
            <h3 className="text-base font-bold text-[#121c2a]">
              Active Standing Valid Through 31 December 2026 (Annual Cycle)
            </h3>
            <p className="text-xs text-[#566771] max-w-3xl leading-relaxed">
              <strong>Statute Notice (Art. 6 Statuten):</strong> Membership contribution is <strong>yearly</strong>. In accordance with Swiss association law and our bylaws,
              active members lose their active status after the year end (31 December). Renewal is formalized annually once the
              <strong> General Assembly (Generalversammlung / GV / Rapat Anggota Tahunan)</strong> reviews reports and confirms the membership roll.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
            <div className="p-3 bg-white border border-[#d3e5f1] rounded-xl text-right">
              <span className="text-[10px] text-[#566771] uppercase font-bold block">Status Validity</span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 justify-end">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Active through Year-End 2026
              </span>
              <span className="text-[10px] text-[#566771] block mt-0.5">
                Ref: {formData.lastGaResolutionRef || 'GA-2025/DEC-RES-14'}
              </span>
            </div>

            {onOpenStatuten && (
              <button
                type="button"
                onClick={onOpenStatuten}
                className="px-3.5 py-2 bg-[#006191] hover:bg-[#007bb6] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Statuten (Art. 60 ff. ZGB)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Member Exclusive Hub: Picture Catalog & Financial Reports */}
      <div className="bg-gradient-to-r from-[#eff3ff] via-white to-[#fff2f6] p-4 sm:p-5 rounded-2xl border border-[#bec7d2]/60 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#006191] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[#121c2a]">Exklusive Mitglieder-Bereiche</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                Aktiv freigeschaltet
              </span>
            </div>
            <p className="text-xs text-[#3f4850] mt-0.5">
              Zugriff auf den Fotokatalog der Veranstaltungen, die geprüfte Jahresrechnung und offizielle Community-Kanäle.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <a
            href="#digital-membership-card"
            className="px-3.5 py-2 bg-[#006191] hover:bg-[#007bb6] text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Digitaler Pass &amp; QR</span>
          </a>

          <button
            type="button"
            onClick={() => navigate('/gallery')}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-[#006191] border border-[#bec7d2]/80 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-[#006191]" />
            <span>Event-Fotokatalog</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/about')}
            className="px-3.5 py-2 bg-white hover:bg-gray-50 text-[#006191] border border-[#bec7d2]/80 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5 text-[#006191]" />
            <span>Jahresrechnung &amp; Finanzen</span>
          </button>

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>{INSTAGRAM_HANDLE}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* DIGITAL MEMBERSHIP CARD & EVENT QUICK CHECK-IN */}
      <div id="digital-membership-card" className="scroll-mt-24">
        <DigitalMembershipCard user={formData} onOpenStatuten={onOpenStatuten} />
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Membership Category, Family Roster & Personal Info */}
        <div className="lg:col-span-8 space-y-8">
          {/* SECTION 1: Membership Category (Personal vs Family) + Admin Approval Workflow */}
          <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#bec7d2]/40 pb-3 gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#121c2a] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#006191]" />
                  Membership Category (Yearly Contribution)
                </h2>
                <p className="text-xs text-[#566771] mt-0.5">
                  Contributions are paid on a <strong>yearly basis</strong>. Switching category requires review &amp; approval by a Board Administrator.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#eff3ff] text-[#006191] self-start sm:self-auto">
                Current: {isFamily ? 'Family Tier (CHF 120/yr)' : 'Personal Tier (CHF 80/yr)'}
              </span>
            </div>

            {/* Pending Category Change Notice (Admin Approval Required) */}
            {pendingCategory && (
              <div className="p-4 bg-amber-50/80 border-2 border-amber-300 rounded-xl space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                          Formal Category Change Request Pending Admin Approval
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                          Awaiting Review
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 mt-1">
                        You requested to change your category to{' '}
                        <strong>
                          {formData.categoryChangeRequest?.requestedCategory === 'family'
                            ? 'Family Membership (CHF 120/year)'
                            : 'Personal Membership (CHF 80/year)'}
                        </strong>{' '}
                        on {formData.categoryChangeRequest?.requestedAt}.
                      </p>
                      {formData.categoryChangeRequest?.reason && (
                        <p className="text-xs text-amber-800/90 italic mt-1 bg-amber-100/60 p-2 rounded-md">
                          “{formData.categoryChangeRequest.reason}”
                        </p>
                      )}
                      <p className="text-[11px] text-amber-800 mt-1.5">
                        * In accordance with association bylaws, category modifications are reviewed by a board administrator to verify household quota before becoming effective.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelCategoryRequest}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 hover:underline shrink-0 cursor-pointer"
                  >
                    Cancel Request
                  </button>
                </div>

                {(user.isAdmin || user.isSuperAdmin) && (
                  <div className="pt-2 border-t border-amber-200 flex items-center justify-end text-xs">
                    <Link
                      to="/admin/members"
                      className="text-xs font-bold text-[#006191] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      Open Admin Dashboard to Approve <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Category Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option A: Personal */}
              <div
                className={`p-4 rounded-xl border-2 transition-all relative ${
                  !isFamily
                    ? 'border-[#006191] bg-[#eff3ff]/40 ring-2 ring-[#006191]/15 shadow-2xs'
                    : 'border-[#bec7d2]/60 hover:border-[#006191]/40 bg-white'
                }`}
              >
                {!isFamily && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase bg-[#006191] text-white px-2 py-0.5 rounded">
                    Active Tier
                  </span>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="font-bold text-sm text-[#121c2a]">Personal Membership</h3>
                <p className="text-xs text-[#566771] mt-1 leading-relaxed">
                  Single individual membership with full general assembly voting rights and access to all majelis.
                </p>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#006191]">
                  <span>Yearly Contribution</span>
                  <span className="text-sm">CHF 80 / year</span>
                </div>

                {/* If currently family, offer button to request switch to personal */}
                {isFamily && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryModalError(null);
                      setCategoryChangeReason('');
                      setTargetCategory('personal');
                      setIsCategoryModalOpen(true);
                    }}
                    disabled={pendingCategory}
                    className="mt-3 w-full py-2 bg-white border border-[#006191] text-[#006191] hover:bg-[#eff3ff] text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pendingCategory ? 'Request Pending...' : 'Request Switch to Personal Tier'}
                  </button>
                )}
              </div>

              {/* Option B: Family */}
              <div
                className={`p-4 rounded-xl border-2 transition-all relative ${
                  isFamily
                    ? 'border-purple-600 bg-purple-50/40 ring-2 ring-purple-600/15 shadow-2xs'
                    : 'border-[#bec7d2]/60 hover:border-purple-300 bg-white'
                }`}
              >
                {isFamily && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase bg-purple-700 text-white px-2 py-0.5 rounded">
                    Active Tier
                  </span>
                )}
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="font-bold text-sm text-[#121c2a]">Family Membership</h3>
                <p className="text-xs text-[#566771] mt-1 leading-relaxed">
                  Extends coverage to parents and <strong>up to five children</strong> under one household.
                </p>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-700">
                  <span>Yearly Contribution</span>
                  <span className="text-sm">CHF 120 / year</span>
                </div>

                {/* If currently personal, offer button to request switch to family */}
                {!isFamily && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryModalError(null);
                      setCategoryChangeReason('');
                      setTargetCategory('family');
                      setIsCategoryModalOpen(true);
                    }}
                    disabled={pendingCategory}
                    className="mt-3 w-full py-2 bg-purple-700 text-white hover:bg-purple-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {pendingCategory ? 'Request Pending Approval...' : 'Request Upgrade to Family Tier'}
                  </button>
                )}
              </div>
            </div>

            {/* FAMILY DETAILS SUB-SECTION: Parents & Children (Up to 5 children) */}
            {isFamily && (
              <div className="mt-4 pt-4 border-t border-[#bec7d2]/40 space-y-6 animate-in fade-in duration-200">
                {/* 1. Parents & Spouse */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#121c2a] uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#006191]" />
                      Parents &amp; Household Guardians
                    </h4>
                    {!showSpouseForm && (
                      <button
                        type="button"
                        onClick={() => setShowSpouseForm(true)}
                        className="text-xs font-semibold text-[#006191] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Secondary Parent / Spouse
                      </button>
                    )}
                  </div>

                  {/* Primary Parent (Account holder) */}
                  <div className="p-3 bg-[#f9f9ff] border border-[#bec7d2]/60 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#006191] text-white flex items-center justify-center font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-[#121c2a]">{formData.name} (Primary Member)</p>
                        <p className="text-[#566771] text-[11px]">{formData.email} • {formData.phone || 'No phone set'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-sm">
                      Primary
                    </span>
                  </div>

                  {/* Secondary Parent / Spouse */}
                  {showSpouseForm && (
                    <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                            2
                          </div>
                          <span className="font-bold text-[#121c2a]">Secondary Parent / Spouse</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleDropSpouse}
                          className="text-[11px] text-rose-600 hover:text-rose-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          title="Remove secondary parent"
                        >
                          <Trash2 className="w-3 h-3" /> Drop from Family
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#566771] mb-1">
                            Spouse Full Name
                          </label>
                          <input
                            type="text"
                            value={formData.spouse?.name || ''}
                            onChange={(e) => updateSpouseField('name', e.target.value)}
                            placeholder="e.g. Siti Sarah"
                            className="w-full px-2.5 py-1.5 bg-white border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#566771] mb-1">
                            Spouse Email (Optional)
                          </label>
                          <input
                            type="email"
                            value={formData.spouse?.email || ''}
                            onChange={(e) => updateSpouseField('email', e.target.value)}
                            placeholder="spouse@domain.com"
                            className="w-full px-2.5 py-1.5 bg-white border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#566771] mb-1">
                            Spouse Phone (Optional)
                          </label>
                          <input
                            type="tel"
                            value={formData.spouse?.phone || ''}
                            onChange={(e) => updateSpouseField('phone', e.target.value)}
                            placeholder="+49 ..."
                            className="w-full px-2.5 py-1.5 bg-white border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Children Registered (Up to 5 Children) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#121c2a] uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#006191]" />
                        Registered Children ({childrenCount} of 5 covered)
                      </h4>
                      <p className="text-[11px] text-[#566771]">
                        Family members can add children or drop someone if they move or leave the household.
                      </p>
                    </div>

                    {childrenCount < 5 ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingChild(true)}
                        className="px-3 py-1.5 bg-[#006191] text-white hover:bg-[#007bb6] text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Child</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        Max 5 children reached
                      </span>
                    )}
                  </div>

                  {/* Children List */}
                  {childrenCount === 0 ? (
                    <div className="p-5 text-center bg-[#f9f9ff] border-2 border-dashed border-[#bec7d2]/60 rounded-xl">
                      <p className="text-xs font-medium text-[#566771]">
                        No children registered under this family membership yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddingChild(true)}
                        className="mt-2 text-xs font-bold text-[#006191] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add first child (up to 5)
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#e6eeff] border border-[#bec7d2]/60 rounded-xl overflow-hidden bg-white">
                      {formData.children?.map((child, index) => (
                        <div
                          key={child.id || index}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f9f9ff] transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {index + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-xs sm:text-sm text-[#121c2a]">{child.name}</p>
                                {child.birthYear && (
                                  <span className="text-[11px] text-[#566771] bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                                    Born {child.birthYear}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#566771] mt-0.5">
                                {child.relation || 'Child'} {child.notes ? `• ${child.notes}` : ''}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDropChild(child.id)}
                            className="self-end sm:self-center px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title={`Drop ${child.name} from family membership`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Drop / Leave</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Add Child Form */}
                  {isAddingChild && (
                    <form
                      onSubmit={handleAddChild}
                      className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3 animate-in fade-in duration-150"
                    >
                      <h5 className="font-bold text-xs text-[#121c2a] flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-purple-700" />
                        Register a Child to Family Membership
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-[#566771] mb-1">
                            Child Full Legal Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={newChildName}
                            onChange={(e) => setNewChildName(e.target.value)}
                            placeholder="e.g. Aisyah Az-Zahra"
                            className="w-full px-3 py-1.5 bg-white border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#566771] mb-1">
                            Birth Year
                          </label>
                          <input
                            type="text"
                            value={newChildBirthYear}
                            onChange={(e) => setNewChildBirthYear(e.target.value)}
                            placeholder="e.g. 2015"
                            className="w-full px-3 py-1.5 bg-white border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#566771] mb-1">
                            Relationship
                          </label>
                          <select
                            value={newChildRelation}
                            onChange={(e) => setNewChildRelation(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191]"
                          >
                            <option value="Son">Son</option>
                            <option value="Daughter">Daughter</option>
                            <option value="Foster Child / Ward">Foster Child / Ward</option>
                            <option value="Dependent">Dependent under 21</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-[#566771] mb-1">
                            School / Madrasah / Youth Activity Notes (Optional)
                          </label>
                          <input
                            type="text"
                            value={newChildNotes}
                            onChange={(e) => setNewChildNotes(e.target.value)}
                            placeholder="e.g. Attends Sunday Madrasah, youth soccer"
                            className="w-full px-3 py-1.5 bg-white border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191]"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingChild(false)}
                          className="px-3 py-1.5 text-xs text-[#566771] hover:text-[#121c2a] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-semibold hover:bg-purple-800 transition-colors cursor-pointer shadow-2xs"
                        >
                          Save Child
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Personal Contact & Address Information */}
          <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-xs space-y-5">
            <div className="border-b border-[#bec7d2]/40 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-[#121c2a] flex items-center gap-2">
                <User className="w-5 h-5 text-[#006191]" />
                Personal Contact &amp; Residential Address
              </h2>
              <p className="text-xs text-[#566771] mt-0.5">
                Update your primary contact information, phone, email, and home address.
              </p>
            </div>

            {/* Profile Photo Upload */}
            <div>
              <PhotoUpload
                id="member-avatar-upload"
                value={formData.avatarUrl || ''}
                onChange={(url) => updateField('avatarUrl', url)}
                label="Profile Picture / Member Headshot"
                sublabel="Upload a portrait photo for your verified membership badge"
                aspectRatio="avatar"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1.5">
                  Primary Member Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Your full legal name"
                  className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-sm font-medium outline-none focus:border-[#006191] focus:bg-white"
                />
              </div>

              {/* Email (read-only per firestore.rules) */}
              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  readOnly
                  value={formData.email}
                  className="w-full px-3.5 py-2.5 bg-gray-100 border border-[#bec7d2]/60 rounded-xl text-sm font-medium text-[#566771] cursor-not-allowed"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1.5">
                  Phone / WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+49 176 1234 5678"
                  className="w-full px-3.5 py-2.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-sm font-medium outline-none focus:border-[#006191] focus:bg-white"
                />
              </div>

              {/* Member Code */}
              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1.5">
                  Member Registration Code
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.memberCode || 'PI-MEMBER'}
                  className="w-full px-3.5 py-2.5 bg-gray-100 border border-[#bec7d2]/60 rounded-xl text-sm font-mono text-[#566771] cursor-not-allowed"
                />
              </div>
            </div>

            {/* Residential Address Fields */}
            <div className="pt-3 border-t border-[#bec7d2]/40 space-y-3">
              <h3 className="text-xs font-bold text-[#121c2a] uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#006191]" />
                Residential Street Address
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-12">
                  <label className="block text-[11px] font-semibold text-[#566771] mb-1">
                    Street Address &amp; House Number / App.
                  </label>
                  <input
                    type="text"
                    value={formData.address?.street || ''}
                    onChange={(e) => updateAddressField('street', e.target.value)}
                    placeholder="e.g. Kaiser-Friedrich-Strasse 42, Apt 3B"
                    className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191] focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-[#566771] mb-1">
                    City / Municipality
                  </label>
                  <input
                    type="text"
                    value={formData.address?.city || ''}
                    onChange={(e) => updateAddressField('city', e.target.value)}
                    placeholder="e.g. Frankfurt am Main"
                    className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191] focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-[#566771] mb-1">
                    Postal Code (PLZ)
                  </label>
                  <input
                    type="text"
                    value={formData.address?.postalCode || ''}
                    onChange={(e) => updateAddressField('postalCode', e.target.value)}
                    placeholder="e.g. 60329"
                    className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs font-mono outline-none focus:border-[#006191] focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-[#566771] mb-1">
                    Country of Residence
                  </label>
                  <select
                    value={formData.address?.country || 'Germany'}
                    onChange={(e) => updateAddressField('country', e.target.value)}
                    className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191] focus:bg-white"
                  >
                    <option value="Germany">Germany</option>
                    <option value="Switzerland">Switzerland</option>
                    <option value="Austria">Austria</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="Indonesia">Indonesia</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="France">France</option>
                    <option value="Other">Other / International</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interest & Notes */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                Community Interest / Notes
              </label>
              <input
                type="text"
                value={formData.interest || ''}
                onChange={(e) => updateField('interest', e.target.value)}
                placeholder="e.g. Youth mentoring, Quranic study, event logistics, disaster relief volunteer"
                className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191] focus:bg-white"
              />
            </div>
          </div>

          {/* SECTION 3: Formal Status Declaration History & Registry Audit Trail */}
          <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#bec7d2]/40 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#121c2a] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#006191]" />
                  Formal Membership Registry &amp; Status Ledger
                </h3>
                <p className="text-xs text-[#566771] mt-0.5">
                  Official historical records of status transitions, relocation notices, and General Assembly resolutions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(true)}
                className="px-3 py-1.5 bg-[#006191] text-white hover:bg-[#007bb6] text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Submit Formal Status Declaration</span>
              </button>
            </div>

            {/* Pending Formal Status Request Banner */}
            {formData.pendingStatusRequest && (
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-950 uppercase tracking-wider">
                      Submitted Formal Request ({formData.pendingStatusRequest.requestedStatus.toUpperCase()})
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-200 text-sky-900 font-bold text-[10px]">
                      {formData.pendingStatusRequest.status}
                    </span>
                  </div>
                  <p className="text-sky-900">{formData.pendingStatusRequest.reason}</p>
                  <p className="text-[11px] text-sky-700">
                    Effective: {formData.pendingStatusRequest.effectiveDate}
                    {formData.pendingStatusRequest.destinationCountry
                      ? ` • Destination: ${formData.pendingStatusRequest.destinationCountry}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCancelPendingStatusRequest()}
                  className="text-rose-700 hover:underline font-semibold shrink-0 cursor-pointer"
                >
                  Withdraw
                </button>
              </div>
            )}

            {/* Status History Table */}
            <div className="border border-[#bec7d2]/60 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f2f6fc] text-[#121c2a] font-bold border-b border-[#bec7d2]/60">
                  <tr>
                    <th className="p-3">Effective Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Reason / Details</th>
                    <th className="p-3">Recorded By &amp; Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6eeff]">
                  {formData.formalStatusHistory && formData.formalStatusHistory.length > 0 ? (
                    formData.formalStatusHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-[#f9f9ff]">
                        <td className="p-3 font-medium text-[#121c2a] whitespace-nowrap">
                          {record.effectiveDate}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              record.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : record.status === 'relocated'
                                ? 'bg-amber-100 text-amber-900'
                                : record.status === 'fee_paused'
                                ? 'bg-sky-100 text-sky-900'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="p-3 text-[#3f4850]">{record.reason}</td>
                        <td className="p-3 text-[#566771] font-mono text-[11px] whitespace-nowrap">
                          {record.recordedBy}
                          {record.documentRef && ` (${record.documentRef})`}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-xs text-[#566771]">
                        No formal status change records registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Section 4: General Assembly Fee Exemption, Member Privileges & Subsidized Fees */}
        <div className="lg:col-span-4 space-y-6">
          {/* CARD A: Annual Fee Exemption & General Assembly Voting */}
          <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-xs space-y-4">
            <div className="border-b border-[#bec7d2]/40 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-purple-700" />
                <h3 className="text-base font-bold text-[#121c2a]">Annual Fee Exemption</h3>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                Voted Yearly
              </span>
            </div>

            {isFeeExempt ? (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-xs text-emerald-950 uppercase">
                    Fee Exemption Granted for 2026
                  </span>
                </div>
                <div className="space-y-1 text-xs text-emerald-900">
                  <p>
                    <strong>Yearly Contribution:</strong> €0 / year
                  </p>
                  <p>
                    <strong>Resolution Ref:</strong>{' '}
                    <span className="font-mono">{formData.feeExemption?.resolutionRef || 'GA-2026/VOTE-08'}</span>
                  </p>
                  <p>
                    <strong>Approved Reason:</strong>{' '}
                    {formData.feeExemption?.exemptionReason || 'Full-time student / financial hardship status approved by GA'}
                  </p>
                </div>

                {/* CRUCIAL RULE: Fee Exemptions DO NOT lose benefits */}
                <div className="pt-2 border-t border-emerald-200 text-xs space-y-1.5 text-emerald-900">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    100% Member Privileges Retained:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800">
                    <li>
                      <strong>Subsidized Event Tickets:</strong> Pay member rate (€0 - €5) instead of standard €25.
                    </li>
                    <li>
                      <strong>General Assembly Voting:</strong> Full democratic voice in board resolutions.
                    </li>
                    <li>
                      <strong>Community Welfare Access:</strong> Unrestricted assistance.
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#566771] leading-relaxed">
                  Association members experiencing financial hardship, full-time students, or active community volunteers
                  can apply for an <strong>Annual Fee Exemption</strong>.
                </p>
                <div className="p-3 bg-[#eff3ff] border border-[#d3e5f1] rounded-xl text-xs space-y-1 text-[#006191]">
                  <p className="font-bold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" /> General Assembly Rule:
                  </p>
                  <p className="text-[11px] text-[#3f4850]">
                    Fee exemptions are <strong>voted on yearly</strong> by the General Assembly. Exempted members
                    <strong> do not lose any benefits</strong>, such as subsidized event admission or voting rights.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExemptionModalOpen(true)}
                  className="w-full py-2.5 bg-white border border-[#006191] text-[#006191] hover:bg-[#eff3ff] font-semibold text-xs rounded-xl transition-colors cursor-pointer text-center inline-flex items-center justify-center gap-1.5"
                >
                  <Vote className="w-3.5 h-3.5" />
                  Apply for GA Fee Exemption
                </button>
              </div>
            )}
          </div>

          {/* CARD B: Subsidized Event Attending Fees Demonstration */}
          <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-xs space-y-4">
            <div className="border-b border-[#bec7d2]/40 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#006191]" />
                <h3 className="text-base font-bold text-[#121c2a]">Subsidized Event Fees</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                Benefit Active
              </span>
            </div>

            <p className="text-xs text-[#566771] leading-relaxed">
              Active members and GA-voted fee-exempt members receive guaranteed subsidized ticket fees for all association programs:
            </p>

            {/* Event Comparison List */}
            <div className="space-y-2.5">
              <div className="p-2.5 bg-[#f9f9ff] border border-[#bec7d2]/60 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-[#121c2a]">Kajian Ahad Pagi Akbar</p>
                  <p className="text-[10px] text-[#566771]">General Non-Member: €15</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Your Rate: €0 (Free)
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-[#f9f9ff] border border-[#bec7d2]/60 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-[#121c2a]">Percikan Youth Tech Lab</p>
                  <p className="text-[10px] text-[#566771]">General Non-Member: €30</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Your Rate: €5 Subsidized
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-[#f9f9ff] border border-[#bec7d2]/60 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-[#121c2a]">Fiqih Muamalah Masterclass</p>
                  <p className="text-[10px] text-[#566771]">General Non-Member: €25</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Your Rate: €0 (Free)
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#566771] italic">
              * Active &amp; fee-exempt members save over €250/year in subsidized educational and spiritual workshops.
            </p>
          </div>

          {/* CARD C: Status Management / Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-xs space-y-4">
            <div className="border-b border-[#bec7d2]/40 pb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#006191]" />
              <h3 className="text-base font-bold text-[#121c2a]">Formal Status Management</h3>
            </div>

            <p className="text-xs text-[#566771]">
              Leaving the country, pausing contributions, or updating official records must be submitted formally to the board:
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setTargetStatus('relocated');
                  setIsStatusModalOpen(true);
                }}
                className="w-full p-2.5 rounded-xl border border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 text-left transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-amber-700" />
                  <div>
                    <p className="text-xs font-bold text-amber-950">Relocating Abroad</p>
                    <p className="text-[10px] text-amber-800">Leaving Germany / returning home</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetStatus('fee_paused');
                  setIsStatusModalOpen(true);
                }}
                className="w-full p-2.5 rounded-xl border border-sky-300 bg-sky-50/60 hover:bg-sky-100/70 text-left transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <PauseCircle className="w-4 h-4 text-sky-700" />
                  <div>
                    <p className="text-xs font-bold text-sky-950">Pause Contribution</p>
                    <p className="text-[10px] text-sky-800">Financial break / sabbatical</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-sky-700" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetStatus('active');
                  setIsStatusModalOpen(true);
                }}
                className="w-full p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Confirm Active Standing</p>
                    <p className="text-[10px] text-emerald-800">Re-certify yearly contribution</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Request Membership Category Change (Requires Admin Approval) */}
      {isCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-change-modal-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#bec7d2]">
            <div className="flex items-center justify-between border-b border-[#bec7d2]/40 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#006191]" />
                <h3 id="category-change-modal-title" className="font-bold text-base text-[#121c2a]">
                  Request Membership Category Change
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCategoryModalError(null);
                  setIsCategoryModalOpen(false);
                }}
                className="text-[#566771] hover:text-[#121c2a] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCategoryChangeRequest} className="space-y-4">
              {categoryModalError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{categoryModalError}</span>
                </div>
              )}
              <div className="p-3 bg-[#eff3ff] border border-[#d3e5f1] rounded-xl text-xs text-[#006191] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Board Approval Governance Policy:
                </p>
                <p className="text-[#3f4850] text-[11px] leading-relaxed">
                  Per Percikan Iman association bylaws, membership category transitions (between Personal and Family tiers)
                  must be <strong>reviewed and approved by a Board Administrator</strong> before the change takes effect in the registry.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Target Membership Category
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetCategory('personal')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      targetCategory === 'personal'
                        ? 'border-[#006191] bg-[#eff3ff] ring-2 ring-[#006191]/20 font-bold'
                        : 'border-[#bec7d2] bg-white'
                    }`}
                  >
                    <p className="text-xs text-[#121c2a]">Personal Tier</p>
                    <p className="text-[11px] text-[#006191]">CHF 80 / year</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetCategory('family')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      targetCategory === 'family'
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600/20 font-bold'
                        : 'border-[#bec7d2] bg-white'
                    }`}
                  >
                    <p className="text-xs text-[#121c2a]">Family Tier</p>
                    <p className="text-[11px] text-purple-700">CHF 120 / year (up to 5 kids)</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Formal Reason for Category Change *
                </label>
                <textarea
                  required
                  rows={3}
                  value={categoryChangeReason}
                  onChange={(e) => setCategoryChangeReason(e.target.value)}
                  placeholder="e.g. Recently married with 1 child, request family coverage for upcoming term; or children have aged out/independent."
                  className="w-full p-3 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#bec7d2]/40">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#566771] hover:text-[#121c2a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#006191] text-white font-bold text-xs rounded-xl hover:bg-[#007bb6] transition-colors cursor-pointer shadow-xs"
                >
                  Submit Request for Admin Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Submit Formal Status Declaration (Relocation, Pause, Resignation) */}
      {isStatusModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#bec7d2]">
            <div className="flex items-center justify-between border-b border-[#bec7d2]/40 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#006191]" />
                <h3 className="font-bold text-base text-[#121c2a]">
                  Formal Status Change Declaration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatusModalError(null);
                  setIsStatusModalOpen(false);
                }}
                className="text-[#566771] hover:text-[#121c2a] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFormalStatus} className="space-y-4">
              {statusModalError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{statusModalError}</span>
                </div>
              )}
              <p className="text-xs text-[#566771] leading-relaxed">
                Changes to membership status are <strong>formal legal declarations</strong> entered into the association ledger.
              </p>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Declared Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as MembershipStatus)}
                  className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191]"
                >
                  <option value="active">Active (Standard Good Standing)</option>
                  <option value="relocated">Relocated Abroad / Left the Country (Fees Suspended)</option>
                  <option value="fee_paused">Pause Contribution (Financial Sabbatical / Student)</option>
                  <option value="inactive">Formal Resignation / Inactive</option>
                </select>
              </div>

              {targetStatus === 'relocated' && (
                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Destination Country
                  </label>
                  <input
                    type="text"
                    value={destinationCountry}
                    onChange={(e) => setDestinationCountry(e.target.value)}
                    placeholder="e.g. Indonesia, Singapore, USA"
                    className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  required
                  value={statusEffectiveDate}
                  onChange={(e) => setStatusEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Formal Explanation / Circumstances *
                </label>
                <textarea
                  required
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="State the reasons for this status change (e.g., employment contract concluded, temporary study abroad, temporary financial adjustment)."
                  className="w-full p-3 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191]"
                />
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statusTermsAccepted}
                    onChange={(e) => setStatusTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-[#006191] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-[#3f4850] leading-snug">
                    I confirm that this formal declaration is true and accurate according to association bylaws (§4 Satzung), and I understand it will be officially recorded in the Verein register.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#bec7d2]/40">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#566771] hover:text-[#121c2a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#006191] text-white font-bold text-xs rounded-xl hover:bg-[#007bb6] transition-colors cursor-pointer shadow-xs"
                >
                  Register Formal Declaration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Apply for Annual General Assembly Fee Exemption */}
      {isExemptionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#bec7d2]">
            <div className="flex items-center justify-between border-b border-[#bec7d2]/40 pb-3">
              <div className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-base text-[#121c2a]">
                  Apply for Annual Fee Exemption (GA Vote)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setExemptionModalError(null);
                  setIsExemptionModalOpen(false);
                }}
                className="text-[#566771] hover:text-[#121c2a] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFeeExemptionApplication} className="space-y-4">
              {exemptionModalError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{exemptionModalError}</span>
                </div>
              )}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-emerald-950">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Privileges Protection Guarantee:
                </p>
                <p className="text-[11px] leading-relaxed">
                  Fee Exemptions are voted on yearly by the General Assembly. If granted, your annual contribution is set to
                  <strong> €0 / year</strong>, and you <strong>retain 100% full member privileges</strong>, including subsidized event registration fees and voting rights!
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Exemption Basis
                </label>
                <select
                  value={exemptionCategoryType}
                  onChange={(e) => setExemptionCategoryType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191]"
                >
                  <option value="student">Full-Time University Student (e.g. Bachelor / Master / PhD)</option>
                  <option value="hardship">Temporary Financial Hardship / Job Transition</option>
                  <option value="volunteer">Dedicated Association Volunteer / Madrasah Teacher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Application Justification / Documentation Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={exemptionReasonInput}
                  onChange={(e) => setExemptionReasonInput(e.target.value)}
                  placeholder="Provide supporting details (e.g., enrolled at RWTH Aachen semester 2026/27, active coordinator for youth halaqah)."
                  className="w-full p-3 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#bec7d2]/40">
                <button
                  type="button"
                  onClick={() => setIsExemptionModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#566771] hover:text-[#121c2a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 text-white font-bold text-xs rounded-xl hover:bg-purple-800 transition-colors cursor-pointer shadow-xs"
                >
                  Submit for General Assembly Vote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK TWINT PAYMENT MODAL */}
      {showTwintPayModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#bec7d2]">
            <div className="flex items-center justify-between border-b border-[#bec7d2]/40 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#006191]" />
                <h3 className="font-bold text-base text-[#121c2a]">
                  TWINT Mobile Payment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTwintPayModal(false)}
                className="text-[#566771] hover:text-[#121c2a] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#566771] block">Membership Contribution</span>
                <span className="text-sm font-bold text-[#121c2a]">
                  {isFamily ? 'Family Membership (1 Year)' : 'Personal Membership (1 Year)'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-[#006191]">
                  CHF {formData.yearlyContribution || (isFamily ? 120 : 80)}
                </span>
                <span className="text-[10px] text-emerald-700 block font-semibold">Art. 6 Statuten</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center text-center space-y-3">
              <div className="w-32 h-32 bg-white p-2 rounded-xl border-2 border-slate-300 shadow-xs flex items-center justify-center relative">
                <div className="w-28 h-28 bg-[radial-gradient(#121c2a_2px,transparent_2px)] [background-size:10px_10px] flex items-center justify-center">
                  <span className="px-2 py-1 bg-[#006191] text-white text-[10px] font-bold rounded shadow-xs">
                    TWINT PAY
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-[#566771] block">TWINT Mobile Number:</span>
                <span className="font-mono text-sm font-bold text-[#006191] bg-white px-3 py-1 rounded border border-slate-300 inline-block">
                  +41 79 123 45 67
                </span>
                <p className="text-[11px] text-[#566771] pt-1">
                  Recipient: <strong>Verein Percikan Iman Schweiz</strong>
                </p>
                <p className="text-[10px] text-emerald-700 font-medium">
                  Reference: {formData.memberCode} - {formData.name}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#bec7d2]/40">
              <button
                type="button"
                onClick={() => setShowTwintPayModal(false)}
                className="px-4 py-2 text-xs text-[#566771] hover:text-[#121c2a] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingTwint}
                onClick={handlePayViaTwintNow}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {isProcessingTwint ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Confirming with TWINT...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm TWINT Payment &amp; Activate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
