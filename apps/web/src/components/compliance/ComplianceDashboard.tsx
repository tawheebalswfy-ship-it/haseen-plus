import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";

const icons = {
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
};

interface NavItem {
  name: string;
  path: string;
}

interface ComplianceDashboardProps {
  children: React.ReactNode;
}

export default function ComplianceDashboard({ children }: ComplianceDashboardProps) {
  const { toggleLanguage, locale, t, dir } = useLanguage();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ct = t.compliance;

  const navigation: NavItem[] = [
    { name: ct.sidebar.dashboard, path: "/dashboard" },
    { name: ct.sidebar.policies, path: "/dashboard/policies" },
    { name: ct.sidebar.assessments, path: "/dashboard/assessments" },
    { name: ct.sidebar.remediation, path: "/dashboard/remediation" },
    { name: ct.sidebar.frameworkComparison, path: "/dashboard/framework-comparison" },
    { name: ct.sidebar.riskDashboard, path: "/dashboard/risk" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const activeItem = navigation.find((item) => isActive(item.path)) ?? navigation[0];

  return (
    <div className="flex h-screen bg-transparent" dir={dir}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 z-50 w-72 bg-white dark:bg-gray-900 border-e border-gray-200 dark:border-gray-800 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          dir === "rtl"
            ? `right-0 ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`
            : `left-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
        }`}
      >
        <div className="flex h-full flex-col bg-white dark:bg-gray-950">
          {/* Logo */}
          <div className="flex h-20 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-800">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <img src="/logo.png" alt="AICG" className="h-7 w-7" />
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                AICG
              </span>
            </Link>
            <button
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-0 bg-transparent"
              onClick={() => setSidebarOpen(false)}
            >
              {icons.close}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
            {navigation.map((item, index) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all no-underline ${
                  isActive(item.path)
                    ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isActive(item.path)
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Bottom */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-1">
            <button
              onClick={toggleLanguage}
              className="flex w-full items-center rounded-xl px-4 py-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 cursor-pointer border-0 bg-transparent"
            >
              {locale === "en" ? "العربية" : "English"}
            </button>
            <Link
              to="/account"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center rounded-xl px-4 py-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 no-underline"
            >
              <svg className="me-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275" />
              </svg>
              {t.auth.account}
            </Link>
            <Link
              to="/"
              className="flex items-center rounded-xl px-4 py-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 no-underline"
            >
              {ct.sidebar.backToHome}
            </Link>
            <button
              onClick={async () => {
                await signOut();
                navigate("/", { replace: true });
              }}
              className="flex w-full items-center rounded-xl px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer border-0 bg-transparent"
            >
              <svg className="me-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              {ct.sidebar.signOut}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-gray-200 bg-white/90 px-6 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/90">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer border-0 bg-transparent dark:hover:bg-gray-800"
              onClick={() => setSidebarOpen(true)}
            >
              {icons.menu}
            </button>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
                {ct.sidebar.breadcrumb}
              </p>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{activeItem.name}</h1>
            </div>
          </div>
          <Link
            to="/account"
            className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 no-underline transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <span className="hidden sm:block">{t.auth.account}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0b1d2c] text-sm font-semibold text-white dark:bg-white dark:text-[#0b1d2c]">
              {(user?.user_metadata?.full_name ?? user?.email ?? "U").charAt(0).toUpperCase()}
            </span>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
