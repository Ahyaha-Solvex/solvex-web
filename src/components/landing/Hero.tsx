'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  const t = useTranslations('landing.hero');

  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex flex-col justify-center items-center text-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Decorative radial gradient aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto flex flex-col items-center">
        {/* Eyebrow */}
        <span className="text-xs font-semibold uppercase tracking-widest text-muted mb-4 border border-border px-3 py-1 rounded-full bg-surface/60">
          {t('eyebrow')}
        </span>

        {/* Main H1 */}
        <h1 className="text-4xl md:text-7xl font-bold tracking-tight text-ink mb-6 max-w-[14ch] leading-[1.08]">
          {t('title')}
        </h1>

        {/* Lead */}
        <p className="text-lg md:text-2xl text-muted leading-relaxed max-w-2xl mb-10 font-normal">
          {t('lead')}
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <a
            href="#sequence"
            className="h-12 px-6 rounded-full bg-brand text-white text-sm font-semibold flex items-center gap-2 hover:bg-brand-hover active:scale-95 transition-all shadow-md focus-visible:outline-none"
          >
            <span>{t('seeHow')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </a>

          <Link
            href="/responder"
            className="h-12 px-6 rounded-full bg-surface border border-border text-ink hover:border-brand text-sm font-semibold flex items-center gap-2 transition-all shadow-sm focus-visible:outline-none"
          >
            <span>{t('openDemo')}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
