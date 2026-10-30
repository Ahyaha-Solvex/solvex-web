'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export function Stats() {
  const t = useTranslations('landing.numbers');

  const stats = [
    {
      score: t('detectionScore'),
      label: 'Crash detection',
      desc: t('detectionDesc'),
    },
    {
      score: t('severityScore'),
      label: 'Severity ranking',
      desc: t('severityDesc'),
    },
    {
      score: t('regionScore'),
      label: 'Injury regions',
      desc: t('regionDesc'),
    },
  ];

  return (
    <section className="py-24 px-6 md:px-12 bg-transparent">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-ink">
            {t('title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-2xl p-8 shadow-1 flex flex-col justify-between"
            >
              <div>
                <div className="text-5xl md:text-7xl font-bold tracking-tight text-ink mb-2 font-sans">
                  {stat.score}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-brand mb-4">
                  {stat.label}
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  {stat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted max-w-3xl mx-auto text-center leading-relaxed">
          {t('footnote')}
        </p>
      </div>
    </section>
  );
}
