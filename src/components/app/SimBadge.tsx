'use client';

import React from 'react';
import { Tag } from 'antd';
import { useTranslations } from 'next-intl';

export interface SimBadgeProps {
  className?: string;
  forceShow?: boolean;
}

export function SimBadge({ className, forceShow = false }: SimBadgeProps) {
  const t = useTranslations('common');
  const isSim = (process.env.NEXT_PUBLIC_SOURCE ?? 'sim') === 'sim';

  // Per Rule 9: persistent tag while source === 'sim'
  if (!isSim && !forceShow) {
    return null;
  }

  return (
    <Tag
      color="magenta"
      className={`font-mono text-[11px] font-medium tracking-tight rounded-full px-2.5 py-0.5 border-none m-0 shadow-sm ${
        className || ''
      }`}
    >
      {t('simBadge')}
    </Tag>
  );
}
