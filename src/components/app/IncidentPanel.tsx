'use client';

import React from 'react';
import { Card, Button, Popconfirm } from 'antd';
import {
  AlertOutlined,
  SendOutlined,
  PhoneOutlined,
  CloseCircleOutlined,
  CompassOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';
import type { Incident } from '@/lib/data/types';
import { ConfidenceLadder } from './ConfidenceLadder';
import { SeverityTag } from './SeverityTag';
import { StatusTag } from './StatusTag';

export interface IncidentPanelProps {
  incident: Incident;
  onConfirm?: () => void;
  onAssignAmbulance?: () => void;
  onCallForHelp?: () => void;
  onCloseIncident?: () => void;
  className?: string;
}

export function IncidentPanel({
  incident,
  onConfirm,
  onAssignAmbulance,
  onCallForHelp,
  onCloseIncident,
  className = '',
}: IncidentPanelProps) {
  const t = useTranslations('responder');

  const primaryOccupant = incident.occupants[0];
  const primarySeverity = primaryOccupant?.m3.level ?? 'high';
  const primaryProbability = primaryOccupant?.m3.probability ?? 0.85;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Header Card with Confidence Ladder */}
      <Card size="small" className="bg-surface border-border shadow-1">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-ink">
                {incident.position.roadLabel}
              </h3>
              <span className="font-mono text-xs text-muted">
                {incident.position.lat.toFixed(4)}°, {incident.position.lng.toFixed(4)}°
              </span>
            </div>
            <StatusTag status={incident.lifecycle} channel={incident.channel} />
          </div>

          <ConfidenceLadder
            score={incident.confidence.score}
            status={incident.confidence.status}
          />
        </div>
      </Card>

      {/* 2. Dispatcher Actions (2x2 Grid) */}
      <Card size="small" className="bg-surface border-border shadow-1">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="primary"
            disabled={incident.confidence.status === 'confirmed'}
            onClick={onConfirm}
            icon={<AlertOutlined />}
            className="w-full text-xs"
          >
            {t('actions.confirm')}
          </Button>

          <Button
            type="default"
            disabled={incident.lifecycle !== 'detected'}
            onClick={onAssignAmbulance}
            icon={<SendOutlined />}
            className="w-full text-xs"
          >
            {t('actions.assignAmbulance')}
          </Button>

          <Button
            type="default"
            onClick={onCallForHelp}
            icon={<PhoneOutlined />}
            className="w-full text-xs"
          >
            {t('actions.callForHelp')}
          </Button>

          <Popconfirm
            title="Clôturer l’intervention ?"
            description="Cette action ferme le cycle de vie de l'incident."
            onConfirm={onCloseIncident}
            okText="Clôturer"
            cancelText="Annuler"
          >
            <Button
              danger
              icon={<CloseCircleOutlined />}
              className="w-full text-xs"
            >
              {t('actions.close')}
            </Button>
          </Popconfirm>
        </div>
      </Card>

      {/* 3. Severity & Occupants */}
      <Card size="small" className="bg-surface border-border shadow-1">
        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
            {t('triage')}
          </span>
          <SeverityTag
            severity={primarySeverity}
            rankingScore={primaryProbability}
            size="large"
            showCaption
          />

          {incident.occupants && incident.occupants.length > 0 && (
            <div className="pt-2 border-t border-border space-y-1.5">
              <span className="text-xs text-muted font-medium">Occupants:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {incident.occupants.map((occ) => (
                  <div
                    key={occ.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-2 border border-border text-xs"
                  >
                    <span className="font-mono font-bold text-ink">{occ.label}</span>
                    <SeverityTag severity={occ.m3.level} size="small" showIcon={false} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 4. Crash Facts (Speed, Delta V, Direction) */}
      {incident.crash && (
        <Card size="small" className="bg-surface border-border shadow-1">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted block">
              Crash Facts (Blackbox)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-surface-2 border border-border">
                <span className="text-muted block text-[10px]">Speed before impact</span>
                <span className="font-mono text-sm font-bold text-ink">
                  {incident.crash.speedBeforeKmh} km/h
                </span>
              </div>
              <div className="p-2 rounded bg-surface-2 border border-border">
                <span className="text-muted block text-[10px]">Delta V (Severity)</span>
                <span className="font-mono text-sm font-bold text-sev-extreme">
                  ΔV {incident.crash.deltaVKmh} km/h
                </span>
              </div>
              <div className="p-2 rounded bg-surface-2 border border-border">
                <span className="text-muted block text-[10px]">Impact Direction</span>
                <span className="font-mono text-sm font-bold text-ink flex items-center gap-1">
                  <CompassOutlined /> {incident.crash.impactDirectionDeg}°
                </span>
              </div>
              <div className="p-2 rounded bg-surface-2 border border-border">
                <span className="text-muted block text-[10px]">Rollover / Multiple</span>
                <span className="font-semibold text-xs text-ink">
                  {incident.crash.rollover ? 'Rollover Yes' : 'Rollover No'} ·{' '}
                  {incident.crash.multipleImpacts ? 'Multi' : 'Single'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
