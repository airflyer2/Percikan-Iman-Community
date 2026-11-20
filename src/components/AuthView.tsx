import React, { useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AUTH_HERO_IMAGE, MEMBER_AVATARS } from '../constants';
import { useAuth } from '../context/AuthContext';
import { UserAccount, MembershipCategory } from '../types';
import {
  signInMember,
  registerMember,
  authenticateWithGoogle,
  completeGoogleMemberRegistration,
  sendMemberPasswordReset,
  validatePasswordStrength,
  isFirebaseConfigured,
  isEmulatorMode
} from '../lib/authService';
import { saveRuntimeFirebaseConfig, getFirebaseOptions, clearRuntimeFirebaseConfig } from '../lib/firebase';
import { isValidEmailFormat } from '../lib/firestoreContent';
import { InfoModals } from './InfoModals';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Users,
  User,
  QrCode,
  AlertCircle,
  Smartphone,
  Coins,
  Banknote,
  Landmark,
  Check,
  ChevronRight,
  Lock,
  Mail,
  KeyRound,
  Settings,
  X,
  Cloud
} from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess?: (user: UserAccount) => void;
  onOpenModal?: (type: 'terms' | 'privacy') => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, onOpenModal }) => {
  const { authStatus, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDevConfigEnabled = Boolean(import.meta.env?.DEV);
  const showDemoCredentials = Boolean(import.meta.env?.DEV || isEmulatorMode());

  const rawFrom = (
    location.state as { from?: { pathname?: string; search?: string } | string } | null
  )?.from;
  const fromPath =
    typeof rawFrom === 'string'
      ? rawFrom
      : rawFrom?.pathname
      ? `${rawFrom.pathname}${rawFrom.search || ''}`
      : '';
  const redirectTo =
    fromPath.startsWith('/') && !fromPath.startsWith('//') && !fromPath.startsWith('/login')
      ? fromPath
      : '/member';

  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [signupStep, setSignupStep] = useState<'details' | 'paywall'>('details');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'twint' | 'bank_transfer' | 'cash'>('twint');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const isSendingResetRef = useRef<boolean>(false);
  const [tempMemberCode, setTempMemberCode] = useState<string>('');
  const [localInfoModal, setLocalInfoModal] = useState<'terms' | 'privacy' | null>(null);

  // Pending Google OAuth user who needs to complete statutory membership registration
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{
    uid: string;
    name: string;
    email: string;
    avatarUrl?: string;
  } | null>(null);

  // Form fields
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [emailOrAdminCode, setEmailOrAdminCode] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [city, setCity] = useState<string>('Zürich');
  const [postalCode, setPostalCode] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [membershipCategory, setMembershipCategory] = useState<MembershipCategory>('family');

  // Statutory agreements
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [agreedToEmailNotices, setAgreedToEmailNotices] = useState<boolean>(false);
  const [agreedToMembershipFee, setAgreedToMembershipFee] = useState<boolean>(false);

  // Validation & feedback
  const [emailNoticeError, setEmailNoticeError] = useState<boolean>(false);
  const [feeNoticeError, setFeeNoticeError] = useState<boolean>(false);
  const [termsError, setTermsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Password Reset Modal
  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSendingReset, setIsSendingReset] = useState<boolean>(false);

  // Firebase Configuration Modal (DEV only)
  const [firebaseModalOpen, setFirebaseModalOpen] = useState<boolean>(false);
  const existingFbConfig = isDevConfigEnabled ? getFirebaseOptions() : null;
  const [fbRawSnippet, setFbRawSnippet] = useState<string>('');
  const [fbApiKey, setFbApiKey] = useState<string>(existingFbConfig?.apiKey || '');
  const [fbProjectId, setFbProjectId] = useState<string>(existingFbConfig?.projectId || '');
  const [fbAuthDomain, setFbAuthDomain] = useState<string>(existingFbConfig?.authDomain || '');
  const [fbAppId, setFbAppId] = useState<string>(existingFbConfig?.appId || '');
  const firebaseActive = isFirebaseConfigured();

  const openLegalModal = (type: 'terms' | 'privacy') => {
    if (onOpenModal) {
      onOpenModal(type);
    } else {
      setLocalInfoModal(type);
    }
  };

  if (authStatus === 'authenticated' && currentUser && !pendingGoogleUser) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleParseConfigSnippet = (raw: string) => {
    setFbRawSnippet(raw);
    const extract = (key: string): string | null => {
      const regex = new RegExp(`${key}\\s*:\\s*["'\`]([^"'\`]+)["'\`]`, 'i');
      const match = raw.match(regex);
      return match ? match[1].trim() : null;
    };
    const apiKeyMatch = extract('apiKey');
    const projectIdMatch = extract('projectId');
    const authDomainMatch = extract('authDomain');
    const appIdMatch = extract('appId');

    if (apiKeyMatch) setFbApiKey(apiKeyMatch);
    if (projectIdMatch) setFbProjectId(projectIdMatch);
    if (authDomainMatch) setFbAuthDomain(authDomainMatch);
    if (appIdMatch) setFbAppId(appIdMatch);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    setErrorMessage(null);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const authenticatedUser = await signInMember(emailOrAdminCode, password);
      setStatusMessage(`Welcome back, ${authenticatedUser.name}!`);
      onAuthSuccess?.(authenticatedUser);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSignupDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!isValidEmailFormat(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage('Please enter your phone number.');
      return;
    }

    if (!pendingGoogleUser) {
      const pwErr = validatePasswordStrength(password);
      if (pwErr) {
        setErrorMessage(pwErr);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter your password.');
        return;
      }
    }

    if (!agreedToEmailNotices) {
      setEmailNoticeError(true);
      setErrorMessage('Please confirm that you understand official Verein notices will be sent to your email.');
      return;
    }
    if (!agreedToMembershipFee) {
      setFeeNoticeError(true);
      setErrorMessage('Please acknowledge the statutory annual membership contribution.');
      return;
    }
    if (!agreedToTerms) {
      setTermsError(true);
      setErrorMessage('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    const code = tempMemberCode || `PI-${Math.floor(1000 + Math.random() * 9000)}`;
    setTempMemberCode(code);
    setSignupStep('paywall');
  };

  const handleCompleteRegistration = async (method: 'twint' | 'bank_transfer' | 'cash') => {
    if (isSubmittingRef.current) return;
    setErrorMessage(null);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payload = {
        fullName,
        email,
        password,
        phone: phoneNumber,
        street,
        postalCode,
        city,
        country: 'Switzerland',
        membershipCategory,
        paymentMethod: method,
        memberCode: tempMemberCode
      };

      const newUser = pendingGoogleUser
        ? await completeGoogleMemberRegistration(
            pendingGoogleUser.uid,
            payload,
            pendingGoogleUser.avatarUrl
          )
        : await registerMember(payload);

      const feeAmount = membershipCategory === 'family' ? 120 : 80;
      if (method === 'twint') {
        setStatusMessage(`Payment confirmed via TWINT! Welcome ${newUser.name}, your membership is active.`);
      } else if (method === 'cash') {
        setStatusMessage(
          `Registration created! Please settle CHF ${feeAmount} in cash with a Board Administrator at the next gathering.`
        );
      } else {
        setStatusMessage(
          `Registration submitted! Your account is pending verification of your CHF ${feeAmount} bank transfer.`
        );
      }

      setPendingGoogleUser(null);
      onAuthSuccess?.(newUser);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration could not be completed.');
      setSignupStep('details');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSubmittingRef.current) return;
    setErrorMessage(null);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await authenticateWithGoogle();

      if (result.status === 'existing_member' && result.user) {
        setStatusMessage(`Signed in with Google as ${result.user.name}!`);
        onAuthSuccess?.(result.user);
        navigate(redirectTo, { replace: true });
        return;
      }

      if (result.status === 'needs_registration_completion' && result.googleProfile) {
        setPendingGoogleUser(result.googleProfile);
        setFullName(result.googleProfile.name);
        setEmail(result.googleProfile.email);
        setTab('signup');
        setSignupStep('details');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendingResetRef.current) return;
    setResetStatus(null);
    isSendingResetRef.current = true;
    setIsSendingReset(true);

    try {
      await sendMemberPasswordReset(resetEmail);
      setResetStatus({
        type: 'success',
        text: `If an account exists for ${resetEmail.trim()}, a password reset link has been dispatched.`
      });
    } catch (err) {
      setResetStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not send password reset email.'
      });
    } finally {
      isSendingResetRef.current = false;
      setIsSendingReset(false);
    }
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbApiKey.trim() || !fbProjectId.trim()) return;
    saveRuntimeFirebaseConfig({
      apiKey: fbApiKey.trim(),
      projectId: fbProjectId.trim(),
      authDomain: fbAuthDomain.trim() || `${fbProjectId.trim()}.firebaseapp.com`,
      storageBucket: `${fbProjectId.trim()}.firebasestorage.app`,
      appId: fbAppId.trim()
    });
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center py-12 bg-[#f9f9ff]">
      <div className="max-w-[1160px] w-full mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 bg-white rounded-2xl overflow-hidden shadow-[0px_8px_30px_rgba(0,0,0,0.06)] border border-[#bec7d2]/40">
          {/* Left Side: Visual & Swiss Verein Identity */}
          <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-10 min-h-[640px]">
            <div className="absolute inset-0 z-0">
              <img
                src={AUTH_HERO_IMAGE}
                alt="Percikan Iman Community"
                className="w-full h-full object-cover grayscale-[15%] brightness-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#003d5c]/95 via-[#006191]/60 to-[#003d5c]/40"></div>
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-semibold border border-white/20">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
                Swiss Verein (Art. 60 ff. ZGB)
              </span>
            </div>

            <div className="relative z-10 text-white space-y-5">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-3 text-white leading-snug">
                  Percikan Iman Community Portal
                </h1>
                <p className="text-sm text-white/90 leading-relaxed">
                  Manage your annual membership, access your digital QR attendance pass, and participate in General Assembly resolutions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 space-y-2 text-xs text-white/90">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Personal Membership</span>
                  <span className="font-bold text-sky-200">CHF 80 / year</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="font-semibold">Family Membership</span>
                  <span className="font-bold text-sky-200">CHF 120 / year</span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {MEMBER_AVATARS.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Member ${i + 1}`}
                      className="h-9 w-9 rounded-full border-2 border-[#006191] object-cover bg-white"
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-white/90 self-center">
                  Verified community members across Switzerland &amp; Europe
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Clean Authentication & Registration Forms */}
          <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-white">
            <div className="w-full max-w-md mx-auto">
              {/* Backend Status Bar */}
              <div className="flex items-center justify-between mb-6">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#566771]">
                  <Lock className="w-3.5 h-3.5 text-[#006191]" />
                  <span>Encrypted Member Authentication</span>
                </div>
                {isDevConfigEnabled && (
                  <button
                    type="button"
                    onClick={() => setFirebaseModalOpen(true)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                      firebaseActive
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                    title="Configure Firebase Authentication & Firestore"
                  >
                    <Cloud className="w-3 h-3" />
                    <span>{firebaseActive ? 'Firebase Cloud Active' : 'Connect Firebase'}</span>
                  </button>
                )}
              </div>

              {/* Status Banner */}
              {statusMessage ? (
                <div className="p-8 bg-emerald-50 rounded-2xl text-center space-y-3 border border-emerald-200 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <p className="font-bold text-base text-emerald-950">{statusMessage}</p>
                  <p className="text-xs text-emerald-700">Redirecting to your member portal...</p>
                </div>
              ) : (
                <>
                  {/* Mode Tabs */}
                  <div className="grid grid-cols-2 p-1 bg-[#f1f5f9] rounded-xl mb-7">
                    <button
                      type="button"
                      onClick={() => {
                        setTab('login');
                        setSignupStep('details');
                        setErrorMessage(null);
                      }}
                      className={`py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        tab === 'login'
                          ? 'bg-white text-[#006191] shadow-xs'
                          : 'text-[#566771] hover:text-[#121c2a]'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTab('signup');
                        setSignupStep('details');
                        setErrorMessage(null);
                      }}
                      className={`py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                        tab === 'signup'
                          ? 'bg-white text-[#006191] shadow-xs'
                          : 'text-[#566771] hover:text-[#121c2a]'
                      }`}
                    >
                      Become a Member
                    </button>
                  </div>

                  {/* Error Alert Banner */}
                  {errorMessage && (
                    <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium flex items-start gap-2.5 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {tab === 'login' ? (
                    /* ================= LOGIN VIEW ================= */
                    <div>
                      <header className="mb-6">
                        <h2 className="text-2xl font-bold text-[#121c2a]">Sign in to your account</h2>
                        <p className="text-[#566771] text-xs sm:text-sm mt-1">
                          Enter your registered email address and password to access your membership profile.
                        </p>
                      </header>

                      <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <label
                            htmlFor="login_identifier"
                            className="block text-xs font-bold text-[#3f4850] uppercase tracking-wider"
                          >
                            Email Address <span className="text-[#6f7881] font-normal lowercase">(or Admin Code)</span>
                          </label>
                          <div className="relative">
                            <input
                              id="login_identifier"
                              type="text"
                              required
                              autoComplete="username"
                              value={emailOrAdminCode}
                              onChange={(e) => {
                                setEmailOrAdminCode(e.target.value);
                                setErrorMessage(null);
                              }}
                              placeholder="name@example.com"
                              className="w-full pl-10 pr-4 py-3 bg-white border border-[#bec7d2] rounded-xl focus:ring-2 focus:ring-[#006191]/20 focus:border-[#006191] outline-none transition-all text-sm text-[#121c2a]"
                            />
                            <Mail className="w-4 h-4 text-[#6f7881] absolute left-3.5 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="login_password"
                              className="block text-xs font-bold text-[#3f4850] uppercase tracking-wider"
                            >
                              Password
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setResetEmail(emailOrAdminCode.includes('@') ? emailOrAdminCode : '');
                                setResetStatus(null);
                                setResetModalOpen(true);
                              }}
                              className="text-xs text-[#006191] hover:underline font-semibold cursor-pointer"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              id="login_password"
                              type={showPassword ? 'text' : 'password'}
                              required
                              autoComplete="current-password"
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                setErrorMessage(null);
                              }}
                              placeholder="Enter your password"
                              className="w-full pl-10 pr-11 py-3 bg-white border border-[#bec7d2] rounded-xl focus:ring-2 focus:ring-[#006191]/20 focus:border-[#006191] outline-none transition-all text-sm text-[#121c2a]"
                            />
                            <KeyRound className="w-4 h-4 text-[#6f7881] absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#566771] hover:text-[#121c2a] cursor-pointer"
                              title={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3.5 bg-[#006191] text-white font-bold rounded-xl hover:bg-[#007bb6] active:scale-[0.99] transition-all shadow-sm cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              <span>Verifying Credentials...</span>
                            </>
                          ) : (
                            <span>Sign In</span>
                          )}
                        </button>
                      </form>

                      {/* Google OAuth Divider */}
                      <div className="mt-6">
                        <div className="relative flex items-center mb-5">
                          <div className="flex-grow border-t border-[#e2e8f0]"></div>
                          <span className="flex-shrink mx-3 text-xs text-[#6f7881] font-medium">
                            Or continue with
                          </span>
                          <div className="flex-grow border-t border-[#e2e8f0]"></div>
                        </div>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleGoogleSignIn}
                          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-[#bec7d2] rounded-xl hover:bg-[#f8fafc] transition-colors cursor-pointer text-sm font-semibold text-[#121c2a] shadow-2xs"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                            />
                            <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                            />
                            <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                            />
                            <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                            />
                          </svg>
                          <span>Continue with Google</span>
                        </button>
                      </div>

                      {/* Collapsible Seeded Accounts Helper for Testing Firebase Auth (Dev/Emulator only) */}
                      {showDemoCredentials && (
                        <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-[#3f4850]">
                          <summary className="cursor-pointer font-semibold text-[#006191] select-none">
                            Seeded Member &amp; Admin Credentials (Click to fill)
                          </summary>
                          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                            <button
                              type="button"
                              onClick={() => {
                                setEmailOrAdminCode('admin@percikaniman.org');
                                setPassword('Admin!2026');
                                setErrorMessage(null);
                              }}
                              className="p-2 bg-white border border-slate-200 hover:border-[#006191] rounded-lg text-left transition-colors cursor-pointer"
                            >
                              <span className="font-bold text-[#121c2a] block">Board Admin (PI-ADMIN)</span>
                              <span className="font-mono text-[11px] text-[#566771]">admin@percikaniman.org</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEmailOrAdminCode('superadmin@percikaniman.org');
                                setPassword('SuperAdmin!2026');
                                setErrorMessage(null);
                              }}
                              className="p-2 bg-white border border-slate-200 hover:border-[#006191] rounded-lg text-left transition-colors cursor-pointer"
                            >
                              <span className="font-bold text-[#121c2a] block">Super Admin (PI-SUPERADMIN)</span>
                              <span className="font-mono text-[11px] text-[#566771]">superadmin@percikaniman.org</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEmailOrAdminCode('ridwan.santoso@percikaniman.org');
                                setPassword('Member!2026');
                                setErrorMessage(null);
                              }}
                              className="p-2 bg-white border border-slate-200 hover:border-[#006191] rounded-lg text-left transition-colors cursor-pointer"
                            >
                              <span className="font-bold text-[#121c2a] block">Family Member (CHF 120)</span>
                              <span className="font-mono text-[11px] text-[#566771]">ridwan.santoso@percikaniman.org</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEmailOrAdminCode('bambang.s@percikaniman.org');
                                setPassword('Member!2026');
                                setErrorMessage(null);
                              }}
                              className="p-2 bg-white border border-slate-200 hover:border-[#006191] rounded-lg text-left transition-colors cursor-pointer"
                            >
                              <span className="font-bold text-[#121c2a] block">Personal Member (CHF 80)</span>
                              <span className="font-mono text-[11px] text-[#566771]">bambang.s@percikaniman.org</span>
                            </button>
                          </div>
                        </details>
                      )}
                    </div>
                  ) : signupStep === 'paywall' ? (
                    /* ================= SIGNUP STEP 2: PAYWALL ================= */
                    <div className="animate-in fade-in duration-200">
                      <div className="flex items-center justify-between mb-5">
                        <button
                          type="button"
                          onClick={() => setSignupStep('details')}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006191] hover:underline cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Edit Personal Details
                        </button>
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Step 2 of 2: Fee Settlement
                        </span>
                      </div>

                      <header className="mb-5">
                        <h2 className="text-2xl font-bold text-[#121c2a]">
                          Statutory Membership Contribution
                        </h2>
                        <p className="text-[#3f4850] text-xs sm:text-sm mt-1">
                          In accordance with Swiss Verein statutes (Art. 60 ff. ZGB), settling your annual dues completes registration and activates full member privileges.
                        </p>
                      </header>

                      {/* Contribution Summary Card */}
                      <div className="p-4 bg-gradient-to-r from-[#eff6ff] to-[#f0fdf4] border border-[#006191]/30 rounded-xl mb-5 space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#006191]/15 pb-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#006191] tracking-wider block">
                              Applicant
                            </span>
                            <p className="font-bold text-sm text-[#121c2a]">{fullName}</p>
                            <p className="text-xs text-[#566771]">{email}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                              Annual Fee
                            </span>
                            <p className="text-2xl font-black text-[#006191]">
                              CHF {membershipCategory === 'family' ? 120 : 80}
                            </p>
                            <span className="text-[10px] text-[#566771]">Per Calendar Year</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#3f4850] pt-0.5">
                          <span className="flex items-center gap-1">
                            {membershipCategory === 'family' ? (
                              <Users className="w-3.5 h-3.5 text-purple-700" />
                            ) : (
                              <User className="w-3.5 h-3.5 text-[#006191]" />
                            )}
                            <strong className="capitalize">{membershipCategory} Membership</strong> (2026)
                          </span>
                          <span className="text-[11px] font-mono text-[#006191] font-semibold">
                            ID: {tempMemberCode}
                          </span>
                        </div>
                      </div>

                      {/* Payment Method Selector Tabs */}
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-[#121c2a] uppercase tracking-wider mb-2">
                          Choose Settlement Method:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPaymentMethod('twint')}
                            className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                              selectedPaymentMethod === 'twint'
                                ? 'border-[#006191] bg-[#eff3ff] ring-2 ring-[#006191]/20'
                                : 'border-[#bec7d2] bg-white hover:border-[#006191]/50'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center mx-auto mb-1">
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-bold text-[#121c2a]">TWINT</p>
                            <span className="text-[10px] text-emerald-700 font-semibold block">Instant Active</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedPaymentMethod('bank_transfer')}
                            className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                              selectedPaymentMethod === 'bank_transfer'
                                ? 'border-[#006191] bg-[#eff3ff] ring-2 ring-[#006191]/20'
                                : 'border-[#bec7d2] bg-white hover:border-[#006191]/50'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-[#006191] text-white flex items-center justify-center mx-auto mb-1">
                              <Landmark className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-bold text-[#121c2a]">Bank Transfer</p>
                            <span className="text-[10px] text-[#566771] block">PostFinance</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedPaymentMethod('cash')}
                            className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                              selectedPaymentMethod === 'cash'
                                ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-600/20'
                                : 'border-[#bec7d2] bg-white hover:border-amber-400'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center mx-auto mb-1">
                              <Banknote className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-bold text-[#121c2a]">Cash</p>
                            <span className="text-[10px] text-amber-800 font-semibold block">In Person</span>
                          </button>
                        </div>
                      </div>

                      {selectedPaymentMethod === 'twint' && (
                        <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-3.5 mb-5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                              Swiss TWINT Mobile Pay
                            </span>
                            <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                              Instant Activation
                            </span>
                          </div>

                          <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-emerald-200">
                            <div className="w-20 h-20 bg-[#00923f]/10 border-2 border-[#00923f] rounded-lg flex flex-col items-center justify-center p-1 shrink-0">
                              <QrCode className="w-12 h-12 text-[#00923f]" />
                              <span className="text-[8px] font-black tracking-wider text-[#00923f] uppercase mt-0.5">
                                TWINT
                              </span>
                            </div>

                            <div className="space-y-1 text-xs text-[#3f4850]">
                              <p className="text-[11px]">
                                Scan QR with your TWINT app, or send to:
                              </p>
                              <p className="font-mono font-bold text-sm text-[#006191] bg-slate-100 px-2 py-0.5 rounded inline-block">
                                +41 79 123 45 67
                              </p>
                              <p className="text-[10px] text-[#566771]">
                                Reference: <span className="font-mono font-bold">{tempMemberCode}</span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleCompleteRegistration('twint')}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {isSubmitting
                                ? 'Creating Member Account...'
                                : `Confirm CHF ${membershipCategory === 'family' ? 120 : 80} TWINT & Create Account`}
                            </span>
                          </button>
                        </div>
                      )}

                      {selectedPaymentMethod === 'bank_transfer' && (
                        <div className="p-4 bg-[#eff3ff] border border-[#006191]/30 rounded-xl space-y-3 mb-5">
                          <div className="p-3 bg-white rounded-lg border border-[#bec7d2]/70 space-y-1.5 text-xs text-[#3f4850]">
                            <div>
                              <span className="text-[10px] text-[#566771] block">Bank:</span>
                              <strong className="text-[#121c2a]">PostFinance AG, Switzerland</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#566771] block">IBAN:</span>
                              <span className="font-mono text-xs font-bold text-[#006191] select-all">
                                CH89 0900 0000 6049 6610 7
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#566771] block">Reference:</span>
                              <span className="font-mono font-bold text-[#006191]">
                                {tempMemberCode} - {fullName}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleCompleteRegistration('bank_transfer')}
                            className="w-full py-3.5 bg-[#006191] hover:bg-[#007bb6] text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                          >
                            <ChevronRight className="w-4 h-4" />
                            <span>
                              {isSubmitting ? 'Submitting Application...' : 'Complete Registration (Bank Transfer)'}
                            </span>
                          </button>
                        </div>
                      )}

                      {selectedPaymentMethod === 'cash' && (
                        <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3 mb-5">
                          <p className="text-xs text-[#3f4850] leading-relaxed">
                            Your account will be created in <strong>Pending Payment</strong> status until you settle{' '}
                            <strong>CHF {membershipCategory === 'family' ? 120 : 80}</strong> in cash at the welcome desk during our next community gathering.
                          </p>
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleCompleteRegistration('cash')}
                            className="w-full py-3.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 text-sm disabled:opacity-60"
                          >
                            <Coins className="w-4 h-4" />
                            <span>
                              {isSubmitting ? 'Submitting Application...' : 'Complete Registration (Cash at Desk)'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ================= SIGNUP STEP 1: DETAILS ================= */
                    <form onSubmit={handleSignupDetailsSubmit} className="space-y-4">
                      {pendingGoogleUser && (
                        <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-center justify-between">
                          <span>
                            Authenticated via Google as <strong>{pendingGoogleUser.email}</strong>. Complete your membership details below.
                          </span>
                          <button
                            type="button"
                            onClick={() => setPendingGoogleUser(null)}
                            className="text-sky-700 underline ml-2 shrink-0 cursor-pointer"
                          >
                            Change
                          </button>
                        </div>
                      )}

                      {/* Category selection */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#121c2a] uppercase tracking-wider">
                          Membership Category
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setMembershipCategory('personal')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              membershipCategory === 'personal'
                                ? 'border-[#006191] bg-[#eff3ff] ring-2 ring-[#006191]/20'
                                : 'border-[#bec7d2] bg-white hover:border-[#006191]/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1.5 font-bold text-sm text-[#121c2a]">
                                <User className="w-4 h-4 text-[#006191]" />
                                Personal
                              </span>
                              <span className="text-xs font-bold text-[#006191]">CHF 80 / yr</span>
                            </div>
                            <p className="text-[11px] text-[#566771]">
                              Individual adult membership with GA voting rights.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setMembershipCategory('family')}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              membershipCategory === 'family'
                                ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-600/20'
                                : 'border-[#bec7d2] bg-white hover:border-purple-400'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1.5 font-bold text-sm text-purple-950">
                                <Users className="w-4 h-4 text-purple-700" />
                                Family
                              </span>
                              <span className="text-xs font-bold text-purple-800">CHF 120 / yr</span>
                            </div>
                            <p className="text-[11px] text-purple-900/80">
                              Household membership (parents &amp; children).
                            </p>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label htmlFor="full_name" className="block text-xs font-bold text-[#3f4850]">
                            Full Name *
                          </label>
                          <input
                            id="full_name"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Ahmad Zulfikar"
                            className="w-full px-3.5 py-2.5 bg-white border border-[#bec7d2] rounded-xl focus:ring-2 focus:ring-[#006191]/20 focus:border-[#006191] outline-none text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="phone_num" className="block text-xs font-bold text-[#3f4850]">
                            Phone / WhatsApp *
                          </label>
                          <input
                            id="phone_num"
                            type="tel"
                            required
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+41 79 123 45 67"
                            className="w-full px-3.5 py-2.5 bg-white border border-[#bec7d2] rounded-xl focus:ring-2 focus:ring-[#006191]/20 focus:border-[#006191] outline-none text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="signup_email" className="block text-xs font-bold text-[#3f4850]">
                          Email Address *
                        </label>
                        <input
                          id="signup_email"
                          type="email"
                          required
                          disabled={Boolean(pendingGoogleUser)}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#bec7d2] rounded-xl focus:ring-2 focus:ring-[#006191]/20 focus:border-[#006191] outline-none text-sm disabled:bg-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="col-span-2 space-y-1">
                          <label htmlFor="street_addr" className="block text-xs font-bold text-[#3f4850]">
                            Street Address
                          </label>
                          <input
                            id="street_addr"
                            type="text"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            placeholder="Bahnhofstrasse 10"
                            className="w-full px-3.5 py-2 bg-white border border-[#bec7d2] rounded-xl focus:border-[#006191] outline-none text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="city_addr" className="block text-xs font-bold text-[#3f4850]">
                            City (CH/EU)
                          </label>
                          <input
                            id="city_addr"
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Zürich"
                            className="w-full px-3.5 py-2 bg-white border border-[#bec7d2] rounded-xl focus:border-[#006191] outline-none text-sm"
                          />
                        </div>
                      </div>

                      {!pendingGoogleUser && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label htmlFor="signup_password" className="block text-xs font-bold text-[#3f4850]">
                              Password *
                            </label>
                            <div className="relative">
                              <input
                                id="signup_password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Min. 6 chars"
                                className="w-full px-3.5 py-2.5 bg-white border border-[#bec7d2] rounded-xl focus:border-[#006191] outline-none text-sm pr-9"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#566771]"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label htmlFor="confirm_password" className="block text-xs font-bold text-[#3f4850]">
                              Confirm Password *
                            </label>
                            <input
                              id="confirm_password"
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Repeat password"
                              className="w-full px-3.5 py-2.5 bg-white border border-[#bec7d2] rounded-xl focus:border-[#006191] outline-none text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Statutory Consents */}
                      <div className="space-y-2.5 pt-2 border-t border-slate-200">
                        <label
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer ${
                            emailNoticeError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-[#f9f9ff]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={agreedToEmailNotices}
                            onChange={(e) => {
                              setAgreedToEmailNotices(e.target.checked);
                              if (e.target.checked) setEmailNoticeError(false);
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-[#bec7d2] text-[#006191]"
                          />
                          <span className="text-[#3f4850]">
                            I consent to receive official Verein invitations and General Assembly notices via email. *
                          </span>
                        </label>

                        <label
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer ${
                            feeNoticeError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-[#f9f9ff]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={agreedToMembershipFee}
                            onChange={(e) => {
                              setAgreedToMembershipFee(e.target.checked);
                              if (e.target.checked) setFeeNoticeError(false);
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-[#bec7d2] text-[#006191]"
                          />
                          <span className="text-[#3f4850]">
                            I acknowledge the annual membership contribution of{' '}
                            <strong>CHF {membershipCategory === 'family' ? '120' : '80'} / year</strong>. *
                          </span>
                        </label>

                        <label
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer ${
                            termsError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-[#f9f9ff]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => {
                              setAgreedToTerms(e.target.checked);
                              if (e.target.checked) setTermsError(false);
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-[#bec7d2] text-[#006191]"
                          />
                          <span className="text-[#3f4850]">
                            I agree to the Verein{' '}
                            <button
                              type="button"
                              onClick={() => openLegalModal('terms')}
                              className="text-[#006191] underline font-semibold"
                            >
                              Statutes &amp; Terms
                            </button>{' '}
                            and{' '}
                            <button
                              type="button"
                              onClick={() => openLegalModal('privacy')}
                              className="text-[#006191] underline font-semibold"
                            >
                              Privacy Policy
                            </button>
                            . *
                          </span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3.5 bg-[#006191] text-white font-bold rounded-xl hover:bg-[#007bb6] transition-all shadow-sm cursor-pointer text-sm"
                      >
                        Continue to Fee Settlement (CHF {membershipCategory === 'family' ? 120 : 80}) &rarr;
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-slate-200">
            <button
              type="button"
              onClick={() => setResetModalOpen(false)}
              className="absolute right-4 top-4 p-1 text-[#566771] hover:bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-[#121c2a] mb-1">Reset Your Password</h3>
            <p className="text-xs text-[#566771] mb-4">
              Enter your registered email address and we will send you a password reset link.
            </p>
            <form onSubmit={handlePasswordResetSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 border border-[#bec7d2] rounded-xl text-sm outline-none focus:border-[#006191]"
              />
              {resetStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    resetStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {resetStatus.text}
                </div>
              )}
              <button
                type="submit"
                disabled={isSendingReset}
                className="w-full py-2.5 bg-[#006191] text-white text-xs font-bold rounded-xl hover:bg-[#007bb6] cursor-pointer"
              >
                {isSendingReset ? 'Sending Reset Link...' : 'Send Password Reset Email'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Firebase Backend Configuration Modal (DEV only) */}
      {isDevConfigEnabled && firebaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
            <button
              type="button"
              onClick={() => setFirebaseModalOpen(false)}
              className="absolute right-4 top-4 p-1 text-[#566771] hover:bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-[#006191] text-white flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#121c2a]">Firebase Authentication &amp; Firestore</h3>
                <p className="text-xs text-[#566771]">
                  {firebaseActive
                    ? `Connected to project: ${existingFbConfig?.projectId}`
                    : 'Connect your Firebase Web SDK credentials'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#3f4850] leading-relaxed mb-4">
              You can configure Firebase via <code className="bg-slate-100 px-1 py-0.5 rounded">.env</code> variables (
              <code className="bg-slate-100 px-1 py-0.5 rounded">VITE_FIREBASE_API_KEY</code>,{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded">VITE_FIREBASE_PROJECT_ID</code>) or enter your Web App SDK config below.
            </p>

            <form onSubmit={handleSaveFirebaseConfig} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#006191] mb-1">
                  Quick Paste: Paste <code className="bg-[#eff3ff] px-1 py-0.5 rounded">firebaseConfig</code> from Firebase Console
                </label>
                <textarea
                  rows={3}
                  value={fbRawSnippet}
                  onChange={(e) => handleParseConfigSnippet(e.target.value)}
                  placeholder={'const firebaseConfig = {\n  apiKey: "AIza...",\n  projectId: "percikan-iman"\n};'}
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg font-mono text-[11px] bg-[#f9f9ff] focus:border-[#006191] outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-[#3f4850] mb-1">Firebase API Key *</label>
                <input
                  type="text"
                  required
                  value={fbApiKey}
                  onChange={(e) => setFbApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-[#3f4850] mb-1">Firebase Project ID *</label>
                <input
                  type="text"
                  required
                  value={fbProjectId}
                  onChange={(e) => setFbProjectId(e.target.value)}
                  placeholder="percikan-iman-ch"
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-[#3f4850] mb-1">Auth Domain (optional)</label>
                <input
                  type="text"
                  value={fbAuthDomain}
                  onChange={(e) => setFbAuthDomain(e.target.value)}
                  placeholder="percikan-iman-ch.firebaseapp.com"
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-[#3f4850] mb-1">App ID (optional)</label>
                <input
                  type="text"
                  value={fbAppId}
                  onChange={(e) => setFbAppId(e.target.value)}
                  placeholder="1:123456789:web:abcdef"
                  className="w-full px-3 py-2 border border-[#bec7d2] rounded-lg font-mono text-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-2">
                {firebaseActive && (
                  <button
                    type="button"
                    onClick={clearRuntimeFirebaseConfig}
                    className="px-3 py-2 text-red-700 hover:bg-red-50 rounded-lg font-semibold cursor-pointer"
                  >
                    Disconnect
                  </button>
                )}
                <button
                  type="submit"
                  className="ml-auto px-4 py-2.5 bg-[#006191] text-white font-bold rounded-lg hover:bg-[#007bb6] cursor-pointer"
                >
                  Save &amp; Connect Firebase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {localInfoModal && (
        <InfoModals type={localInfoModal} onClose={() => setLocalInfoModal(null)} />
      )}
    </div>
  );
};
