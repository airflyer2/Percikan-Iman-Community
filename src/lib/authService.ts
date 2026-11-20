import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import {
  getFirebaseOptions,
  getFirebaseServices,
  googleProvider,
  isFirebaseConfigured
} from './firebase';
import { UserAccount, MembershipCategory, PaymentMethod } from '../types';

const CREDENTIALS_VAULT_KEY = 'percikan_iman_auth_vault_v1';
const SESSION_USER_KEY = 'percikan_iman_user';
const MAX_BATCH_SIZE = 450;

interface VaultCredentialRecord {
  uid: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export function isEmulatorMode(): boolean {
  const options = getFirebaseOptions();
  return Boolean(options?.useEmulator && isLocalhost());
}

/**
 * Pure helper for verifying dev/emulator gating rules in unit tests.
 */
export function evaluateDevOrEmulatorGate(
  isDev: boolean,
  useEmulatorEnv: string | undefined,
  useEmulatorOption: boolean | undefined,
  hostname: string
): boolean {
  const localhost = hostname === 'localhost' || hostname === '127.0.0.1';
  return Boolean(isDev || (useEmulatorEnv === 'true' && useEmulatorOption && localhost));
}

export function isDevOrEmulatorMode(): boolean {
  return Boolean(
    import.meta.env?.DEV ||
      (import.meta.env?.VITE_USE_FIREBASE_EMULATOR === 'true' && isEmulatorMode())
  );
}

async function loadDevSeedMembers(): Promise<UserAccount[]> {
  if (!isDevOrEmulatorMode()) {
    return [];
  }
  const mod = await import('../data/members');
  return mod.INITIAL_MEMBERS_LIST;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively strips `undefined` values from plain objects and arrays while
 * preserving Firestore FieldValue sentinels (e.g. deleteField, serverTimestamp) and Dates.
 */
export function sanitizeFirestorePayload<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestorePayload(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) {
        cleaned[key] = sanitizeFirestorePayload(val);
      }
    }
    return cleaned as T;
  }
  return value;
}

// --- Web Crypto SHA-256 Password Hashing for Dev/Emulator Fallback Vault ---
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return sha256Hex(`${salt}:${password}:percikan_iman_v1`);
}

async function ensureDefaultVaultSeeded(): Promise<Record<string, VaultCredentialRecord>> {
  if (!isDevOrEmulatorMode()) {
    return {};
  }

  let vault: Record<string, VaultCredentialRecord> = {};
  try {
    const raw = localStorage.getItem(CREDENTIALS_VAULT_KEY);
    if (raw) {
      vault = JSON.parse(raw);
    }
  } catch {
    vault = {};
  }

  const defaultSeeds: Array<{ email: string; defaultPass: string; uid: string }> = [
    { email: 'superadmin@percikaniman.org', defaultPass: 'SuperAdmin!2026', uid: 'uid-superadmin' },
    { email: 'admin@percikaniman.org', defaultPass: 'Admin!2026', uid: 'uid-admin' },
    { email: 'ridwan.santoso@percikaniman.org', defaultPass: 'Member!2026', uid: 'uid-ridwan' },
    { email: 'bambang.s@percikaniman.org', defaultPass: 'Member!2026', uid: 'uid-bambang' },
    { email: 'taufik.hidayat@percikaniman.org', defaultPass: 'Member!2026', uid: 'uid-taufik' },
    { email: 'ahmad.fauzi@percikaniman.org', defaultPass: 'Member!2026', uid: 'uid-ahmad' },
    { email: 'indira.pratiwi@percikaniman.org', defaultPass: 'Member!2026', uid: 'uid-indira' }
  ];

  let modified = false;
  for (const seed of defaultSeeds) {
    const key = seed.email.toLowerCase();
    if (!vault[key]) {
      const salt = `salt_${seed.uid}`;
      const passwordHash = await hashPassword(seed.defaultPass, salt);
      vault[key] = {
        uid: seed.uid,
        email: key,
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      modified = true;
    }
  }

  if (modified) {
    try {
      localStorage.setItem(CREDENTIALS_VAULT_KEY, JSON.stringify(vault));
    } catch {
      // ignore storage errors
    }
  }

  return vault;
}

export interface RegistrationPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  membershipCategory: MembershipCategory;
  paymentMethod: PaymentMethod;
  memberCode?: string;
}

export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  return null;
}

function buildNewMemberAccount(
  uid: string,
  payload: RegistrationPayload,
  authProvider: 'password' | 'google' = 'password'
): UserAccount {
  const isTwint = payload.paymentMethod === 'twint';
  const finalMemberCode =
    (payload.memberCode?.trim() || `PI-${Math.floor(1000 + Math.random() * 9000)}`).slice(0, 64);
  const feeAmount = payload.membershipCategory === 'family' ? 120 : 80;
  const initialStatus = isTwint ? 'active' : 'pending_payment';
  const payStatus = isTwint ? 'paid' : 'pending_payment';
  const todayStr = new Date().toLocaleDateString('en-GB');

  let reasonText = '';
  let recordedBy = '';
  if (isTwint) {
    reasonText = `Initial membership application completed. Statutory contribution (CHF ${feeAmount}) paid via TWINT. Active status activated.`;
    recordedBy = 'TWINT Mobile Gateway';
  } else if (payload.paymentMethod === 'bank_transfer') {
    reasonText = `Initial membership application submitted with Bank Transfer settlement. Annual contribution (CHF ${feeAmount}) pending bank deposit verification by Board Administrator.`;
    recordedBy = 'Member Registration Portal';
  } else {
    reasonText = `Initial membership application submitted with Cash settlement. Annual contribution (CHF ${feeAmount}) to be paid in cash to Board Administrator. Pending admin confirmation.`;
    recordedBy = 'Member Registration Portal';
  }

  const account: UserAccount = {
    uid,
    emailVerified: authProvider === 'google',
    authProvider,
    name: payload.fullName.trim().slice(0, 150),
    email: payload.email.trim().toLowerCase(),
    memberCode: finalMemberCode,
    role: 'Registered Member',
    isAdmin: false,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: false,
    membershipCategory: payload.membershipCategory,
    membershipStatus: initialStatus,
    paymentStatus: payStatus,
    paymentMethod: payload.paymentMethod,
    paymentReference: isTwint
      ? `TWINT-${Math.floor(100000 + Math.random() * 900000)}`
      : `PI-REG-${finalMemberCode}`,
    phone: payload.phone.trim().slice(0, 50),
    yearlyContribution: feeAmount,
    monthlyFee: payload.membershipCategory === 'family' ? 10 : 6.67,
    membershipYear: 2026,
    validUntil: isTwint ? '31 Dec 2026 (Subject to GA Renewal)' : 'Pending Fee Settlement',
    gaApprovalStatus: 'approved_current_year',
    joinedAt: todayStr,
    acknowledgedEmailNotices: true,
    acknowledgedMembershipFee: true,
    feeExemption: {
      isExempt: false,
      retainsBenefits: true
    },
    formalStatusHistory: [
      {
        id: `fst-init-${Date.now()}`,
        status: initialStatus,
        effectiveDate: todayStr,
        reason: reasonText,
        recordedBy,
        dateLogged: todayStr
      }
    ],
    address: {
      street: (payload.street?.trim() || '').slice(0, 200),
      postalCode: (payload.postalCode?.trim() || '').slice(0, 30),
      city: (payload.city?.trim() || 'Zürich').slice(0, 100),
      country: (payload.country?.trim() || 'Switzerland').slice(0, 100)
    },
    children: []
  };

  if (isTwint) {
    account.paidAt = todayStr;
  }

  return account;
}

/**
 * Resolves an admin Member Code (e.g. PI-ADMIN, PI-SUPERADMIN) to an email address.
 * Per security policy, ONLY administrators are permitted to use Member Code lookup at sign-in.
 */
async function resolveIdentifierToEmail(
  identifier: string,
  knownMembers: UserAccount[]
): Promise<{ email: string; member?: UserAccount }> {
  const trimmed = identifier.trim();
  const devSeeds = isDevOrEmulatorMode() ? await loadDevSeedMembers() : [];
  const mergedKnown = [...devSeeds];
  knownMembers.forEach((km) => {
    const idx = mergedKnown.findIndex((m) => m.email.toLowerCase() === km.email.toLowerCase());
    if (idx === -1) mergedKnown.push(km);
    else mergedKnown[idx] = { ...mergedKnown[idx], ...km };
  });

  if (trimmed.includes('@')) {
    const lower = trimmed.toLowerCase();
    const matched = mergedKnown.find((m) => m.email.toLowerCase() === lower);
    return { email: lower, member: matched };
  }

  const upperCode = trimmed.toUpperCase();
  const localMatch = mergedKnown.find(
    (m) => (m.memberCode || '').trim().toUpperCase() === upperCode
  );
  if (localMatch) {
    if (!localMatch.isAdmin && !localMatch.isSuperAdmin && !localMatch.canManageBoard && !localMatch.canScanQR) {
      throw new Error(
        'Member code sign-in is restricted to Board Administrators. Please sign in with your registered email address and password.'
      );
    }
    return { email: localMatch.email.toLowerCase(), member: localMatch };
  }

  const services = getFirebaseServices();
  if (services && services.auth.currentUser) {
    try {
      const q = query(collection(services.db, 'members'), where('memberCode', '==', upperCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const memberDoc = { ...(docSnap.data() as UserAccount), uid: docSnap.id };
        if (!memberDoc.isAdmin && !memberDoc.isSuperAdmin && !memberDoc.canManageBoard && !memberDoc.canScanQR) {
          throw new Error(
            'Member code sign-in is restricted to Board Administrators. Please sign in with your registered email address and password.'
          );
        }
        return { email: memberDoc.email.toLowerCase(), member: memberDoc };
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('restricted to Board Administrators')) {
        throw e;
      }
    }
  }

  throw new Error(
    'No administrator account found for that member code. Please sign in with your registered email address.'
  );
}

function formatFirebaseError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address is already registered. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 8 characters with letters and numbers.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed sign-in attempts. Please wait a moment or reset your password.';
    case 'auth/popup-closed-by-user':
      return 'Google Sign-In was cancelled before completion.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Email/Password or Google Sign-In is not yet enabled in your Firebase Console (Authentication > Sign-in method).';
    case 'auth/unauthorized-domain':
      return 'This domain is not yet authorized in Firebase Console (Authentication > Settings > Authorized domains).';
    case 'permission-denied':
      return 'Permission denied while accessing your member profile. Please contact an administrator.';
    default:
      if (err instanceof Error) return err.message;
      return 'Authentication failed. Please try again.';
  }
}

export async function signInMember(
  identifier: string,
  password: string,
  knownMembers: UserAccount[] = []
): Promise<UserAccount> {
  if (!identifier.trim() || !password) {
    throw new Error('Please enter both your email address and password.');
  }

  const devOrEmulator = isDevOrEmulatorMode();
  const { email, member: preMatchedMember } = await resolveIdentifierToEmail(
    identifier,
    knownMembers
  );

  const services = getFirebaseServices();
  if (!services) {
    if (!devOrEmulator) {
      throw new Error('Firebase Authentication is not configured.');
    }

    const vault = await ensureDefaultVaultSeeded();
    const record = vault[email.toLowerCase()];
    if (!record) {
      throw new Error('Invalid email or password. Please check your credentials and try again.');
    }

    const candidateHash = await hashPassword(password, record.salt);
    if (candidateHash !== record.passwordHash) {
      throw new Error('Invalid email or password. Please check your credentials and try again.');
    }

    const devSeeds = await loadDevSeedMembers();
    const matched =
      preMatchedMember ||
      knownMembers.find((m) => m.email.toLowerCase() === email.toLowerCase()) ||
      devSeeds.find((m) => m.email.toLowerCase() === email.toLowerCase());

    if (!matched) {
      throw new Error('Member profile could not be loaded for this account.');
    }

    return {
      ...matched,
      uid: record.uid,
      authProvider: 'password'
    };
  }

  try {
    let effectivePassword = password;
    const lowerEmail = email.toLowerCase();

    if (devOrEmulator) {
      if (lowerEmail === 'admin@percikaniman.org' && (password === 'admin123' || password === 'admin')) {
        effectivePassword = 'Admin!2026';
      } else if (
        lowerEmail === 'superadmin@percikaniman.org' &&
        (password === 'admin123' || password === 'superadmin' || password === 'Admin!2026')
      ) {
        effectivePassword = 'SuperAdmin!2026';
      } else if (
        preMatchedMember &&
        !preMatchedMember.isAdmin &&
        (password === 'member123' || password === 'percikan2026')
      ) {
        effectivePassword = 'Member!2026';
      }
    }

    let fbUser: FirebaseUser;
    try {
      const credential = await signInWithEmailAndPassword(services.auth, email, effectivePassword);
      fbUser = credential.user;
    } catch (signInErr) {
      const errCode = (signInErr as { code?: string })?.code || '';
      if (
        devOrEmulator &&
        (errCode === 'auth/user-not-found' || errCode === 'auth/invalid-credential') &&
        preMatchedMember
      ) {
        const vault = await ensureDefaultVaultSeeded();
        const record = vault[lowerEmail];
        if (record) {
          const candidateHash = await hashPassword(effectivePassword, record.salt);
          if (candidateHash === record.passwordHash) {
            try {
              const created = await createUserWithEmailAndPassword(
                services.auth,
                email,
                effectivePassword
              );
              await updateProfile(created.user, { displayName: preMatchedMember.name });
              fbUser = created.user;
            } catch (createErr) {
              const createCode = (createErr as { code?: string })?.code || '';
              if (createCode === 'auth/email-already-in-use') {
                throw signInErr;
              }
              throw createErr;
            }
          } else {
            throw signInErr;
          }
        } else {
          throw signInErr;
        }
      } else {
        throw signInErr;
      }
    }

    const memberRef = doc(services.db, 'members', fbUser.uid);
    const memberSnap = await getDoc(memberRef);
    if (memberSnap.exists()) {
      return {
        ...(memberSnap.data() as UserAccount),
        uid: memberSnap.id,
        emailVerified: fbUser.emailVerified
      };
    }

    if (devOrEmulator && preMatchedMember) {
      const synced: UserAccount = {
        ...preMatchedMember,
        uid: fbUser.uid,
        emailVerified: fbUser.emailVerified,
        authProvider: 'password'
      };
      try {
        await setDoc(memberRef, sanitizeFirestorePayload(synced), { merge: true });
      } catch {
        // Privileged seed accounts cannot self-create /members/{uid} under firestore.rules;
        // admin provisioning / emulator setup handles privileged docs.
      }
      return synced;
    }

    throw new Error(
      'Member profile not found in Firestore. Please complete registration or contact an administrator.'
    );
  } catch (err) {
    throw new Error(formatFirebaseError(err));
  }
}

export async function registerMember(
  payload: RegistrationPayload,
  knownMembers: UserAccount[] = []
): Promise<UserAccount> {
  const emailLower = payload.email.trim().toLowerCase();
  const pwError = validatePasswordStrength(payload.password);
  if (pwError) {
    throw new Error(pwError);
  }

  const services = getFirebaseServices();
  if (services) {
    try {
      const credential = await createUserWithEmailAndPassword(
        services.auth,
        emailLower,
        payload.password
      );
      await updateProfile(credential.user, {
        displayName: payload.fullName.trim()
      });

      const newUser = buildNewMemberAccount(credential.user.uid, payload, 'password');
      await setDoc(doc(services.db, 'members', credential.user.uid), sanitizeFirestorePayload(newUser));
      return newUser;
    } catch (err) {
      throw new Error(formatFirebaseError(err));
    }
  }

  if (!isDevOrEmulatorMode()) {
    throw new Error('Firebase Authentication is not configured.');
  }

  const vault = await ensureDefaultVaultSeeded();
  const devSeeds = await loadDevSeedMembers();
  const allMembers = knownMembers.length > 0 ? knownMembers : devSeeds;
  const emailExists =
    Boolean(vault[emailLower]) ||
    allMembers.some((m) => m.email.toLowerCase() === emailLower);

  if (emailExists) {
    throw new Error('An account with this email address is already registered. Please sign in instead.');
  }

  const uid = `uid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const salt = `salt_${uid}`;
  const passwordHash = await hashPassword(payload.password, salt);

  vault[emailLower] = {
    uid,
    email: emailLower,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(CREDENTIALS_VAULT_KEY, JSON.stringify(vault));
  } catch {
    // ignore storage errors
  }

  return buildNewMemberAccount(uid, payload, 'password');
}

export interface GoogleAuthResult {
  status: 'existing_member' | 'needs_registration_completion';
  user?: UserAccount;
  googleProfile?: {
    uid: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export async function authenticateWithGoogle(
  knownMembers: UserAccount[] = []
): Promise<GoogleAuthResult> {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error(
      'Google OAuth Sign-In requires Firebase Authentication to be connected. Please complete Firebase project setup or sign in with Email & Password.'
    );
  }

  try {
    const result = await signInWithPopup(services.auth, googleProvider);
    const fbUser = result.user;
    const emailLower = (fbUser.email || '').toLowerCase();

    const memberRef = doc(services.db, 'members', fbUser.uid);
    const memberSnap = await getDoc(memberRef);
    if (memberSnap.exists()) {
      return {
        status: 'existing_member',
        user: {
          ...(memberSnap.data() as UserAccount),
          uid: memberSnap.id,
          emailVerified: fbUser.emailVerified,
          authProvider: 'google'
        }
      };
    }

    if (isDevOrEmulatorMode()) {
      const devSeeds = await loadDevSeedMembers();
      const mergedKnown = [...devSeeds, ...knownMembers];
      const existingByEmail = mergedKnown.find(
        (m) => m.email.toLowerCase() === emailLower
      );
      if (existingByEmail) {
        const merged: UserAccount = {
          ...existingByEmail,
          uid: fbUser.uid,
          avatarUrl: existingByEmail.avatarUrl || fbUser.photoURL || undefined,
          emailVerified: true,
          authProvider: 'google'
        };
        try {
          await setDoc(memberRef, sanitizeFirestorePayload(merged), { merge: true });
        } catch {
          // ignore if rules prevent self-creating privileged seed profile
        }
        return {
          status: 'existing_member',
          user: merged
        };
      }
    }

    return {
      status: 'needs_registration_completion',
      googleProfile: {
        uid: fbUser.uid,
        name: fbUser.displayName || emailLower.split('@')[0] || 'New Member',
        email: emailLower,
        avatarUrl: fbUser.photoURL || undefined
      }
    };
  } catch (err) {
    throw new Error(formatFirebaseError(err));
  }
}

export async function completeGoogleMemberRegistration(
  uid: string,
  payload: RegistrationPayload,
  avatarUrl?: string
): Promise<UserAccount> {
  const newUser = buildNewMemberAccount(uid, payload, 'google');
  if (avatarUrl && avatarUrl.trim()) {
    newUser.avatarUrl = avatarUrl.trim();
  }

  const services = getFirebaseServices();
  if (!services) {
    if (!isDevOrEmulatorMode()) {
      throw new Error('Firebase Authentication is not configured.');
    }
    return newUser;
  }

  await setDoc(doc(services.db, 'members', uid), sanitizeFirestorePayload(newUser));
  return newUser;
}

export async function sendMemberPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid registered email address.');
  }

  const services = getFirebaseServices();
  if (services) {
    try {
      await sendPasswordResetEmail(services.auth, cleanEmail);
      return;
    } catch (err) {
      throw new Error(formatFirebaseError(err));
    }
  }

  if (!isDevOrEmulatorMode()) {
    throw new Error('Firebase Authentication is not configured.');
  }

  const vault = await ensureDefaultVaultSeeded();
  const devSeeds = await loadDevSeedMembers();
  const exists =
    Boolean(vault[cleanEmail]) ||
    devSeeds.some((m) => m.email.toLowerCase() === cleanEmail);

  if (!exists) {
    throw new Error('No registered member account was found with that email address.');
  }
}

export async function signOutMember(): Promise<void> {
  const services = getFirebaseServices();
  if (services) {
    try {
      await firebaseSignOut(services.auth);
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(SESSION_USER_KEY);
    } catch {
      // ignore
    }
  }
}

export async function updateMemberDocument(
  uid: string,
  patch: Partial<UserAccount>
): Promise<void> {
  const cleanUid = uid.trim();
  if (!cleanUid) {
    throw new Error('Member UID is required for profile update.');
  }
  const services = getFirebaseServices();
  if (!services) {
    throw new Error('Firebase is not configured.');
  }

  const cleanedPatch = sanitizeFirestorePayload(patch);
  if (Object.keys(cleanedPatch).length === 0) {
    return;
  }
  await updateDoc(doc(services.db, 'members', cleanUid), cleanedPatch as Record<string, unknown>);
}

export async function deleteMemberDocument(uid: string): Promise<void> {
  const cleanUid = uid.trim();
  if (!cleanUid) {
    throw new Error('Member UID is required for deletion.');
  }
  const services = getFirebaseServices();
  if (!services) {
    throw new Error('Firebase is not configured.');
  }

  await deleteDoc(doc(services.db, 'members', cleanUid));
}

export interface VerifiedVoteWeightUpdate {
  uid: string;
  verifiedVoteWeight: number;
  voteWeightVerifiedAt: string;
  voteWeightVerifiedBy: string;
}

export async function batchUpdateVerifiedVoteWeights(
  updates: VerifiedVoteWeightUpdate[]
): Promise<void> {
  if (!updates.length) return;

  const validUpdates: VerifiedVoteWeightUpdate[] = [];
  for (const item of updates) {
    const cleanUid = item.uid.trim();
    if (!Number.isFinite(item.verifiedVoteWeight)) {
      throw new Error(
        `Invalid verifiedVoteWeight for member "${cleanUid || 'unknown'}": expected a finite number.`
      );
    }
    if (!cleanUid) continue;
    validUpdates.push({ ...item, uid: cleanUid });
  }

  if (validUpdates.length === 0) return;

  const services = getFirebaseServices();
  if (!services) {
    throw new Error('Firebase is not configured.');
  }

  for (let i = 0; i < validUpdates.length; i += MAX_BATCH_SIZE) {
    const chunk = validUpdates.slice(i, i + MAX_BATCH_SIZE);
    const batch = writeBatch(services.db);
    for (const item of chunk) {
      const clampedWeight = Math.max(0, Math.min(20, Math.trunc(item.verifiedVoteWeight)));
      batch.update(doc(services.db, 'members', item.uid), {
        verifiedVoteWeight: clampedWeight,
        voteWeightVerifiedAt: item.voteWeightVerifiedAt.slice(0, 64),
        voteWeightVerifiedBy: item.voteWeightVerifiedBy.slice(0, 150)
      });
    }
    await batch.commit();
  }
}

export function subscribeToAuthAndProfile(
  onUserChanged: (user: UserAccount | null) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onUserChanged(null);
    return () => {};
  }

  let profileUnsub: Unsubscribe | null = null;

  const authUnsub = onAuthStateChanged(services.auth, (fbUser: FirebaseUser | null) => {
    if (profileUnsub) {
      profileUnsub();
      profileUnsub = null;
    }

    if (!fbUser) {
      onUserChanged(null);
      return;
    }

    const memberRef = doc(services.db, 'members', fbUser.uid);
    profileUnsub = onSnapshot(
      memberRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUserChanged({
            ...(docSnap.data() as UserAccount),
            uid: docSnap.id,
            emailVerified: fbUser.emailVerified
          });
        } else {
          onUserChanged(null);
        }
      },
      () => {
        onUserChanged(null);
      }
    );
  });

  return () => {
    if (profileUnsub) {
      profileUnsub();
      profileUnsub = null;
    }
    authUnsub();
  };
}

export function subscribeToFirestoreMembers(
  onMembersUpdated: (members: UserAccount[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onMembersUpdated([]);
    return () => {};
  }

  const colRef = collection(services.db, 'members');
  return onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snapshot) => {
      // Skip partial client-cache snapshots (e.g. [admin] pre-populated by AuthContext)
      // so batch operations like "Certify Voter Roll" never act on an incomplete roll.
      if (snapshot.metadata?.fromCache) {
        return;
      }
      const list = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as UserAccount),
        uid: docSnap.id
      }));
      onMembersUpdated(list);
    },
    (err) => {
      onError?.(err);
    }
  );
}

/**
 * Admin-only lookup by Member Code (e.g. PI-7740, PI-FAM-2021).
 */
export async function lookupMemberByCodeForAdmin(
  caller: UserAccount | null,
  memberCode: string,
  knownMembers: UserAccount[] = []
): Promise<UserAccount | null> {
  if (!caller || (!caller.isAdmin && !caller.isSuperAdmin && !caller.canScanQR && !caller.canManageBoard)) {
    throw new Error('Unauthorized: Only Board Administrators and authorized operators may look up members by code.');
  }

  const cleanCode = memberCode.trim().toUpperCase();
  if (!cleanCode) return null;

  const services = getFirebaseServices();
  if (services) {
    try {
      const q = query(collection(services.db, 'members'), where('memberCode', '==', cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        return {
          ...(docSnap.data() as UserAccount),
          uid: docSnap.id
        };
      }
    } catch {
      // fall through to knownMembers / dev seed check
    }
  }

  const devSeeds = isDevOrEmulatorMode() ? await loadDevSeedMembers() : [];
  const merged = [...knownMembers, ...devSeeds];
  return (
    merged.find(
      (m) => (m.memberCode || '').trim().toUpperCase() === cleanCode
    ) || null
  );
}

export { isFirebaseConfigured };
