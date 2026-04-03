import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { t, toggleLanguage } = useLanguage();
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/90">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 no-underline">
          <img src="/logo.png" alt="AICG" className="h-7 w-7" />
          <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            AICG
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            to="/"
            className="text-sm font-medium text-gray-700 hover:text-gray-600 no-underline dark:text-gray-300 dark:hover:text-gray-500"
          >
            {t.nav.home}
          </Link>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-gray-700 hover:text-gray-600 no-underline dark:text-gray-300 dark:hover:text-gray-500"
          >
            {t.nav.dashboard}
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="cursor-pointer rounded-full border border-gray-300/80 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {t.nav.language}
          </button>

          {!user ? (
            <>
              <Link
                to="/auth/sign-in"
                className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 no-underline dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t.nav.login}
              </Link>
              <Link
                to="/auth/sign-up"
                className="rounded-full bg-gray-900 dark:bg-white px-5 py-2 text-sm font-semibold !text-white dark:!text-gray-900 shadow-md hover:bg-gray-800 dark:hover:bg-gray-200 no-underline"
              >
                {t.nav.register}
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/account"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold !text-white no-underline hover:bg-gray-800 dark:bg-white dark:!text-gray-900 dark:hover:bg-gray-200"
                title={user.email ?? ''}
              >
                {(user.user_metadata?.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
              </Link>
              <button
                onClick={() => signOut()}
                className="cursor-pointer rounded-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 border-0 bg-transparent dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {t.nav.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
