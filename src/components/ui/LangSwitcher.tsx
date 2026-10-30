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
      className="inline-flex items-center rounded-md border border-border bg-surface p-0.5 text-xs font-medium"
    >
      {locales.map((loc) => {
        const isActive = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => handleChange(loc)}
            className={`px-2.5 py-1 rounded transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              isActive
                ? 'bg-brand text-white font-semibold'
                : 'text-muted hover:text-ink hover:bg-surface-2'
            }`}
          >
            {t(loc)}
          </button>
        );
      })}
    </div>
  );
}
