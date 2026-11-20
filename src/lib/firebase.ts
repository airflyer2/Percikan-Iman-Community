import { initializeApp, getApps, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider, AppCheck } from 'firebase/app-check';
import { getAuth, GoogleAuthProvider, connectAuthEmulator, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  connectFirestoreEmulator,
  Firestore
} from 'firebase/firestore';

const STORAGE_CONFIG_KEY = 'percikan_iman_firebase_config';

export interface StoredFirebaseConfig extends FirebaseOptions {
  databaseId?: string;
  useEmulator?: boolean;
}

export interface AppCheckStatus {
  configured: boolean;
  initialized: boolean;
  debugMode: boolean;
  error?: string;
}

const DEFAULT_FIREBASE_CONFIG: StoredFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBqO2Jq8eaGJDds3nxoeGAvM_tpnZyol78',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'percikan-iman-724ae.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'percikan-iman-724ae',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'percikan-iman-724ae.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '504014788755',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:504014788755:web:060faae786dd42d78d9566',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-7W6GXZ9W3J',
  databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)',
  useEmulator: import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'
};

export function getFirebaseOptions(): StoredFirebaseConfig | null {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredFirebaseConfig;
        if (parsed.apiKey && parsed.projectId) {
          return parsed;
        }
      }
    } catch {
      // ignore storage read error
    }
  }

  if (DEFAULT_FIREBASE_CONFIG.apiKey && DEFAULT_FIREBASE_CONFIG.projectId) {
    return DEFAULT_FIREBASE_CONFIG;
  }

  return null;
}

export function saveRuntimeFirebaseConfig(config: StoredFirebaseConfig): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  window.location.reload();
}

export function clearRuntimeFirebaseConfig(): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_CONFIG_KEY);
  window.location.reload();
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseOptions() !== null;
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;
let firebaseAnalytics: Analytics | null = null;
let firebaseAppCheck: AppCheck | null = null;
let emulatorsConnected = false;
let appCheckStatus: AppCheckStatus = {
  configured: Boolean(import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim()),
  initialized: false,
  debugMode: false,
};

export function getAppCheckStatus(): AppCheckStatus {
  return { ...appCheckStatus };
}

function initFirebaseAppCheck(app: FirebaseApp): void {
  if (typeof window === 'undefined' || firebaseAppCheck) {
    return;
  }

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim() || '';
  let debugMode = false;

  if (import.meta.env.DEV) {
    const debugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN?.trim();
    const normalizedDebugToken = debugToken?.toLowerCase();
    if (normalizedDebugToken === 'true') {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      debugMode = true;
    } else if (debugToken && normalizedDebugToken !== 'false' && normalizedDebugToken !== '0') {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
      debugMode = true;
    }
  }

  if (!siteKey) {
    appCheckStatus = {
      configured: false,
      initialized: false,
      debugMode,
    };
    return;
  }

  try {
    const providerMode = import.meta.env.VITE_RECAPTCHA_PROVIDER?.trim().toLowerCase();
    const provider =
      providerMode === 'enterprise'
        ? new ReCaptchaEnterpriseProvider(siteKey)
        : new ReCaptchaV3Provider(siteKey);

    firebaseAppCheck = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
    appCheckStatus = {
      configured: true,
      initialized: true,
      debugMode,
    };
  } catch (err) {
    appCheckStatus = {
      configured: true,
      initialized: false,
      debugMode,
      error: err instanceof Error ? err.message : 'App Check initialization failed',
    };
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export function getFirebaseServices(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  analytics: Analytics | null;
  appCheck: AppCheck | null;
} | null {
  const options = getFirebaseOptions();
  if (!options) {
    return null;
  }

  if (!firebaseApp) {
    const existingApps = getApps();
    const isNewApp = existingApps.length === 0;
    firebaseApp = isNewApp ? initializeApp(options) : existingApps[0];

    // Initialize App Check before Firestore so App Check tokens accompany Firestore requests
    initFirebaseAppCheck(firebaseApp);

    firebaseAuth = getAuth(firebaseApp);

    const rawDbId = options.databaseId?.trim();
    const dbId = rawDbId && rawDbId !== '(default)' ? rawDbId : undefined;
    try {
      firestoreDb = dbId
        ? initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true }, dbId)
        : initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
    } catch {
      firestoreDb = dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);
    }

    if (typeof window !== 'undefined') {
      isAnalyticsSupported()
        .then((supported) => {
          if (supported && firebaseApp) {
            firebaseAnalytics = getAnalytics(firebaseApp);
          }
        })
        .catch(() => {
          // ignore analytics init errors
        });
    }

    if (
      options.useEmulator &&
      !emulatorsConnected &&
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ) {
      const emulatorHost = window.location.hostname;
      connectAuthEmulator(firebaseAuth, `http://${emulatorHost}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(firestoreDb, emulatorHost, 8080);
      emulatorsConnected = true;
    }
  }

  return {
    app: firebaseApp!,
    auth: firebaseAuth!,
    db: firestoreDb!,
    analytics: firebaseAnalytics,
    appCheck: firebaseAppCheck,
  };
}
