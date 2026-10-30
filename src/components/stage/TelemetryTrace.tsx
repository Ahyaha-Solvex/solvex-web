'use client';

import React, { useMemo } from 'react';
import { Button, Slider } from 'antd';
import {
  CaretRightOutlined,
  PauseOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';

export interface TelemetryTraceProps {
  currentTime?: number; // 0..16s
  impactTime?: number; // default 5.0s
  totalDuration?: number; // 16.0s
  samples?: number[]; // resultant g samples (e.g. 1600 samples)
  isPlaying?: boolean;
  speed?: number;
  onSeek?: (time: number) => void;
  onTogglePlay?: () => void;
  onGoToImpact?: () => void;
  onSpeedChange?: (speed: number) => void;
  className?: string;
}

export function TelemetryTrace({
  currentTime = 5.0,
  impactTime = 5.0,
  totalDuration = 16.0,
  samples,
  isPlaying = false,
  speed = 1.0,
  onSeek,
  onTogglePlay,
  onGoToImpact,
  onSpeedChange,
  className = '',
}: TelemetryTraceProps) {
  // Generate synthetic resultant g wave if not provided
  const traceData = useMemo(() => {
    if (samples && samples.length > 0) return samples;
    // 160 samples for an 80px high strip
    return Array.from({ length: 160 }, (_, i) => {
      const t = (i / 160) * totalDuration;
      // Pre-crash normal driving: 0.1 - 0.3g
      if (t < impactTime - 0.2) return 0.2 + Math.sin(i * 0.3) * 0.08;
      // Impact spike: sharp impulse peak ~28g
      if (t >= impactTime - 0.2 && t <= impactTime + 0.6) {
        const dist = Math.abs(t - impactTime);
        return Math.max(0.5, 28 * Math.exp(-dist * 12) + Math.sin(i * 2) * 3);
      }
      // Post-crash resting: 0.05g
      return 0.1 + Math.sin(i * 0.5) * 0.04;
    });
  }, [samples, totalDuration, impactTime]);

  const maxG = Math.max(...traceData, 30);
  const width = 640;
  const height = 80;

  // Compute SVG line points
  const points = traceData.map((val, idx) => {
    const x = (idx / (traceData.length - 1)) * width;
    const y = height - (val / maxG) * (height - 12) - 6;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const currentX = (currentTime / totalDuration) * width;
  const impactX = (impactTime / totalDuration) * width;

  return (
    <div
      className={`p-3 rounded-xl bg-stage-bg/95 backdrop-blur-md border border-stage-grid text-stage-ink shadow-2 space-y-2 select-none ${className}`}
    >
      {/* Top Header: Current Telemetry g readout + Playback controls */}
      <div className="flex items-center justify-between text-xs gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="small"
            type="primary"
            icon={isPlaying ? <PauseOutlined /> : <CaretRightOutlined />}
            onClick={onTogglePlay}
            className="text-xs font-mono"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>

          <Button
            size="small"
            icon={<ThunderboltFilled className="text-stage-impact" />}
            onClick={onGoToImpact}
            className="text-xs bg-surface/10 border-stage-grid text-stage-ink hover:text-white"
          >
            Go to impact (t=5s)
          </Button>

          <div className="flex items-center gap-1 font-mono text-[11px] text-stage-muted ms-2">
            <span>Speed:</span>
            {[0.25, 0.5, 1.0].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange?.(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  speed === s
                    ? 'bg-brand text-white font-bold'
                    : 'text-stage-muted hover:text-stage-ink'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono tabular-nums">
          <span className="text-stage-muted text-[11px]">Time:</span>
          <span className="text-stage-ink font-bold text-xs">{currentTime.toFixed(2)}s</span>
          <span className="text-stage-muted text-[11px]">/ {totalDuration}s</span>
        </div>
      </div>

      {/* SVG Resultant G Trace Strip */}
      <div className="relative w-full overflow-hidden rounded bg-black/40 border border-stage-grid/50 h-[80px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Subtle horizontal grid lines */}
          <line x1="0" y1="20" x2={width} y2="20" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
          <line x1="0" y1="40" x2={width} y2="40" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
          <line x1="0" y1="60" x2={width} y2="60" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />

          {/* Impact Marker Line */}
          <line
            x1={impactX}
            y1="0"
            x2={impactX}
            y2={height}
            stroke="var(--stage-impact)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Acceleration Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="var(--stage-ink)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Playhead Line */}
          <line
            x1={currentX}
            y1="0"
            x2={currentX}
            y2={height}
            stroke="var(--brand)"
            strokeWidth="2"
          />
        </svg>

        {/* Impact Marker Label */}
        <div
          className="absolute top-1 text-[9px] font-mono text-stage-impact uppercase font-bold pointer-events-none"
          style={{ insetInlineStart: `${(impactTime / totalDuration) * 100}%`, transform: 'translateX(-50%)' }}
        >
          Impact
        </div>
      </div>

      {/* Scrubber Slider */}
      <div className="px-1">
        <Slider
          min={0}
          max={totalDuration}
          step={0.05}
          value={currentTime}
          onChange={(val) => onSeek?.(val)}
          tooltip={{ formatter: (val) => `${val?.toFixed(2)}s` }}
          className="m-0"
        />
      </div>
    </div>
  );
}
