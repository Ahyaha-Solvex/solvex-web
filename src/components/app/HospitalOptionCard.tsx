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
import type { HospitalOption } from '@/lib/data/types';

export interface HospitalOptionCardProps {
  hospital: HospitalOption;
  recommended?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}

export function HospitalOptionCard({
  hospital,
  recommended = false,
  selected = false,
  onSelect,
  className = '',
}: HospitalOptionCardProps) {
  const t = useTranslations('responder');
  const isRecommended = recommended || hospital.recommended;
  const etaMinutes = Math.round(hospital.etaSeconds / 60);

  return (
    <Card
      size="small"
      className={`border transition-all duration-fast ${
        isRecommended
          ? 'border-brand bg-brand-subtle/30 shadow-md ring-1 ring-brand/20'
          : selected
          ? 'border-brand bg-surface shadow-sm'
          : 'border-border bg-surface hover:border-border-strong'
      } ${className}`}
    >
      <div className="space-y-3">
        {/* Header: Name + Recommendation Tag */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-sm font-bold text-ink flex items-center gap-1.5">
                <MedicineBoxFilled className="text-brand" />
                <span>{hospital.name}</span>
              </h4>
              {isRecommended && (
                <Tag color="#006233" className="m-0 text-[10px] font-bold flex items-center gap-1">
                  <StarFilled /> {t('recommended')}
                </Tag>
              )}
            </div>
            <p className="text-xs text-muted">
              {hospital.freeBeds} lits disponibles · Score IA {Math.round(hospital.score * 100)}%
            </p>
          </div>

          <div className="text-end shrink-0">
            <span className="font-mono text-base font-bold text-brand block">
              {etaMinutes} min
            </span>
            <span className="text-[10px] text-muted">ETA urgences</span>
          </div>
        </div>

        {/* Specialties Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {hospital.specialties.map((sp) => (
            <Tag key={sp} className="m-0 text-[10px] bg-surface-2 text-ink border-border">
              {sp}
            </Tag>
          ))}
        </div>

        {/* Why Reasons Chips */}
        {hospital.reasons && hospital.reasons.length > 0 && (
          <div className="p-2 rounded bg-surface border border-border space-y-1">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider block">
              Critères de sélection :
            </span>
            <div className="space-y-0.5">
              {hospital.reasons.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-ink">
                  <CheckCircleOutlined className="text-brand text-[10px] shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          type={selected || isRecommended ? 'primary' : 'default'}
          block
          icon={selected ? <CheckOutlined /> : undefined}
          onClick={() => onSelect?.(hospital.id)}
          className="text-xs font-semibold"
        >
          {selected ? 'Hôpital sélectionné' : 'Choisir cet établissement'}
        </Button>
      </div>
    </Card>
  );
}
