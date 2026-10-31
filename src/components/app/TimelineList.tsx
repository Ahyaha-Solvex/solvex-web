'use client';

import React from 'react';
import { Card, Timeline, Skeleton } from 'antd';
import {
  ThunderboltFilled,
  LineChartOutlined,
  MessageFilled,
  SendOutlined,
  EnvironmentFilled,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { TimelineEvent } from '@/lib/data/types';
import { EmptyState } from './EmptyState';

export interface TimelineListProps {
  events?: TimelineEvent[];
  loading?: boolean;
  className?: string;
}

export function TimelineList({
  events = [],
  loading = false,
  className = '',
}: TimelineListProps) {
  const t = useTranslations('responder');

  if (loading) {
    return (
      <Card size="small" className={`bg-surface border-border shadow-1 ${className}`}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <EmptyState
        title="No timeline events"
        description="Event log will populate as telemetry and messages arrive."
        className={className}
      />
    );
  }

  // Sort newest on top per SPEC_RESPONDER.md
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.t).getTime() - new Date(a.t).getTime()
  );

  const getKindIcon = (kind: TimelineEvent['kind']) => {
    switch (kind) {
      case 'detected':
        return <ThunderboltFilled className="text-sev-extreme" />;
      case 'alert_sent':
        return <LineChartOutlined className="text-brand" />;
      case 'sms_received':
        return <MessageFilled className="text-yellow-600" />;
      case 'witness_confirm':
      case 'dispatcher_confirm':
        return <CheckCircleOutlined className="text-brand" />;
      case 'ambulance_assigned':
        return <SendOutlined className="text-blue-600" />;
      case 'on_scene':
      case 'at_hospital':
        return <EnvironmentFilled className="text-brand" />;
      case 'helper_called':
      case 'volunteer_called':
      case 'contact_called':
        return <PhoneOutlined className="text-brand" />;
      case 'helper_confirmed':
      case 'triage_set':
        return <CheckCircleOutlined className="text-brand" />;
      default:
        return <ClockCircleOutlined className="text-muted" />;
    }
  };

  const timelineItems = sortedEvents.map((ev, i) => {
    const formattedTime = new Date(ev.t).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return {
      key: `${ev.t}-${i}`,
      dot: getKindIcon(ev.kind),
      children: (
        <div className="pb-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-ink">{ev.label}</span>
            <span className="font-mono text-[11px] text-muted tabular-nums">
              {formattedTime}
            </span>
          </div>
          <span className="text-[10px] text-muted font-mono uppercase tracking-wider block mt-0.5">
            {ev.kind.replace('_', ' ')}
          </span>
        </div>
      ),
    };
  });

  return (
    <Card
      size="small"
      className={`bg-surface border-border shadow-1 ${className}`}
      title={
        <span className="font-semibold text-sm text-ink flex items-center gap-2">
          <ClockCircleOutlined className="text-brand" />
          <span>{t('timelineTitle')}</span>
        </span>
      }
    >
      <div className="pt-2">
        <Timeline items={timelineItems} />
      </div>
    </Card>
  );
}
