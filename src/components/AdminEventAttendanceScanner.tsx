import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Banknote,
  Calendar,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  History,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToFirestoreMembers } from '../lib/authService';
import {
  deleteAttendanceRecord,
  recordAttendanceCheckIn,
  settleDoorCashFee,
  subscribeAttendanceRecords
} from '../lib/firestoreAttendance';
import { formatFirestoreError, subscribeEvents } from '../lib/firestoreContent';
import {
  CommunityEvent,
  EventAttendanceRecord,
  FormalStatusRecord,
  UserAccount
} from '../types';

function useOptionalAuth() {
  try {
    return useAuth();
  } catch {
    return null;
  }
}

interface AdminEventAttendanceScannerProps {
  currentAdminName?: string;
}

export const AdminEventAttendanceScanner: React.FC<
  AdminEventAttendanceScannerProps
> = ({ currentAdminName }) => {
  const auth = useOptionalAuth();
  const resolvedUser = auth?.currentUser ?? null;
  const hasFullAdmin = Boolean(
    resolvedUser?.isAdmin || resolvedUser?.isSuperAdmin || auth?.hasFullAdmin
  );
  const resolvedAdminName = (
    currentAdminName ||
    resolvedUser?.name ||
    resolvedUser?.email ||
    'Vorstand Admin'
  ).slice(0, 150);

  // Live Firestore subscriptions
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [members, setMembers] = useState<UserAccount[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [attendanceRecords, setAttendanceRecords] = useState<EventAttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Camera & scanning state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSettlingDoorFee, setIsSettlingDoorFee] = useState(false);

  // Latest scanned result
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    rejectionReason?: 'not_member' | 'unpaid_fee' | 'inactive' | 'invalid_format' | 'duplicate';
    member?: UserAccount;
    parsedPayload?: Record<string, unknown>;
    message: string;
    party: string[];
    isDuplicate?: boolean;
    scannedAt: string;
    pendingFeeAmount?: number;
  } | null>(null);

  // Manual code fallback search
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Table filter & search
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [filterEventId, setFilterEventId] = useState<string>('all');

  // DOM & Scan Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedPayloadRef = useRef<{ key: string; timestamp: number } | null>(null);
  const handleScanPayloadRef = useRef<(rawData: string) => Promise<void>>(async () => {});
  const isSettlingDoorRef = useRef(false);
  const settledDoorUidsRef = useRef<Set<string>>(new Set());
  const isSubmittingManualRef = useRef(false);

  useEffect(() => {
    const unsubEvents = subscribeEvents((res) => {
      setEvents(res.data);
      setEventsLoading(res.loading);
      setEventsError(res.error);
    });
    const unsubAttendance = subscribeAttendanceRecords((res) => {
      setAttendanceRecords(res.data);
      setAttendanceLoading(res.loading);
      setAttendanceError(res.error);
    });
    const unsubMembers = subscribeToFirestoreMembers(
      (list) => {
        setMembers(list);
        setMembersLoading(false);
        setMembersError(null);
      },
      (err) => {
        setMembersLoading(false);
        setMembersError(formatFirestoreError(err, 'Failed to load members.'));
      }
    );

    return () => {
      unsubEvents();
      unsubAttendance();
      unsubMembers();
    };
  }, []);

  useEffect(() => {
    if (events.length === 0) {
      setSelectedEventId('');
      return;
    }
    if (!selectedEventId || !events.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const currentEvent = useMemo(() => {
    return events.find((e) => e.id === selectedEventId) || events[0] || null;
  }, [events, selectedEventId]);

  const playChime = useCallback(
    (isSuccess: boolean) => {
      if (!soundEnabled) return;
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (isSuccess) {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } else {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, ctx.currentTime);
          osc.frequency.setValueAtTime(220, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (e) {
        console.warn('Audio feedback failed:', e);
      }
    },
    [soundEnabled]
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      const errorObj = err as { name?: string; message?: string };
      if (
        errorObj.name === 'NotAllowedError' ||
        errorObj.name === 'PermissionDeniedError'
      ) {
        setCameraError(
          'Kamerazugriff wurde im Browser abgelehnt. Bitte Berechtigung erteilen oder manuelle Codesuche nutzen.'
        );
      } else if (errorObj.name === 'NotFoundError') {
        setCameraError('Keine Kamera auf diesem Gerät erkannt.');
      } else {
        setCameraError(`Kamera-Fehler: ${errorObj.message || 'Zugriff fehlgeschlagen.'}`);
      }
      setIsCameraActive(false);
    }
  };

  const toggleFacingMode = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => {
        void startCamera();
      }, 100);
    }
  };

  const handleScanPayload = useCallback(
    async (rawData: string) => {
      setActionError(null);

      if (!currentEvent) {
        setActionError('Bitte wählen Sie zuerst ein aktives Community-Event aus.');
        return;
      }

      if (membersLoading) {
        setActionError('Mitgliederdaten werden noch synchronisiert. Bitte kurz warten.');
        return;
      }

      const normalizedRaw = rawData.trim();
      if (!normalizedRaw) return;

      const dedupeKey = `${currentEvent.id}:${normalizedRaw}`;
      const now = Date.now();
      if (
        lastScannedPayloadRef.current &&
        lastScannedPayloadRef.current.key === dedupeKey &&
        now - lastScannedPayloadRef.current.timestamp < 3000
      ) {
        return;
      }

      lastScannedPayloadRef.current = { key: dedupeKey, timestamp: now };

      let parsed: Record<string, unknown> | null = null;
      let lookupMemberCode = '';
      let lookupUid = '';
      let partyList: string[] = [];

      try {
        const candidate: unknown = JSON.parse(normalizedRaw);
        if (candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate)) {
          parsed = candidate as Record<string, unknown>;
          lookupMemberCode = String(parsed.memberId || parsed.memberCode || '').trim();
          lookupUid = String(parsed.uid || '').trim();
          if (Array.isArray(parsed.party) && parsed.party.length > 0) {
            partyList = parsed.party.map((item) => String(item));
          } else if (typeof parsed.name === 'string' && parsed.name) {
            partyList = [parsed.name];
          }
        } else {
          lookupMemberCode = normalizedRaw;
        }
      } catch {
        lookupMemberCode = normalizedRaw;
      }

      const parsedEmail =
        typeof parsed?.memberEmail === 'string'
          ? parsed.memberEmail.trim().toLowerCase()
          : typeof parsed?.email === 'string'
          ? parsed.email.trim().toLowerCase()
          : '';

      const matchedMember = members.find((m) => {
        if (parsed !== null) {
          // Security: JSON QR payloads must match an authoritative identifier (uid, memberCode, or email),
          // NEVER by display name alone, and all provided identifiers must agree.
          const hasAnyIdentifier = Boolean(lookupUid || lookupMemberCode || parsedEmail);
          if (!hasAnyIdentifier) return false;
          if (lookupUid && m.uid !== lookupUid) return false;
          if (
            lookupMemberCode &&
            (m.memberCode || '').trim().toLowerCase() !== lookupMemberCode.toLowerCase()
          ) {
            return false;
          }
          if (
            parsedEmail &&
            (m.email || '').trim().toLowerCase() !== parsedEmail
          ) {
            return false;
          }
          return true;
        }

        const codeLower = lookupMemberCode.toLowerCase();
        return Boolean(
          codeLower && (m.memberCode || '').trim().toLowerCase() === codeLower
        );
      });

      if (!matchedMember) {
        playChime(false);
        setLastScanResult({
          success: false,
          rejectionReason: 'not_member',
          message:
            '⛔ Zutritt verweigert: Kein registriertes Vereinsmitglied gefunden. Nur registrierte Mitglieder haben Zutritt.',
          party: [],
          scannedAt: new Date().toLocaleTimeString('de-CH')
        });
        return;
      }

      const memberName = matchedMember.name;
      const memberCode = matchedMember.memberCode || lookupMemberCode || 'PI-MEMBER';
      const memberCategory = matchedMember.membershipCategory || 'personal';
      const memberStatus = matchedMember.membershipStatus || 'active';
      const isExempt = Boolean(matchedMember.feeExemption?.isExempt);
      const requiredFee = memberCategory === 'family' ? 120 : 80;

      if (partyList.length === 0) {
        partyList = [memberName];
      }

      if (memberStatus === 'pending_payment' && !isExempt) {
        playChime(false);
        setLastScanResult({
          success: false,
          rejectionReason: 'unpaid_fee',
          member: matchedMember,
          parsedPayload: parsed || undefined,
          pendingFeeAmount: requiredFee,
          message: `⚠️ Einlass gesperrt: Jahresbeitrag ausstehend (CHF ${requiredFee}.00 offen). Einlass nur nach Begleichung des Mitgliederbeitrags.`,
          party: partyList,
          scannedAt: new Date().toLocaleTimeString('de-CH')
        });
        return;
      }

      if (memberStatus !== 'active' && !isExempt) {
        playChime(false);
        const statusLabel =
          memberStatus === 'inactive'
            ? 'Inaktiv'
            : memberStatus === 'fee_paused'
            ? 'Pausiert'
            : memberStatus === 'relocated'
            ? 'Verzogen'
            : memberStatus;
        setLastScanResult({
          success: false,
          rejectionReason: 'inactive',
          member: matchedMember,
          parsedPayload: parsed || undefined,
          message: `⛔ Zutritt verweigert: Mitgliedschaftsstatus ist "${statusLabel}" (nicht aktiv).`,
          party: partyList,
          scannedAt: new Date().toLocaleTimeString('de-CH')
        });
        return;
      }

      const existingCheckin = attendanceRecords.find(
        (r) =>
          r.eventId === currentEvent.id &&
          ((r.memberCode || '').toLowerCase() === memberCode.toLowerCase() ||
            (matchedMember.email &&
              r.memberEmail?.toLowerCase() === matchedMember.email.toLowerCase()))
      );

      const isDuplicate = Boolean(existingCheckin);

      try {
        if (!isDuplicate) {
          await recordAttendanceCheckIn({
            eventId: currentEvent.id,
            eventTitle: currentEvent.title,
            memberCode,
            memberName,
            memberEmail: matchedMember.email,
            category: memberCategory,
            status: memberStatus,
            isFeeExempt: isExempt,
            partyCount: partyList.length,
            partyMembers: partyList,
            scannedAt: new Date().toISOString(),
            scannedBy: resolvedAdminName,
            feePaidChf: 0,
            verified: true
          });
        }

        playChime(true);
        setLastScanResult({
          success: true,
          member: matchedMember,
          parsedPayload: parsed || undefined,
          message: isDuplicate
            ? `⚠️ Bereits eingecheckt! Eintritt erneut bestätigt für ${memberName}.`
            : `✅ Check-in erfolgreich! Willkommen, ${memberName}.`,
          party: partyList,
          isDuplicate,
          scannedAt: new Date().toLocaleTimeString('de-CH')
        });
      } catch (err) {
        playChime(false);
        setActionError(
          formatFirestoreError(err, 'Check-in konnte nicht in Firestore gespeichert werden.')
        );
      }
    },
    [attendanceRecords, currentEvent, members, membersLoading, playChime, resolvedAdminName]
  );

  useEffect(() => {
    handleScanPayloadRef.current = handleScanPayload;
  }, [handleScanPayload]);

  useEffect(() => {
    if (!isCameraActive) return;

    let isActive = true;
    const tick = () => {
      if (!isActive) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (qrCode && qrCode.data) {
            void handleScanPayloadRef.current(qrCode.data);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCameraActive]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleDoorPaymentAndCheckin = async (
    member: UserAccount,
    feeAmount: number
  ) => {
    if (isSettlingDoorRef.current) return;
    if (!currentEvent) {
      setActionError('Bitte wählen Sie zuerst ein aktives Event aus.');
      return;
    }
    if (!member.uid) {
      setActionError('Mitglieds-UID fehlt — Barzahlung kann nicht in Firestore gebucht werden.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-GB');
    const auditRecord: FormalStatusRecord = {
      id: `fst-door-${Date.now()}`,
      status: 'active',
      effectiveDate: todayStr,
      reason: `Annual membership fee (CHF ${feeAmount}.00) settled in cash at event door (${currentEvent.title}) and verified by ${resolvedAdminName}.`,
      recordedBy: resolvedAdminName,
      documentRef: `DOOR-CASH-${Date.now().toString().slice(-6)}`,
      dateLogged: todayStr
    };

    const nextHistory = [auditRecord, ...(member.formalStatusHistory || [])].slice(0, 100);
    const memberName = member.name;
    const memberCode = member.memberCode || 'PI-MEMBER';
    const partyList =
      lastScanResult?.party && lastScanResult.party.length > 0
        ? lastScanResult.party
        : [memberName];

    isSettlingDoorRef.current = true;
    setIsSettlingDoorFee(true);
    setActionError(null);
    try {
      const alreadySettled =
        settledDoorUidsRef.current.has(member.uid) ||
        (member.membershipStatus === 'active' && member.paymentStatus === 'paid');

      if (!alreadySettled) {
        await settleDoorCashFee(member.uid, {
          membershipStatus: 'active',
          paymentStatus: 'paid',
          paymentMethod: 'cash',
          paidAt: todayStr,
          paymentVerifiedBy: resolvedAdminName,
          formalStatusHistory: nextHistory
        });
        settledDoorUidsRef.current.add(member.uid);
      }

      const existingCheckin = attendanceRecords.find(
        (r) =>
          r.eventId === currentEvent.id &&
          ((r.memberCode || '').toLowerCase() === memberCode.toLowerCase() ||
            (member.email && r.memberEmail?.toLowerCase() === member.email.toLowerCase()))
      );

      if (!existingCheckin) {
        await recordAttendanceCheckIn({
          eventId: currentEvent.id,
          eventTitle: currentEvent.title,
          memberCode,
          memberName,
          memberEmail: member.email,
          category: member.membershipCategory || 'personal',
          status: 'active',
          isFeeExempt: false,
          partyCount: partyList.length,
          partyMembers: partyList,
          scannedAt: new Date().toISOString(),
          scannedBy: resolvedAdminName,
          feePaidChf: feeAmount,
          verified: true,
          notes: `Jahresbeitrag CHF ${feeAmount}.00 bar an der Kasse bezahlt und freigeschaltet`
        });
      }

      playChime(true);
      setLastScanResult({
        success: true,
        member: {
          ...member,
          membershipStatus: 'active',
          paymentStatus: 'paid',
          paymentMethod: 'cash'
        },
        message: `✅ Zahlung von CHF ${feeAmount}.00 erhalten! ${memberName} ist jetzt aktiviert und eingecheckt.`,
        party: partyList,
        isDuplicate: Boolean(existingCheckin),
        scannedAt: new Date().toLocaleTimeString('de-CH')
      });
    } catch (err) {
      playChime(false);
      setActionError(
        formatFirestoreError(err, 'Barzahlung an der Abendkasse fehlgeschlagen.')
      );
    } finally {
      isSettlingDoorRef.current = false;
      setIsSettlingDoorFee(false);
    }
  };

  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingManualRef.current || isSubmittingManual) return;
    setManualError(null);
    const code = manualCodeInput.trim();
    if (!code) return;
    if (!currentEvent) {
      setManualError('Bitte wählen Sie zuerst ein Event aus.');
      return;
    }

    setManualCodeInput('');
    isSubmittingManualRef.current = true;
    setIsSubmittingManual(true);
    try {
      await handleScanPayload(code);
    } finally {
      isSubmittingManualRef.current = false;
      setIsSubmittingManual(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = logSearchQuery.trim().toLowerCase();
    return attendanceRecords.filter((rec) => {
      const matchEvent = filterEventId === 'all' || rec.eventId === filterEventId;
      const matchSearch =
        !q ||
        (rec.memberName || '').toLowerCase().includes(q) ||
        (rec.memberCode || '').toLowerCase().includes(q) ||
        (rec.eventTitle || '').toLowerCase().includes(q) ||
        (Array.isArray(rec.partyMembers) ? rec.partyMembers : []).some((p) =>
          String(p || '').toLowerCase().includes(q)
        );
      return matchEvent && matchSearch;
    });
  }, [attendanceRecords, filterEventId, logSearchQuery]);

  const currentEventAttendance = useMemo(() => {
    const list = attendanceRecords.filter((r) => r.eventId === (currentEvent?.id || ''));
    const totalAttendees = list.reduce((acc, r) => acc + (r.partyCount || 1), 0);
    return {
      cardsScanned: list.length,
      totalAdmittedAttendees: totalAttendees
    };
  }, [attendanceRecords, currentEvent?.id]);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      setActionError('Keine Anwesenheitseinträge zum Exportieren vorhanden.');
      return;
    }

    const headers = [
      'Record ID',
      'Event Name',
      'Scan Timestamp',
      'Member Code',
      'Member Name',
      'Email',
      'Category',
      'Status',
      'Fee Exempt',
      'Party Count',
      'Party Attendees',
      'Fee CHF',
      'Verified By',
      'Notes'
    ];

    const escapeCsvCell = (val: unknown): string => {
      const str = String(val ?? '');
      const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
      return `"${safe.replace(/"/g, '""')}"`;
    };

    const rows = filteredRecords.map((r) => [
      escapeCsvCell(r.id),
      escapeCsvCell(r.eventTitle),
      escapeCsvCell(new Date(r.scannedAt).toLocaleString('de-CH')),
      escapeCsvCell(r.memberCode),
      escapeCsvCell(r.memberName),
      escapeCsvCell(r.memberEmail || ''),
      escapeCsvCell(r.category),
      escapeCsvCell(r.status),
      escapeCsvCell(r.isFeeExempt ? 'YES' : 'NO'),
      r.partyCount,
      escapeCsvCell((Array.isArray(r.partyMembers) ? r.partyMembers : []).join('; ')),
      r.feePaidChf,
      escapeCsvCell(r.scannedBy),
      escapeCsvCell(r.notes || '')
    ]);

    const csvText = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvText], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vpi_event_attendance_${currentEvent?.id || 'all'}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearCurrentEventLogs = async () => {
    if (!hasFullAdmin || !currentEvent) return;
    const recordsToDelete = attendanceRecords.filter((r) => r.eventId === currentEvent.id);
    if (recordsToDelete.length === 0) return;

    if (
      !window.confirm(
        `Möchten Sie alle ${recordsToDelete.length} erfassten Check-ins für "${currentEvent.title}" unwiderruflich aus Firestore löschen?`
      )
    ) {
      return;
    }

    setActionError(null);
    try {
      await Promise.all(recordsToDelete.map((r) => deleteAttendanceRecord(r.id)));
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Fehler beim Löschen der Check-in-Einträge.'));
    }
  };

  const handleDeleteSingleRecord = async (recordId: string) => {
    if (!hasFullAdmin) return;
    setActionError(null);
    try {
      await deleteAttendanceRecord(recordId);
    } catch (err) {
      setActionError(formatFirestoreError(err, 'Check-in Eintrag konnte nicht gelöscht werden.'));
    }
  };

  const combinedError = actionError || eventsError || attendanceError || membersError;

  return (
    <div className="space-y-6">
      {combinedError && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{combinedError}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-[#bec7d2]/60 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#e6eeff]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006191] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#121c2a]">
                  Event-Einlass &amp; QR-Code Scanner
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Firestore Live Terminal
                </span>
              </div>
              <p className="text-xs text-[#566771] mt-0.5">
                Scannen Sie digitale Mitgliedsausweise am Saaleinlass, überprüfen Sie den
                Beitragsstatus und erfassen Sie Anwesenheiten direkt in Firestore.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg text-xs font-medium border cursor-pointer transition-colors flex items-center gap-1.5 ${
                soundEnabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-gray-100 text-gray-500 border-gray-300'
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{soundEnabled ? 'Audio An' : 'Stumm'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-lg bg-[#f0f4f9] text-[#006191] hover:bg-[#e1ecf8] text-xs font-semibold border border-[#bec7d2]/70 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>CSV Export</span>
            </button>
          </div>
        </div>

        {/* Event Selector & Realtime Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-[#566771] mb-1">
              Aktives Event für Check-in Auswählen
            </label>
            {eventsLoading ? (
              <div className="py-2.5 px-4 bg-[#f9f9ff] border border-[#bec7d2] rounded-xl text-xs text-[#566771]">
                Lade Community-Events...
              </div>
            ) : events.length === 0 ? (
              <div className="py-2.5 px-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                Keine Events in Firestore vorhanden. Bitte zuerst ein Event unter Admin → Events anlegen.
              </div>
            ) : (
              <>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full bg-[#f9f9ff] border border-[#bec7d2] rounded-xl px-4 py-2.5 text-sm font-bold text-[#121c2a] focus:border-[#006191] outline-none cursor-pointer"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.date} — {evt.title} ({evt.location})
                    </option>
                  ))}
                </select>
                {currentEvent && (
                  <div className="flex items-center gap-4 text-xs text-[#566771] mt-1.5">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#006191]" />
                      {currentEvent.date} ({currentEvent.time})
                    </span>
                    <span className="line-clamp-1">{currentEvent.location}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-[#f0f7fb] p-3.5 rounded-xl border border-[#006191]/20 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#006191] uppercase tracking-wide">
                Erfasste Einlässe
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-[#121c2a]">
                  {currentEventAttendance.totalAdmittedAttendees}
                </span>
                <span className="text-xs text-[#566771]">Personen</span>
              </div>
              <p className="text-[11px] text-[#566771]">
                ({currentEventAttendance.cardsScanned} Ausweise gescannt)
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white text-[#006191] shadow-2xs flex items-center justify-center border border-[#006191]/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#001c2e] rounded-2xl p-4 sm:p-6 text-white shadow-md relative overflow-hidden border border-[#003b5c]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isCameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {isCameraActive
                    ? 'Kamera Aktiv — Sucher scharf'
                    : 'Kamera Deaktiviert'}
                </span>
              </div>

              {isCameraActive && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">
                    {facingMode === 'environment' ? 'Rückkamera' : 'Selfie-Kamera'}
                  </span>
                </button>
              )}
            </div>

            <div className="relative aspect-4/3 w-full bg-black/60 rounded-xl overflow-hidden border-2 border-white/15 flex items-center justify-center">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {isCameraActive ? (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-64 h-64 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_15px_rgba(52,211,153,0.3)] flex items-center justify-center">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-sm" />
                    <span className="absolute bottom-2 text-[10px] text-emerald-300 font-mono tracking-widest bg-black/60 px-2 py-0.5 rounded">
                      QR CODE IN DEN RAHMEN HALTEN
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto text-slate-300">
                    <CameraOff className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Kamera ist derzeit ausgeschaltet
                    </p>
                    <p className="text-xs text-slate-300 max-w-xs mx-auto mt-1">
                      Klicken Sie auf den Button unten, um den Live-Videosucher zu starten.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Hinweis zur Kamera: </span>
                  {cameraError}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
              {isCameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Kamera stoppen</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!currentEvent}
                  onClick={() => void startCamera()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#006191] hover:bg-[#007bb6] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Kamera starten &amp; Scannen</span>
                </button>
              )}

              <span className="text-[11px] text-slate-300">
                Unterstützt optische Handy-Displays &amp; gedruckte Ausweise
              </span>
            </div>
          </div>

          {/* Manual Code Fallback Input */}
          <div className="bg-white p-4 rounded-xl border border-[#bec7d2]/60 shadow-2xs">
            <h3 className="text-xs font-bold uppercase text-[#121c2a] mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#006191]" />
              <span>Manueller Check-in (Mitgliedsnummer / QR JSON)</span>
            </h3>
            <form onSubmit={(e) => void handleManualCodeSubmit(e)} className="flex gap-2">
              <input
                type="text"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                placeholder="z.B. PI-FAM-2021 oder PI-7740..."
                className="flex-grow px-3.5 py-2 text-xs border border-[#bec7d2] rounded-lg focus:border-[#006191] outline-none"
              />
              <button
                type="submit"
                disabled={!currentEvent || membersLoading || attendanceLoading || isSubmittingManual}
                className="px-4 py-2 bg-[#006191] text-white text-xs font-bold rounded-lg hover:bg-[#007bb6] transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                Einchecken
              </button>
            </form>
            {manualError && <p className="text-[11px] text-red-600 mt-1.5">{manualError}</p>}
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-[#bec7d2]/60 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#566771] mb-3 flex items-center justify-between">
              <span>Letztes Scan-Ergebnis</span>
              {lastScanResult && (
                <span className="font-mono text-[10px] text-[#566771]">
                  Zeit: {lastScanResult.scannedAt}
                </span>
              )}
            </h3>

            {lastScanResult ? (
              <div
                data-testid="last-scan-result"
                className={`p-4 rounded-xl border transition-all ${
                  lastScanResult.success
                    ? lastScanResult.isDuplicate
                      ? 'bg-amber-50/80 border-amber-300'
                      : 'bg-emerald-50/80 border-emerald-300'
                    : lastScanResult.rejectionReason === 'unpaid_fee'
                    ? 'bg-amber-50/90 border-amber-300'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      lastScanResult.success
                        ? lastScanResult.isDuplicate
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                        : lastScanResult.rejectionReason === 'unpaid_fee'
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {lastScanResult.success ? (
                      lastScanResult.isDuplicate ? (
                        <AlertCircle className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )
                    ) : lastScanResult.rejectionReason === 'unpaid_fee' ? (
                      <Banknote className="w-5 h-5" />
                    ) : (
                      <ShieldAlert className="w-5 h-5" />
                    )}
                  </div>

                  <div className="flex-grow">
                    <p
                      className={`text-sm font-bold ${
                        lastScanResult.success
                          ? lastScanResult.isDuplicate
                            ? 'text-amber-900'
                            : 'text-emerald-900'
                          : lastScanResult.rejectionReason === 'unpaid_fee'
                          ? 'text-amber-950'
                          : 'text-red-900'
                      }`}
                    >
                      {lastScanResult.message}
                    </p>

                    {!lastScanResult.success &&
                      lastScanResult.rejectionReason === 'unpaid_fee' &&
                      lastScanResult.member && (
                        <div className="mt-3 p-3.5 bg-white/95 border border-amber-300 rounded-xl space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                            <span className="flex items-center gap-1.5">
                              <Banknote className="w-4 h-4 text-amber-600" />
                              Abendkasse Bar-Zahlung:
                            </span>
                            <span className="font-extrabold text-sm text-emerald-800">
                              CHF{' '}
                              {lastScanResult.pendingFeeAmount ||
                                (lastScanResult.member.membershipCategory === 'family'
                                  ? 120
                                  : 80)}
                              .00
                            </span>
                          </div>
                          <p className="text-[11px] text-[#566771]">
                            Mit Klick wird der Jahresbeitrag in Firestore als bezahlt gebucht und
                            das Mitglied sofort eingecheckt.
                          </p>
                          <button
                            type="button"
                            disabled={isSettlingDoorFee}
                            onClick={() =>
                              void handleDoorPaymentAndCheckin(
                                lastScanResult.member!,
                                lastScanResult.pendingFeeAmount ||
                                  (lastScanResult.member?.membershipCategory === 'family'
                                    ? 120
                                    : 80)
                              )
                            }
                            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {isSettlingDoorFee
                                ? 'Buche Zahlung...'
                                : `CHF ${
                                    lastScanResult.pendingFeeAmount ||
                                    (lastScanResult.member.membershipCategory === 'family'
                                      ? 120
                                      : 80)
                                  }.00 bar erhalten & einchecken`}
                            </span>
                          </button>
                        </div>
                      )}

                    {lastScanResult.member && (
                      <div className="mt-3 space-y-2 text-xs border-t border-black/5 pt-2.5">
                        <div className="flex justify-between">
                          <span className="text-[#566771]">Mitglied:</span>
                          <span className="font-bold text-[#121c2a]">
                            {lastScanResult.member.name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#566771]">Mitglieds-Code:</span>
                          <span className="font-mono font-bold text-[#006191]">
                            {lastScanResult.member.memberCode || 'PI-MEMBER'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#566771]">Status:</span>
                          <span className="font-bold uppercase text-[10px]">
                            {lastScanResult.member.membershipStatus}
                          </span>
                        </div>

                        {lastScanResult.member.feeExemption?.isExempt && (
                          <div className="bg-amber-100/80 p-2 rounded-lg border border-amber-300 text-[11px] text-amber-900 flex items-center gap-1.5 mt-1">
                            <Award className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>
                              GV-Beitragsbefreiung aktiv — kostenfreier Einlass (CHF 0.00)
                            </span>
                          </div>
                        )}

                        {lastScanResult.party.length > 0 && (
                          <div className="pt-2 border-t border-black/5">
                            <span className="block text-[11px] font-bold text-[#566771] mb-1">
                              Gruppe ({lastScanResult.party.length} Personen):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {lastScanResult.party.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-gray-300 text-gray-800"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-[#bec7d2]/60 rounded-xl">
                <FileCheck2 className="w-8 h-8 text-[#bec7d2] mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#566771]">Warte auf Scan...</p>
                <p className="text-[11px] text-[#566771]/80 max-w-xs mx-auto mt-0.5">
                  Halten Sie den QR-Code vor die Kamera oder geben Sie die Mitgliedsnummer ein.
                </p>
              </div>
            )}
          </div>

          <div className="bg-[#f0f4f9] rounded-2xl p-5 border border-[#bec7d2]/60">
            <h4 className="text-xs font-bold uppercase text-[#121c2a] mb-2 flex items-center justify-between">
              <span>Event-Status &amp; Einlassregeln</span>
              <ShieldCheck className="w-4 h-4 text-[#006191]" />
            </h4>
            <ul className="text-xs text-[#566771] space-y-2">
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Nur registrierte Mitglieder der Percikan Iman Community Schweiz.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Bezahlter Jahresbeitrag (CHF 80 / CHF 120) oder GV-Befreiung erforderlich.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-white rounded-2xl p-6 border border-[#bec7d2]/60 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e6eeff]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#006191]" />
            <h3 className="text-base font-bold text-[#121c2a]">
              Anwesenheits-Protokoll ({filteredRecords.length} Einträge)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-[#bec7d2] rounded-lg text-[#121c2a] outline-none"
            >
              <option value="all">Alle Events anzeigen</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#566771] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Name oder Code filtern..."
                className="pl-8 pr-3 py-1.5 text-xs border border-[#bec7d2] rounded-lg outline-none w-48 sm:w-60"
              />
            </div>

            {hasFullAdmin && currentEventAttendance.cardsScanned > 0 && (
              <button
                type="button"
                onClick={() => void handleClearCurrentEventLogs()}
                className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 font-semibold cursor-pointer"
              >
                Log leeren
              </button>
            )}
          </div>
        </div>

        {attendanceLoading ? (
          <div className="text-center py-10 text-xs text-[#566771]">
            Lade Anwesenheits-Protokoll...
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#eff3ff] text-[#121c2a] uppercase font-bold tracking-wider border-b border-[#bec7d2]/60">
                  <th className="py-3 px-3">Uhrzeit</th>
                  <th className="py-3 px-3">Mitglied &amp; Code</th>
                  <th className="py-3 px-3">Kategorie</th>
                  <th className="py-3 px-3">Event</th>
                  <th className="py-3 px-3">Einlass-Gruppe</th>
                  <th className="py-3 px-3">Kosten</th>
                  <th className="py-3 px-3">Status</th>
                  {hasFullAdmin && <th className="py-3 px-3 text-right">Aktion</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6eeff]">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-[#f9f9ff] transition-colors">
                    <td className="py-3 px-3 font-mono text-[#566771] whitespace-nowrap">
                      {new Date(record.scannedAt).toLocaleTimeString('de-CH')}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-[#121c2a] block">{record.memberName}</span>
                      <span className="font-mono text-[10px] text-[#006191]">
                        {record.memberCode}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          record.category === 'family'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {record.category === 'family' ? 'Familie' : 'Einzel'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-[#121c2a] max-w-xs truncate">
                      {record.eventTitle}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-[#121c2a]">{record.partyCount}</span>
                        <span className="text-[11px] text-[#566771]">Pers.</span>
                      </div>
                      <div className="text-[10px] text-[#566771] truncate max-w-[200px]">
                        {(record.partyMembers ?? []).join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-700 whitespace-nowrap">
                      CHF {record.feePaidChf.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        Gültig
                      </span>
                    </td>
                    {hasFullAdmin && (
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeleteSingleRecord(record.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Eintrag löschen"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-[#566771]">
            <History className="w-8 h-8 text-[#bec7d2] mx-auto mb-2" />
            <p className="text-xs font-bold">Noch keine Check-in Einträge erfasst</p>
          </div>
        )}
      </div>
    </div>
  );
};
