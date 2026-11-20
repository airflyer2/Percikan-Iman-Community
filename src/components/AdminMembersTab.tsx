import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  Banknote,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  Trash2,
  Users,
  Vote,
  X
} from 'lucide-react';
import { collection, getDocsFromServer } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n';
import {
  batchUpdateVerifiedVoteWeights,
  deleteMemberDocument,
  subscribeToFirestoreMembers,
  updateMemberDocument,
  VerifiedVoteWeightUpdate
} from '../lib/authService';
import { getFirebaseServices } from '../lib/firebase';
import { formatFirestoreError } from '../lib/firestoreContent';
import {
  CategoryChangeRequest,
  FeeExemptionInfo,
  FormalStatusRecord,
  UserAccount
} from '../types';
import { calculateVotingPower } from '../utils/votingPower';

function useOptionalAuth() {
  try {
    return useAuth();
  } catch {
    return null;
  }
}

interface AdminMembersTabProps {
  currentAdminName?: string;
  onOpenStatuten?: () => void;
}

export const AdminMembersTab: React.FC<AdminMembersTabProps> = ({
  currentAdminName,
  onOpenStatuten
}) => {
  const { t } = useLanguage();
  const auth = useOptionalAuth();

  const resolvedCurrentUser = auth?.currentUser ?? null;
  const isCallerSuperAdmin = Boolean(
    resolvedCurrentUser?.isSuperAdmin ?? auth?.isSuperAdmin
  );
  const resolvedAdminName = (
    currentAdminName ||
    resolvedCurrentUser?.name ||
    resolvedCurrentUser?.email ||
    'Board Administrator'
  ).slice(0, 150);

  const [members, setMembers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToFirestoreMembers(
      (list) => {
        setMembers(list);
        setLoading(false);
        setLoadError(null);
      },
      (err) => {
        setLoadError(formatFirestoreError(err, 'Failed to load members from Firestore.'));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'personal' | 'family'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [adminNotice, setAdminNotice] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [busyUids, setBusyUids] = useState<Record<string, boolean>>({});
  const busyUidsRef = useRef<Set<string>>(new Set());
  const [isBatchBusy, setIsBatchBusy] = useState(false);
  const isBatchBusyRef = useRef(false);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fee Exemption Grant Modal State
  const [isGrantExemptionOpen, setIsGrantExemptionOpen] = useState(false);
  const [exemptionModalError, setExemptionModalError] = useState<string | null>(null);
  const [selectedMemberUid, setSelectedMemberUid] = useState('');
  const [exemptionReason, setExemptionReason] = useState(
    'Full-time master student & youth halaqah volunteer'
  );
  const [exemptionResolutionRef, setExemptionResolutionRef] = useState(
    'GA-2026/RES-VOTE-12'
  );
  const [exemptionYear, setExemptionYear] = useState(2026);

  // GA Roll Ratification Modal State
  const [isGaRatificationModalOpen, setIsGaRatificationModalOpen] = useState(false);
  const [ratificationModalError, setRatificationModalError] = useState<string | null>(null);
  const [ratificationTargetYear, setRatificationTargetYear] = useState(2027);
  const [ratificationResolutionRef, setRatificationResolutionRef] = useState(
    'GA-2026/RAT-ROLL-01'
  );

  const isRowBusy = (uid?: string | null): boolean => Boolean(uid && busyUids[uid]);

  const startRowBusy = (uid: string): boolean => {
    if (busyUidsRef.current.has(uid)) return false;
    busyUidsRef.current.add(uid);
    setBusyUids((prev) => ({ ...prev, [uid]: true }));
    return true;
  };

  const endRowBusy = (uid: string) => {
    busyUidsRef.current.delete(uid);
    setBusyUids((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const canModifyMember = (m: UserAccount): boolean => {
    return Boolean(m.uid) && (isCallerSuperAdmin || !m.isSuperAdmin);
  };

  const showNotice = (msg: string) => {
    setAdminError(null);
    setAdminNotice(msg);
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => {
      setAdminNotice(null);
      noticeTimerRef.current = null;
    }, 5000);
  };

  const pendingRequests = useMemo(() => {
    return members.filter((m) => m.categoryChangeRequest?.status === 'pending');
  }, [members]);

  const feeExemptMembers = useMemo(() => {
    return members.filter((m) => m.feeExemption?.isExempt);
  }, [members]);

  const pendingPaymentMembers = useMemo(() => {
    return members.filter((m) => m.membershipStatus === 'pending_payment');
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const matchQuery =
        !q ||
        (m.name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q) ||
        (m.memberCode || '').toLowerCase().includes(q) ||
        (m.address?.city || '').toLowerCase().includes(q);

      const matchCategory =
        filterCategory === 'all' || m.membershipCategory === filterCategory;

      const matchStatus =
        filterStatus === 'all'
          ? true
          : filterStatus === 'exempt'
          ? m.feeExemption?.isExempt
          : m.membershipStatus === filterStatus;

      return matchQuery && matchCategory && matchStatus;
    });
  }, [members, searchQuery, filterCategory, filterStatus]);

  // 0. Approve Pending Payment
  const handleApprovePayment = async (member: UserAccount) => {
    if (!canModifyMember(member) || !member.uid) {
      setAdminError('Cannot modify this member record without UID and sufficient permissions.');
      return;
    }

    const feeAmount =
      member.yearlyContribution || (member.membershipCategory === 'family' ? 120 : 80);
    const methodLabel =
      member.paymentMethod === 'cash'
        ? 'Cash in Person'
        : member.paymentMethod === 'bank_transfer'
        ? 'Bank Transfer (PostFinance)'
        : 'Direct Payment';

    const auditRecord: FormalStatusRecord = {
      id: `fst-pay-${Date.now()}`,
      status: 'active',
      effectiveDate: new Date().toLocaleDateString('en-GB'),
      reason: `Annual membership fee (CHF ${feeAmount}) received & verified via ${methodLabel} by Board Administrator (${resolvedAdminName}). Account formally activated with full voting & statutory rights.`,
      recordedBy: resolvedAdminName,
      documentRef: `RCP-PAY-${Date.now().toString().slice(-6)}`,
      dateLogged: new Date().toLocaleDateString('en-GB')
    };

    const patch: Partial<UserAccount> = {
      membershipStatus: 'active',
      paymentStatus: 'paid',
      paidAt: new Date().toLocaleDateString('en-GB').slice(0, 100),
      paymentVerifiedBy: resolvedAdminName,
      formalStatusHistory: [auditRecord, ...(member.formalStatusHistory || [])].slice(0, 100)
    };

    if (!startRowBusy(member.uid)) return;
    setAdminError(null);
    try {
      await updateMemberDocument(member.uid, patch);
      showNotice(
        `Fee payment confirmed & membership activated for ${member.email}. Member now has active standing.`
      );
    } catch (err) {
      setAdminError(formatFirestoreError(err, 'Failed to approve member payment.'));
    } finally {
      endRowBusy(member.uid);
    }
  };

  // 1. Approve Category Change Request
  const handleApproveCategoryChange = async (member: UserAccount) => {
    if (!canModifyMember(member) || !member.uid || !member.categoryChangeRequest) {
      setAdminError('Cannot approve category change: missing UID or insufficient permissions.');
      return;
    }

    const targetCat = member.categoryChangeRequest.requestedCategory;
    const targetYearlyFee = targetCat === 'family' ? 120 : 80;
    const updatedContribution = member.feeExemption?.isExempt ? 0 : targetYearlyFee;

    const auditRecord: FormalStatusRecord = {
      id: `fst-cat-${Date.now()}`,
      status: member.membershipStatus || 'active',
      effectiveDate: new Date().toLocaleDateString('en-GB'),
      reason: `Category changed from ${(member.membershipCategory || 'personal').toUpperCase()} to ${targetCat.toUpperCase()} formally approved by Board Administrator (${resolvedAdminName}). Member note: "${member.categoryChangeRequest.reason || ''}"`,
      recordedBy: resolvedAdminName,
      documentRef: `GA-BOARD-APR-${Math.floor(1000 + Math.random() * 9000)}`,
      dateLogged: new Date().toLocaleDateString('en-GB')
    };

    // Construct strictly allowed 7-key CategoryChangeRequest (strips any legacy adminNotes)
    const updatedRequest: CategoryChangeRequest = {
      requestedCategory: member.categoryChangeRequest.requestedCategory,
      requestedAt: member.categoryChangeRequest.requestedAt,
      reason: member.categoryChangeRequest.reason,
      status: 'approved',
      reviewedBy: resolvedAdminName,
      reviewedAt: new Date().toLocaleDateString('en-GB').slice(0, 64)
    };

    const patch: Partial<UserAccount> = {
      membershipCategory: targetCat,
      yearlyContribution: updatedContribution,
      monthlyFee: targetCat === 'family' ? 10 : 6.67,
      categoryChangeRequest: updatedRequest,
      formalStatusHistory: [auditRecord, ...(member.formalStatusHistory || [])].slice(0, 100)
    };

    if (!startRowBusy(member.uid)) return;
    setAdminError(null);
    try {
      await updateMemberDocument(member.uid, patch);
      showNotice(`Category change request approved for ${member.email}.`);
    } catch (err) {
      setAdminError(formatFirestoreError(err, 'Failed to approve category change.'));
    } finally {
      endRowBusy(member.uid);
    }
  };

  // 2. Reject Category Change Request (uses reviewNotes — never adminNotes!)
  const handleRejectCategoryChange = async (member: UserAccount) => {
    if (!canModifyMember(member) || !member.uid || !member.categoryChangeRequest) {
      setAdminError('Cannot reject category change: missing UID or insufficient permissions.');
      return;
    }

    const updatedRequest: CategoryChangeRequest = {
      requestedCategory: member.categoryChangeRequest.requestedCategory,
      requestedAt: member.categoryChangeRequest.requestedAt,
      reason: member.categoryChangeRequest.reason,
      status: 'rejected',
      reviewedBy: resolvedAdminName,
      reviewedAt: new Date().toLocaleDateString('en-GB').slice(0, 64),
      reviewNotes: 'Declined after board administrator verification of household quota.'
    };

    if (!startRowBusy(member.uid)) return;
    setAdminError(null);
    try {
      await updateMemberDocument(member.uid, { categoryChangeRequest: updatedRequest });
      showNotice(`Category change request declined for ${member.email}.`);
    } catch (err) {
      setAdminError(formatFirestoreError(err, 'Failed to decline category change.'));
    } finally {
      endRowBusy(member.uid);
    }
  };

  // 3. Grant Annual Fee Exemption
  const handleGrantFeeExemption = async (e: React.FormEvent) => {
    e.preventDefault();
    setExemptionModalError(null);
    const targetMember = members.find((m) => m.uid === selectedMemberUid);
    if (!targetMember || !canModifyMember(targetMember) || !targetMember.uid) {
      setExemptionModalError('Please select a valid modifiable member.');
      return;
    }

    const yearNum = Number(exemptionYear);
    if (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > 2100) {
      setExemptionModalError('Exemption year must be between 1990 and 2100.');
      return;
    }

    const exemption: FeeExemptionInfo = {
      isExempt: true,
      exemptionYear: yearNum,
      resolutionRef: exemptionResolutionRef.trim().slice(0, 120),
      exemptionReason: exemptionReason.trim().slice(0, 500),
      retainsBenefits: true
    };

    const auditRecord: FormalStatusRecord = {
      id: `fst-exm-${Date.now()}`,
      status: targetMember.membershipStatus || 'active',
      effectiveDate: `01.01.${yearNum}`,
      reason: `Annual Fee Exemption (CHF 0/yr) formally voted by General Assembly for Year ${yearNum}. Full member privileges retained. Ref: ${exemptionResolutionRef}`,
      recordedBy: `General Assembly Resolution (${resolvedAdminName})`.slice(0, 150),
      documentRef: exemptionResolutionRef.trim(),
      dateLogged: new Date().toLocaleDateString('en-GB')
    };

    const patch: Partial<UserAccount> = {
      yearlyContribution: 0,
      feeExemption: exemption,
      formalStatusHistory: [auditRecord, ...(targetMember.formalStatusHistory || [])].slice(
        0,
        100
      )
    };

    if (!startRowBusy(targetMember.uid)) return;
    setAdminError(null);
    try {
      await updateMemberDocument(targetMember.uid, patch);
      setIsGrantExemptionOpen(false);
      setExemptionModalError(null);
      setSelectedMemberUid('');
      showNotice(
        `General Assembly Fee Exemption successfully granted for ${targetMember.email}.`
      );
    } catch (err) {
      setExemptionModalError(formatFirestoreError(err, 'Failed to grant fee exemption.'));
    } finally {
      endRowBusy(targetMember.uid);
    }
  };

  // 4. Revoke Fee Exemption
  const handleRevokeFeeExemption = async (member: UserAccount) => {
    if (!canModifyMember(member) || !member.uid) {
      setAdminError('Cannot modify this member record.');
      return;
    }

    const restoredContribution = member.membershipCategory === 'family' ? 120 : 80;
    const auditRecord: FormalStatusRecord = {
      id: `fst-rev-${Date.now()}`,
      status: member.membershipStatus || 'active',
      effectiveDate: new Date().toLocaleDateString('en-GB'),
      reason: `Annual Fee Exemption concluded. Standard yearly contribution (CHF ${restoredContribution}/yr) reinstated.`,
      recordedBy: resolvedAdminName,
      documentRef: `GA-EXM-REV-${Date.now()}`,
      dateLogged: new Date().toLocaleDateString('en-GB')
    };

    const patch: Partial<UserAccount> = {
      yearlyContribution: restoredContribution,
      feeExemption: {
        isExempt: false,
        retainsBenefits: true
      },
      formalStatusHistory: [auditRecord, ...(member.formalStatusHistory || [])].slice(0, 100)
    };

    if (!startRowBusy(member.uid)) return;
    setAdminError(null);
    try {
      await updateMemberDocument(member.uid, patch);
      showNotice(
        `Fee Exemption revoked. Standard annual contribution restored for ${member.email}.`
      );
    } catch (err) {
      setAdminError(formatFirestoreError(err, 'Failed to revoke fee exemption.'));
    } finally {
      endRowBusy(member.uid);
    }
  };

  // 5. Execute GA Annual Roll Ratification
  const handleExecuteGaRatification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBatchBusyRef.current) return;
    setRatificationModalError(null);
    const targetYear = Number(ratificationTargetYear);
    if (!Number.isInteger(targetYear) || targetYear < 1990 || targetYear > 2100) {
      setRatificationModalError('Ratification target year must be between 1990 and 2100.');
      return;
    }

    const targets = members.filter(
      (m) => m.membershipStatus === 'active' && canModifyMember(m)
    );
    if (targets.length === 0) {
      setRatificationModalError('No modifiable active member records found.');
      return;
    }

    isBatchBusyRef.current = true;
    setIsBatchBusy(true);
    setAdminError(null);
    try {
      await Promise.all(
        targets.map((m) => {
          const auditRecord: FormalStatusRecord = {
            id: `fst-ga-rat-${Date.now()}-${m.uid}`,
            status: 'active',
            effectiveDate: `01.01.${targetYear}`,
            reason: `General Assembly annual review & roll ratification adopted for Membership Year ${targetYear}. Resolution Ref: ${ratificationResolutionRef}`,
            recordedBy: `General Assembly Presidium (${resolvedAdminName})`.slice(0, 150),
            documentRef: ratificationResolutionRef.trim(),
            dateLogged: new Date().toLocaleDateString('en-GB')
          };
          const patch: Partial<UserAccount> = {
            membershipYear: targetYear,
            validUntil: `31 Dec ${targetYear} (Subject to GA Renewal)`,
            gaApprovalStatus: 'approved_current_year',
            lastGaResolutionRef: ratificationResolutionRef.trim(),
            formalStatusHistory: [auditRecord, ...(m.formalStatusHistory || [])].slice(0, 100)
          };
          return updateMemberDocument(m.uid!, patch);
        })
      );

      setIsGaRatificationModalOpen(false);
      setRatificationModalError(null);
      showNotice(
        `General Assembly Roll Ratification executed! ${targets.length} active member(s) renewed for Membership Year ${targetYear}.`
      );
    } catch (err) {
      setRatificationModalError(formatFirestoreError(err, 'Failed to execute GA roll ratification.'));
    } finally {
      isBatchBusyRef.current = false;
      setIsBatchBusy(false);
    }
  };

  // 6. Super Admin Role Delegation
  const handleToggleRole = async (
    targetMember: UserAccount,
    roleField: 'isAdmin' | 'canManageBoard' | 'canScanQR'
  ) => {
    if (!isCallerSuperAdmin || !targetMember.uid) return;

    const nextVal = !targetMember[roleField];
    const roleLabel =
      roleField === 'canScanQR'
        ? 'Event QR Scanner Operator'
        : roleField === 'canManageBoard'
        ? 'Board of Directors Officer'
        : 'Administrator';

    const auditEntry: FormalStatusRecord = {
      id: `fst-role-${Date.now()}`,
      status: targetMember.membershipStatus || 'active',
      effectiveDate: new Date().toLocaleDateString('en-GB'),
      reason: `Role privilege "${roleLabel}" ${nextVal ? 'GRANTED' : 'REVOKED'} by Super Administrator (${resolvedAdminName})`,
      recordedBy: resolvedAdminName,
      dateLogged: new Date().toLocaleDateString('en-GB')
    };

    const patch: Partial<UserAccount> = {
      [roleField]: nextVal,
      formalStatusHistory: [auditEntry, ...(targetMember.formalStatusHistory || [])].slice(
        0,
        100
      )
    };

    if (!startRowBusy(targetMember.uid)) return;
    setAdminError(null);
    try {
      await updateMemberDocument(targetMember.uid, patch);
      showNotice(
        `Permission "${roleLabel}" successfully ${nextVal ? 'GRANTED' : 'REVOKED'} for ${targetMember.name}.`
      );
    } catch (err) {
      setAdminError(formatFirestoreError(err, 'Failed to update staff role permission.'));
    } finally {
      endRowBusy(targetMember.uid);
    }
  };

  // 7. Super Admin Member Deletion
  const handleDeleteMember = async (member: UserAccount) => {
    if (
      !isCallerSuperAdmin ||
      !member.uid ||
      member.uid === resolvedCurrentUser?.uid
    ) {
      return;
    }

    if (
      !window.confirm(
        `Permanently delete member profile for "${member.name}" (${member.email})? This cannot be undone.`
      )
    ) {
      return;
    }

    if (!startRowBusy(member.uid)) return;
    setAdminError(null);
    try {
      await deleteMemberDocument(member.uid);
      showNotice(`Deleted member record for ${member.email}.`);
    } catch (err) {
      setAdminError(formatFirestoreError(err, 'Failed to delete member document.'));
    } finally {
      endRowBusy(member.uid);
    }
  };

  // 8. Re-verify single member vote weight
  const handleReverifyVoteWeight = async (member: UserAccount) => {
    if (!canModifyMember(member) || !member.uid) {
      setAdminError('Cannot re-verify vote weight for this member.');
      return;
    }

    const expectedWeight = Math.max(
      0,
      Math.min(20, Math.trunc(calculateVotingPower(member).totalVotes))
    );
    const patch: Partial<UserAccount> = {
      verifiedVoteWeight: expectedWeight,
      voteWeightVerifiedAt: new Date().toISOString().slice(0, 64),
      voteWeightVerifiedBy: resolvedAdminName
    };

    if (!startRowBusy(member.uid)) return;
    setAdminError(null);
    try {
      await updateMemberDocument(member.uid, patch);
      showNotice(
        `Verified GA vote weight (${expectedWeight}) for ${member.name}.`
      );
    } catch (err) {
      setAdminError(formatFirestoreError(err, 'Failed to verify member vote weight.'));
    } finally {
      endRowBusy(member.uid);
    }
  };

  // 9. Batch Certify Voter Roll
  const handleBatchCertifyVoterRoll = async () => {
    if (isBatchBusyRef.current) return;
    if (loading) {
      setAdminError('Voter roll is still synchronizing from Firestore. Please wait a moment.');
      return;
    }

    isBatchBusyRef.current = true;
    setIsBatchBusy(true);
    setAdminError(null);
    try {
      const services = getFirebaseServices();
      if (!services) {
        setAdminError('Firebase is not configured.');
        return;
      }
      const serverSnapshot = await getDocsFromServer(collection(services.db, 'members'));
      const authoritativeMembers: UserAccount[] = serverSnapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as UserAccount),
        uid: docSnap.id
      }));

      const nowIso = new Date().toISOString();
      const updates: VerifiedVoteWeightUpdate[] = [];
      for (const m of authoritativeMembers) {
        if (!canModifyMember(m) || !m.uid) continue;
        const expected = Math.max(
          0,
          Math.min(20, Math.trunc(calculateVotingPower(m).totalVotes))
        );
        if (m.verifiedVoteWeight !== expected) {
          updates.push({
            uid: m.uid,
            verifiedVoteWeight: expected,
            voteWeightVerifiedAt: nowIso,
            voteWeightVerifiedBy: resolvedAdminName
          });
        }
      }

      if (updates.length === 0) {
        showNotice('All modifiable member vote weights are already verified and up to date.');
        return;
      }

      await batchUpdateVerifiedVoteWeights(updates);
      showNotice(`Certified GA vote weights for ${updates.length} member(s).`);
    } catch (err) {
      setAdminError(formatFirestoreError(err, 'Failed to batch certify voter roll.'));
    } finally {
      isBatchBusyRef.current = false;
      setIsBatchBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {adminNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm flex items-center gap-3 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{adminNotice}</span>
        </div>
      )}

      {(loadError || adminError) && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{loadError || adminError}</span>
        </div>
      )}

      {/* 1. GOVERNANCE BANNER */}
      <div className="bg-gradient-to-r from-[#eff3ff] via-white to-[#f5f8ff] border-2 border-[#006191]/30 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-[#006191] text-white text-xs font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
                <Vote className="w-3.5 h-3.5" /> Generalversammlung (GV) Beschlusswesen
              </span>
              <span className="text-xs font-semibold text-[#566771]">
                Schweizer ZGB (Art. 60–79) • Amtsjahr 2026
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#121c2a]">
              {t.admin.gaRuleTitle}
            </h3>
            <p className="text-xs text-[#566771] max-w-3xl leading-relaxed">
              {t.admin.gaRuleDesc}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 shrink-0">
            {onOpenStatuten && (
              <button
                type="button"
                onClick={onOpenStatuten}
                className="px-4 py-2.5 bg-white border border-[#bec7d2] text-[#006191] hover:bg-[#eff3ff] text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Statuten (Art. 60 ff. ZGB)</span>
              </button>
            )}
            <button
              type="button"
              disabled={isBatchBusy || loading || members.length === 0}
              onClick={() => void handleBatchCertifyVoterRoll()}
              className="px-4 py-2.5 bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t.admin.certifyVoterRoll}</span>
            </button>
            <button
              type="button"
              disabled={isBatchBusy}
              onClick={() => {
                setRatificationModalError(null);
                setIsGaRatificationModalOpen(true);
              }}
              className="px-4 py-2.5 bg-[#006191] text-white hover:bg-[#007bb6] text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t.admin.simulateGaRatification}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setExemptionModalError(null);
                setIsGrantExemptionOpen(true);
              }}
              className="px-4 py-2.5 bg-purple-700 text-white hover:bg-purple-800 text-xs font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>{t.admin.voteFeeExemption}</span>
            </button>
          </div>
        </div>

        {/* Governance Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-[#bec7d2]/40">
          <div className="p-3 bg-white border border-[#bec7d2]/60 rounded-xl">
            <span className="text-[11px] font-semibold text-[#566771] block">Total Registered</span>
            <span className="text-xl font-bold text-[#121c2a]">{members.length} members</span>
          </div>
          <div className="p-3 bg-white border border-[#bec7d2]/60 rounded-xl">
            <span className="text-[11px] font-semibold text-[#566771] block">Active Standing</span>
            <span className="text-xl font-bold text-emerald-700">
              {members.filter((m) => m.membershipStatus === 'active').length} members
            </span>
          </div>
          <div className="p-3 bg-white border border-[#bec7d2]/60 rounded-xl">
            <span className="text-[11px] font-semibold text-[#566771] block">Pending Fee / Cash</span>
            <span className="text-xl font-bold text-amber-600">
              {pendingPaymentMembers.length} to verify
            </span>
          </div>
          <div className="p-3 bg-white border border-[#bec7d2]/60 rounded-xl">
            <span className="text-[11px] font-semibold text-[#566771] block">GA Fee Exemptions</span>
            <span className="text-xl font-bold text-purple-700">
              {feeExemptMembers.length} approved
            </span>
          </div>
          <div className="p-3 bg-white border border-[#bec7d2]/60 rounded-xl">
            <span className="text-[11px] font-semibold text-[#566771] block">Category Reviews</span>
            <span className="text-xl font-bold text-sky-700">
              {pendingRequests.length} requests
            </span>
          </div>
        </div>
      </div>

      {/* 2. PENDING CATEGORY CHANGE REQUESTS QUEUE */}
      <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#bec7d2]/40 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#121c2a] flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <span>{t.admin.pendingCategoryRequests}</span>
            </h3>
            <p className="text-xs text-[#566771] mt-0.5">
              Category change requests (Personal ↔ Family) require Board Administrator verification.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto">
            {pendingRequests.length} Pending
          </span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center bg-[#f9f9ff] border-2 border-dashed border-[#bec7d2]/60 rounded-xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-semibold text-[#121c2a]">
              No pending category change requests.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((member) => {
              const allowed = canModifyMember(member);
              const isBusy = isRowBusy(member.uid);
              return (
                <div
                  key={member.uid || member.email}
                  className="p-4 bg-amber-50/60 border-2 border-amber-300 rounded-xl space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-[#121c2a]">{member.name}</h4>
                      <p className="text-xs text-[#566771]">{member.email}</p>
                      <span className="inline-block mt-1 text-[11px] font-mono text-[#006191] bg-white px-2 py-0.5 rounded border border-[#006191]/20">
                        ID: {member.memberCode}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      Awaiting Review
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-amber-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-[#566771]">Current Category:</span>
                      <span className="capitalize text-[#121c2a]">
                        {member.membershipCategory} (CHF{' '}
                        {member.membershipCategory === 'family' ? 120 : 80}/yr)
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-bold text-[#006191]">
                      <span>Requested Transition:</span>
                      <span className="capitalize">
                        {member.categoryChangeRequest?.requestedCategory} (CHF{' '}
                        {member.categoryChangeRequest?.requestedCategory === 'family' ? 120 : 80}
                        /yr)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#566771]">
                      <span>Requested Date:</span>
                      <span>{member.categoryChangeRequest?.requestedAt}</span>
                    </div>
                  </div>

                  {member.categoryChangeRequest?.reason && (
                    <div className="text-xs text-[#3f4850] bg-white/80 p-2.5 rounded-lg border border-amber-200/80">
                      <span className="font-bold text-[#121c2a] block text-[11px] uppercase mb-0.5">
                        Justification:
                      </span>
                      <p className="italic">“{member.categoryChangeRequest.reason}”</p>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200">
                    {allowed ? (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleRejectCategoryChange(member)}
                          className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" /> {t.admin.decline}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleApproveCategoryChange(member)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" /> {t.admin.approve}
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-[#566771] italic">
                        Protected Super Admin record
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2b. PENDING FEE PAYMENTS & CASH REGISTRATIONS */}
      <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#bec7d2]/40 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#121c2a] flex items-center gap-2">
              <Banknote className="w-5 h-5 text-amber-600" />
              <span>Pending Fee Payments &amp; Cash Registrations ({pendingPaymentMembers.length})</span>
            </h3>
            <p className="text-xs text-[#566771] mt-0.5">
              Members selecting Cash or Bank Transfer remain in Pending Payment until verified.
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 self-start sm:self-auto">
            {pendingPaymentMembers.length} Awaiting Payment
          </span>
        </div>

        {pendingPaymentMembers.length === 0 ? (
          <div className="p-8 text-center bg-[#f9f9ff] border-2 border-dashed border-[#bec7d2]/60 rounded-xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-semibold text-[#121c2a]">
              All member dues and contributions are up to date.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPaymentMembers.map((member) => {
              const allowed = canModifyMember(member);
              const isBusy = isRowBusy(member.uid);
              return (
                <div
                  key={member.uid || member.email}
                  className="p-4 bg-amber-50/70 border-2 border-amber-300 rounded-xl space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-[#121c2a]">{member.name}</h4>
                      <p className="text-xs text-[#566771]">{member.email}</p>
                      <span className="inline-block mt-1 text-[11px] font-mono text-[#006191] bg-white px-2 py-0.5 rounded border border-[#006191]/20">
                        ID: {member.memberCode}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
                      {member.paymentMethod === 'cash' ? 'Cash Settlement' : 'Bank Transfer'}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-amber-200 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-[#566771]">Tier &amp; Statutory Fee:</span>
                      <span className="capitalize text-[#121c2a] font-bold">
                        {member.membershipCategory} (CHF{' '}
                        {member.membershipCategory === 'family' ? 120 : 80})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#566771]">
                      <span>Reference / Code:</span>
                      <span className="font-mono font-semibold">
                        {member.paymentReference || member.memberCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                    <span className="text-[11px] text-amber-800 italic">
                      Received fee in person or bank?
                    </span>
                    {allowed ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleApprovePayment(member)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve &amp; Activate
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#566771] italic">
                        Protected Super Admin
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. GENERAL ASSEMBLY FEE EXEMPTIONS */}
      <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#bec7d2]/40 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#121c2a] flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-700" />
              <span>General Assembly Annual Fee Exemptions ({feeExemptMembers.length})</span>
            </h3>
            <p className="text-xs text-[#566771] mt-0.5">
              Exempted members retain full benefits (subsidized event fees, GA voting rights).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsGrantExemptionOpen(true)}
            className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Grant Exemption (Vote)
          </button>
        </div>

        <div className="border border-[#bec7d2]/60 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f2f6fc] text-[#121c2a] font-bold border-b border-[#bec7d2]/60">
              <tr>
                <th className="p-3">Member Name &amp; Code</th>
                <th className="p-3">Voted Year</th>
                <th className="p-3">Annual Contribution</th>
                <th className="p-3">Justification</th>
                <th className="p-3">Retained Benefits</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6eeff]">
              {feeExemptMembers.length > 0 ? (
                feeExemptMembers.map((member) => {
                  const allowed = canModifyMember(member);
                  return (
                    <tr key={member.uid || member.email} className="hover:bg-[#f9f9ff]">
                      <td className="p-3">
                        <p className="font-bold text-[#121c2a]">{member.name}</p>
                        <p className="text-[11px] text-[#566771] font-mono">
                          {member.memberCode} • {member.email}
                        </p>
                      </td>
                      <td className="p-3 font-semibold text-purple-900 whitespace-nowrap">
                        Year {member.feeExemption?.exemptionYear || 2026}
                        <span className="block text-[10px] text-[#566771] font-mono">
                          Ref: {member.feeExemption?.resolutionRef}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                          CHF 0 / year (Voted)
                        </span>
                      </td>
                      <td className="p-3 text-[#3f4850] max-w-xs">
                        {member.feeExemption?.exemptionReason ||
                          'Approved under GA hardship/student resolution'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <Ticket className="w-3.5 h-3.5" /> Subsidized Tickets &amp; GA Voting
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {allowed ? (
                          <button
                            type="button"
                            disabled={isRowBusy(member.uid)}
                            onClick={() => void handleRevokeFeeExemption(member)}
                            className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#566771] italic">Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-xs text-[#566771]">
                    No fee exemptions currently active.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. OFFICIAL MEMBERS LEDGER & DIRECTORY */}
      <div className="bg-white rounded-2xl border border-[#bec7d2]/60 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#bec7d2]/40 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#121c2a] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#006191]" />
              <span>
                {t.admin.allRegisteredMembers} ({filteredMembers.length})
              </span>
            </h3>
            <p className="text-xs text-[#566771] mt-0.5">
              Live Firestore member roll with certified GA voting weights, statuses, and role permissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.admin.searchMembersPlaceholder}
                className="pl-8 pr-3 py-1.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191]"
              />
              <Search className="w-3.5 h-3.5 text-[#566771] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(e.target.value as 'all' | 'personal' | 'family')
              }
              className="px-2.5 py-1.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191]"
            >
              <option value="all">All Categories</option>
              <option value="personal">Personal Tier (CHF 80/yr)</option>
              <option value="family">Family Tier (CHF 120/yr)</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-[#f9f9ff] border border-[#bec7d2] rounded-lg text-xs outline-none focus:border-[#006191]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_payment">
                Pending Fee Payment ({pendingPaymentMembers.length})
              </option>
              <option value="relocated">Relocated Abroad</option>
              <option value="fee_paused">Fee Paused</option>
              <option value="exempt">GA Fee-Exempt</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs text-[#566771]">
            Loading members from Cloud Firestore...
          </div>
        ) : (
          <div className="border border-[#bec7d2]/60 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f2f6fc] text-[#121c2a] font-bold border-b border-[#bec7d2]/60">
                <tr>
                  <th className="p-3">Member &amp; Code</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Yearly Contribution</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">{t.admin.voterRollTitle}</th>
                  <th className="p-3">GA Validity</th>
                  {isCallerSuperAdmin && <th className="p-3 text-right">Role &amp; Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6eeff]">
                {filteredMembers.map((m) => {
                  const allowed = canModifyMember(m);
                  const isBusy = isRowBusy(m.uid);
                  const expectedVoteWeight = Math.max(
                    0,
                    Math.min(20, Math.trunc(calculateVotingPower(m).totalVotes))
                  );
                  const hasVerifiedWeight = typeof m.verifiedVoteWeight === 'number';
                  const isWeightMismatch =
                    hasVerifiedWeight && m.verifiedVoteWeight !== expectedVoteWeight;

                  return (
                    <tr key={m.uid || m.email} className="hover:bg-[#f9f9ff]">
                      <td className="p-3">
                        <p className="font-bold text-[#121c2a]">{m.name}</p>
                        <p className="text-[11px] text-[#566771]">
                          {m.email} • {m.address?.city || 'Switzerland'}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] font-mono text-[#006191] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {m.memberCode}
                          </span>
                          {m.isSuperAdmin && (
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-900 px-1.5 py-0.5 rounded">
                              Super Admin
                            </span>
                          )}
                          {m.isAdmin && !m.isSuperAdmin && (
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                          {m.canManageBoard && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                              Board
                            </span>
                          )}
                          {m.canScanQR && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                              <QrCode className="w-2.5 h-2.5" /> Scanner
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            m.membershipCategory === 'family'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {m.membershipCategory || 'personal'}
                          {m.membershipCategory === 'family' &&
                            ` (${m.children?.length || 0} kids)`}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-[#121c2a]">
                          {m.feeExemption?.isExempt
                            ? 'CHF 0 / year (GA Exempt)'
                            : m.membershipStatus === 'pending_payment'
                            ? `CHF ${m.yearlyContribution || (m.membershipCategory === 'family' ? 120 : 80)} / yr (Pending)`
                            : m.membershipStatus !== 'active'
                            ? 'CHF 0 / year (Suspended)'
                            : `CHF ${m.yearlyContribution || (m.membershipCategory === 'family' ? 120 : 80)} / year`}
                        </span>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              m.membershipStatus === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.membershipStatus === 'pending_payment'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : m.membershipStatus === 'relocated'
                                ? 'bg-amber-100 text-amber-800'
                                : m.membershipStatus === 'fee_paused'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {m.membershipStatus === 'pending_payment'
                              ? 'Fee Pending'
                              : m.membershipStatus}
                          </span>

                          {m.membershipStatus === 'pending_payment' && allowed && (
                            <div className="mt-1">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleApprovePayment(m)}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-2.5 h-2.5" /> Approve Payment
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Verified GA Vote Weight Column */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="space-y-1">
                          {!hasVerifiedWeight ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                              {t.admin.voteWeightPending} (Exp: {expectedVoteWeight})
                            </span>
                          ) : isWeightMismatch ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                              <ShieldAlert className="w-3 h-3" />
                              {t.admin.voteWeightMismatch} ({m.verifiedVoteWeight} ≠{' '}
                              {expectedVoteWeight})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              {t.admin.voteWeightVerified}: {m.verifiedVoteWeight}
                            </span>
                          )}

                          {(!hasVerifiedWeight || isWeightMismatch) && allowed && (
                            <div>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleReverifyVoteWeight(m)}
                                className="px-2 py-0.5 bg-[#006191] hover:bg-[#007bb6] text-white rounded text-[10px] font-bold cursor-pointer disabled:opacity-50"
                              >
                                {t.admin.reverifyVoteWeight}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap text-[11px] text-[#566771]">
                        <span className="font-medium text-[#121c2a] block">
                          Year {m.membershipYear || 2026}
                        </span>
                        <span className="text-[10px] text-emerald-700">
                          Valid through 31.12.{m.membershipYear || 2026}
                        </span>
                      </td>

                      {isCallerSuperAdmin && (
                        <td className="p-3 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleToggleRole(m, 'canScanQR')}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border disabled:opacity-50 ${
                                m.canScanQR
                                  ? 'bg-emerald-600 text-white border-emerald-700'
                                  : 'bg-white text-[#566771] border-[#bec7d2] hover:border-emerald-500'
                              }`}
                            >
                              QR {m.canScanQR ? '✓' : '+'}
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleToggleRole(m, 'canManageBoard')}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border disabled:opacity-50 ${
                                m.canManageBoard
                                  ? 'bg-[#006191] text-white border-[#004f76]'
                                  : 'bg-white text-[#566771] border-[#bec7d2] hover:border-[#006191]'
                              }`}
                            >
                              Board {m.canManageBoard ? '✓' : '+'}
                            </button>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleToggleRole(m, 'isAdmin')}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer border disabled:opacity-50 ${
                                m.isAdmin
                                  ? 'bg-purple-700 text-white border-purple-800'
                                  : 'bg-white text-[#566771] border-[#bec7d2] hover:border-purple-600'
                              }`}
                            >
                              Admin {m.isAdmin ? '✓' : '+'}
                            </button>

                            {m.uid && m.uid !== resolvedCurrentUser?.uid && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleDeleteMember(m)}
                                className="p-1 text-[#ba1a1a] hover:bg-rose-50 rounded-md cursor-pointer disabled:opacity-50"
                                title="Delete Member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Grant Annual Fee Exemption */}
      {isGrantExemptionOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#bec7d2]">
            <div className="flex items-center justify-between border-b border-[#bec7d2]/40 pb-3">
              <div className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-base text-[#121c2a]">
                  Record General Assembly Fee Exemption Vote
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGrantExemptionOpen(false)}
                className="text-[#566771] hover:text-[#121c2a] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleGrantFeeExemption(e)} className="space-y-4">
              {exemptionModalError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{exemptionModalError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Select Member *
                </label>
                <select
                  required
                  value={selectedMemberUid}
                  onChange={(e) => setSelectedMemberUid(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191]"
                >
                  <option value="">-- Choose Member --</option>
                  {members.filter(canModifyMember).map((m) => (
                    <option key={m.uid || m.email} value={m.uid || ''}>
                      {m.name} ({m.email}) - {m.membershipCategory}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Vote Term Year
                  </label>
                  <input
                    type="number"
                    min={1990}
                    max={2100}
                    value={exemptionYear}
                    onChange={(e) => setExemptionYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    GA Resolution Ref
                  </label>
                  <input
                    type="text"
                    required
                    value={exemptionResolutionRef}
                    onChange={(e) => setExemptionResolutionRef(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs font-mono outline-none focus:border-[#006191]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                  Exemption Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={exemptionReason}
                  onChange={(e) => setExemptionReason(e.target.value)}
                  className="w-full p-3 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#bec7d2]/40">
                <button
                  type="button"
                  onClick={() => setIsGrantExemptionOpen(false)}
                  className="px-4 py-2 text-xs text-[#566771] hover:text-[#121c2a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRowBusy(selectedMemberUid)}
                  className="px-5 py-2 bg-purple-700 text-white font-bold text-xs rounded-xl hover:bg-purple-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Confirm GA Exemption Vote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GA Roll Ratification */}
      {isGaRatificationModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-[#bec7d2]">
            <div className="flex items-center justify-between border-b border-[#bec7d2]/40 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#006191]" />
                <h3 className="font-bold text-base text-[#121c2a]">
                  General Assembly Annual Roll Ratification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGaRatificationModalOpen(false)}
                className="text-[#566771] hover:text-[#121c2a] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleExecuteGaRatification(e)} className="space-y-4">
              {ratificationModalError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{ratificationModalError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    Renewal Membership Year
                  </label>
                  <input
                    type="number"
                    min={1990}
                    max={2100}
                    value={ratificationTargetYear}
                    onChange={(e) => setRatificationTargetYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs outline-none focus:border-[#006191]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121c2a] uppercase mb-1">
                    GA Ratification Ref
                  </label>
                  <input
                    type="text"
                    required
                    value={ratificationResolutionRef}
                    onChange={(e) => setRatificationResolutionRef(e.target.value)}
                    className="w-full px-3 py-2 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs font-mono outline-none focus:border-[#006191]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#bec7d2]/40">
                <button
                  type="button"
                  onClick={() => setIsGaRatificationModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#566771] hover:text-[#121c2a] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBatchBusy}
                  className="px-5 py-2 bg-[#006191] text-white font-bold text-xs rounded-xl hover:bg-[#007bb6] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isBatchBusy ? 'Ratifying...' : 'Execute GA Roll Ratification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
