'use client';

import React from 'react';
import { EyeOutlined, AimOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';

export interface RegionLegendProps {
  className?: string;
  vertical?: boolean;
}

export function RegionLegend({ className = '', vertical = false }: RegionLegendProps) {
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
      icon: <EyeOutlined className="text-[10px]" />,
    },
    {
      level: 'likely',
      color: 'var(--reg-likely)',
      label: tReg('likely'),
      icon: <AimOutlined className="text-[10px]" />,
    },
  ];

  return (
    <div
      className={`flex ${
        vertical ? 'flex-col gap-2' : 'items-center gap-4 flex-wrap'
      } p-2 rounded-md bg-surface/85 backdrop-blur-sm border border-border text-xs ${className}`}
    >
      {items.map((it) => (
        <div key={it.level} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs flex items-center justify-center"
            style={{ backgroundColor: it.color }}
          />
          <span className="font-medium text-ink flex items-center gap-1 text-[11px]">
            {it.icon}
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}
