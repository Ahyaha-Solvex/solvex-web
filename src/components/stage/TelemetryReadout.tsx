'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { CrashFacts, TelemetryWindow } from '@/lib/data/types';
import { useReplayStore } from '@/lib/stores/replayStore';

export interface TelemetryReadoutProps {
  crash?: CrashFacts;
  telemetry?: TelemetryWindow;
  className?: string;
}

/**
 * Telemetry Readout Grid Overlay
 * SPEC_RESPONDER: Speed (km/h), ΔV (km/h), Impact direction (° and compass glyph),
 * Rollover (yes/no), Multiple impacts (yes/no), g peak.
 */
export function TelemetryReadout({
  crash,
  telemetry,
  className = '',
}: TelemetryReadoutProps) {
  const t = useTranslations('responder.telemetry');

  const currentTimeMs = useReplayStore((s) => s.currentTimeMs);
  const impactAtMs = useReplayStore((s) => s.impactAtMs);

  // Speed at current replay frame
  const initialSpeed = crash?.speedBeforeKmh ?? 80;
  const isHardBraking = (crash?.deltaVKmh ?? 50) < 25 && (crash?.impactDirectionDeg ?? 90) === 0;
  let currentSpeed = initialSpeed;
  if (isHardBraking) {
    const brakeStartMs = impactAtMs - 2200;
    if (currentTimeMs >= impactAtMs) {
      currentSpeed = 0;
    } else if (currentTimeMs > brakeStartMs) {
      const p = Math.min(1, Math.max(0, (currentTimeMs - brakeStartMs) / 2200));
      currentSpeed = Math.round(initialSpeed * (1 - p));
    }
  } else if (currentTimeMs >= impactAtMs) {
    // Decelerating to 0 after impact
    const postImpactProgress = Math.min((currentTimeMs - impactAtMs) / 1500, 1.0);
    currentSpeed = Math.round(initialSpeed * (1 - postImpactProgress));
  }

  // Calculate Peak g from telemetry accel stream
  const peakG = React.useMemo(() => {
    if (!telemetry?.accel || telemetry.accel.length === 0) {
      // Approximate from deltaV if raw stream is absent
      return crash?.deltaVKmh ? (crash.deltaVKmh / 4.2).toFixed(1) : '12.4';
    }
    let maxG = 0;
    for (const [x, y, z] of telemetry.accel) {
      const mag = Math.sqrt(x * x + y * y + z * z);
      if (mag > maxG) maxG = mag;
    }
    return maxG.toFixed(1);
  }, [telemetry, crash]);

  const deltaV = crash?.deltaVKmh ?? 48;
  const directionDeg = crash?.impactDirectionDeg ?? 90;
  const rollover = crash?.rollover ?? false;
  const multipleImpacts = crash?.multipleImpacts ?? false;

  return (
    <div
      className={`px-3.5 py-2.5 rounded-lg bg-stage-bg/90 backdrop-blur-md border border-white/12 shadow-2 text-stage-ink select-none ${className}`}
    >
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-5 gap-y-2 text-start">
        {/* 1. Speed */}
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-stage-muted">
            {t('speed')}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5" dir="ltr">
            <span className="font-mono text-base font-bold text-stage-ink tabular-nums">
              {currentSpeed}
            </span>
            <span className="text-[10px] text-stage-muted font-mono">km/h</span>
          </div>
        </div>

        {/* 2. Delta V */}
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-stage-muted">
            {t('deltaV')}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5" dir="ltr">
            <span className="font-mono text-base font-bold text-stage-impact tabular-nums">
              {deltaV}
            </span>
            <span className="text-[10px] text-stage-muted font-mono">km/h</span>
          </div>
        </div>

        {/* 3. Impact Direction & Compass Glyph */}
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-stage-muted">
            {t('direction')}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5" dir="ltr">
            <span className="font-mono text-base font-bold text-stage-ink tabular-nums">
              {directionDeg}°
            </span>
            <div
              className="w-4 h-4 rounded-full border border-white/25 flex items-center justify-center transition-transform"
              style={{ transform: `rotate(${directionDeg}deg)` }}
              title={`Impact at ${directionDeg}°`}
            >
              <div className="w-0.5 h-2 bg-stage-impact rounded-full" />
            </div>
          </div>
        </div>

        {/* 4. Peak g */}
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-stage-muted">
            {t('peakG')}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5" dir="ltr">
            <span className="font-mono text-base font-bold text-stage-route tabular-nums">
              {peakG}
            </span>
            <span className="text-[10px] text-stage-muted font-mono">g</span>
          </div>
        </div>

        {/* 5. Rollover */}
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-stage-muted">
            {t('rollover')}
          </span>
          <span
            className={`font-mono text-base font-bold mt-0.5 ${
              rollover ? 'text-stage-impact' : 'text-stage-muted'
            }`}
          >
            {rollover ? t('yes') : t('no')}
          </span>
        </div>

        {/* 6. Multiple Impacts */}
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-stage-muted">
            {t('multipleImpacts')}
          </span>
          <span
            className={`font-mono text-base font-bold mt-0.5 ${
              multipleImpacts ? 'text-stage-impact' : 'text-stage-muted'
            }`}
          >
            {multipleImpacts ? t('yes') : t('no')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default TelemetryReadout;
