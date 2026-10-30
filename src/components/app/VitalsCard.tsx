'use client';

import React from 'react';
import { Card, Tag, Skeleton, Alert, Button } from 'antd';
import {
  HeartFilled,
  ReloadOutlined,
  WarningFilled,
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
        <Alert
          message={error}
          type="error"
          showIcon
          action={
            onRetry && (
              <Button size="small" danger onClick={onRetry} icon={<ReloadOutlined />}>
                Retry
              </Button>
            )
          }
        />
      </Card>
    );
  }

  if (!vitals) {
    return (
      <EmptyState
        variant="vitals"
        title="No vitals yet"
        description="Smartwatch or paramedic cuff not connected."
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

  // Use history if available, else synthetic 60-point trend
  const hrData = vitals.history && vitals.history.length > 1
    ? vitals.history.map((h) => h.hr ?? hrVal)
    : Array.from({ length: 60 }, (_, i) => Math.round(hrVal + Math.sin(i * 0.4) * 4));

  const spo2Data = vitals.history && vitals.history.length > 1
    ? vitals.history.map((h) => h.spo2 ?? spo2Val)
    : Array.from({ length: 60 }, (_, i) => Math.round(spo2Val + Math.sin(i * 0.3) * 1));

  const bpData = Array.from({ length: 60 }, (_, i) => Math.round(sysVal + Math.sin(i * 0.2) * 5));

  const sourceLabels: Record<Vitals['source'], string> = {
    watch: 'Smartwatch',
    paramedic_cuff: 'Paramedic cuff',
    manual: 'Manual input',
  };

  const formattedTime = new Date(vitals.updatedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <Card
      size="small"
      className={`bg-surface border-border shadow-1 space-y-4 ${className}`}
      title={
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-ink flex items-center gap-2">
            <HeartFilled className="text-sev-extreme" />
            <span>{t('vitalsTitle')}</span>
          </span>
          <Tag color="blue" className="m-0 text-[11px] font-mono">
            {sourceLabels[vitals.source] || vitals.source}
          </Tag>
        </div>
      }
      extra={
        <span className="text-[11px] text-muted">
          {formattedTime}
        </span>
      }
    >
      <div className="space-y-4">
        {/* Heart Rate */}
        <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-surface-2 border border-border">
          <div>
            <span className="text-xs text-muted block font-medium">Heart Rate</span>
            <div className="flex items-baseline gap-1">
              <span className={`font-mono text-2xl font-bold tabular-nums ${isHrAlert ? 'text-sev-high' : 'text-ink'}`}>
                {vitals.hr ?? '--'}
              </span>
              <span className="text-xs text-muted">bpm</span>
            </div>
            {isHrAlert && (
              <span className="text-[10px] text-sev-high flex items-center gap-0.5 font-medium">
                <WarningFilled /> display hint
              </span>
            )}
          </div>
          <Sparkline data={hrData} color={isHrAlert ? 'var(--sev-high)' : 'var(--brand)'} />
        </div>

        {/* Oxygen Saturation */}
        <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-surface-2 border border-border">
          <div>
            <span className="text-xs text-muted block font-medium">Oxygen (SpO₂)</span>
            <div className="flex items-baseline gap-1">
              <span className={`font-mono text-2xl font-bold tabular-nums ${isSpo2Alert ? 'text-sev-high' : 'text-ink'}`}>
                {vitals.spo2 !== undefined ? `${vitals.spo2}` : '--'}
              </span>
              <span className="text-xs text-muted">%</span>
            </div>
            {isSpo2Alert && (
              <span className="text-[10px] text-sev-high flex items-center gap-0.5 font-medium">
                <WarningFilled /> display hint
              </span>
            )}
          </div>
          <Sparkline data={spo2Data} color={isSpo2Alert ? 'var(--sev-high)' : 'var(--brand)'} />
        </div>

        {/* Blood Pressure */}
        <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-surface-2 border border-border">
          <div>
            <span className="text-xs text-muted block font-medium">Blood Pressure</span>
            <div className="flex items-baseline gap-1">
              <span className={`font-mono text-2xl font-bold tabular-nums ${isBpAlert ? 'text-sev-high' : 'text-ink'}`}>
                {vitals.bpSys ?? '--'}/{vitals.bpDia ?? '--'}
              </span>
              <span className="text-xs text-muted">mmHg</span>
            </div>
            {isBpAlert && (
              <span className="text-[10px] text-sev-high flex items-center gap-0.5 font-medium">
                <WarningFilled /> display hint
              </span>
            )}
          </div>
          <Sparkline data={bpData} color={isBpAlert ? 'var(--sev-high)' : 'var(--brand)'} />
        </div>
      </div>
    </Card>
  );
}
