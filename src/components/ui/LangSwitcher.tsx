'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';

export function LangSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common.locales');

  const locales: Array<'fr' | 'en' | 'ar'> = ['fr', 'en', 'ar'];

  const handleChange = (newLocale: 'fr' | 'en' | 'ar') => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div
      role="group"
      aria-label="Language selection"
      className="inline-flex items-center h-8 rounded-full border border-border-strong bg-surface-2 p-0.5 text-xs font-medium shadow-1 shrink-0"
    >
      {locales.map((loc) => {
        const isActive = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => handleChange(loc)}
            className={`h-full px-2.5 rounded-full transition-all duration-fast inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              isActive
                ? 'bg-brand text-white font-semibold shadow-1'
                : 'text-ink-2 hover:text-ink hover:bg-surface'
            }`}
          >
            {t(loc)}
          </button>
        );
      })}
    </div>
  );
}
