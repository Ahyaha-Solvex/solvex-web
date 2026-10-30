'use client';

import React from 'react';
import {
  InboxOutlined,
  UserOutlined,
  HeartOutlined,
  AlertOutlined,
  LineChartOutlined,
} from '@ant-design/icons';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'patients' | 'vitals' | 'telemetry' | 'incidents';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  const defaultIcons = {
    default: <InboxOutlined className="text-3xl text-muted" />,
    patients: <UserOutlined className="text-3xl text-muted" />,
    vitals: <HeartOutlined className="text-3xl text-muted" />,
    telemetry: <LineChartOutlined className="text-3xl text-muted" />,
    incidents: <AlertOutlined className="text-3xl text-muted" />,
  };

  const selectedIcon = icon || defaultIcons[variant];

  return (
    <div
      className={`p-8 rounded-xl border border-dashed border-border bg-surface-2/60 flex flex-col items-center justify-center text-center space-y-3 ${className}`}
    >
      <div className="p-3 rounded-full bg-surface shadow-xs text-muted flex items-center justify-center">
        {selectedIcon}
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        {description && (
          <p className="text-xs text-muted leading-relaxed">{description}</p>
        )}
      </div>

      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
