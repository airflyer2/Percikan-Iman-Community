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
  where,
  writeBatch
} from 'firebase/firestore';
import { getFirebaseServices } from './firebase';
import {
  formatFirestoreError,
  isValidEmailFormat,
  stripUndefined,
  SubscriptionResult
} from './firestoreContent';
import { DonationPledge, DonationReport } from '../types';

export type { SubscriptionResult } from './firestoreContent';

export interface SubmitDonationPledgeInput {
  id?: string;
  donorName: string;
  email: string;
  amount: number;
  destination: string;
  paymentMethod?: string;
  date?: string;
  notes?: string;
}

export interface CreateManualDonationReportInput {
  id?: string;
  donorName: string;
  email?: string;
  amount: number;
  currency?: 'CHF' | 'EUR' | 'USD';
  destination: string;
  paymentMethod: string;
  date?: string;
  status?: DonationReport['status'];
  notes?: string;
}

const VALID_DONATION_CURRENCIES: ReadonlyArray<'CHF' | 'EUR' | 'USD'> = ['CHF', 'EUR', 'USD'];
const VALID_DONATION_REPORT_STATUSES: ReadonlyArray<DonationReport['status']> = [
  'Completed',
  'Processing',
  'Flagged'
];

export function buildDonationPledgePayload(
  input: SubmitDonationPledgeInput
): DonationPledge {
  const donorName = (input.donorName || '').trim().slice(0, 150);
  if (!donorName) throw new Error('Donor name is required.');

  const email = (input.email || '').trim().toLowerCase();
  if (!isValidEmailFormat(email)) {
    throw new Error('Please enter a valid donor email address.');
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 100_000) {
    throw new Error('Donation amount must be between CHF 1 and CHF 100,000.');
  }

  const destination = (input.destination || '').trim().slice(0, 200);
  if (!destination) throw new Error('Donation destination is required.');

  const id = (
    input.id?.trim() ||
    `PI-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  ).slice(0, 128);

  const pledge: DonationPledge = {
    id,
    donorName,
    email,
    amount,
    currency: 'CHF',
    destination,
    date: (
      input.date?.trim() || new Date().toISOString().slice(0, 16).replace('T', ' ')
    ).slice(0, 64),
    paymentMethod: (input.paymentMethod?.trim() || 'PostFinance / IBAN Transfer').slice(0, 100),
    status: 'Processing'
  };

  if (typeof input.notes === 'string' && input.notes.trim()) {
    pledge.notes = input.notes.trim().slice(0, 1000);
  }

  // Note: `promotedReportId` is explicitly omitted on create per firestore.rules
  return stripUndefined(pledge);
}

export function buildPromotedReportPayload(
  pledge: DonationPledge,
  adminName: string,
  adminNotes?: string
): { report: DonationReport; pledgeUpdate: Record<string, unknown> } {
  if (pledge.status === 'Promoted') {
    throw new Error('This donation pledge has already been promoted to the verified ledger.');
  }
  if (pledge.status === 'Rejected') {
    throw new Error('Rejected donation pledges cannot be promoted to the verified ledger.');
  }

  const reportId = `VPI-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`.slice(
    0,
    128
  );
  const noteParts = [
    adminNotes?.trim(),
    pledge.notes?.trim(),
    `Verified by ${adminName.trim() || 'Board Treasurer'}`
  ].filter(Boolean);
  const combinedNotes = noteParts.join(' | ').slice(0, 1000);

  const report: DonationReport = stripUndefined({
    id: reportId,
    donorName: pledge.donorName.slice(0, 150),
    email: pledge.email,
    amount: pledge.amount,
    currency: 'CHF',
    destination: pledge.destination.slice(0, 200),
    date: pledge.date.slice(0, 64),
    paymentMethod: pledge.paymentMethod.slice(0, 100),
    status: 'Completed',
    notes: combinedNotes || undefined,
    sourcePledgeId: pledge.id.slice(0, 128)
  });

  // Update strictly touches only mutable fields (never the 8 immutable pledge fields)
  const pledgeUpdate: Record<string, unknown> = {
    status: 'Promoted',
    promotedReportId: reportId
  };
  if (typeof adminNotes === 'string' && adminNotes.trim().length > 0) {
    pledgeUpdate.notes = adminNotes.trim().slice(0, 1000);
  }

  return { report, pledgeUpdate: stripUndefined(pledgeUpdate) };
}

export function buildManualDonationReportPayload(
  input: CreateManualDonationReportInput
): DonationReport {
  const donorName = (input.donorName || '').trim().slice(0, 150);
  if (!donorName) throw new Error('Donor name is required.');

  const email = (input.email?.trim() || 'offline.donor@percikaniman.org').toLowerCase();
  if (!isValidEmailFormat(email)) {
    throw new Error('Please enter a valid donor email address.');
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 100_000) {
    throw new Error('Donation amount must be between 1 and 100,000.');
  }

  const destination = (input.destination || '').trim().slice(0, 200);
  const paymentMethod = (input.paymentMethod || '').trim().slice(0, 100);
  if (!destination || !paymentMethod) {
    throw new Error('Destination and payment method are required.');
  }

  const currency = input.currency === undefined ? 'CHF' : input.currency;
  if (!VALID_DONATION_CURRENCIES.includes(currency)) {
    throw new Error(`Invalid donation currency "${String(currency)}". Must be CHF, EUR, or USD.`);
  }

  const status = input.status === undefined ? 'Completed' : input.status;
  if (!VALID_DONATION_REPORT_STATUSES.includes(status)) {
    throw new Error(
      `Invalid donation report status "${String(status)}". Must be Completed, Processing, or Flagged.`
    );
  }

  const report: DonationReport = {
    id: (
      input.id?.trim() ||
      `VPI-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    ).slice(0, 128),
    donorName,
    email,
    amount,
    currency,
    destination,
    date: (
      input.date?.trim() || new Date().toISOString().slice(0, 16).replace('T', ' ')
    ).slice(0, 64),
    paymentMethod,
    status
  };

  if (typeof input.notes === 'string' && input.notes.trim()) {
    report.notes = input.notes.trim().slice(0, 1000);
  }

  return stripUndefined(report);
}

/**
 * Public/member write-only submission to `/donationPledges/{id}`.
 * Never reads back `/donationPledges` since unauthenticated users do not have read access.
 */
export async function submitDonationPledge(
  input: SubmitDonationPledgeInput
): Promise<DonationPledge> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const payload = buildDonationPledgePayload(input);
  await setDoc(doc(services.db, 'donationPledges', payload.id), payload);
  return payload;
}

export function subscribeDonationPledges(
  onUpdate: (res: SubscriptionResult<DonationPledge>) => void,
  options?: { status?: DonationPledge['status'] }
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: [], loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: [], loading: true, error: null });
  const pledgesCol = collection(services.db, 'donationPledges');
  const q = options?.status
    ? query(pledgesCol, where('status', '==', options.status), orderBy('date', 'desc'))
    : query(pledgesCol, orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as DonationPledge),
        id: docSnap.id
      }));
      onUpdate({ data, loading: false, error: null });
    },
    (err) => {
      onUpdate({ data: [], loading: false, error: formatFirestoreError(err) });
    }
  );
}

export function subscribeDonationReports(
  onUpdate: (res: SubscriptionResult<DonationReport>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: [], loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: [], loading: true, error: null });
  const q = query(collection(services.db, 'donationReports'), orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as DonationReport),
        id: docSnap.id
      }));
      onUpdate({ data, loading: false, error: null });
    },
    (err) => {
      onUpdate({ data: [], loading: false, error: formatFirestoreError(err) });
    }
  );
}

export async function promotePledgeToReport(
  pledge: DonationPledge,
  adminName: string,
  adminNotes?: string
): Promise<DonationReport> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const { report, pledgeUpdate } = buildPromotedReportPayload(pledge, adminName, adminNotes);

  const batch = writeBatch(services.db);
  batch.set(doc(services.db, 'donationReports', report.id), report);
  batch.update(doc(services.db, 'donationPledges', pledge.id), pledgeUpdate);
  await batch.commit();

  return report;
}

export async function rejectDonationPledge(
  pledgeId: string,
  reason?: string
): Promise<void> {
  const cleanPledgeId = (pledgeId || '').trim();
  if (!cleanPledgeId) {
    throw new Error('Donation pledge ID is required.');
  }
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const updatePayload: Record<string, unknown> = { status: 'Rejected' };
  if (typeof reason === 'string' && reason.trim().length > 0) {
    updatePayload.notes = reason.trim().slice(0, 1000);
  }
  await updateDoc(doc(services.db, 'donationPledges', cleanPledgeId), updatePayload);
}

export async function createManualDonationReport(
  input: CreateManualDonationReportInput
): Promise<DonationReport> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');

  const payload = buildManualDonationReportPayload(input);
  await setDoc(doc(services.db, 'donationReports', payload.id), payload);
  return payload;
}

export async function deleteDonationReport(reportId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'donationReports', reportId));
}

export async function deleteDonationPledge(pledgeId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'donationPledges', pledgeId));
}
