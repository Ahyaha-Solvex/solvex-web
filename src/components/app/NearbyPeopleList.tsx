'use client';

import React from 'react';
import { Card, Tag, Button } from 'antd';
import {
  MedicineBoxFilled,
  SafetyCertificateFilled,
  UserOutlined,
  CheckCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { NearbyPerson } from '@/lib/data/types';
import { EmptyState } from './EmptyState';

export interface NearbyPeopleListProps {
  people?: NearbyPerson[];
  onCallHelp?: () => void;
  className?: string;
}

export function NearbyPeopleList({
  people = [],
  onCallHelp,
  className = '',
}: NearbyPeopleListProps) {
  const t = useTranslations('responder');

  const kindConfig: Record<
    NearbyPerson['kind'],
    { color: string; tagColor: string; icon: React.ReactNode; label: string }
  > = {
    helper_medic: {
      color: 'var(--sev-extreme)',
      tagColor: 'error',
      icon: <MedicineBoxFilled />,
      label: 'Médecin urgentiste',
    },
    helper_first_aider: {
      color: 'var(--sev-high)',
      tagColor: 'warning',
      icon: <SafetyCertificateFilled />,
      label: 'Secouriste breveté',
    },
    volunteer: {
      color: 'var(--brand)',
      tagColor: 'default',
      icon: <UserOutlined />,
      label: 'Citoyen volontaire',
    },
    staff: {
      color: 'var(--brand)',
      tagColor: 'processing',
      icon: <SafetyCertificateFilled />,
      label: 'Agent de service',
    },
  };

  return (
    <Card
      size="small"
      className={`bg-surface border-border shadow-1 ${className}`}
      title={
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-ink flex items-center gap-2">
            <SafetyCertificateFilled className="text-brand" />
            <span>{t('helpersTitle')}</span>
          </span>
          <span className="font-mono text-xs text-muted">
            {people.length} détectés
          </span>
        </div>
      }
      extra={
        onCallHelp && (
          <Button
            size="small"
            type="primary"
            icon={<SendOutlined />}
            onClick={onCallHelp}
            className="text-xs"
          >
            Alerter le périmètre
          </Button>
        )
      }
    >
      {people.length === 0 ? (
        <EmptyState
          title="Aucun volontaire à proximité"
          description="Diffuser un appel à solidarité pour mobiliser les secouristes locaux."
        />
      ) : (
        <div className="space-y-2.5">
          {people.map((person, idx) => {
            const conf = kindConfig[person.kind] || kindConfig.volunteer;
            const isMedic = person.kind === 'helper_medic';

            return (
              <div
                key={person.id}
                className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 text-xs ${
                  isMedic
                    ? 'bg-sev-extreme-subtle/30 border-sev-extreme/40'
                    : 'bg-surface-2 border-border'
                }`}
              >
                {/* Person details */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: conf.color }}
                    />
                    <span
                      className={`font-semibold truncate ${
                        isMedic ? 'text-sev-extreme font-bold' : 'text-ink'
                      }`}
                    >
                      {person.id.toUpperCase()} · Intervenant #{idx + 1}
                    </span>
                    <Tag
                      color={conf.tagColor}
                      className="m-0 text-[10px] px-1 py-0 flex items-center gap-1"
                    >
                      {conf.icon}
                      <span>{conf.label}</span>
                    </Tag>
                  </div>

                  <div className="flex items-center gap-3 text-muted text-[11px] ps-4">
                    <span className="font-mono tabular-nums">{person.distanceM} m</span>
                    <span className="font-mono text-[10px]">
                      GPS {person.lat.toFixed(3)}°, {person.lng.toFixed(3)}°
                    </span>
                  </div>
                </div>

                {/* Status tag */}
                <div className="shrink-0 text-end">
                  <Tag
                    color={person.accepted ? 'success' : 'default'}
                    className="m-0 text-[10px] font-medium"
                  >
                    {person.accepted ? (
                      <span className="flex items-center gap-1">
                        <CheckCircleOutlined /> Sur place
                      </span>
                    ) : (
                      'En attente'
                    )}
                  </Tag>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
