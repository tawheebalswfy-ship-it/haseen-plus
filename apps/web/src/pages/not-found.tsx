import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

export function NotFound() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 dark:bg-gray-950">
      <div className="flex max-w-lg flex-col items-center text-center">
        {/* 404 number */}
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#0d6a5c] dark:text-[#5cb8a3]">
          Error 404
        </p>
        <h1 className="mb-3 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
          {t.notFound.title}
        </h1>
        <p className="mb-10 text-base text-gray-500 dark:text-gray-400">
          {t.notFound.description}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {t.notFound.backHome}
          </Link>
          {user && (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border-0 bg-[#0b1d2c] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#142d40] dark:bg-white dark:text-[#0b1d2c] dark:hover:bg-gray-100"
            >
              {t.notFound.goToDashboard}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
