import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import BrandLogo, { BRAND_TAGLINE } from "../components/BrandLogo";
import { supabase } from "../lib/supabase";

type AuthMode = "sign-in" | "sign-up" | "forgot-password" | "reset-password";
type SuccessState = "sign-up" | "forgot-password" | "password-updated" | null;

function getAuthMode(pathname?: string): AuthMode {
  switch (pathname) {
    case "sign-up":
      return "sign-up";
    case "forgot-password":
      return "forgot-password";
    case "reset-password":
      return "reset-password";
    default:
      return "sign-in";
  }
}

export function Auth() {
  const { pathname } = useParams();
  const mode = getAuthMode(pathname);
  const isSignIn = mode === "sign-in";
  const isSignUp = mode === "sign-up";
  const isForgotPassword = mode === "forgot-password";
  const isResetPassword = mode === "reset-password";

  const {
    signIn,
    signUp,
    requestPasswordReset,
    resendConfirmation,
    updatePassword,
    user,
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessState>(null);
  const [successEmail, setSuccessEmail] = useState("");
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resetLinkChecked, setResetLinkChecked] = useState(false);

  useEffect(() => {
    if (!isResetPassword) return;
    let active = true;

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && active) setError("This password reset link is invalid or expired. Please request a new reset link.");
      } else {
        await supabase.auth.getSession();
      }
      if (active) setResetLinkChecked(true);
    })();

    return () => {
      active = false;
    };
  }, [isResetPassword]);

  if (!authLoading && user && !isResetPassword) {
    return <Navigate to="/dashboard" replace />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-400 border-t-transparent" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          setError(error);
        } else {
          setSuccessEmail(email);
          setSuccess("sign-up");
        }
        return;
      }

      if (isForgotPassword) {
        const redirectTo = `${window.location.origin}/auth/reset-password`;
        const { error } = await requestPasswordReset(email, redirectTo);
        if (error) {
          setError(error);
        } else {
          setSuccessEmail(email);
          setSuccess("forgot-password");
        }
        return;
      }

      if (isResetPassword) {
        if (!user) {
          setError(t.auth.invalidRecoveryLink);
          return;
        }

        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }

        if (password !== confirmPassword) {
          setError(t.auth.passwordsDoNotMatch);
          return;
        }

        const { error } = await updatePassword(password);
        if (error) {
          setError(error);
        } else {
          setSuccess("password-updated");
        }
        return;
      }

      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
      } else {
        navigate("/dashboard", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const successTitle = success === "password-updated"
      ? t.auth.passwordUpdatedTitle
      : t.auth.checkEmail;
    const successDescription = success === "sign-up"
      ? "Please check your email to confirm your account."
      : success === "forgot-password"
        ? "Password reset link sent. Please check your email."
        : t.auth.passwordUpdatedDescription;
    const nextPath = success === "password-updated" ? "/dashboard" : "/auth/sign-in";
    const nextLabel = success === "password-updated" ? t.auth.continueToDashboard : t.auth.backToSignIn;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 inline-flex rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
            <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{successTitle}</h2>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">{successDescription}</p>
          {success === "sign-up" && (
            <div className="mb-5">
              {resendMessage && (
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{resendMessage}</p>
              )}
              <button
                onClick={async () => {
                  setResendMessage(null);
                  const { error } = await resendConfirmation(successEmail || email);
                  setResendMessage(error || "Confirmation email resent. Please check your inbox.");
                }}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Resend confirmation email
              </button>
            </div>
          )}
          <Link
            to={nextPath}
            className="cursor-pointer border-0 bg-transparent text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            {nextLabel}
          </Link>
        </div>
      </div>
    );
  }

  const title = isSignUp
    ? t.auth.createAccount
    : isForgotPassword
      ? t.auth.forgotPassword
      : isResetPassword
        ? t.auth.resetPassword
        : t.auth.signIn;

  const subtitle = isSignUp
    ? t.auth.signUpSubtitle
    : isForgotPassword
      ? t.auth.forgotPasswordSubtitle
      : isResetPassword
        ? t.auth.resetPasswordSubtitle
        : t.auth.signInSubtitle;

  const submitLabel = isSignUp
    ? t.auth.createAccount
    : isForgotPassword
      ? t.auth.sendResetLink
      : isResetPassword
        ? t.auth.resetPassword
        : t.auth.signIn;

  const footerPrompt = isSignUp
    ? t.auth.alreadyHaveAccount
    : isForgotPassword
      ? t.auth.rememberedPassword
      : t.auth.dontHaveAccount;

  const footerLink = isSignUp || isForgotPassword ? "/auth/sign-in" : "/auth/sign-up";
  const footerLinkLabel = isSignUp || isForgotPassword ? t.auth.signIn : t.auth.createAccount;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="relative hidden w-1/2 overflow-hidden bg-[#0b1d2c] lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(13,106,92,0.15)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(10,76,110,0.12)_0%,_transparent_60%)]" />

        <div className="absolute inset-0 opacity-[0.04]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative z-10 flex max-w-sm flex-col items-center px-10 text-center">
          <BrandLogo className="mb-6 px-5 py-4" imageClassName="h-20 max-w-64" />
          <p className="mb-8 text-sm font-medium leading-relaxed text-gray-300">
            {BRAND_TAGLINE}
          </p>

          <div className="flex w-full flex-col gap-4 text-left">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#0d6a5c]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="text-sm text-gray-300">NCA &amp; ISO 27001 Compliance</span>
            </div>
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#c9a84c]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <span className="text-sm text-gray-300">AI-Powered Gap Analysis</span>
            </div>
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#4a9ec9]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
              </svg>
              <span className="text-sm text-gray-300">Real-time Risk Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between px-6 py-4 sm:px-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {t.nav.home}
          </Link>
          <BrandLogo compact className="px-2 py-1 lg:hidden" imageClassName="h-7 max-w-24" />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>

            {isResetPassword && !user && resetLinkChecked ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="mb-4 inline-flex rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
                  <svg className="h-6 w-6 text-amber-700 dark:text-amber-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007v.008H12v-.008z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 3.94L1.82 18a1.875 1.875 0 001.603 2.813h17.154A1.875 1.875 0 0022.18 18l-8.52-14.06a1.875 1.875 0 00-3.32 0z" />
                  </svg>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-amber-900 dark:text-amber-100">
                  {t.auth.invalidRecoveryLink}
                </p>
                <Link
                  to="/auth/forgot-password"
                  className="inline-flex items-center rounded-xl bg-[#0b1d2c] px-4 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#142d40] dark:bg-white dark:text-[#0b1d2c] dark:hover:bg-gray-100"
                >
                  {t.auth.requestNewResetLink}
                </Link>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {isSignUp && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t.auth.fullName}
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pr-3.5">
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={t.auth.fullNamePlaceholder}
                          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-all focus:border-[#0a4c6e] focus:ring-2 focus:ring-[#0a4c6e]/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-[#0d6a5c] dark:focus:ring-[#0d6a5c]/20 rtl:pl-4 rtl:pr-10"
                        />
                      </div>
                    </div>
                  )}

                  {!isResetPassword && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t.auth.email}
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pr-3.5">
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t.auth.emailPlaceholder}
                          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-all focus:border-[#0a4c6e] focus:ring-2 focus:ring-[#0a4c6e]/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-[#0d6a5c] dark:focus:ring-[#0d6a5c]/20 rtl:pl-4 rtl:pr-10"
                        />
                      </div>
                    </div>
                  )}

                  {!isForgotPassword && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t.auth.password}
                        </label>
                        {isSignIn && (
                          <Link
                            to="/auth/forgot-password"
                            className="text-xs font-medium text-[#0a4c6e] no-underline hover:text-[#0d6a5c] dark:text-[#5cb8a3] dark:hover:text-[#7dd3c0]"
                          >
                            {t.auth.forgotPassword}
                          </Link>
                        )}
                      </div>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pr-3.5">
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        </div>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          minLength={isResetPassword ? 8 : 6}
                          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-all focus:border-[#0a4c6e] focus:ring-2 focus:ring-[#0a4c6e]/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-[#0d6a5c] dark:focus:ring-[#0d6a5c]/20 rtl:pl-4 rtl:pr-10"
                        />
                      </div>
                    </div>
                  )}

                  {isResetPassword && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t.auth.confirmPassword}
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:left-auto rtl:right-0 rtl:pr-3.5">
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        </div>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t.auth.confirmPasswordPlaceholder}
                          minLength={8}
                          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-all focus:border-[#0a4c6e] focus:ring-2 focus:ring-[#0a4c6e]/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-[#0d6a5c] dark:focus:ring-[#0d6a5c]/20 rtl:pl-4 rtl:pr-10"
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
                      <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full cursor-pointer rounded-xl border-0 bg-[#0b1d2c] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#142d40] disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-[#0b1d2c] dark:hover:bg-gray-100"
                  >
                    {loading ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {t.auth.loading}
                      </span>
                    ) : (
                      submitLabel
                    )}
                  </button>
                </form>

                {(isSignIn || isSignUp) && (
                  <div className="my-7 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700" />
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {t.auth.orContinueWith}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700" />
                  </div>
                )}

                {!isResetPassword && (
                  <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 py-3.5 text-center dark:border-gray-700/50 dark:bg-gray-800/30">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {footerPrompt}{" "}
                      <Link
                        to={footerLink}
                        className="font-semibold text-[#0a4c6e] underline decoration-[#0a4c6e]/30 underline-offset-2 transition-colors hover:text-[#0d6a5c] hover:decoration-[#0d6a5c]/50 dark:text-[#5cb8a3] dark:decoration-[#5cb8a3]/30 dark:hover:text-[#7dd3c0]"
                      >
                        {footerLinkLabel}
                      </Link>
                    </p>
                  </div>
                )}

                {(isSignIn || isSignUp) && (
                  <p className="mt-6 text-center text-xs leading-relaxed text-gray-400 dark:text-gray-500">
                    {t.auth.termsNotice}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Confirming your email...");

  useEffect(() => {
    let active = true;

    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const errorDescription = url.searchParams.get("error_description") || url.searchParams.get("error");

      if (errorDescription) {
        if (active) setMessage("This confirmation link is invalid or expired. Please request a new confirmation email.");
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (active) setMessage("This confirmation link is invalid or expired. Please request a new confirmation email.");
          return;
        }
      } else {
        await supabase.auth.getSession();
      }

      if (active) {
        setMessage("Email confirmed. Redirecting to dashboard...");
        setTimeout(() => navigate("/dashboard", { replace: true }), 700);
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Email Confirmation</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        {message.includes("invalid") || message.includes("expired") ? (
          <Link to="/auth/sign-in" className="mt-6 inline-flex text-sm font-medium text-gray-600 dark:text-gray-300">
            Back to sign in
          </Link>
        ) : null}
      </div>
    </div>
  );
}

