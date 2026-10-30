'use client';

import React from 'react';
import { Table, Tag, Button } from 'antd';
import { CarOutlined, CheckOutlined } from '@ant-design/icons';
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

  const statusConfig: Record<Ambulance['status'], { color: string; label: string }> = {
    available: { color: 'success', label: 'Disponible' },
    assigned: { color: 'processing', label: 'Assigné' },
    en_route: { color: 'processing', label: 'En route' },
    on_scene: { color: 'warning', label: 'Sur les lieux' },
    transporting: { color: 'purple', label: 'Évacuation' },
  };

  const columns = [
    {
      title: 'Unité PC',
      dataIndex: 'id',
      key: 'id',
      render: (id: string, record: Ambulance) => (
        <div className="space-y-0.5">
          <span className="font-mono text-xs font-bold text-ink flex items-center gap-1.5">
            <CarOutlined className="text-brand" />
            {id}
          </span>
          <span className="text-[11px] text-muted block truncate max-w-[160px]">
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
          <span className="font-mono text-xs font-semibold tabular-nums text-brand">
            {mins} min
          </span>
        );
      },
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: Ambulance['status']) => {
        const conf = statusConfig[status] || statusConfig.available;
        return (
          <Tag color={conf.color} className="m-0 text-[10px] font-medium">
            {conf.label}
          </Tag>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
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
            className="text-xs"
          >
            {isAssigned ? 'Assigné' : 'Dépêcher'}
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
