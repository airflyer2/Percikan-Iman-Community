import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe
} from 'firebase/firestore';
import { getFirebaseServices } from './firebase';
import { isSafeHttpUrl } from './urlValidation';
import {
  BoardMember,
  Campaign,
  CommunityEvent,
  ContributionDestination,
  NavScreen,
  Program,
  SiteNotice
} from '../types';

export interface SubscriptionResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export interface DocSubscriptionResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const VALID_PROGRAM_CATEGORIES: ReadonlyArray<Program['category']> = [
  'Religious',
  'Social Impact',
  'Youth',
  'Health',
  'Transparency',
  'Community'
];

const VALID_EVENT_CATEGORIES: ReadonlyArray<CommunityEvent['category']> = [
  'Majelis & Spiritual',
  'Charity & Relief',
  'Youth & Education',
  'Community Gathering'
];

const VALID_NOTICE_LINK_SCREENS: ReadonlyArray<string> = [
  'home',
  'programs',
  'donate',
  'gallery',
  'about',
  'contact',
  'login',
  'member',
  'assembly',
  'brand'
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively strips `undefined` values from plain objects and arrays while
 * preserving Firestore FieldValue sentinels and Dates.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefined(v);
      }
    }
    return cleaned as T;
  }
  return value;
}

export function formatFirestoreError(
  err: unknown,
  fallback = 'Firestore operation failed.'
): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'permission-denied':
      return 'Permission denied. Your account does not have access for this operation.';
    case 'failed-precondition':
      return 'Operation failed precondition (check required Firestore index or document state).';
    case 'unavailable':
      return 'Cloud Firestore is currently unavailable. Please check your connection and try again.';
    case 'not-found':
      return 'The requested document was not found.';
    case 'already-exists':
      return 'This record already exists.';
    default:
      return err instanceof Error ? err.message : fallback;
  }
}

export function isValidEmailFormat(email: string): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 254) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

export function normalizeSafeHttpUrl(url: string): string {
  if (typeof url !== 'string') return '';
  return url.trim().replace(/^https?:\/\//i, (scheme) => scheme.toLowerCase());
}

const utf8Encoder = new TextEncoder();

export function utf8ByteLength(value: string): number {
  return utf8Encoder.encode(value).length;
}

export function isValidFirestoreImageUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const bytes = utf8ByteLength(trimmed);
  if (
    isSafeHttpUrl(trimmed) &&
    /^https?:\/\//.test(trimmed) &&
    bytes >= 8 &&
    bytes <= 2048
  ) {
    return true;
  }
  return (
    bytes <= 500000 &&
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(trimmed)
  );
}

// --- Pure Payload Builders (exported for rule-compliance unit testing) ---

export function buildProgramPayload(program: Program): Program {
  const id = (program.id?.trim() || `prog-${Date.now()}`).slice(0, 128);
  const title = (program.title || '').trim().slice(0, 200);
  if (!title) throw new Error('Program title is required.');
  if (!VALID_PROGRAM_CATEGORIES.includes(program.category)) {
    throw new Error(`Invalid program category: ${program.category}`);
  }
  const imageUrl = normalizeSafeHttpUrl(program.imageUrl || '');
  if (!isValidFirestoreImageUrl(imageUrl)) {
    throw new Error('Program image URL must be a valid HTTP(S) URL or raster Base64 image (<= 500 KB).');
  }

  const payload: Program = {
    id,
    title,
    category: program.category,
    tag: (program.tag || '').trim().slice(0, 80),
    iconName: (program.iconName?.trim() || 'volunteer_activism').slice(0, 64),
    description: (program.description || '').trim().slice(0, 2000),
    imageUrl,
    dateOrSchedule: (program.dateOrSchedule || '').trim().slice(0, 200),
    location: (program.location || '').trim().slice(0, 250),
    detailedOverview: (program.detailedOverview || '').trim().slice(0, 5000)
  };

  if (typeof program.tagColor === 'string' && program.tagColor.trim()) {
    payload.tagColor = program.tagColor.trim().slice(0, 50);
  }
  if (typeof program.participantsCount === 'string' && program.participantsCount.trim()) {
    payload.participantsCount = program.participantsCount.trim().slice(0, 150);
  }

  return stripUndefined(payload);
}

export function buildCampaignPayload(campaign: Campaign): Campaign {
  const id = (campaign.id?.trim() || `camp-${Date.now()}`).slice(0, 128);
  const title = (campaign.title || '').trim().slice(0, 200);
  if (!title) throw new Error('Campaign title is required.');

  const goalAmount = Number(campaign.goalAmount);
  if (!Number.isFinite(goalAmount) || goalAmount < 1 || goalAmount > 100_000_000) {
    throw new Error('Campaign goal amount must be between 1 and 100,000,000.');
  }
  const currentAmount = Math.max(0, Math.min(100_000_000, Number(campaign.currentAmount) || 0));
  const rawProgress = Number.isFinite(Number(campaign.progressPercent))
    ? Number(campaign.progressPercent)
    : Math.round((currentAmount / goalAmount) * 100);
  const progressPercent = Math.max(0, Math.min(1000, rawProgress));

  const payload: Campaign = {
    id,
    title,
    description: (campaign.description || '').trim().slice(0, 2000),
    progressPercent,
    currentAmount,
    goalAmount
  };

  if (typeof campaign.isCritical === 'boolean') {
    payload.isCritical = campaign.isCritical;
  }
  if (typeof campaign.tag === 'string' && campaign.tag.trim()) {
    payload.tag = campaign.tag.trim().slice(0, 80);
  }
  if (typeof campaign.iconName === 'string' && campaign.iconName.trim()) {
    payload.iconName = campaign.iconName.trim().slice(0, 64);
  }
  if (typeof campaign.imageUrl === 'string' && campaign.imageUrl.trim()) {
    const img = normalizeSafeHttpUrl(campaign.imageUrl);
    if (!isValidFirestoreImageUrl(img)) {
      throw new Error('Campaign image URL must be a valid HTTP(S) URL or raster Base64 image (<= 500 KB).');
    }
    payload.imageUrl = img;
  }
  if (typeof campaign.beneficiaries === 'string' && campaign.beneficiaries.trim()) {
    payload.beneficiaries = campaign.beneficiaries.trim().slice(0, 200);
  }

  return stripUndefined(payload);
}

export function buildDestinationPayload(
  destination: ContributionDestination
): ContributionDestination {
  const id = (destination.id?.trim() || `dest-${Date.now()}`).slice(0, 128);
  const name = (destination.name || '').trim().slice(0, 200);
  if (!name) throw new Error('Destination name is required.');
  const shortLabel = (destination.shortLabel?.trim() || name).slice(0, 100);
  const category = (destination.category?.trim() || 'General').slice(0, 100);

  const payload: ContributionDestination = {
    id,
    name,
    shortLabel,
    category,
    description: (destination.description || '').trim().slice(0, 2000)
  };

  if (
    destination.totalCollected !== undefined &&
    destination.totalCollected !== null &&
    Number.isFinite(Number(destination.totalCollected))
  ) {
    payload.totalCollected = Math.max(
      0,
      Math.min(100_000_000, Number(destination.totalCollected))
    );
  }

  return stripUndefined(payload);
}

export function buildEventPayload(event: CommunityEvent): CommunityEvent {
  const id = (event.id?.trim() || `evt-${Date.now()}`).slice(0, 128);
  const title = (event.title || '').trim().slice(0, 200);
  const date = (event.date || '').trim().slice(0, 32);
  const time = (event.time || '').trim().slice(0, 100);
  const location = (event.location || '').trim().slice(0, 250);
  if (!title || !date || !time || !location) {
    throw new Error('Event title, date, time, and location are required.');
  }
  if (!VALID_EVENT_CATEGORIES.includes(event.category)) {
    throw new Error(`Invalid event category: ${event.category}`);
  }

  const payload: CommunityEvent = {
    id,
    title,
    date,
    time,
    category: event.category,
    location,
    description: (event.description || '').trim().slice(0, 3000)
  };

  if (typeof event.isOnline === 'boolean') {
    payload.isOnline = event.isOnline;
  }
  if (typeof event.onlineLink === 'string' && event.onlineLink.trim()) {
    const link = normalizeSafeHttpUrl(event.onlineLink);
    const bytes = utf8ByteLength(link);
    if (!isSafeHttpUrl(link) || !/^https?:\/\//.test(link) || bytes < 8 || bytes > 2048) {
      throw new Error('Online event link must be a valid http:// or https:// URL (<= 2048 bytes).');
    }
    payload.onlineLink = link;
  }
  if (typeof event.speaker === 'string' && event.speaker.trim()) {
    payload.speaker = event.speaker.trim().slice(0, 200);
  }
  if (
    event.capacity !== undefined &&
    event.capacity !== null &&
    Number.isFinite(Number(event.capacity)) &&
    Number(event.capacity) >= 1
  ) {
    payload.capacity = Math.min(100_000, Number(event.capacity));
  }
  if (
    event.registeredCount !== undefined &&
    event.registeredCount !== null &&
    Number.isFinite(Number(event.registeredCount))
  ) {
    payload.registeredCount = Math.max(0, Math.min(100_000, Number(event.registeredCount)));
  }
  if (typeof event.featured === 'boolean') {
    payload.featured = event.featured;
  }
  if (typeof event.imageUrl === 'string' && event.imageUrl.trim()) {
    const img = normalizeSafeHttpUrl(event.imageUrl);
    if (!isValidFirestoreImageUrl(img)) {
      throw new Error('Event image URL must be a valid HTTP(S) URL or raster Base64 image (<= 500 KB).');
    }
    payload.imageUrl = img;
  }
  if (
    event.regularFee !== undefined &&
    event.regularFee !== null &&
    Number.isFinite(Number(event.regularFee))
  ) {
    payload.regularFee = Math.max(0, Math.min(10_000, Number(event.regularFee)));
  }
  if (
    event.memberSubsidizedFee !== undefined &&
    event.memberSubsidizedFee !== null &&
    Number.isFinite(Number(event.memberSubsidizedFee))
  ) {
    payload.memberSubsidizedFee = Math.max(
      0,
      Math.min(10_000, Number(event.memberSubsidizedFee))
    );
  }

  return stripUndefined(payload);
}

export function buildBoardMemberPayload(member: BoardMember): BoardMember {
  const id = (member.id?.trim() || `board-${Date.now()}`).slice(0, 128);
  const name = (member.name || '').trim().slice(0, 150);
  const role = (member.role || '').trim().slice(0, 150);
  const department = (member.department || '').trim().slice(0, 100);
  if (!name || !role || !department) {
    throw new Error('Board member name, role, and department are required.');
  }
  const imageUrl = normalizeSafeHttpUrl(member.imageUrl || '');
  if (!isValidFirestoreImageUrl(imageUrl)) {
    throw new Error('Board member image URL must be a valid HTTP(S) URL or raster Base64 image (<= 500 KB).');
  }

  const payload: BoardMember = {
    id,
    name,
    role,
    department,
    imageUrl,
    bio: (member.bio || '').trim().slice(0, 2000)
  };

  if (typeof member.email === 'string' && member.email.trim()) {
    const email = member.email.trim();
    if (!isValidEmailFormat(email)) {
      throw new Error('Board member email address is invalid.');
    }
    payload.email = email;
  }
  if (typeof member.phone === 'string' && member.phone.trim()) {
    payload.phone = member.phone.trim().slice(0, 50);
  }
  if (
    member.order !== undefined &&
    member.order !== null &&
    String(member.order).trim() !== '' &&
    Number.isFinite(Number(member.order))
  ) {
    payload.order = Math.max(0, Math.min(10_000, Number(member.order)));
  }

  return stripUndefined(payload);
}

export function buildSiteNoticePayload(notice: SiteNotice): SiteNotice {
  const payload: SiteNotice = {
    enabled: Boolean(notice.enabled),
    message: (notice.message || '').trim().slice(0, 1000),
    badge: (notice.badge || '').trim().slice(0, 80)
  };

  if (typeof notice.linkText === 'string' && notice.linkText.trim()) {
    payload.linkText = notice.linkText.trim().slice(0, 100);
  }
  if (typeof notice.linkScreen === 'string' && notice.linkScreen.trim()) {
    const normalized = notice.linkScreen.trim() === 'auth' ? 'login' : notice.linkScreen.trim();
    if (!VALID_NOTICE_LINK_SCREENS.includes(normalized)) {
      throw new Error(`Invalid site notice linkScreen: ${notice.linkScreen}`);
    }
    payload.linkScreen = normalized as NavScreen;
  }

  return stripUndefined(payload);
}

// --- Subscriptions (Route-Scoped, No Static Fallbacks) ---

export function subscribePrograms(
  onUpdate: (res: SubscriptionResult<Program>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: [], loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: [], loading: true, error: null });
  return onSnapshot(
    collection(services.db, 'programs'),
    (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Program),
        id: docSnap.id
      }));
      onUpdate({ data, loading: false, error: null });
    },
    (err) => {
      onUpdate({ data: [], loading: false, error: formatFirestoreError(err) });
    }
  );
}

export function subscribeCampaigns(
  onUpdate: (res: SubscriptionResult<Campaign>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: [], loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: [], loading: true, error: null });
  return onSnapshot(
    collection(services.db, 'campaigns'),
    (snapshot) => {
      const data = snapshot.docs
        .map((docSnap) => ({
          ...(docSnap.data() as Campaign),
          id: docSnap.id
        }))
        .sort((a, b) => {
          const aCrit = a.isCritical ? 0 : 1;
          const bCrit = b.isCritical ? 0 : 1;
          if (aCrit !== bCrit) return aCrit - bCrit;
          const aProj = a.id.startsWith('proj-') ? 1 : 0;
          const bProj = b.id.startsWith('proj-') ? 1 : 0;
          if (aProj !== bProj) return aProj - bProj;
          return a.id.localeCompare(b.id);
        });
      onUpdate({ data, loading: false, error: null });
    },
    (err) => {
      onUpdate({ data: [], loading: false, error: formatFirestoreError(err) });
    }
  );
}

export function subscribeDestinations(
  onUpdate: (res: SubscriptionResult<ContributionDestination>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: [], loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: [], loading: true, error: null });
  return onSnapshot(
    collection(services.db, 'destinations'),
    (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as ContributionDestination),
        id: docSnap.id
      }));
      onUpdate({ data, loading: false, error: null });
    },
    (err) => {
      onUpdate({ data: [], loading: false, error: formatFirestoreError(err) });
    }
  );
}

export function subscribeEvents(
  onUpdate: (res: SubscriptionResult<CommunityEvent>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: [], loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: [], loading: true, error: null });
  const q = query(collection(services.db, 'events'), orderBy('date', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as CommunityEvent),
        id: docSnap.id
      }));
      onUpdate({ data, loading: false, error: null });
    },
    (err) => {
      onUpdate({ data: [], loading: false, error: formatFirestoreError(err) });
    }
  );
}

export function subscribeBoardMembers(
  onUpdate: (res: SubscriptionResult<BoardMember>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: [], loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: [], loading: true, error: null });
  return onSnapshot(
    collection(services.db, 'boardMembers'),
    (snapshot) => {
      const data = snapshot.docs
        .map((docSnap) => ({
          ...(docSnap.data() as BoardMember),
          id: docSnap.id
        }))
        .sort(
          (a, b) =>
            (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)
        );
      onUpdate({ data, loading: false, error: null });
    },
    (err) => {
      onUpdate({ data: [], loading: false, error: formatFirestoreError(err) });
    }
  );
}

export function subscribeSiteNotice(
  onUpdate: (res: DocSubscriptionResult<SiteNotice>) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUpdate({ data: null, loading: false, error: 'Firebase is not configured.' });
    return () => {};
  }

  onUpdate({ data: null, loading: true, error: null });
  return onSnapshot(
    doc(services.db, 'siteConfig', 'notice'),
    (snap) => {
      onUpdate({
        data: snap.exists() ? (snap.data() as SiteNotice) : null,
        loading: false,
        error: null
      });
    },
    (err) => {
      onUpdate({ data: null, loading: false, error: formatFirestoreError(err) });
    }
  );
}

// --- Typed CRUD Writers ---

export async function saveProgram(program: Program): Promise<Program> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  const payload = buildProgramPayload(program);
  await setDoc(doc(services.db, 'programs', payload.id), payload);
  return payload;
}

export async function deleteProgram(programId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'programs', programId));
}

export async function saveCampaign(campaign: Campaign): Promise<Campaign> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  const payload = buildCampaignPayload(campaign);
  await setDoc(doc(services.db, 'campaigns', payload.id), payload);
  return payload;
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'campaigns', campaignId));
}

export async function saveDestination(
  destination: ContributionDestination
): Promise<ContributionDestination> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  const payload = buildDestinationPayload(destination);
  await setDoc(doc(services.db, 'destinations', payload.id), payload);
  return payload;
}

export async function deleteDestination(destinationId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'destinations', destinationId));
}

export async function saveEvent(event: CommunityEvent): Promise<CommunityEvent> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  const payload = buildEventPayload(event);
  await setDoc(doc(services.db, 'events', payload.id), payload);
  return payload;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'events', eventId));
}

export async function saveBoardMember(member: BoardMember): Promise<BoardMember> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  const payload = buildBoardMemberPayload(member);
  await setDoc(doc(services.db, 'boardMembers', payload.id), payload);
  return payload;
}

export async function deleteBoardMember(memberId: string): Promise<void> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  await deleteDoc(doc(services.db, 'boardMembers', memberId));
}

export async function saveSiteNotice(notice: SiteNotice): Promise<SiteNotice> {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase is not configured.');
  const payload = buildSiteNoticePayload(notice);
  await setDoc(doc(services.db, 'siteConfig', 'notice'), payload);
  return payload;
}
