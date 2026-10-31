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
  'h-10 px-4 rounded-full bg-white text-ink text-sm font-semibold disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

/** The same toast as the landing crash: it stops the dispatcher until it is answered. */
export function ZoneAlert({ zone, onWarn, onAcknowledge }: ZoneAlertProps) {
  const t = useTranslations('responder.zone');
  const overdue = zone.phase === 'overdue';

  return (
    <div
      role="alert"
      className="absolute top-16 inset-x-0 z-30 mx-auto w-[min(92vw,620px)] rounded-2xl p-6 text-white shadow-2"
      style={{ background: overdue ? 'var(--flag-red)' : 'var(--sev-high)' }}
    >
      <h2 className="text-2xl font-bold tracking-tight">
        {t(overdue ? 'overdueTitle' : 'headingTitle', { driver: zone.driver })}
      </h2>
      <p className="mt-2">
        {overdue
          ? t('overdueText', { backBy: zone.backBy, lastSeen: zone.lastSeenAt ?? '--' })
          : t('headingText', { road: zone.road, backBy: zone.backBy })}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
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
      <p className="mt-3 text-xs opacity-75">{t('note')}</p>
    </div>
  );
}
