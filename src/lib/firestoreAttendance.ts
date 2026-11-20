import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe,
  updateDoc,
  where
} from 'firebase/firestore';
import { getFirebaseServices } from './firebase';
import {
  formatFirestoreError,
  isValidEmailFormat,
  stripUndefined,
  SubscriptionResult
} from './firestoreContent';
import {
  EventAttendanceRecord,
  FormalStatusRecord,
  MembershipStatus
} from '../types';

export type { SubscriptionResult } from './firestoreContent';

const VALID_ATTENDANCE_STATUSES: ReadonlyArray<MembershipStatus> = [
  'active',
  'pending_payment',
  'relocated',
  'fee_paused',
  'inactive'
];

export interface DoorSettlementPatch {
  membershipStatus: 'active';
  paymentStatus: 'paid';
  paymentMethod: 'cash';
  paidAt: string;
  paymentVerifiedBy: string;
  formalStatusHistory: FormalStatusRecord[];
}

export function buildAttendanceRecordPayload(
  record: Omit<EventAttendanceRecord, 'id'> & { id?: string }
): EventAttendanceRecord {
  const statusStr = String(record.status || '');
  if (!VALID_ATTENDANCE_STATUSES.includes(statusStr as MembershipStatus)) {
    throw new Error(
      `Invalid attendance membership status "${statusStr}". Expected one of: ${VALID_ATTENDANCE_STATUSES.join(', ')}.`
    );
  }
  if (record.category !== 'personal' && record.category !== 'family') {
    throw new Error(`Invalid attendance category: ${record.category}`);
  }

  const id = (
    record.id?.trim() ||
    `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  ).slice(0, 128);
  const eventId = (record.eventId || '').trim().slice(0, 128);
  const eventTitle = (record.eventTitle || '').trim().slice(0, 250);
  const memberCode = (record.memberCode || '').trim().slice(0, 64);
  const memberName = (record.memberName || '').trim().slice(0, 150);
  const scannedAt = (record.scannedAt?.trim() || new Date().toISOString()).slice(0, 64);
  const scannedBy = (record.scannedBy || '').trim().slice(0, 150);

  if (!eventId || !eventTitle || !memberCode || !memberName || !scannedBy) {
    throw new Error('Attendance record requires eventId, eventTitle, memberCode, memberName, and scannedBy.');
  }

  const partyMembers = Array.isArray(record.partyMembers)
    ? record.partyMembers.map((m) => String(m).slice(0, 150)).slice(0, 25)
    : [];
  const partyCount = Math.max(1, Math.min(25, Math.trunc(Number(record.partyCount) || 1)));
  const feePaidChf = Math.max(0, Math.min(10_000, Number(record.feePaidChf) || 0));

  const payload: EventAttendanceRecord = {
    id,
    eventId,
    eventTitle,
    memberCode,
    memberName,
    category: record.category,
    status: record.status,
    isFeeExempt: Boolean(record.isFeeExempt),
    partyCount,
    partyMembers,
    scannedAt,
    scannedBy,
    feePaidChf,
    verified: Boolean(record.verified)
  };

  if (typeof record.memberEmail === 'string' && isValidEmailFormat(record.memberEmail)) {
    payload.memberEmail = record.memberEmail.trim().toLowerCase();
  }

  if (typeof record.notes === 'string' && record.notes.trim()) {
    payload.notes = record.notes.trim().slice(0, 1000);
  }

  return stripUndefined(payload);
}

/**
 * Strictly constructs the 6-field patch permitted by
 * `firestore.rules:isAllowedScannerDoorSettlementUpdate()`.
 */
export function buildDoorSettlementPatch(
  patch: DoorSettlementPatch
): DoorSettlementPatch {
  return {
    membershipStatus: 'active',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    paidAt: (patch.paidAt?.trim() || new Date().toLocaleDateString('en-GB')).slice(0, 100),
    paymentVerifiedBy: (patch.paymentVerifiedBy?.trim() || 'QR Scanner Operator').slice(0, 150),
    formalStatusHistory: stripUndefined(
      (Array.isArray(patch.formalStatusHistory) ? patch.formalStatusHistory : []).slice(-100)
    )
  };
}

export function subscribeAttendanceRecords(
  onUpdate: (res: SubscriptionResult<EventAttendanceRecord>) => void,
  eventId?: string
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: [], loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: [], loading: true, error: null });
  const attCol = collection(services.db, 'attendance');
  const q =
    eventId && eventId !== 'all'
      ? query(attCol, where('eventId', '==', eventId), orderBy('scannedAt', 'desc'))
      : query(attCol, orderBy('scannedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as EventAttendanceRecord),
        id: docSnap.id
      }));
      onUpdate({ data, loading: false, error: null });
    },
    (err) => {
      onUpdate({ data: [], loading: false, error: formatFirestoreError(err) });
    }
  );
}

export async function recordAttendanceCheckIn(
  record: Omit<EventAttendanceRecord, 'id'> & { id?: string }
): Promise<EventAttendanceRecord> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const payload = buildAttendanceRecordPayload(record);
  await setDoc(doc(services.db, 'attendance', payload.id), payload);
  return payload;
}

export async function deleteAttendanceRecord(recordId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'attendance', recordId));
}

export async function settleDoorCashFee(
  memberUid: string,
  patch: DoorSettlementPatch
): Promise<void> {
  const cleanUid = memberUid.trim();
  if (!cleanUid) {
    throw new Error('Member UID is required for door cash fee settlement.');
  }
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const strictPatch = buildDoorSettlementPatch(patch);
  await updateDoc(
    doc(services.db, 'members', cleanUid),
    strictPatch as unknown as Record<string, unknown>
  );
}
