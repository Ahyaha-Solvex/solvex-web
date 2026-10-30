'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Radio, Brain, Navigation } from 'lucide-react';

export function Chain() {
  const t = useTranslations('landing.chain');

  const steps = [
    {
      num: '01',
      title: t('step1Title'),
      desc: t('step1Desc'),
      icon: AlertCircle,
    },
    {
      num: '02',
      title: t('step2Title'),
      desc: t('step2Desc'),
      icon: Radio,
    },
    {
      num: '03',
      title: t('step3Title'),
      desc: t('step3Desc'),
      icon: Brain,
    },
    {
      num: '04',
      title: t('step4Title'),
      desc: t('step4Desc'),
      icon: Navigation,
    },
  ];

  return (
    <section id="how" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="text-center max-w-xl mx-auto mb-16">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-ink">
          {t('title')}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="bg-surface border border-border rounded-2xl p-6 shadow-1 flex flex-col justify-between hover:border-brand/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-8">
                  <span className="text-3xl font-mono font-bold text-border-strong group-hover:text-brand transition-colors">
                    {step.num}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-ink group-hover:text-brand group-hover:bg-brand-subtle transition-all">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-ink mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {step.desc}
                </p>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden md:block w-full border-t border-dashed border-border mt-6 pt-2" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
