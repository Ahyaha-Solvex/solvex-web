'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { DeadZoneWatch } from '@/lib/data/types';

export interface ZoneAlertProps {
  zone: DeadZoneWatch;
  onWarn: (message: 'dont_go' | 'no_help') => void;
  onAcknowledge: () => void;
}

const BUTTON =
  'h-9 px-4 rounded-md bg-surface text-ink text-xs font-semibold border border-white/20 shadow-1 hover:bg-surface-2 transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

/** Persistent dead-zone watch alert banner. */
export function ZoneAlert({ zone, onWarn, onAcknowledge }: ZoneAlertProps) {
  const t = useTranslations('responder.zone');
  const overdue = zone.phase === 'overdue';

  return (
    <div
      role="alert"
      className="mx-4 mt-3 rounded-lg px-5 py-4 text-white shadow-2 border border-white/15 shrink-0 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      style={{ background: overdue ? 'var(--sev-extreme)' : 'var(--sev-high)' }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-bold tracking-tight m-0 text-white">
            {t(overdue ? 'overdueTitle' : 'headingTitle', { driver: zone.driver })}
          </h2>
          <span className="px-2 py-0.5 rounded-sm bg-black/20 text-[11px] font-mono text-white/90">
            {t('note')}
          </span>
        </div>
        <p className="mt-1 text-xs text-white/90 m-0 leading-relaxed">
          {overdue
            ? t('overdueText', { backBy: zone.backBy, lastSeen: zone.lastSeenAt ?? '--' })
            : t('headingText', { road: zone.road, backBy: zone.backBy })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {!overdue && (
          <>
            <button type="button" className={BUTTON} disabled={zone.warned} onClick={() => onWarn('dont_go')}>
              {t(zone.warned ? 'warned' : 'warn')}
            </button>
            <button type="button" className={BUTTON} disabled={zone.toldNoHelp} onClick={() => onWarn('no_help')}>
              {t(zone.toldNoHelp ? 'toldNoHelp' : 'noHelp')}
            </button>
          </>
        )}
        <button type="button" className={BUTTON} onClick={onAcknowledge}>
          {t(overdue ? 'gotIt' : 'keepWatching')}
        </button>
      </div>
    </div>
  );
}
