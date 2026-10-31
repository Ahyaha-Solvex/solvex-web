'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export interface SimBadgeProps {
  className?: string;
  forceShow?: boolean;
}

export function SimBadge({ className = '', forceShow = false }: SimBadgeProps) {
  const t = useTranslations('common');
  const isSim = (process.env.NEXT_PUBLIC_SOURCE ?? 'sim') === 'sim';

  // Per Rule 9: persistent tag while source === 'sim'
  if (!isSim && !forceShow) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface-2 border border-border-strong text-ink-2 font-mono text-[11px] font-medium tracking-tight select-none whitespace-nowrap shadow-1 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" aria-hidden="true" />
      <span>{t('simBadge')}</span>
    </span>
  );
}
