import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  X
} from 'lucide-react';
import {
  authenticateWithGoogle,
  sendMemberPasswordReset,
  signInMember,
  signOutMember
} from '../../lib/authService';
import { LOGO_URL } from '../../constants';
import { useLanguage } from '../../i18n';
import { LanguageSelector } from '../LanguageSelector';

export interface AdminLoginGateProps {
  redirectPath?: string;
  onLoginSuccess?: () => void;
  persistedError?: string | null;
  onErrorChange?: (error: string | null) => void;
}

export const AdminLoginGate: React.FC<AdminLoginGateProps> = ({
  redirectPath,
  onLoginSuccess,
  persistedError,
  onErrorChange
}) => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(persistedError ?? null);
  const allowStaffCodeHint = Boolean(
    import.meta.env?.DEV ||
      (import.meta.env?.VITE_USE_FIREBASE_EMULATOR === 'true' &&
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  );

  useEffect(() => {
    if (persistedError !== undefined) {
      setErrorMessage(persistedError);
    }
  }, [persistedError]);

  const reportError = (msg: string | null) => {
    setErrorMessage(msg);
    onErrorChange?.(msg);
  };

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const isResettingRef = useRef(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const currentPathWithSearch = `${location.pathname}${location.search}`;
  const effectiveRedirectPath = redirectPath || currentPathWithSearch;

  const completeNavigation = () => {
    onLoginSuccess?.();
    if (
      effectiveRedirectPath &&
      effectiveRedirectPath.startsWith('/admin') &&
      effectiveRedirectPath !== currentPathWithSearch
    ) {
      navigate(effectiveRedirectPath, { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    reportError(null);

    if (!identifier.trim() || !password) {
      reportError(
        allowStaffCodeHint
          ? 'Please enter both your staff email (or admin code) and password.'
          : 'Please enter both your staff email address and password.'
      );
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await signInMember(identifier, password);
      completeNavigation();
    } catch (err) {
      reportError(
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please check your credentials and try again.'
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSubmittingRef.current) return;
    reportError(null);
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await authenticateWithGoogle();
      if (result.status === 'needs_registration_completion') {
        await signOutMember();
        reportError(
          `No registered staff member profile exists for ${
            result.googleProfile?.email || 'this Google account'
          }. Please sign in with a registered staff account or return to the public site to register.`
        );
        return;
      }
      completeNavigation();
    } catch (err) {
      reportError(
        err instanceof Error
          ? err.message
          : 'Google sign-in failed. Please try again.'
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isResettingRef.current) return;
    setResetError(null);
    setResetSuccess(false);

    if (!resetEmail.trim()) {
      setResetError('Please enter your registered email address.');
      return;
    }

    isResettingRef.current = true;
    setIsResetting(true);
    try {
      await sendMemberPasswordReset(resetEmail);
      setResetSuccess(true);
    } catch (err) {
      setResetError(
        err instanceof Error
          ? err.message
          : 'Unable to send password reset email. Please verify your email address.'
      );
    } finally {
      isResettingRef.current = false;
      setIsResetting(false);
    }
  };

  return (
    <div
      data-testid="admin-login-gate"
      className="min-h-screen bg-[#f6f7f4] flex flex-col justify-between px-4 py-8"
    >
      {/* Minimal Top Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between gap-3 mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006191] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.nav.returnToPublicSite}</span>
        </Link>

        <LanguageSelector variant="navbar" />
      </div>

      {/* Centered Admin Sign-In Card */}
      <main className="max-w-md w-full mx-auto bg-white rounded-2xl border border-[#bec7d2]/70 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <img
              src={LOGO_URL}
              alt="Verein Percikan Iman Schweiz"
              className="w-10 h-10 object-contain"
            />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eff3ff] text-[#006191] text-[11px] font-bold uppercase tracking-wider border border-[#d3e5f1]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t.nav.admin}</span>
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#121c2a]">
            {t.admin.dashboardTitle}
          </h1>
          <p className="text-xs text-[#566771] mt-1 leading-relaxed">
            Verein Percikan Iman Schweiz — Staff &amp; Board Governance Authentication
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin_login_identifier"
              className="block text-xs font-bold text-[#3f4850] uppercase tracking-wider"
            >
              {t.programs.emailAddress}{' '}
              {allowStaffCodeHint && (
                <span className="text-[#6f7881] font-normal lowercase">(or staff code)</span>
              )}
            </label>
            <div className="relative">
              <input
                id="admin_login_identifier"
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  reportError(null);
                }}
                placeholder={
                  allowStaffCodeHint
                    ? 'admin@percikaniman.org or PI-ADMIN'
                    : 'admin@percikaniman.org'
                }
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#bec7d2] rounded-xl focus:ring-2 focus:ring-[#006191]/20 focus:border-[#006191] outline-none transition-all text-sm text-[#121c2a]"
              />
              <Mail className="w-4 h-4 text-[#6f7881] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="admin_login_password"
                className="block text-xs font-bold text-[#3f4850] uppercase tracking-wider"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(identifier.includes('@') ? identifier.trim() : '');
                  setResetError(null);
                  setResetSuccess(false);
                  setIsResetModalOpen(true);
                }}
                className="text-xs text-[#006191] hover:underline font-semibold cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <div className="relative">
              <input
                id="admin_login_password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  reportError(null);
                }}
                placeholder="Enter your password"
                className="w-full pl-10 pr-11 py-2.5 bg-white border border-[#bec7d2] rounded-xl focus:ring-2 focus:ring-[#006191]/20 focus:border-[#006191] outline-none transition-all text-sm text-[#121c2a]"
              />
              <KeyRound className="w-4 h-4 text-[#6f7881] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#566771] hover:text-[#121c2a] cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#006191] text-white font-bold rounded-xl hover:bg-[#007bb6] transition-all shadow-sm cursor-pointer text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>{t.nav.login}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center mb-4">
            <div className="flex-grow border-t border-[#e2e8f0]" />
            <span className="flex-shrink mx-3 text-xs text-[#6f7881] font-medium">
              Or continue with
            </span>
            <div className="flex-grow border-t border-[#e2e8f0]" />
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-[#bec7d2] rounded-xl hover:bg-[#f8fafc] transition-colors cursor-pointer text-sm font-semibold text-[#121c2a] shadow-2xs disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
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

        <p className="mt-5 text-[11px] text-center text-[#566771]">
          Restricted to authorized Verein Percikan Iman Schweiz board &amp; operations staff.
        </p>
      </main>

      <footer className="max-w-md w-full mx-auto text-center text-[11px] text-[#6f7881] mt-6">
        Verein Percikan Iman Schweiz • Isolated Administration Portal
      </footer>

      {/* Password Reset Modal */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-reset-password-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#bec7d2]/60 relative">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-[#566771] hover:bg-gray-100 cursor-pointer"
              aria-label="Close password reset dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 id="admin-reset-password-title" className="text-lg font-bold text-[#121c2a] mb-1">
              Reset Staff Password
            </h2>
            <p className="text-xs text-[#566771] mb-4">
              Enter your registered staff email address to receive a password reset link.
            </p>

            {resetSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Password reset email sent</p>
                  <p className="mt-1">
                    Check your inbox at <strong>{resetEmail}</strong> for reset instructions.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {resetError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="admin_reset_email"
                    className="block text-xs font-bold text-[#3f4850] uppercase mb-1"
                  >
                    {t.programs.emailAddress}
                  </label>
                  <input
                    id="admin_reset_email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="admin@percikaniman.org"
                    className="w-full px-3.5 py-2.5 border border-[#bec7d2] rounded-xl text-sm outline-none focus:border-[#006191]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#566771] hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-4 py-2 bg-[#006191] text-white text-xs font-bold rounded-lg hover:bg-[#007bb6] disabled:opacity-60 cursor-pointer"
                  >
                    {isResetting ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
