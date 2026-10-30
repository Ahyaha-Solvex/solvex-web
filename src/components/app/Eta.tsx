'use client';

import React, { useEffect, useState } from 'react';
import { Tag } from 'antd';
import { CarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';

export interface EtaProps {
  secondsRemaining?: number;
  targetTimestamp?: string | number;
  ambulanceId?: string;
  origin?: string;
  size?: 'small' | 'large';
  compact?: boolean;
  className?: string;
}

export function Eta({
  secondsRemaining,
  targetTimestamp,
  ambulanceId,
  origin,
  size = 'large',
  compact = false,
  className = '',
}: EtaProps) {
  const t = useTranslations('hospital');

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (secondsRemaining !== undefined) return secondsRemaining;
    if (targetTimestamp) {
      const diff = Math.max(0, Math.floor((new Date(targetTimestamp).getTime() - Date.now()) / 1000));
      return diff;
    }
    return 660; // 11 mins default seed
  });

  useEffect(() => {
    if (secondsRemaining !== undefined) {
      setTimeLeft(secondsRemaining);
      return;
    }

    if (!targetTimestamp) return;

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(targetTimestamp).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsRemaining, targetTimestamp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = timeLeft < 180 && timeLeft > 0;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 font-mono text-xs font-semibold ${className}`}>
        <ClockCircleOutlined className={isUrgent ? 'text-sev-extreme animate-pulse' : 'text-brand'} />
        <span className="tabular-nums">{formattedTime}</span>
        {ambulanceId && (
          <Tag color="blue" className="m-0 text-[10px] px-1 py-0">
            {ambulanceId}
          </Tag>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl bg-surface border border-border shadow-1 space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <ClockCircleOutlined />
          <span>{t('etaTitle')}</span>
        </span>

        {ambulanceId && (
          <Tag color="#006233" className="m-0 text-xs px-2 py-0.5 rounded font-mono">
            <CarOutlined className="me-1" />
            {ambulanceId}
          </Tag>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <div
          className={`font-mono font-bold tracking-tight tabular-nums ${
            size === 'large' ? 'text-4xl text-ink' : 'text-2xl text-ink'
          } ${isUrgent ? 'text-sev-extreme' : ''}`}
        >
          {formattedTime}
        </div>
        <span className="text-xs text-muted font-medium">min:sec</span>
      </div>

      {origin && (
        <p className="text-xs text-muted truncate border-t border-border pt-2 mt-2">
          {t('from')}: <span className="font-medium text-ink">{origin}</span>
        </p>
      )}
    </div>
  );
}
