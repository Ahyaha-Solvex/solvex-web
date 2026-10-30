'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { ConfidenceStatus } from '@/lib/data/types';

export interface ConfidenceLadderProps {
  score: number;
  status: ConfidenceStatus;
  compact?: boolean;
  showScore?: boolean;
  className?: string;
}

const STEPS: { key: ConfidenceStatus; colorVar: string; labelKey: string }[] = [
  { key: 'suspected', colorVar: 'var(--conf-suspected)', labelKey: 'suspected' },
  { key: 'likely', colorVar: 'var(--conf-likely)', labelKey: 'likely' },
  { key: 'witness_confirmed', colorVar: 'var(--conf-witness)', labelKey: 'witness_confirmed' },
  { key: 'confirmed', colorVar: 'var(--conf-confirmed)', labelKey: 'confirmed' },
];

export function ConfidenceLadder({
  score,
  status,
  compact = false,
  showScore = true,
  className = '',
}: ConfidenceLadderProps) {
  const t = useTranslations('status');

  const statusOrder: Record<ConfidenceStatus, number> = {
    suspected: 0,
    likely: 1,
    witness_confirmed: 2,
    confirmed: 3,
  };

  const activeIndex = statusOrder[status] ?? 0;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header with status label and score */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink flex items-center gap-1.5">
          {status === 'confirmed' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sev-extreme opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sev-extreme" />
            </span>
          )}
          <span>{t(status)}</span>
        </span>

        {showScore && (
          <span className="font-mono text-xs font-bold text-ink">
            {score}%
          </span>
        )}
      </div>

      {/* 4-Segment Progress Bar */}
      <div className="flex items-center gap-1.5 w-full">
        {STEPS.map((step, idx) => {
          const isFilled = idx <= activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div
              key={step.key}
              className="flex-1 flex flex-col gap-1"
            >
              <div
                className={`h-2 rounded-sm transition-all duration-base ${
                  isFilled ? 'opacity-100' : 'bg-surface-2 border border-border opacity-40'
                } ${isCurrent ? 'ring-1 ring-offset-1 ring-border-strong' : ''}`}
                style={{
                  backgroundColor: isFilled ? step.colorVar : undefined,
                }}
              />
              {!compact && (
                <span
                  className={`text-[10px] text-center truncate ${
                    isCurrent ? 'font-bold text-ink' : 'text-muted'
                  }`}
                >
                  {t(step.labelKey)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
