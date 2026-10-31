'use client';

import React from 'react';
import { Table, Button } from 'antd';
import { CarOutlined, CheckOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { Ambulance } from '@/lib/data/types';

export interface AmbulanceTableProps {
  ambulances: Ambulance[];
  assignedId?: string;
  onAssign?: (id: string) => void;
  loading?: boolean;
  className?: string;
}

export function AmbulanceTable({
  ambulances,
  assignedId,
  onAssign,
  loading = false,
  className = '',
}: AmbulanceTableProps) {
  const t = useTranslations('responder');
  const tw = useTranslations('responder.workspace');
  const tStatus = useTranslations('status');

  const statusStyles: Record<
    Ambulance['status'],
    { bg: string; border: string; text: string; label: string }
  > = {
    available: {
      bg: 'var(--brand-subtle)',
      border: 'var(--brand)',
      text: 'var(--brand-press)',
      label: tStatus('detected'),
    },
    assigned: {
      bg: 'var(--brand-subtle)',
      border: 'var(--brand)',
      text: 'var(--brand)',
      label: tStatus('dispatched'),
    },
    en_route: {
      bg: 'var(--brand-subtle)',
      border: 'var(--brand)',
      text: 'var(--brand)',
      label: tStatus('dispatched'),
    },
    on_scene: {
      bg: 'rgba(217, 164, 0, 0.14)',
      border: 'var(--sev-medium)',
      text: 'var(--ink)',
      label: tStatus('on_scene'),
    },
    transporting: {
      bg: 'var(--brand)',
      border: 'var(--brand-press)',
      text: '#FFFFFF',
      label: tStatus('transporting'),
    },
  };

  const columns = [
    {
      title: tw('unit'),
      dataIndex: 'id',
      key: 'id',
      render: (id: string, record: Ambulance) => (
        <div className="space-y-0.5 py-0.5">
          <span className="font-mono text-xs font-bold text-ink flex items-center gap-1.5">
            <CarOutlined className="text-brand" />
            {id}
          </span>
          <span className="text-xs text-muted block truncate max-w-[180px]">
            {record.unit}
          </span>
        </div>
      ),
    },
    {
      title: 'ETA',
      dataIndex: 'etaSeconds',
      key: 'etaSeconds',
      render: (etaSeconds?: number) => {
        const mins = Math.round((etaSeconds || 660) / 60);
        return (
          <span
            className="font-mono text-xs font-bold tabular-nums text-brand"
            dir="ltr"
          >
            {mins} min
          </span>
        );
      },
    },
    {
      title: tw('progress'),
      dataIndex: 'status',
      key: 'status',
      render: (status: Ambulance['status']) => {
        const conf = statusStyles[status] || statusStyles.available;
        return (
          <span
            style={{
              backgroundColor: conf.bg,
              borderColor: conf.border,
              color: conf.text,
            }}
            className="inline-flex items-center px-2 py-0.5 rounded-sm border text-[11px] font-semibold"
          >
            {status === 'available' ? 'Available' : conf.label}
          </span>
        );
      },
    },
    {
      title: '',
      key: 'action',
      align: 'end' as const,
      render: (_: unknown, record: Ambulance) => {
        const isAssigned = record.id === assignedId || record.status === 'assigned';
        const isAvailable = record.status === 'available' || isAssigned;

        return (
          <Button
            size="small"
            type={isAssigned ? 'primary' : 'default'}
            disabled={!isAvailable}
            icon={isAssigned ? <CheckOutlined /> : undefined}
            onClick={() => onAssign?.(record.id)}
            className="text-xs font-semibold"
          >
            {isAssigned ? t('assignedAmbulance') : t('actions.assignAmbulance')}
          </Button>
        );
      },
    },
  ];

  return (
    <div className={`overflow-x-auto ${className}`}>
      <Table
        dataSource={ambulances}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={false}
        loading={loading}
        bordered
        className="bg-surface"
      />
    </div>
  );
}
