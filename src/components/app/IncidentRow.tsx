'use client';

import React from 'react';
import { WifiOutlined, MessageOutlined } from '@ant-design/icons';
import type { Incident } from '@/lib/data/types';
import { SeverityTag } from './SeverityTag';
import { StatusTag } from './StatusTag';

export interface IncidentRowProps {
  incident: Incident;
  selected?: boolean;
  isNew?: boolean;
  onClick?: () => void;
  className?: string;
}

export function IncidentRow({
  incident,
  selected = false,
  isNew = false,
  onClick,
  className = '',
}: IncidentRowProps) {
  const confidenceDotColors = {
    suspected: 'var(--conf-suspected)',
    likely: 'var(--conf-likely)',
    witness_confirmed: 'var(--conf-witness)',
    confirmed: 'var(--conf-confirmed)',
  }[incident.confidence.status];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  const formattedTime = new Date(incident.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const primarySeverity = incident.occupants[0]?.m3.level ?? 'high';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`relative group p-3 rounded-lg border transition-all duration-fast cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 ${
        isNew ? 'animate-pulse bg-brand-subtle' : ''
      } ${
        selected
          ? 'bg-brand-subtle border-brand shadow-sm'
          : 'bg-surface border-border hover:bg-surface-2 hover:border-border-strong'
      } ${className}`}
    >
      {/* 3px Brand Bar on Selected */}
      {selected && (
        <span
          className="absolute inset-y-1 inset-inline-start-1 w-1 bg-brand rounded-full"
          aria-hidden="true"
        />
      )}

      <div className="ps-1.5 space-y-2">
        {/* Top line: Pin dot + Road Label + Time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: confidenceDotColors }}
              title={`Confidence: ${incident.confidence.score}% (${incident.confidence.status})`}
            />
            <span className="font-semibold text-xs text-ink truncate">
              {incident.position.roadLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 text-muted">
            <span className="font-mono text-[11px] tabular-nums">
              {formattedTime}
            </span>
            <span className="text-[11px] opacity-80">
              {incident.channel === 'data' ? <WifiOutlined /> : <MessageOutlined />}
            </span>
          </div>
        </div>

        {/* Bottom line: Tags (Severity, Status) + Confidence score */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <SeverityTag severity={primarySeverity} size="small" showIcon={false} />
            <StatusTag status={incident.lifecycle} size="small" />
          </div>

          <span className="font-mono text-[11px] font-semibold text-muted shrink-0">
            C{incident.confidence.score}
          </span>
        </div>
      </div>
    </div>
  );
}
