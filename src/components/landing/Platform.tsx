'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Smartphone, Siren, Hospital, ArrowRight } from 'lucide-react';

export function Platform() {
  const t = useTranslations('landing.platform');

  const views = [
    {
      title: t('citizenTitle'),
      desc: t('citizenDesc'),
      tag: t('citizenTag'),
      icon: Smartphone,
      href: null,
      cta: 'Mobile App',
    },
    {
      title: t('responderTitle'),
      desc: t('responderDesc'),
      tag: 'Live Dispatch',
      icon: Siren,
      href: '/responder',
      cta: 'Open Responder',
    },
    {
      title: t('hospitalTitle'),
      desc: t('hospitalDesc'),
      tag: 'Emergency Prep',
      icon: Hospital,
      href: '/hospital',
      cta: 'Open Hospital',
    },
  ];

  return (
    <section id="platform" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="text-center max-w-xl mx-auto mb-16">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-ink">
          {t('title')}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {views.map((view, i) => {
          const Icon = view.icon;
          return (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl p-8 shadow-1 flex flex-col justify-between hover:-translate-y-1 hover:shadow-2 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-ink group-hover:bg-brand-subtle group-hover:text-brand transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-surface-2 text-muted border border-border">
                    {view.tag}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-ink mb-3">
                  {view.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed mb-8">
                  {view.desc}
                </p>
              </div>

              {view.href ? (
                <Link
                  href={view.href}
                  className="h-10 px-4 rounded-xl bg-surface border border-border group-hover:border-brand text-xs font-semibold text-ink group-hover:text-brand flex items-center justify-between transition-colors focus-visible:outline-none"
                >
                  <span>{view.cta}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              ) : (
                <div className="h-10 px-4 rounded-xl bg-surface-2 text-xs font-semibold text-muted flex items-center justify-between border border-border/50">
                  <span>{view.cta}</span>
                  <span className="text-[10px] uppercase font-mono tracking-wider">iOS / Android</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
