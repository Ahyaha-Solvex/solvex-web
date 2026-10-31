'use client';

import React from 'react';
import { EyeOutlined, AimOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';

export interface RegionLegendProps {
  className?: string;
  vertical?: boolean;
  tone?: 'light' | 'stage';
}

export function RegionLegend({
  className = '',
  vertical = false,
  tone = 'light',
}: RegionLegendProps) {
  const tReg = useTranslations('regions');

  const items = [
    {
      level: 'unlikely',
      color: 'var(--reg-unlikely)',
      label: tReg('unlikely'),
      icon: null,
    },
    {
      level: 'check',
      color: 'var(--reg-check)',
      label: tReg('check'),
      icon: <EyeOutlined className="text-[11px]" />,
    },
    {
      level: 'likely',
      color: 'var(--reg-likely)',
      label: tReg('likely'),
      icon: <AimOutlined className="text-[11px]" />,
    },
  ];

  const surfaceStyles =
    tone === 'stage'
      ? 'bg-stage-bg/90 border-white/15 text-stage-ink shadow-2'
      : 'bg-surface/95 border-border text-ink shadow-1';

  return (
    <div
      className={`flex ${
        vertical ? 'flex-col gap-2' : 'items-center gap-3.5 flex-wrap'
      } px-3 py-2 rounded-md backdrop-blur-md border text-xs ${surfaceStyles} ${className}`}
    >
      {items.map((it) => (
        <div key={it.level} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 flex items-center justify-center"
            style={{ backgroundColor: it.color }}
          />
          <span className="font-medium flex items-center gap-1 text-xs leading-none">
            {it.icon}
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}
