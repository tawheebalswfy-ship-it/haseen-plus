import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";

export function Account() {
  const { user, signOut, signingOut } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useLanguage();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const displayName = fullName.trim() || user?.user_metadata?.full_name || user?.email || t.auth.unnamed;
  const initial = displayName.charAt(0).toUpperCase();
  const originalName = user?.user_metadata?.full_name ?? "";
  const hasChanges = fullName.trim() !== originalName;

  const memberSince = useMemo(() => {
    if (!user?.created_at) return "-";

    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
    }).format(new Date(user.created_at));
  }, [locale, user?.created_at]);

  const accountId = user?.id ? `${user.id.slice(0, 8)}...${user.id.slice(-4)}` : "-";
  const emailStatus = user?.email_confirmed_at ? t.auth.verified : t.auth.notVerified;

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    });

    setSaving(false);

    if (error) {
      setSaveError(error.message || t.auth.saveFailed);
      return;
    }

    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl items-center justify-center px-4 pt-24">
          <div className="w-full rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0b1d2c] text-white dark:bg-white dark:text-[#0b1d2c]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275" />
              </svg>
            </div>
            <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{t.auth.account}</h1>
            <p className="mb-6 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{t.auth.signInRequired}</p>
            <Link
              to="/auth/sign-in"
              className="inline-flex items-center rounded-xl bg-[#0b1d2c] px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#142d40] dark:bg-white dark:text-[#0b1d2c] dark:hover:bg-gray-100"
            >
              {t.nav.login}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef3f7] dark:bg-[#0b1116]">
      <Navbar />
      <div className="relative overflow-hidden pt-24">
        <div className="absolute inset-x-0 top-0 h-80 bg-[#e6edf3] dark:bg-[#101922]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-[#17364d] bg-[#123149] shadow-[0_24px_60px_rgba(11,29,44,0.14)] dark:border-[#203342] dark:bg-[#102738] dark:shadow-none">
            <div className="absolute inset-0 opacity-[0.08]">
              <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="account-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                    <path d="M 36 0 L 0 0 0 36" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#account-grid)" />
              </svg>
            </div>
            <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[auto,1fr,auto] lg:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/12 text-3xl font-bold text-white ring-1 ring-white/15 backdrop-blur-sm">
                {initial}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                  {t.auth.account}
                </p>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{displayName}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-200">
                  {t.auth.accountSubtitle}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {emailStatus}
                </span>
                <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {user.email}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <section className="rounded-3xl border border-[#d8e2ee] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-gray-800 dark:bg-gray-900 sm:p-8">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.auth.profileDetails}</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.auth.profileDetailsDescription}</p>
                </div>
                {saved && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                    {t.auth.saved}
                  </span>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t.auth.fullName}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-[#0a4c6e] focus:ring-2 focus:ring-[#0a4c6e]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-[#0d6a5c] dark:focus:ring-[#0d6a5c]/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t.auth.email}</label>
                  <input
                    type="email"
                    value={user.email ?? ""}
                    disabled
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 outline-none dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
                  />
                </div>

                {saveError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                    {saveError}
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-gray-200 pt-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {hasChanges ? t.auth.profileDetailsDescription : t.auth.accountSubtitle}
                  </p>
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges}
                    className="inline-flex items-center justify-center rounded-xl border-0 bg-[#0b1d2c] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#142d40] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-[#0b1d2c] dark:hover:bg-gray-100"
                  >
                    {saving ? t.auth.saving : t.auth.saveChanges}
                  </button>
                </div>
              </div>
            </section>

            <div className="space-y-6">
              <section className="rounded-3xl border border-[#d8e2ee] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.auth.accountOverview}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.auth.accountOverviewDescription}</p>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t.auth.memberSince}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{memberSince}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t.auth.emailStatus}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{emailStatus}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t.auth.accountIdentifier}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{accountId}</span>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-[#d8e2ee] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.auth.quickActions}</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.auth.quickActionsDescription}</p>

                <div className="mt-6 grid gap-3">
                  <Link
                    to="/auth/forgot-password"
                    className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 no-underline transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <span>{t.auth.resetPassword}</span>
                    <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>

                  <Link
                    to="/dashboard"
                    className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 no-underline transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <span>{t.auth.openDashboard}</span>
                    <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>

                  <button
                    onClick={async () => {
                      await signOut();
                      navigate("/auth/sign-in", { replace: true });
                    }}
                    disabled={signingOut}
                    className="flex items-center justify-between rounded-2xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/20"
                  >
                    <span>{signingOut ? "Signing out..." : t.nav.logout}</span>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

