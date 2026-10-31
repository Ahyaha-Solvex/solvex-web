'use client';

import React from 'react';
import { AimOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { BodyRegion, M4Level } from '@/lib/data/types';

export interface RegionRowProps {
  region: BodyRegion;
  level: M4Level;
  probability: number;
  selected?: boolean;
  hovered?: boolean;
  onSelect?: (region: BodyRegion) => void;
  onHover?: (region: BodyRegion | null) => void;
  className?: string;
}

export function RegionRow({
  region,
  level,
  probability,
  selected = false,
  hovered = false,
  onSelect,
  onHover,
  className = '',
}: RegionRowProps) {
  const tReg = useTranslations('regions');

  const levelConfig = {
    unlikely: {
      dotColor: 'var(--reg-unlikely)',
      badgeBg: 'var(--surface-2)',
      badgeBorder: 'var(--border)',
      badgeText: 'var(--muted)',
      tagText: tReg('unlikely'),
      icon: null,
    },
    check: {
      dotColor: 'var(--reg-check)',
      badgeBg: 'rgba(224, 161, 0, 0.14)',
      badgeBorder: 'var(--reg-check)',
      badgeText: 'var(--ink)',
      tagText: tReg('check'),
      icon: <EyeOutlined className="text-[11px]" />,
    },
    likely: {
      dotColor: 'var(--reg-likely)',
      badgeBg: 'var(--sev-extreme-subtle)',
      badgeBorder: 'var(--reg-likely)',
      badgeText: 'var(--reg-likely)',
      tagText: tReg('likely'),
      icon: <AimOutlined className="text-[11px]" />,
    },
  }[level];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(region);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${tReg(region)}: ${levelConfig.tagText}, ${Math.round(probability * 100)}%`}
      onClick={() => onSelect?.(region)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onHover?.(region)}
      onMouseLeave={() => onHover?.(null)}
      className={`relative group flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border transition-all duration-fast cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 ${
        selected
          ? 'bg-brand-subtle border-brand shadow-1 ps-4'
          : hovered
          ? 'bg-surface-2 border-border-strong'
          : 'bg-surface border-border hover:bg-surface-2 hover:border-border-strong'
      } ${className}`}
    >
      {selected && (
        <span
          className="absolute inset-y-1.5 start-1 w-1 rounded-full bg-brand"
          aria-hidden="true"
        />
      )}

      {/* Region Name with colored indicator & probability bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: levelConfig.dotColor }}
          />
          <span className="text-xs font-semibold text-ink truncate">
            {tReg(region)}
          </span>
        </div>
        <div className="mt-1.5 ms-4.5 h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-base"
            style={{
              width: `${Math.round(probability * 100)}%`,
              backgroundColor: levelConfig.dotColor,
            }}
          />
        </div>
      </div>

      {/* Level Badge & Probability */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span
          style={{
            backgroundColor: levelConfig.badgeBg,
            borderColor: levelConfig.badgeBorder,
            color: levelConfig.badgeText,
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-semibold leading-tight"
        >
          {levelConfig.icon}
          <span>{levelConfig.tagText}</span>
        </span>
        <span className="font-mono text-xs font-bold tabular-nums text-ink w-9 text-end">
          {Math.round(probability * 100)}%
        </span>
      </div>
    </div>
  );
}
