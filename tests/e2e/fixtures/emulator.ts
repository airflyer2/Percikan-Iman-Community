import fs from 'node:fs';
import path from 'node:path';

export interface ProjectConfig {
  projectId: string;
  databaseId: string;
  authEmulatorOrigin: string;
  firestoreEmulatorOrigin: string;
}

export interface SeededAuthResult {
  uid: string;
  idToken: string;
  email: string;
  refreshToken: string;
}

export type PersonaKey =
  | 'superAdmin'
  | 'admin'
  | 'canManageBoard'
  | 'canScanQR'
  | 'activeFamily'
  | 'activePersonal'
  | 'feeExempt'
  | 'pendingPayment'
  | 'feePaused'
  | 'relocated';

export interface PersonaSpec {
  key: PersonaKey;
  email: string;
  password: string;
  name: string;
  memberCode: string;
  role: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canManageBoard: boolean;
  canScanQR: boolean;
  membershipCategory: 'personal' | 'family';
  membershipStatus:
    | 'active'
    | 'pending_payment'
    | 'relocated'
    | 'fee_paused'
    | 'inactive';
  paymentStatus: 'paid' | 'pending_payment' | 'exempt';
  paymentMethod: 'twint' | 'bank_transfer' | 'cash' | 'exempt';
  yearlyContribution: number;
  verifiedVoteWeight?: number;
  spouse?: { name: string; email?: string; phone?: string };
  children?: Array<{
    id: string;
    name: string;
    birthYear: string;
    relation?: string;
  }>;
  feeExemption?: {
    isExempt: boolean;
    votedYear: number;
    exemptionYear: number;
    approvedByGA: boolean;
    resolutionRef: string;
    exemptionReason: string;
    validUntil: string;
    retainsBenefits: boolean;
  };
  categoryChangeRequest?: {
    requestedCategory: 'personal' | 'family';
    requestedAt: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
  };
  phone?: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

let cachedDotEnv: Record<string, string> | null = null;

function readDotEnvFile(): Record<string, string> {
  if (cachedDotEnv) return cachedDotEnv;
  const result: Record<string, string> = {};
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (val.startsWith('"') || val.startsWith("'")) {
        const quote = val[0];
        const closeIdx = val.indexOf(quote, 1);
        if (closeIdx !== -1) {
          val = val.slice(1, closeIdx);
        }
      } else {
        val = val.replace(/\s+#.*$/, '').trim();
      }
      result[key] = val;
    }
  }
  cachedDotEnv = result;
  return result;
}

function getEnvVar(name: string, fallback: string): string {
  const fromProcess = process.env[name];
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess;
  const fromFile = readDotEnvFile()[name];
  if (fromFile !== undefined && fromFile !== '') return fromFile;
  return fallback;
}

export function getProjectConfig(): ProjectConfig {
  const projectId = getEnvVar('VITE_FIREBASE_PROJECT_ID', 'percikan-iman-724ae');
  const databaseId = getEnvVar('VITE_FIREBASE_DATABASE_ID', '(default)');
  const authHost = getEnvVar('FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099');
  const firestoreHost = getEnvVar('FIRESTORE_EMULATOR_HOST', '127.0.0.1:8080');

  return {
    projectId,
    databaseId,
    authEmulatorOrigin: authHost.startsWith('http')
      ? authHost
      : `http://${authHost}`,
    firestoreEmulatorOrigin: firestoreHost.startsWith('http')
      ? firestoreHost
      : `http://${firestoreHost}`,
  };
}

export const TEST_PERSONAS: Record<PersonaKey, PersonaSpec> = {
  superAdmin: {
    key: 'superAdmin',
    email: 'superadmin@percikaniman.org',
    password: 'SuperAdmin!2026',
    name: 'Super Administrator',
    memberCode: 'PI-SUPERADMIN',
    role: 'Super Administrator',
    isAdmin: true,
    isSuperAdmin: true,
    canManageBoard: true,
    canScanQR: true,
    membershipCategory: 'personal',
    membershipStatus: 'active',
    paymentStatus: 'exempt',
    paymentMethod: 'exempt',
    yearlyContribution: 0,
    verifiedVoteWeight: 1,
    feeExemption: {
      isExempt: true,
      votedYear: 2026,
      exemptionYear: 2026,
      approvedByGA: true,
      resolutionRef: 'GA-2026/RES-EXEC-01',
      exemptionReason: 'Executive Board Mandate',
      validUntil: '2026-12-31',
      retainsBenefits: true,
    },
    phone: '+41 44 500 00 01',
    address: {
      street: 'Bahnhofstrasse 10',
      city: 'Zürich',
      postalCode: '8001',
      country: 'Switzerland',
    },
  },
  admin: {
    key: 'admin',
    email: 'admin@percikaniman.org',
    password: 'Admin!2026',
    name: 'Dr. H. Aam Amiruddin',
    memberCode: 'PI-ADMIN',
    role: 'Board Administrator',
    isAdmin: true,
    isSuperAdmin: false,
    canManageBoard: true,
    canScanQR: true,
    membershipCategory: 'family',
    membershipStatus: 'active',
    paymentStatus: 'paid',
    paymentMethod: 'twint',
    yearlyContribution: 120,
    verifiedVoteWeight: 4,
    spouse: {
      name: 'Siti Aminah',
      email: 'siti.aminah@percikaniman.org',
    },
    children: [
      {
        id: 'child-admin-1',
        name: 'Farhan Amiruddin',
        birthYear: '2004',
        relation: 'Son',
      },
      {
        id: 'child-admin-2',
        name: 'Nadia Amiruddin',
        birthYear: '2008',
        relation: 'Daughter',
      },
    ],
    phone: '+41 44 500 00 02',
    address: {
      street: 'Seestrasse 22',
      city: 'Zürich',
      postalCode: '8002',
      country: 'Switzerland',
    },
  },
  canManageBoard: {
    key: 'canManageBoard',
    email: 'board.mgr@percikaniman.org',
    password: 'BoardMgr!2026',
    name: 'Dewi Kartika',
    memberCode: 'PI-BOARD-01',
    role: 'Board Directory Editor',
    isAdmin: false,
    isSuperAdmin: false,
    canManageBoard: true,
    canScanQR: false,
    membershipCategory: 'personal',
    membershipStatus: 'active',
    paymentStatus: 'paid',
    paymentMethod: 'bank_transfer',
    yearlyContribution: 80,
    verifiedVoteWeight: 1,
    phone: '+41 44 500 00 03',
    address: {
      street: 'Limmatquai 45',
      city: 'Zürich',
      postalCode: '8001',
      country: 'Switzerland',
    },
  },
  canScanQR: {
    key: 'canScanQR',
    email: 'qr.scanner@percikaniman.org',
    password: 'Scanner!2026',
    name: 'Hendra Wijaya',
    memberCode: 'PI-SCAN-01',
    role: 'Event Volunteer Scanner',
    isAdmin: false,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: true,
    membershipCategory: 'personal',
    membershipStatus: 'active',
    paymentStatus: 'paid',
    paymentMethod: 'twint',
    yearlyContribution: 80,
    verifiedVoteWeight: 1,
    phone: '+41 44 500 00 04',
    address: {
      street: 'Langstrasse 88',
      city: 'Zürich',
      postalCode: '8004',
      country: 'Switzerland',
    },
  },
  activeFamily: {
    key: 'activeFamily',
    email: 'ridwan.santoso@percikaniman.org',
    password: 'Member!2026',
    name: 'Ridwan Kamil Santoso',
    memberCode: 'PI-FAM-2021',
    role: 'Member',
    isAdmin: false,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: false,
    membershipCategory: 'family',
    membershipStatus: 'active',
    paymentStatus: 'paid',
    paymentMethod: 'twint',
    yearlyContribution: 120,
    verifiedVoteWeight: 2,
    spouse: {
      name: 'Siti Sarah Nurhaliza',
      email: 'sarah.santoso@percikaniman.org',
    },
    children: [
      {
        id: 'child-fam-1',
        name: 'Alya Santoso',
        birthYear: '2012',
        relation: 'Daughter',
      },
      {
        id: 'child-fam-2',
        name: 'Bima Santoso',
        birthYear: '2015',
        relation: 'Son',
      },
      {
        id: 'child-fam-3',
        name: 'Citra Santoso',
        birthYear: '2020',
        relation: 'Daughter',
      },
    ],
    phone: '+41 79 300 11 22',
    address: {
      street: 'Winterthurerstrasse 120',
      city: 'Zürich',
      postalCode: '8057',
      country: 'Switzerland',
    },
  },
  activePersonal: {
    key: 'activePersonal',
    email: 'bambang.s@percikaniman.org',
    password: 'Member!2026',
    name: 'Bambang Sudirman',
    memberCode: 'PI-7740',
    role: 'Member',
    isAdmin: false,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: false,
    membershipCategory: 'personal',
    membershipStatus: 'active',
    paymentStatus: 'paid',
    paymentMethod: 'bank_transfer',
    yearlyContribution: 80,
    verifiedVoteWeight: 1,
    categoryChangeRequest: {
      requestedCategory: 'family',
      requestedAt: '2026-03-01T10:00:00.000Z',
      reason: 'Recently married in Zürich',
      status: 'pending',
    },
    phone: '+41 78 400 22 33',
    address: {
      street: 'Schaffhauserstrasse 55',
      city: 'Zürich',
      postalCode: '8006',
      country: 'Switzerland',
    },
  },
  feeExempt: {
    key: 'feeExempt',
    email: 'ahmad.fauzi@percikaniman.org',
    password: 'Member!2026',
    name: 'Ahmad Fauzi Rahman',
    memberCode: 'PI-STU-8821',
    role: 'Member',
    isAdmin: false,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: false,
    membershipCategory: 'personal',
    membershipStatus: 'active',
    paymentStatus: 'exempt',
    paymentMethod: 'exempt',
    yearlyContribution: 0,
    verifiedVoteWeight: 1,
    feeExemption: {
      isExempt: true,
      votedYear: 2026,
      exemptionYear: 2026,
      approvedByGA: true,
      resolutionRef: 'GA-2026/RES-EX-04',
      exemptionReason: 'Full-time student exemption',
      validUntil: '2026-12-31',
      retainsBenefits: true,
    },
    phone: '+41 76 500 33 44',
    address: {
      street: 'Rämistrasse 101',
      city: 'Zürich',
      postalCode: '8092',
      country: 'Switzerland',
    },
  },
  pendingPayment: {
    key: 'pendingPayment',
    email: 'taufik.hidayat@percikaniman.org',
    password: 'Member!2026',
    name: 'Taufik Hidayat',
    memberCode: 'PI-9552',
    role: 'Member',
    isAdmin: false,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: false,
    membershipCategory: 'personal',
    membershipStatus: 'pending_payment',
    paymentStatus: 'pending_payment',
    paymentMethod: 'cash',
    yearlyContribution: 80,
    verifiedVoteWeight: 0,
    phone: '+41 79 600 44 55',
    address: {
      street: 'Hardturmstrasse 161',
      city: 'Zürich',
      postalCode: '8005',
      country: 'Switzerland',
    },
  },
  feePaused: {
    key: 'feePaused',
    email: 'paused.member@percikaniman.org',
    password: 'Member!2026',
    name: 'Yusuf Pratama',
    memberCode: 'PI-PAUSED-01',
    role: 'Member',
    isAdmin: false,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: false,
    membershipCategory: 'personal',
    membershipStatus: 'fee_paused',
    paymentStatus: 'pending_payment',
    paymentMethod: 'bank_transfer',
    yearlyContribution: 80,
    verifiedVoteWeight: 0,
    phone: '+41 79 700 55 66',
    address: {
      street: 'Birmensdorferstrasse 200',
      city: 'Zürich',
      postalCode: '8003',
      country: 'Switzerland',
    },
  },
  relocated: {
    key: 'relocated',
    email: 'indira.pratiwi@percikaniman.org',
    password: 'Member!2026',
    name: 'Indira Pratiwi Kusuma',
    memberCode: 'PI-ALUM-309',
    role: 'Member',
    isAdmin: false,
    isSuperAdmin: false,
    canManageBoard: false,
    canScanQR: false,
    membershipCategory: 'personal',
    membershipStatus: 'relocated',
    paymentStatus: 'exempt',
    paymentMethod: 'exempt',
    yearlyContribution: 0,
    verifiedVoteWeight: 0,
    phone: '+49 170 800 66 77',
    address: {
      street: 'Hauptstrasse 12',
      city: 'Basel',
      postalCode: '4001',
      country: 'Germany',
    },
  },
};

export interface FirestoreRestValue {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  stringValue?: string;
  arrayValue?: { values?: FirestoreRestValue[] };
  mapValue?: { fields?: Record<string, FirestoreRestValue> };
}

export function toFirestoreValue(value: unknown): FirestoreRestValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { nullValue: null };
    }
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (value instanceof Date) {
    return { stringValue: Number.isNaN(value.getTime()) ? '' : value.toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value
          .filter((item) => item !== undefined)
          .map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof value === 'object') {
    const fields: Record<string, FirestoreRestValue> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

export function toFirestoreFields(
  obj: Record<string, unknown>
): Record<string, FirestoreRestValue> {
  const fields: Record<string, FirestoreRestValue> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      fields[key] = toFirestoreValue(val);
    }
  }
  return fields;
}

export function fromFirestoreValue(val: FirestoreRestValue): unknown {
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map((item) =>
      fromFirestoreValue(item)
    );
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

export function fromFirestoreDoc(doc: {
  name?: string;
  fields?: Record<string, FirestoreRestValue>;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const fields = doc.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

export async function resetAuthEmulator(): Promise<void> {
  const { projectId, authEmulatorOrigin } = getProjectConfig();
  const res = await fetch(
    `${authEmulatorOrigin}/emulator/v1/projects/${encodeURIComponent(projectId)}/accounts`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to reset Auth Emulator (${res.status}): ${text}`
    );
  }
}

export async function resetFirestoreEmulator(): Promise<void> {
  const { projectId, databaseId, firestoreEmulatorOrigin } = getProjectConfig();
  const res = await fetch(
    `${firestoreEmulatorOrigin}/emulator/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to reset Firestore Emulator (${res.status}): ${text}`
    );
  }
}

export async function resetEmulators(): Promise<void> {
  await Promise.all([resetAuthEmulator(), resetFirestoreEmulator()]);
}

export async function signInAuthEmulatorUser(
  email: string,
  password: string
): Promise<SeededAuthResult> {
  const { authEmulatorOrigin } = getProjectConfig();
  const res = await fetch(
    `${authEmulatorOrigin}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );
  const body = (await res.json()) as {
    localId?: string;
    idToken?: string;
    email?: string;
    refreshToken?: string;
    error?: { message?: string };
  };
  if (!res.ok || !body.localId || !body.idToken) {
    throw new Error(
      `Auth Emulator signIn failed for ${email} (${res.status}): ${body.error?.message || JSON.stringify(body)}`
    );
  }
  return {
    uid: body.localId,
    idToken: body.idToken,
    email: body.email || email,
    refreshToken: body.refreshToken || '',
  };
}

export async function seedAuthUser(
  persona: Pick<PersonaSpec, 'email' | 'password' | 'name'>
): Promise<SeededAuthResult> {
  const { authEmulatorOrigin } = getProjectConfig();
  const res = await fetch(
    `${authEmulatorOrigin}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: persona.email,
        password: persona.password,
        displayName: persona.name,
        returnSecureToken: true,
      }),
    }
  );
  const body = (await res.json()) as {
    localId?: string;
    idToken?: string;
    email?: string;
    refreshToken?: string;
    error?: { message?: string };
  };
  if (body.error?.message === 'EMAIL_EXISTS') {
    return signInAuthEmulatorUser(persona.email, persona.password);
  }
  if (!res.ok || !body.localId || !body.idToken) {
    throw new Error(
      `Auth Emulator signUp failed for ${persona.email} (${res.status}): ${body.error?.message || JSON.stringify(body)}`
    );
  }
  return {
    uid: body.localId,
    idToken: body.idToken,
    email: body.email || persona.email,
    refreshToken: body.refreshToken || '',
  };
}

function firestoreDocumentsBaseUrl(): string {
  const { projectId, databaseId, firestoreEmulatorOrigin } = getProjectConfig();
  return `${firestoreEmulatorOrigin}/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents`;
}

export async function seedFirestoreDoc(
  collectionPath: string,
  docId: string,
  data: Record<string, unknown>
): Promise<void> {
  const cleanCollection = collectionPath.replace(/^\/+|\/+$/g, '');
  const cleanId = docId.replace(/^\/+|\/+$/g, '');
  const url = `${firestoreDocumentsBaseUrl()}/${cleanCollection}/${cleanId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer owner',
    },
    body: JSON.stringify({
      fields: toFirestoreFields(data),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to seed Firestore doc ${cleanCollection}/${cleanId} (${res.status}): ${text}`
    );
  }
}

export async function getFirestoreDoc(
  collectionPath: string,
  docId: string
): Promise<Record<string, unknown> | null> {
  const cleanCollection = collectionPath.replace(/^\/+|\/+$/g, '');
  const cleanId = docId.replace(/^\/+|\/+$/g, '');
  const url = `${firestoreDocumentsBaseUrl()}/${cleanCollection}/${cleanId}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: 'Bearer owner',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to get Firestore doc ${cleanCollection}/${cleanId} (${res.status}): ${text}`
    );
  }
  const doc = (await res.json()) as {
    name?: string;
    fields?: Record<string, FirestoreRestValue>;
  };
  return fromFirestoreDoc(doc);
}

export async function deleteFirestoreDoc(
  collectionPath: string,
  docId: string
): Promise<void> {
  const cleanCollection = collectionPath.replace(/^\/+|\/+$/g, '');
  const cleanId = docId.replace(/^\/+|\/+$/g, '');
  const url = `${firestoreDocumentsBaseUrl()}/${cleanCollection}/${cleanId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer owner',
    },
  });
  if (res.status === 404) return;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to delete Firestore doc ${cleanCollection}/${cleanId} (${res.status}): ${text}`
    );
  }
}

export async function listFirestoreCollection(
  collectionPath: string
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const cleanCollection = collectionPath.replace(/^\/+|\/+$/g, '');
  const url = `${firestoreDocumentsBaseUrl()}/${cleanCollection}?pageSize=200`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: 'Bearer owner',
    },
  });
  if (res.status === 404) return [];
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Failed to list Firestore collection ${cleanCollection} (${res.status}): ${text}`
    );
  }
  const body = (await res.json()) as {
    documents?: Array<{
      name: string;
      fields?: Record<string, FirestoreRestValue>;
    }>;
  };
  return (body.documents || []).map((doc) => {
    const parts = doc.name.split('/');
    return {
      id: parts[parts.length - 1],
      data: fromFirestoreDoc(doc),
    };
  });
}

export async function attemptUnauthenticatedOrMemberFirestoreWrite(options: {
  method: 'POST' | 'PATCH' | 'DELETE';
  collectionPath: string;
  docId?: string;
  data?: Record<string, unknown>;
  idToken?: string;
  updateMask?: string[];
}): Promise<{ ok: boolean; status: number; body: string }> {
  const cleanCollection = options.collectionPath.replace(/^\/+|\/+$/g, '');
  const base = firestoreDocumentsBaseUrl();
  let url = options.docId
    ? `${base}/${cleanCollection}/${options.docId.replace(/^\/+|\/+$/g, '')}`
    : `${base}/${cleanCollection}`;

  const params = new URLSearchParams();
  if (options.method === 'POST' && options.docId) {
    url = `${base}/${cleanCollection}`;
    params.set('documentId', options.docId);
  }
  if (options.updateMask && options.updateMask.length > 0) {
    for (const field of options.updateMask) {
      params.append('updateMask.fieldPaths', field);
    }
  }
  const qs = params.toString();
  if (qs) url += `?${qs}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.idToken) {
    headers['Authorization'] = `Bearer ${options.idToken}`;
  }

  const res = await fetch(url, {
    method: options.method,
    headers,
    ...(options.method !== 'DELETE' && options.data
      ? { body: JSON.stringify({ fields: toFirestoreFields(options.data) }) }
      : {}),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

export async function attemptUnauthenticatedOrMemberFirestoreRead(options: {
  collectionPath: string;
  docId?: string;
  idToken?: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const cleanCollection = options.collectionPath.replace(/^\/+|\/+$/g, '');
  const base = firestoreDocumentsBaseUrl();
  const url = options.docId
    ? `${base}/${cleanCollection}/${options.docId.replace(/^\/+|\/+$/g, '')}`
    : `${base}/${cleanCollection}`;
  const headers: Record<string, string> = {};
  if (options.idToken) {
    headers['Authorization'] = `Bearer ${options.idToken}`;
  }
  const res = await fetch(url, { method: 'GET', headers });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

export function buildMemberDocument(
  persona: PersonaSpec,
  uid: string,
  options?: { includeVerifiedVoteWeight?: boolean }
): Record<string, unknown> {
  const includeWeight = options?.includeVerifiedVoteWeight !== false;
  const doc: Record<string, unknown> = {
    uid,
    emailVerified: true,
    authProvider: 'password',
    name: persona.name,
    email: persona.email,
    phone: persona.phone || '+41 44 000 00 00',
    address: persona.address || {
      street: 'Bahnhofstrasse 1',
      city: 'Zürich',
      postalCode: '8001',
      country: 'Switzerland',
    },
    memberCode: persona.memberCode,
    role: persona.role,
    isAdmin: persona.isAdmin,
    isSuperAdmin: persona.isSuperAdmin,
    canManageBoard: persona.canManageBoard,
    canScanQR: persona.canScanQR,
    joinedAt: '2025-01-15',
    membershipCategory: persona.membershipCategory,
    membershipStatus: persona.membershipStatus,
    yearlyContribution: persona.yearlyContribution,
    monthlyFee:
      persona.yearlyContribution > 0
        ? Number((persona.yearlyContribution / 12).toFixed(2))
        : 0,
    membershipYear: 2026,
    validUntil: '2026-12-31',
    gaApprovalStatus: 'approved_current_year',
    paymentStatus: persona.paymentStatus,
    paymentMethod: persona.paymentMethod,
    acknowledgedEmailNotices: true,
    acknowledgedMembershipFee: true,
  };
  if (persona.spouse) doc.spouse = persona.spouse;
  if (persona.children) doc.children = persona.children;
  if (persona.feeExemption) doc.feeExemption = persona.feeExemption;
  if (persona.categoryChangeRequest) {
    doc.categoryChangeRequest = persona.categoryChangeRequest;
  }
  if (includeWeight && persona.verifiedVoteWeight !== undefined) {
    doc.verifiedVoteWeight = persona.verifiedVoteWeight;
    doc.voteWeightVerifiedAt = '2026-09-01T09:00:00.000Z';
    doc.voteWeightVerifiedBy = 'Dr. H. Aam Amiruddin';
  }
  return doc;
}

export function generateValidQrPayload(persona: PersonaSpec): string {
  const party = [persona.name];
  if (persona.spouse?.name) party.push(persona.spouse.name);
  if (persona.children) {
    for (const c of persona.children) party.push(c.name);
  }
  const authHash = Buffer.from(
    `${persona.memberCode}:${persona.name}:2026-CH`
  )
    .toString('base64')
    .slice(0, 16);

  return JSON.stringify({
    org: 'Verein Percikan Iman Schweiz',
    memberId: persona.memberCode,
    name: persona.name,
    category: persona.membershipCategory,
    status: persona.membershipStatus,
    exempt: Boolean(persona.feeExemption?.isExempt),
    validYear: 2026,
    validUntil: '2026-12-31',
    partyCount: party.length,
    party,
    authHash,
  });
}

export function buildBallotBreakdown(
  overrides?: Partial<{
    primaryEligible: boolean;
    spouseEligible: boolean;
    eligibleChildrenNames: string[];
    ineligibleChildrenNames: string[];
  }>
): {
  primaryEligible: boolean;
  spouseEligible: boolean;
  eligibleChildrenNames: string[];
  ineligibleChildrenNames: string[];
} {
  return {
    primaryEligible: overrides?.primaryEligible ?? true,
    spouseEligible: overrides?.spouseEligible ?? false,
    eligibleChildrenNames: overrides?.eligibleChildrenNames ?? [],
    ineligibleChildrenNames: overrides?.ineligibleChildrenNames ?? [],
  };
}

export interface SeedWorldOptions {
  includeBootstrap?: boolean;
  certifyVoterRoll?: boolean;
  gaOpen?: boolean;
  activeQuestionId?: string;
  gaQ1Status?: 'draft' | 'on_floor' | 'closed';
  seedDomainData?: boolean;
  personas?: PersonaKey[];
}

export interface SeededWorld {
  users: Record<PersonaKey, SeededAuthResult>;
}

export async function seedStandardWorld(
  options: SeedWorldOptions = {}
): Promise<SeededWorld> {
  await resetEmulators();

  const keys =
    options.personas || (Object.keys(TEST_PERSONAS) as PersonaKey[]);
  const users = {} as Record<PersonaKey, SeededAuthResult>;

  for (const key of keys) {
    const persona = TEST_PERSONAS[key];
    const authRes = await seedAuthUser(persona);
    users[key] = authRes;
    await seedFirestoreDoc(
      'members',
      authRes.uid,
      buildMemberDocument(persona, authRes.uid, {
        includeVerifiedVoteWeight: options.certifyVoterRoll !== false,
      })
    );
  }

  if (options.seedDomainData !== false) {
    await seedFirestoreDoc('programs', 'prog-pengajian', {
      id: 'prog-pengajian',
      title: 'Monatliches Pengajian (Ta\'lim Schweiz)',
      description:
        'Monatliche religiöse Wissensvermittlung und Gemeinschaftstreffen in Zürich.',
      detailedOverview:
        'Vertiefende Vorträge, Frage-Antwort-Runden und gemeinsames Gebet für Mitglieder und Gäste in Zürich.',
      category: 'Religious',
      tag: 'Active',
      dateOrSchedule: 'Jeden 2. Sonntag im Monat',
      location: 'Zürich-Stadelhofen',
      imageUrl: 'https://images.unsplash.com/photo-1585036156171-384164a8c675',
      iconName: 'volunteer_activism',
    });
    await seedFirestoreDoc('programs', 'prog-foodkitchen', {
      id: 'prog-foodkitchen',
      title: 'Solidaritätsküche Zürich',
      description: 'Gemeinschaftsküche für Bedürftige und Studierende.',
      detailedOverview:
        'Wöchentliche Zubereitung und Ausgabe warmer Mahlzeiten durch ehrenamtliche Vereinsmitglieder.',
      category: 'Social Impact',
      tag: 'Active',
      dateOrSchedule: 'Samstags 11:00–14:00',
      location: 'Zürich Kreis 4',
      imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433',
      iconName: 'volunteer_activism',
    });
    await seedFirestoreDoc('programs', 'prog-youthcamp', {
      id: 'prog-youthcamp',
      title: 'Jugend-Camp & Leadership Schweiz',
      description: 'Förderung junger Mitglieder in der Schweiz.',
      detailedOverview:
        'Mehrtägiges Bildungs- und Freizeitlager zur Stärkung von Verantwortung und Teamgeist.',
      category: 'Youth',
      tag: 'Seasonal',
      dateOrSchedule: 'Herbstferien 2026',
      location: 'Engelberg',
      imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac',
      iconName: 'volunteer_activism',
    });

    await seedFirestoreDoc('campaigns', 'camp-infaq', {
      id: 'camp-infaq',
      title: 'INFAQ & Vereinsbetrieb (Percikan Iman Schweiz)',
      description: 'Unterstützung für Miete, Bildungsprogramme und Betrieb.',
      currentAmount: 12500,
      goalAmount: 25000,
      progressPercent: 50,
      isCritical: false,
      imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6',
    });

    await seedFirestoreDoc('destinations', 'dest-verein-infaq', {
      id: 'dest-verein-infaq',
      name: 'INFAQ & Vereinsbetrieb (Percikan Iman Schweiz)',
      shortLabel: 'INFAQ & Verein',
      category: 'Community Aid',
      description: 'Allgemeiner Vereinsbetrieb und Raumkosten.',
    });
    await seedFirestoreDoc('destinations', 'dest-humanitarian', {
      id: 'dest-humanitarian',
      name: 'Nothilfe & Humanitäre Projekte',
      shortLabel: 'Nothilfe',
      category: 'Humanitarian',
      description: 'Direkte Soforthilfe und Bildungsstipendien.',
    });

    await seedFirestoreDoc('events', 'evt-pengajian-stadel', {
      id: 'evt-pengajian-stadel',
      title: 'Monatliches Pengajian & Familien-Begegnung',
      description: 'Monatliches Community-Event in Zürich mit Vortrag und Austausch.',
      date: '2026-09-13',
      time: '13:30 - 17:00',
      location: 'Gemeindezentrum Zürich-Stadelhofen',
      category: 'Majelis & Spiritual',
      imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18',
      onlineLink: 'https://meet.jit.si/percikan-iman-zuerich',
    });
    await seedFirestoreDoc('events', 'evt-salim-fillah', {
      id: 'evt-salim-fillah',
      title: 'Guest Lecture: Ustadz Salim A. Fillah',
      description: 'Öffentlicher Gastvortrag zu Ethik und Gemeinschaft.',
      date: '2026-05-14',
      time: '18:00 - 20:30',
      location: 'Volkshaus Zürich',
      category: 'Youth & Education',
      imageUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94',
      onlineLink: 'https://meet.jit.si/percikan-iman-lecture',
    });

    await seedFirestoreDoc('boardMembers', 'board-1', {
      id: 'board-1',
      name: 'Dr. H. Aam Amiruddin',
      role: 'Präsident / Vorsitzender',
      department: 'Executive Leadership',
      bio: 'Gründungspräsident von Verein Percikan Iman Schweiz.',
      imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
      order: 1,
    });
    await seedFirestoreDoc('boardMembers', 'board-2', {
      id: 'board-2',
      name: 'Dewi Kartika',
      role: 'Sekretärin & Kommunikation',
      department: 'Administration',
      bio: 'Verantwortlich für Kommunikation und Vereinsadministration.',
      imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
      order: 2,
    });

    await seedFirestoreDoc('donationReports', 'rep-2025-01', {
      id: 'rep-2025-01',
      donorName: 'Anonymer Spender Zürich',
      email: 'donor@example.ch',
      amount: 500,
      currency: 'CHF',
      destination: 'INFAQ & Vereinsbetrieb (Percikan Iman Schweiz)',
      date: '2026-01-20',
      paymentMethod: 'PostFinance',
      status: 'Completed',
    });

    await seedFirestoreDoc('siteConfig', 'notice', {
      enabled: true,
      badge: 'Generalversammlung 2026',
      message:
        'Die ordentliche Generalversammlung findet am 15. September 2026 in Zürich statt.',
    });

    const gaIsOpen = options.gaOpen !== undefined ? options.gaOpen : true;
    const activeQ =
      options.activeQuestionId !== undefined
        ? options.activeQuestionId === ''
          ? null
          : options.activeQuestionId
        : 'ga-q1';
    const q1Status =
      options.gaQ1Status ??
      (options.activeQuestionId === '' ? 'draft' : 'on_floor');

    await seedFirestoreDoc('siteConfig', 'gaSession', {
      isOpen: gaIsOpen,
      sessionTitle: 'Ordentliche Vereinsversammlung 2026',
      scheduledDate: '15. September 2026',
      activeQuestionId: activeQ,
      openedAt: '2026-09-15T09:00:00.000Z',
      openedBy: 'Dr. H. Aam Amiruddin',
      location: 'Zürich-Stadelhofen',
    });

    await seedFirestoreDoc('assemblyQuestions', 'ga-q1', {
      id: 'ga-q1',
      title: 'Jahresbudget 2026/2027 genehmigen',
      description:
        'Genehmigung des vorgelegten Jahresbudgets gemäss Art. 12 der Vereinsstatuten.',
      category: 'Budget & Financial',
      status: q1Status,
      type: 'yes_no_abstain',
      agendaOrder: 1,
      quorumRequiredPercent: 50,
      statuteArticleRef: 'Art. 12 Verein Statuten',
      createdAt: '2026-09-01T08:00:00.000Z',
      createdBy: 'Dr. H. Aam Amiruddin',
      optionIds: ['opt-yes', 'opt-no', 'opt-abstain'],
      options: [
        { id: 'opt-yes', text: 'Ja / Genehmigen', votesWeighted: 0, ballotCount: 0 },
        { id: 'opt-no', text: 'Nein / Ablehnen', votesWeighted: 0, ballotCount: 0 },
        { id: 'opt-abstain', text: 'Enthaltung', votesWeighted: 0, ballotCount: 0 },
      ],
      totalVotesWeighted: 0,
      totalBallots: 0,
    });

    await seedFirestoreDoc('assemblyQuestions', 'ga-q2', {
      id: 'ga-q2',
      title: 'Statutenänderung Art. 8 Digitaler Einlass',
      description: 'Ergänzung zur elektronischen Mitgliedskarte.',
      category: 'Statute Amendment',
      status: 'draft',
      type: 'yes_no_abstain',
      agendaOrder: 2,
      quorumRequiredPercent: 66.7,
      statuteArticleRef: 'Art. 8 Verein Statuten',
      createdAt: '2026-09-01T08:15:00.000Z',
      createdBy: 'Dr. H. Aam Amiruddin',
      optionIds: ['opt-yes', 'opt-no', 'opt-abstain'],
      options: [
        { id: 'opt-yes', text: 'Ja / Zustimmen', votesWeighted: 0, ballotCount: 0 },
        { id: 'opt-no', text: 'Nein / Ablehnen', votesWeighted: 0, ballotCount: 0 },
        { id: 'opt-abstain', text: 'Enthaltung', votesWeighted: 0, ballotCount: 0 },
      ],
      totalVotesWeighted: 0,
      totalBallots: 0,
    });

    await seedFirestoreDoc('assemblyQuestions', 'ga-q4', {
      id: 'ga-q4',
      title: 'Entlastung des Vorstands 2025',
      description: 'Abgeschlossene Abstimmung zur Entlastung.',
      category: 'General Resolution',
      status: 'closed',
      type: 'yes_no_abstain',
      agendaOrder: 3,
      quorumRequiredPercent: 50,
      statuteArticleRef: 'Art. 11 Verein Statuten',
      createdAt: '2026-09-01T08:30:00.000Z',
      createdBy: 'Dr. H. Aam Amiruddin',
      optionIds: ['opt-yes', 'opt-no'],
      options: [
        { id: 'opt-yes', text: 'Ja', votesWeighted: 6, ballotCount: 2 },
        { id: 'opt-no', text: 'Nein', votesWeighted: 0, ballotCount: 0 },
      ],
      totalVotesWeighted: 6,
      totalBallots: 2,
      finalResults: {
        totalWeight: 6,
        totalBallots: 2,
        closedAt: '2026-09-15T10:00:00.000Z',
        closedBy: 'Dr. H. Aam Amiruddin',
        optionTotals: { 'opt-yes': 6, 'opt-no': 0 },
      },
    });

    await seedFirestoreDoc('boardInquiries', 'inq-1', {
      id: 'inq-1',
      title: 'Transparenzbericht Raumkosten Zürich',
      content: 'Können die Raumkosten pro Quartal detailliert werden?',
      category: 'Finance & Audit',
      authorUid: users.activeFamily?.uid || 'seed-author',
      authorName: 'Ridwan Kamil Santoso',
      authorMemberCode: 'PI-FAM-2021',
      authorCategory: 'family',
      submittedAt: '2026-09-10T12:00:00.000Z',
      status: 'submitted',
    });
  }

  if (options.includeBootstrap) {
    await seedFirestoreDoc('siteConfig', 'bootstrap', {
      seededAt: '2026-09-01T08:00:00.000Z',
      seededBy: 'superadmin@percikaniman.org',
      version: '1.0.0',
    });
  }

  return { users };
}
