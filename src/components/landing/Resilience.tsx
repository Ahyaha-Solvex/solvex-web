'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Wifi, MessageSquare, Share2, Satellite } from 'lucide-react';

export function Resilience() {
  const t = useTranslations('landing.resilience');

  const tiers = [
    {
      title: t('dataTitle'),
      desc: t('dataDesc'),
      icon: Wifi,
      status: t('active'),
      isActive: true,
    },
    {
      title: t('smsTitle'),
      desc: t('smsDesc'),
      icon: MessageSquare,
      status: t('active'),
      isActive: true,
    },
    {
      title: t('relayTitle'),
      desc: t('relayDesc'),
      icon: Share2,
      status: t('roadmap'),
      isActive: false,
    },
    {
      title: t('satTitle'),
      desc: t('satDesc'),
      icon: Satellite,
      status: t('roadmap'),
      isActive: false,
    },
  ];

  return (
    <section className="py-24 px-6 md:px-12 max-w-5xl mx-auto">
      <div className="text-center max-w-xl mx-auto mb-16">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-ink">
          {t('title')}
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        {tiers.map((tier, i) => {
          const Icon = tier.icon;
          return (
            <div
              key={i}
              className={`p-6 rounded-2xl border flex items-center justify-between gap-6 transition-all ${
                tier.isActive
                  ? 'bg-surface border-border shadow-1'
                  : 'bg-surface/30 border-border/60 opacity-60 border-dashed'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    tier.isActive
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-surface-2 text-muted border border-border'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    {tier.title}
                  </h3>
                  <p className="text-sm text-muted mt-0.5">
                    {tier.desc}
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full border shrink-0 ${
                  tier.isActive
                    ? 'bg-brand-subtle text-brand border-brand/30'
                    : 'bg-surface-2 text-muted border-border'
                }`}
              >
                {tier.status}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
