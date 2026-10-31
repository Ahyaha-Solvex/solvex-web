'use client';

import React from 'react';
import { Card, Skeleton, Button } from 'antd';
import {
  HeartFilled,
  ReloadOutlined,
  WarningFilled,
  CloseCircleFilled,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { Vitals } from '@/lib/data/types';
import { EmptyState } from './EmptyState';

export interface VitalsCardProps {
  vitals?: Vitals;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

function Sparkline({ data, color = 'var(--brand)', height = 36 }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 140;
  const padding = 4;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-[140px] overflow-visible"
      style={{ height: `${height}px` }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#spark-${color.replace(/[^a-zA-Z0-9]/g, '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VitalsCard({
  vitals,
  loading = false,
  error,
  onRetry,
  className = '',
}: VitalsCardProps) {
  const t = useTranslations('hospital');
  const tCommon = useTranslations('common');

  if (loading) {
    return (
      <Card size="small" className={`bg-surface border-border shadow-1 ${className}`}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card size="small" className={`bg-surface border-border shadow-1 ${className}`}>
        <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-sev-extreme-subtle border border-sev-extreme/30">
          <div className="flex items-center gap-2.5 min-w-0 text-sev-extreme">
            <CloseCircleFilled className="text-base shrink-0" />
            <span className="text-xs font-semibold text-ink truncate">
              {error}
            </span>
          </div>
          {onRetry && (
            <Button
              size="small"
              danger
              onClick={onRetry}
              icon={<ReloadOutlined />}
              className="shrink-0 px-3 font-semibold shadow-1"
            >
              {tCommon('retry')}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (!vitals) {
    return (
      <EmptyState
        variant="vitals"
        title={t('liveVitals')}
        description={t('noVitals')}
        className={className}
      />
    );
  }

  // Display thresholds per SPEC_HOSPITAL.md
  // HR <50 or >120, SpO2 <92, systolic <90
  const hrVal = vitals.hr ?? 75;
  const spo2Val = vitals.spo2 ?? 98;
  const sysVal = vitals.bpSys ?? 120;

  const isHrAlert = vitals.hr !== undefined && (vitals.hr < 50 || vitals.hr > 120);
  const isSpo2Alert = vitals.spo2 !== undefined && vitals.spo2 < 92;
  const isBpAlert = vitals.bpSys !== undefined && vitals.bpSys < 90;
  const hasAnyAlert = isHrAlert || isSpo2Alert || isBpAlert;

  // Use history if available, else synthetic 60-point trend
  const hrData =
    vitals.history && vitals.history.length > 1
      ? vitals.history.map((h) => h.hr ?? hrVal)
      : Array.from({ length: 60 }, (_, i) => Math.round(hrVal + Math.sin(i * 0.4) * 4));

  const spo2Data =
    vitals.history && vitals.history.length > 1
      ? vitals.history.map((h) => h.spo2 ?? spo2Val)
      : Array.from({ length: 60 }, (_, i) => Math.round(spo2Val + Math.sin(i * 0.3) * 1));

  const bpData = Array.from({ length: 60 }, (_, i) => Math.round(sysVal + Math.sin(i * 0.2) * 5));

  const sourceLabels: Record<Vitals['source'], string> = {
    watch: t('vitalsSource.watch'),
    paramedic_cuff: t('vitalsSource.paramedic_cuff'),
    manual: t('vitalsSource.manual'),
  };

  const formattedTime = new Date(vitals.updatedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const metrics = [
    {
      key: 'hr',
      label: t('hr'),
      value: vitals.hr !== undefined ? String(vitals.hr) : '--',
      unit: 'bpm',
      alert: isHrAlert,
      data: hrData,
    },
    {
      key: 'spo2',
      label: t('spo2'),
      value: vitals.spo2 !== undefined ? String(vitals.spo2) : '--',
      unit: '%',
      alert: isSpo2Alert,
      data: spo2Data,
    },
    {
      key: 'bp',
      label: t('bp'),
      value: `${vitals.bpSys ?? '--'}/${vitals.bpDia ?? '--'}`,
      unit: 'mmHg',
      alert: isBpAlert,
      data: bpData,
    },
  ];

  return (
    <Card
      size="small"
      className={`bg-surface border-border shadow-1 ${className}`}
      title={
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-ink flex items-center gap-2">
            <HeartFilled className="text-sev-extreme" />
            <span>{t('vitalsTitle')}</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-sm bg-surface-2 border border-border text-ink-2 text-[11px] font-medium">
              {sourceLabels[vitals.source] || vitals.source}
            </span>
            <span className="font-mono text-[11px] text-muted tabular-nums" dir="ltr">
              {formattedTime}
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-2.5">
        {metrics.map((m) => (
          <div
            key={m.key}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border transition-colors ${
              m.alert
                ? 'bg-sev-extreme-subtle/40 border-sev-high/40'
                : 'bg-surface-2/70 border-border'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted">{m.label}</span>
                {m.alert && (
                  <WarningFilled className="text-[11px] text-sev-high" />
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5" dir="ltr">
                <span
                  className={`font-mono text-2xl font-bold tabular-nums leading-none ${
                    m.alert ? 'text-sev-high' : 'text-ink'
                  }`}
                >
                  {m.value}
                </span>
                <span className="font-mono text-xs text-muted">{m.unit}</span>
              </div>
            </div>
            <Sparkline
              data={m.data}
              color={m.alert ? 'var(--sev-high)' : 'var(--brand)'}
            />
          </div>
        ))}

        {hasAnyAlert && (
          <p className="text-[11px] text-sev-high flex items-center gap-1.5 pt-0.5">
            <WarningFilled className="shrink-0" />
            <span>{t('displayHint')}</span>
          </p>
        )}
      </div>
    </Card>
  );
}
