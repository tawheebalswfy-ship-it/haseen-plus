import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                AICG
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {t.footer.description}
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
              {t.footer.product}
            </h3>
            <ul className="mt-4 space-y-3 list-none p-0">
              <li>
                <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-600 no-underline dark:text-gray-400 dark:hover:text-gray-500">
                  {t.nav.dashboard}
                </Link>
              </li>
              <li>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t.footer.documentation}</span>
              </li>
              <li>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t.footer.pricing}</span>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
              {t.footer.company}
            </h3>
            <ul className="mt-4 space-y-3 list-none p-0">
              <li>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t.footer.about}</span>
              </li>
              <li>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t.footer.privacy}</span>
              </li>
              <li>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t.footer.terms}</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-900 dark:text-white">
              {t.footer.contact}
            </h3>
            <ul className="mt-4 space-y-3 list-none p-0">
              <li className="text-sm text-gray-500 dark:text-gray-400">
                contact@aicg.sa
              </li>
              <li className="text-sm text-gray-500 dark:text-gray-400">
                support@aicg.sa
              </li>
              <li className="text-sm text-gray-500 dark:text-gray-400">
                Riyadh, Saudi Arabia
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between border-t border-gray-200/70 pt-8 sm:flex-row dark:border-gray-800/70">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            &copy; {new Date().getFullYear()} AICG. {t.footer.rights}
          </p>
          <p className="mt-2 sm:mt-0 text-xs uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
            {t.footer.madeIn}
          </p>
        </div>
      </div>
    </footer>
  );
}
