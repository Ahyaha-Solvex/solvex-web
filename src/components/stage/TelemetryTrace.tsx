'use client';

import React, { useMemo, useRef } from 'react';
import type { TelemetryWindow } from '@/lib/data/types';
import { useReplayStore } from '@/lib/stores/replayStore';

export interface TelemetryTraceProps {
  telemetry?: TelemetryWindow;
  currentTime?: number;
  impactTime?: number;
  totalDuration?: number;
  isPlaying?: boolean;
  speed?: number;
  onSeek?: (t: number) => void;
  onTogglePlay?: () => void;
  onGoToImpact?: () => void;
  onSpeedChange?: (s: number) => void;
  className?: string;
}

/**
 * Telemetry Trace Strip (Resultant g over time, 80px high)
 * SPEC_RESPONDER: strip synced to replay clock; line --stage-ink, impact marker --stage-impact.
 */
export function TelemetryTrace({
  telemetry,
  currentTime: controlledCurrentTime,
  impactTime: controlledImpactTime,
  totalDuration: controlledTotalDuration,
  onSeek,
  className = '',
}: TelemetryTraceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const storeCurrentTimeMs = useReplayStore((s) => s.currentTimeMs);
  const storeDurationMs = useReplayStore((s) => s.durationMs);
  const storeImpactAtMs = useReplayStore((s) => s.impactAtMs);
  const setTime = useReplayStore((s) => s.setTime);

  // Reconcile props vs store (props in seconds, store in ms)
  const currentTimeMs =
    controlledCurrentTime !== undefined
      ? controlledCurrentTime * 1000
      : storeCurrentTimeMs;
  const durationMs =
    controlledTotalDuration !== undefined
      ? controlledTotalDuration * 1000
      : storeDurationMs;
  const impactAtMs =
    controlledImpactTime !== undefined
      ? controlledImpactTime * 1000
      : storeImpactAtMs;

  // Generate or sample the resultant acceleration g array across the 16s window
  const { points, maxG } = useMemo(() => {
    const totalPoints = 160; // 10 points per second for crisp SVG path
    const data: number[] = [];
    let peak = 14;

    if (telemetry?.accel && telemetry.accel.length > 0) {
      const step = Math.max(1, Math.floor(telemetry.accel.length / totalPoints));
      for (let i = 0; i < telemetry.accel.length; i += step) {
        const [x, y, z] = telemetry.accel[i];
        const mag = Math.sqrt(x * x + y * y + z * z);
        data.push(mag);
        if (mag > peak) peak = mag;
      }
    } else {
      // Realistic pre/post crash profile
      const impactIdx = Math.floor((impactAtMs / durationMs) * totalPoints);
      for (let i = 0; i < totalPoints; i++) {
        if (i < impactIdx - 3) {
          // Pre-crash normal driving vibrations (0.9 to 1.1 g)
          data.push(1.0 + Math.sin(i * 1.5) * 0.12);
        } else if (i >= impactIdx - 3 && i <= impactIdx + 4) {
          // Extreme deceleration spike at impact
          const distFromImpact = Math.abs(i - impactIdx);
          const spike = 15.2 * Math.exp(-distFromImpact * 0.7);
          data.push(spike);
        } else {
          // Post-impact settling to rest
          const decay = Math.exp(-(i - impactIdx) * 0.1);
          data.push(1.0 + decay * 2.5 * Math.sin(i * 0.8));
        }
      }
    }

    return { points: data, maxG: Math.max(peak, 16) };
  }, [telemetry, impactAtMs, durationMs]);

  // Construct SVG Polyline path
  const svgPath = useMemo(() => {
    if (points.length === 0) return '';
    const width = 400;
    const height = 60; // Leave 20px padding in 80px container
    const stepX = width / (points.length - 1);

    return points
      .map((g, idx) => {
        const x = idx * stepX;
        // Invert Y: 0g is at bottom (y = height), maxG is at top (y = 4)
        const y = height - (g / maxG) * (height - 8);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [points, maxG]);

  // Calculate cursor positions
  const currentRatio = Math.max(0, Math.min(currentTimeMs / durationMs, 1.0));
  const impactRatio = Math.max(0, Math.min(impactAtMs / durationMs, 1.0));

  // Handle click on trace to scrub
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(clickX / rect.width, 1));
    const targetMs = fraction * durationMs;
    setTime(targetMs);
    onSeek?.(targetMs / 1000);
  };

  return (
    <div
      ref={containerRef}
      dir="ltr"
      onClick={handleClick}
      className={`relative h-[80px] w-full max-w-md px-3 py-1.5 rounded-lg bg-stage-bg/90 backdrop-blur-md border border-white/12 shadow-2 cursor-pointer select-none group overflow-hidden ${className}`}
      title="Click to scrub replay time"
    >
      {/* Header labels */}
      <div className="flex items-center justify-between text-[11px] font-mono text-stage-muted px-0.5 pointer-events-none">
        <span className="font-medium">Acceleration (g)</span>
        <span className="tabular-nums">Peak {maxG.toFixed(1)}g</span>
      </div>

      {/* SVG Waveform Area */}
      <div className="relative w-full h-[52px] mt-0.5">
        <svg
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {/* Subtle grid lines */}
          <line x1="0" y1="56" x2="400" y2="56" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <line x1="0" y1="28" x2="400" y2="28" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2,2" />

          {/* Area fill under curve */}
          <path
            d={`${svgPath} L 400,60 L 0,60 Z`}
            fill="url(#traceGradient)"
            opacity={0.3}
          />

          {/* Curve stroke (--stage-ink: #E8EEEA) */}
          <path
            d={svgPath}
            fill="none"
            stroke="#E8EEEA"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <defs>
            <linearGradient id="traceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E8EEEA" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#E8EEEA" stopOpacity="0.0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Impact Marker Line (--stage-impact: #FF4D5E) */}
        <div
          className="absolute top-0 bottom-0 w-[1.5px] bg-[#FF4D5E] pointer-events-none z-10 shadow-[0_0_8px_#FF4D5E]"
          style={{ left: `${impactRatio * 100}%` }}
        >
          <span className="absolute -top-1 -translate-x-1/2 text-[9px] font-mono font-bold text-[#FF4D5E]">
            T=0
          </span>
        </div>

        {/* Current Replay Playhead Cursor */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none z-20 shadow-[0_0_6px_#ffffff]"
          style={{ left: `${currentRatio * 100}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-white -translate-x-[3px] -top-0.5 shadow" />
        </div>
      </div>
    </div>
  );
}

export default TelemetryTrace;
