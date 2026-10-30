'use client';

import React from 'react';
import { Tag } from 'antd';
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
      tagColor: 'default',
      tagText: tReg('unlikely'),
      icon: null,
    },
    check: {
      dotColor: 'var(--reg-check)',
      tagColor: 'warning',
      tagText: tReg('check'),
      icon: <EyeOutlined />,
    },
    likely: {
      dotColor: 'var(--reg-likely)',
      tagColor: 'error',
      tagText: tReg('likely'),
      icon: <AimOutlined />,
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
      className={`group flex items-center justify-between p-2.5 rounded-lg border transition-all duration-fast cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 ${
        selected
          ? 'bg-brand-subtle border-brand ring-1 ring-brand/30 shadow-sm'
          : hovered
          ? 'bg-surface-2 border-border-strong'
          : 'bg-surface border-border hover:bg-surface-2 hover:border-border-strong'
      } ${className}`}
    >
      {/* Region Name with colored indicator */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
          style={{ backgroundColor: levelConfig.dotColor }}
        />
        <span className="text-xs font-semibold text-ink truncate">
          {tReg(region)}
        </span>
      </div>

      {/* Level Tag & Probability */}
      <div className="flex items-center gap-2 shrink-0">
        <Tag
          color={levelConfig.tagColor}
          className="m-0 text-[10px] px-1.5 py-0 rounded flex items-center gap-1 font-medium"
        >
          {levelConfig.icon}
          <span>{levelConfig.tagText}</span>
        </Tag>
        <span className="font-mono text-xs tabular-nums text-muted w-10 text-end">
          {Math.round(probability * 100)}%
        </span>
      </div>
    </div>
  );
}
