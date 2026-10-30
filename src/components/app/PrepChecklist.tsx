'use client';

import React, { useState } from 'react';
import { Card, Checkbox, Tag } from 'antd';
import { MedicineBoxOutlined } from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { PrepItem } from '@/lib/data/types';
import { EmptyState } from './EmptyState';

export interface PrepItemDisplay extends PrepItem {
  priority?: 'routine' | 'urgent' | 'immediate';
  done?: boolean;
}

export interface PrepChecklistProps {
  items?: PrepItemDisplay[];
  onChange?: (id: string, checked: boolean) => void;
  className?: string;
}

export function PrepChecklist({
  items = [],
  onChange,
  className = '',
}: PrepChecklistProps) {
  const t = useTranslations('hospital');
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    items.forEach((it) => {
      init[it.id] = it.done || false;
    });
    return init;
  });

  const handleToggle = (id: string, checked: boolean) => {
    setCheckedState((prev) => ({ ...prev, [id]: checked }));
    onChange?.(id, checked);
  };

  if (!items || items.length === 0) {
    return (
      <EmptyState
        title="No prep checklist"
        description="All standard ER emergency protocols apply."
        className={className}
      />
    );
  }

  const priorityConfig: Record<'immediate' | 'urgent' | 'routine', { color: string; label: string }> = {
    immediate: { color: 'error', label: 'Immediate' },
    urgent: { color: 'warning', label: 'Urgent' },
    routine: { color: 'default', label: 'Routine' },
  };

  const completedCount = Object.values(checkedState).filter(Boolean).length;

  return (
    <Card
      size="small"
      className={`bg-surface border-border shadow-1 ${className}`}
      title={
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-ink flex items-center gap-2">
            <MedicineBoxOutlined className="text-brand" />
            <span>{t('prepTitle')}</span>
          </span>
          <span className="font-mono text-xs text-muted">
            {completedCount} / {items.length} {t('prepared')}
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        {items.map((item) => {
          const isChecked = !!checkedState[item.id];
          const prioKey = item.priority || 'routine';
          const prio = priorityConfig[prioKey] || priorityConfig.routine;

          return (
            <div
              key={item.id}
              className={`p-2.5 rounded-lg border transition-all ${
                isChecked
                  ? 'bg-surface-2/60 border-border opacity-70'
                  : 'bg-surface border-border hover:border-border-strong'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={isChecked}
                  onChange={(e) => handleToggle(item.id, e.target.checked)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isChecked ? 'line-through text-muted' : 'text-ink'
                      }`}
                    >
                      {item.label}
                    </span>
                    <Tag
                      color={prio.color}
                      className="m-0 text-[10px] px-1 py-0 font-medium"
                    >
                      {prio.label}
                    </Tag>
                  </div>
                  <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                    {item.reason}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
