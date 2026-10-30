'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { PRODUCT_NAME } from '@/config/brand';
import { LangSwitcher } from '@/components/ui/LangSwitcher';

export function LandingFooter() {
  const t = useTranslations('landing.footer');

  return (
    <footer className="border-t border-border bg-surface/40 py-12 px-6 md:px-12 text-muted text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm tracking-tight text-ink">
            {PRODUCT_NAME}
          </span>
          <span className="text-border-strong">·</span>
          <span>{t('byline')}</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="px-2.5 py-1 rounded bg-sev-extreme-subtle text-sev-extreme font-medium border border-border">
            {t('disclaimer')}
          </span>
          <LangSwitcher />
        </div>
      </div>
    </footer>
  );
}
