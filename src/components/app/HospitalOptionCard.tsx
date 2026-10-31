'use client';

import React from 'react';
import { Card, Tag, Button } from 'antd';
import {
  MedicineBoxFilled,
  StarFilled,
  CheckCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { HospitalCapacityStatus, HospitalOption } from '@/lib/data/types';

export interface HospitalOptionCardProps {
  hospital: HospitalOption;
  recommended?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}

const CAPACITY_COLOR: Record<HospitalCapacityStatus, string> = {
  optimal: 'var(--sev-low)',
  busy: 'var(--sev-medium)',
  saturated: 'var(--sev-high)',
  divert: 'var(--sev-extreme)',
};

export function HospitalOptionCard({
  hospital,
  recommended = false,
  selected = false,
  onSelect,
  className = '',
}: HospitalOptionCardProps) {
  const t = useTranslations('responder');
  const tw = useTranslations('responder.workspace');
  const isRecommended = recommended || hospital.recommended;
  const etaMinutes = Math.round(hospital.etaSeconds / 60);
  const capStatus: HospitalCapacityStatus = hospital.capacityStatus ?? 'optimal';
  const capColor = CAPACITY_COLOR[capStatus];
  const occupancyPct = hospital.occupancyPct ?? 50;

  return (
    <Card
      size="small"
      className={`border transition-all duration-fast ${
        isRecommended
          ? 'border-brand bg-brand-subtle/40 shadow-1'
          : selected
          ? 'border-brand bg-surface shadow-1'
          : 'border-border bg-surface hover:border-border-strong'
      } ${className}`}
    >
      <div className="space-y-2.5">
        {/* Header: Name + Recommendation Tag + ETA */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-ink flex items-center gap-1.5 m-0">
                <MedicineBoxFilled className="text-brand shrink-0" />
                <span className="truncate">{hospital.name}</span>
              </h4>
              {isRecommended && (
                <Tag
                  style={{
                    backgroundColor: 'var(--brand)',
                    borderColor: 'var(--brand)',
                    color: 'var(--surface)',
                  }}
                  className="m-0 text-[11px] font-semibold flex items-center gap-1"
                >
                  <StarFilled /> {t('recommended')}
                </Tag>
              )}
            </div>

            {/* Clinical Capacity Badge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-surface-2 border border-border text-[11px] font-semibold text-ink"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: capColor }}
                />
                <span>{tw(`hospitalCapacity.${capStatus}`)}</span>
              </span>
              {hospital.orAvailable !== undefined && (
                <span className="px-1.5 py-0.5 rounded-sm bg-surface-2 border border-border font-mono text-[10px] font-semibold text-ink-2">
                  {hospital.orAvailable ? tw('orReady') : tw('orBusy')}
                </span>
              )}
            </div>
          </div>

          <div className="text-end shrink-0" dir="ltr">
            <span className="font-mono text-base font-bold text-brand block tabular-nums">
              {etaMinutes} min
            </span>
            <span className="text-[11px] text-muted">ETA</span>
          </div>
        </div>

        {/* Occupancy Progress Bar & Bed Metrics */}
        <div className="p-2 rounded-md bg-surface-2/70 border border-border space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted font-medium">{tw('occupancy')}</span>
            <span className="font-mono font-bold text-ink tabular-nums" dir="ltr">
              {occupancyPct}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface border border-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-base"
              style={{
                width: `${Math.min(100, Math.max(0, occupancyPct))}%`,
                backgroundColor: capColor,
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-muted">{tw('edBeds')}</span>
              <span className="font-mono font-semibold text-ink tabular-nums" dir="ltr">
                {hospital.freeBeds}/{hospital.totalBeds ?? hospital.freeBeds + 10}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">{tw('icuBays')}</span>
              <span className="font-mono font-semibold text-ink tabular-nums" dir="ltr">
                {hospital.icuBedsFree ?? Math.max(0, Math.floor(hospital.freeBeds / 3))}
              </span>
            </div>
          </div>
        </div>

        {/* Specialties Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {hospital.specialties.map((sp) => (
            <span
              key={sp}
              className="px-2 py-0.5 rounded-sm bg-surface-2 border border-border text-ink-2 text-[11px] font-medium"
            >
              {sp}
            </span>
          ))}
        </div>

        {/* Why Reasons Chips */}
        {hospital.reasons && hospital.reasons.length > 0 && (
          <div className="p-2.5 rounded-md bg-surface border border-border space-y-1">
            {hospital.reasons.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-ink">
                <CheckCircleOutlined className="text-brand text-xs shrink-0" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <Button
          type={selected || isRecommended ? 'primary' : 'default'}
          block
          size="small"
          disabled={capStatus === 'divert' && !selected}
          icon={selected ? <CheckOutlined /> : undefined}
          onClick={() => onSelect?.(hospital.id)}
          className="text-xs font-semibold"
        >
          {selected ? tw('dispatchedToHospital') : tw('dispatchUnitToHospital')}
        </Button>
      </div>
    </Card>
  );
}
