'use client';

import React from 'react';
import { Card, Button } from 'antd';
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
  const tw = useTranslations('responder.workspace');

  const kindConfig: Record<
    NearbyPerson['kind'],
    { dotColor: string; badgeBg: string; badgeBorder: string; badgeText: string; icon: React.ReactNode; label: string }
  > = {
    helper_medic: {
      dotColor: 'var(--sev-extreme)',
      badgeBg: 'var(--sev-extreme-subtle)',
      badgeBorder: 'var(--sev-extreme)',
      badgeText: 'var(--sev-extreme)',
      icon: <MedicineBoxFilled />,
      label: t('kind.helper_medic'),
    },
    helper_first_aider: {
      dotColor: 'var(--sev-high)',
      badgeBg: 'rgba(201, 86, 15, 0.12)',
      badgeBorder: 'var(--sev-high)',
      badgeText: 'var(--sev-high)',
      icon: <SafetyCertificateFilled />,
      label: t('kind.helper_first_aider'),
    },
    volunteer: {
      dotColor: 'var(--brand)',
      badgeBg: 'var(--surface)',
      badgeBorder: 'var(--border-strong)',
      badgeText: 'var(--ink-2)',
      icon: <UserOutlined />,
      label: t('kind.volunteer'),
    },
    staff: {
      dotColor: 'var(--brand)',
      badgeBg: 'var(--brand-subtle)',
      badgeBorder: 'var(--brand)',
      badgeText: 'var(--brand-press)',
      icon: <SafetyCertificateFilled />,
      label: t('kind.staff'),
    },
  };

  return (
    <Card
      size="small"
      className={`bg-surface border-border shadow-1 ${className}`}
      title={
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-ink flex items-center gap-2">
            <SafetyCertificateFilled className="text-brand" />
            <span>{t('helpersTitle')}</span>
          </span>
          <span className="font-mono text-xs text-muted tabular-nums">
            {people.length}
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
            {t('actions.callForHelp')}
          </Button>
        )
      }
    >
      {people.length === 0 ? (
        <EmptyState
          title={t('helpersTitle')}
          description={tw('noHelpers')}
        />
      ) : (
        <div className="space-y-2">
          {people.map((person, idx) => {
            const conf = kindConfig[person.kind] || kindConfig.volunteer;
            const isMedic = person.kind === 'helper_medic';

            return (
              <div
                key={person.id}
                className={`p-3 rounded-md border transition-all flex items-center justify-between gap-3 text-xs ${
                  isMedic
                    ? 'bg-sev-extreme-subtle/35 border-sev-extreme/35'
                    : 'bg-surface-2/80 border-border'
                }`}
              >
                {/* Person details */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: conf.dotColor }}
                    />
                    <span
                      className={`font-semibold truncate ${
                        isMedic ? 'text-sev-extreme font-bold' : 'text-ink'
                      }`}
                    >
                      {person.name ?? `${conf.label} #${idx + 1}`}
                    </span>
                    <span
                      style={{
                        backgroundColor: conf.badgeBg,
                        borderColor: conf.badgeBorder,
                        color: conf.badgeText,
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[10px] font-semibold"
                    >
                      {conf.icon}
                      <span>{conf.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-muted text-[11px] ps-4" dir="ltr">
                    <span className="font-mono font-semibold tabular-nums text-ink-2">
                      {person.distanceM} m
                    </span>
                    <span className="font-mono text-[10px]">
                      {person.lat.toFixed(3)}°, {person.lng.toFixed(3)}°
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <div className="shrink-0 text-end">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-[11px] font-semibold ${
                      person.accepted
                        ? 'bg-brand-subtle border-brand/30 text-brand'
                        : 'bg-surface border-border text-muted'
                    }`}
                  >
                    {person.accepted ? (
                      <>
                        <CheckCircleOutlined />
                        <span>{t('volunteerOnWay')}</span>
                      </>
                    ) : (
                      <span>{t('callVolunteer')}</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
