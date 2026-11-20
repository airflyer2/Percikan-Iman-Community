import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getFirebaseServices } from '../lib/firebase';
import { signOutMember } from '../lib/authService';
import { UserAccount } from '../types';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

export interface AuthContextValue {
  authStatus: AuthStatus;
  currentUser: UserAccount | null;
  firebaseUser: FirebaseUser | null;
  hasFullAdmin: boolean;
  isSuperAdmin: boolean;
  canManageBoard: boolean;
  canScanQR: boolean;
  hasAnyStaffRole: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const services = getFirebaseServices();
    if (!services) {
      setFirebaseUser(null);
      setCurrentUser(null);
      setAuthStatus('unauthenticated');
      return;
    }

    let profileUnsub: Unsubscribe | null = null;

    const authUnsub = onAuthStateChanged(services.auth, (fbUser) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (!fbUser) {
        setFirebaseUser(null);
        setCurrentUser(null);
        setAuthStatus('unauthenticated');
        return;
      }

      setFirebaseUser(fbUser);
      setAuthStatus('loading');

      const memberRef = doc(services.db, 'members', fbUser.uid);
      profileUnsub = onSnapshot(
        memberRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setCurrentUser({
              ...(docSnap.data() as UserAccount),
              uid: docSnap.id,
              emailVerified: fbUser.emailVerified
            });
            setAuthStatus('authenticated');
          } else {
            setFirebaseUser(null);
            setCurrentUser(null);
            setAuthStatus('unauthenticated');
          }
        },
        () => {
          setFirebaseUser(null);
          setCurrentUser(null);
          setAuthStatus('unauthenticated');
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
  }, []);

  const signOut = useCallback(async () => {
    await signOutMember();
    if (!getFirebaseServices()) {
      setFirebaseUser(null);
      setCurrentUser(null);
      setAuthStatus('unauthenticated');
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);
    const hasFullAdmin = Boolean(currentUser?.isAdmin || currentUser?.isSuperAdmin);
    const canManageBoard = Boolean(currentUser?.canManageBoard);
    const canScanQR = Boolean(currentUser?.canScanQR);
    const hasAnyStaffRole = Boolean(hasFullAdmin || canManageBoard || canScanQR);

    return {
      authStatus,
      currentUser,
      firebaseUser,
      hasFullAdmin,
      isSuperAdmin,
      canManageBoard,
      canScanQR,
      hasAnyStaffRole,
      signOut
    };
  }, [authStatus, currentUser, firebaseUser, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
