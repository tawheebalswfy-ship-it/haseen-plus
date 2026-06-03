import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import BrandLogo from "../BrandLogo";

const navIcons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  policies: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  assessments: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
  reports: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  remediation: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-3.078A2.25 2.25 0 004.5 14.07v4.804a2.25 2.25 0 001.536 1.978l5.384 3.078a2.25 2.25 0 002.16 0l5.384-3.078A2.25 2.25 0 0020.5 18.874V14.07a2.25 2.25 0 00-1.536-1.978l-5.384-3.078a2.25 2.25 0 00-2.16 0z" />
    </svg>
  ),
  scheduling: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  signOut: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  ),
  menu: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  sun: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  moon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
};

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface ComplianceDashboardProps {
  children: React.ReactNode;
}

export default function ComplianceDashboard({ children }: ComplianceDashboardProps) {
  const { toggleLanguage, locale, t, dir } = useLanguage();
  const { signOut } = useAuth();
  const { resolved, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ct = t.compliance;

  const navigation: NavItem[] = [
    { name: ct.sidebar.dashboard, path: "/dashboard", icon: navIcons.dashboard },
    { name: ct.sidebar.policies, path: "/dashboard/policies", icon: navIcons.policies },
    { name: ct.sidebar.assessments, path: "/dashboard/assessments", icon: navIcons.assessments },
    { name: locale === "ar" ? "التقارير" : "Reports", path: "/dashboard/framework-comparison", icon: navIcons.reports },
    { name: ct.sidebar.remediation, path: "/dashboard/remediation", icon: navIcons.remediation },
    { name: locale === "ar" ? "الجدولة" : "Scheduling", path: "/dashboard/risk", icon: navIcons.scheduling },
    { name: locale === "ar" ? "الملف الشخصي" : "Profile", path: "/account", icon: navIcons.profile },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen" dir={dir}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — theme-aware: light bg in light, dark navy in dark */}
      <aside
        className={`fixed inset-y-0 z-50 w-56 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          dir === "rtl"
            ? `right-0 ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`
            : `left-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
        }`}
      >
        <div className="flex h-full flex-col bg-gray-50 border-e border-gray-200 dark:border-gray-800 dark:bg-gray-950">
          {/* Logo area */}
          <div className="flex h-16 items-center gap-2.5 px-5">
            <BrandLogo compact className="px-2 py-1" imageClassName="h-7 max-w-24" />
            <button
              className="lg:hidden ms-auto p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer border-0 bg-transparent"
              onClick={() => setSidebarOpen(false)}
            >
              {navIcons.close}
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors no-underline ${
                  isActive(item.path)
                    ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="border-t border-gray-200 dark:border-white/10 p-3 space-y-0.5">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 cursor-pointer border-0 bg-transparent"
            >
              {resolved === "dark" ? navIcons.sun : navIcons.moon}
              {resolved === "dark" ? (locale === "ar" ? "الوضع الفاتح" : "Light Mode") : (locale === "ar" ? "الوضع الداكن" : "Dark Mode")}
            </button>
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 cursor-pointer border-0 bg-transparent"
            >
              <span className="w-5 h-5 inline-flex items-center justify-center text-xs font-bold">
                {locale === "en" ? "ع" : "En"}
              </span>
              {locale === "en" ? "العربية" : "English"}
            </button>
            {/* Sign out */}
            <button
              onClick={async () => {
                await signOut();
                navigate("/", { replace: true });
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-white/5 cursor-pointer border-0 bg-transparent"
            >
              {navIcons.signOut}
              {ct.sidebar.signOut}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-950">
        {/* Top header */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer border-0 bg-transparent dark:hover:bg-gray-800"
              onClick={() => setSidebarOpen(true)}
            >
              {navIcons.menu}
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {ct.sidebar.dashboard}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard/policies?open=true")}
              className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              {t.compliance.overview.uploadPolicy}
            </button>
            <button
              onClick={() => navigate("/dashboard/assessments?open=true")}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 cursor-pointer border-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t.compliance.overview.newAssessment}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
