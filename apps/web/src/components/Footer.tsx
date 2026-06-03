import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import BrandLogo, { BRAND_NAME } from "./BrandLogo";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center no-underline">
              <BrandLogo compact className="px-2.5 py-1.5" />
            </Link>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 no-underline dark:text-gray-400 dark:hover:text-gray-300">
              {t.nav.dashboard}
            </Link>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t.footer.privacy}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t.footer.terms}</span>
          </div>

          {/* Copyright */}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} {BRAND_NAME}. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
