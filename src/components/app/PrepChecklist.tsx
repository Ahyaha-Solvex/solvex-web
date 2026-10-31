'use client';

import React, { useState } from 'react';
import { Card, Checkbox } from 'antd';
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

  const priorityConfig: Record<
    'immediate' | 'urgent' | 'routine',
    { bg: string; border: string; text: string; dot: string }
  > = {
    immediate: {
      bg: 'var(--sev-extreme-subtle)',
      border: 'var(--sev-extreme)',
      text: 'var(--sev-extreme)',
      dot: 'var(--sev-extreme)',
    },
    urgent: {
      bg: 'rgba(201, 86, 15, 0.12)',
      border: 'var(--sev-high)',
      text: 'var(--sev-high)',
      dot: 'var(--sev-high)',
    },
    routine: {
      bg: 'var(--surface-2)',
      border: 'var(--border)',
      text: 'var(--muted)',
      dot: 'var(--brand)',
    },
  };

  const completedCount = Object.values(checkedState).filter(Boolean).length;

  return (
    <Card
      size="small"
      className={`bg-surface border-border shadow-1 ${className}`}
      title={
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-ink flex items-center gap-2">
            <MedicineBoxOutlined className="text-brand" />
            <span>{t('prepTitle')}</span>
          </span>
          <span className="px-2 py-0.5 rounded-sm bg-brand-subtle border border-brand/25 font-mono text-xs font-semibold text-brand tabular-nums">
            {completedCount}/{items.length} {t('prepared')}
          </span>
        </div>
      }
    >
      <div className="space-y-2">
        {items.map((item) => {
          const isChecked = !!checkedState[item.id];
          const prioKey = item.priority || 'routine';
          const prio = priorityConfig[prioKey] || priorityConfig.routine;

          return (
            <label
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-md border transition-all cursor-pointer select-none ${
                isChecked
                  ? 'bg-surface-2/60 border-border opacity-65'
                  : 'bg-surface border-border hover:bg-surface-2/50 hover:border-border-strong'
              }`}
            >
              <Checkbox
                checked={isChecked}
                onChange={(e) => handleToggle(item.id, e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold leading-snug ${
                      isChecked ? 'line-through text-muted' : 'text-ink'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: prio.dot }}
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {item.reason}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </Card>
  );
}
