'use client';

import React from 'react';
import { Tag, Tooltip } from 'antd';
import {
  CheckCircleFilled,
  InfoCircleFilled,
  WarningFilled,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { M3Level } from '@/lib/data/types';

export interface SeverityTagProps {
  severity: M3Level;
  size?: 'small' | 'middle' | 'large';
  showIcon?: boolean;
  rankingScore?: number;
  escalatedBy?: string[];
  showCaption?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SeverityTag({
  severity,
  size = 'middle',
  showIcon = true,
  rankingScore,
  escalatedBy,
  showCaption = false,
  disabled = false,
  className = '',
}: SeverityTagProps) {
  const t = useTranslations('severity');
  const tCommon = useTranslations('common');

  const config = {
    low: {
      color: 'var(--sev-low)',
      textClass: 'text-white',
      icon: <CheckCircleFilled />,
      label: t('low'),
    },
    medium: {
      color: 'var(--sev-medium)',
      textClass: 'text-ink font-semibold',
      icon: <InfoCircleFilled />,
      label: t('medium'),
    },
    high: {
      color: 'var(--sev-high)',
      textClass: 'text-white',
      icon: <WarningFilled />,
      label: t('high'),
    },
    extreme: {
      color: 'var(--sev-extreme)',
      textClass: 'text-white',
      icon: <ExclamationCircleFilled />,
      label: t('extreme'),
    },
  }[severity];

  const sizeClasses = {
    small: 'text-xs px-2 py-0.5 rounded-[4px]',
    middle: 'text-xs px-2.5 py-1 rounded-[6px] font-medium',
    large: 'text-base font-semibold px-4 py-2 rounded-[10px] h-10 inline-flex items-center gap-2',
  }[size];

  const tagContent = (
    <Tag
      style={{
        backgroundColor: disabled ? 'var(--surface-2)' : config.color,
        borderColor: disabled ? 'var(--border)' : config.color,
        color: disabled ? 'var(--muted)' : undefined,
      }}
      className={`m-0 border inline-flex items-center gap-1.5 transition-all shadow-sm ${
        disabled ? 'opacity-60 cursor-not-allowed' : config.textClass
      } ${sizeClasses} ${className}`}
    >
      {showIcon && <span className="flex items-center">{config.icon}</span>}
      <span>{config.label}</span>
      {rankingScore !== undefined && size === 'small' && (
        <span className="font-mono opacity-90 ms-1 text-[11px]">
          ({Math.round(rankingScore * 100)}%)
        </span>
      )}
    </Tag>
  );

  if (size === 'large' || showCaption || (escalatedBy && escalatedBy.length > 0)) {
    return (
      <div className="space-y-1.5 inline-block">
        <div className="flex items-center gap-2.5 flex-wrap">
          {tagContent}
          {rankingScore !== undefined && (
            <span className="font-mono text-sm font-semibold text-ink">
              Ranking score {Math.round(rankingScore * 100)}%
            </span>
          )}
        </div>

        {escalatedBy && escalatedBy.length > 0 && (
          <div className="text-xs text-sev-high font-medium flex items-center gap-1">
            <WarningFilled />
            <span>Raised one level by: {escalatedBy.join(', ')}</span>
          </div>
        )}

        {showCaption && (
          <p className="text-[11px] text-muted italic">
            {tCommon('medicalDisclaimer')}
          </p>
        )}
      </div>
    );
  }

  return (
    <Tooltip title={tCommon('medicalDisclaimer')}>
      {tagContent}
    </Tooltip>
  );
}
