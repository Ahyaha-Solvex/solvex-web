'use client';

import React, { useEffect, useRef } from 'react';
import { Play, Pause, Zap } from 'lucide-react';
import { useReplayStore } from '@/lib/stores/replayStore';

export interface ReplayControlsProps {
  className?: string;
}

export function ReplayControls({ className = '' }: ReplayControlsProps) {
  const {
    currentTimeMs,
    durationMs,
    impactAtMs,
    isPlaying,
    speedMultiplier,
    togglePlay,
    setTime,
    setSpeedMultiplier,
    goToImpact,
    step,
  } = useReplayStore();

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Playback timer loop using requestAnimationFrame
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const onFrame = (now: number) => {
      if (typeof window !== 'undefined' && (window as unknown as { __SOLVEX_MANUAL_TICK__?: boolean }).__SOLVEX_MANUAL_TICK__) {
        animationFrameRef.current = requestAnimationFrame(onFrame);
        return;
      }
      if (lastTimeRef.current !== null) {
        const deltaMs = now - lastTimeRef.current;
        step(deltaMs);
      }
      lastTimeRef.current = now;
      animationFrameRef.current = requestAnimationFrame(onFrame);
    };

    animationFrameRef.current = requestAnimationFrame(onFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, step]);

  // Relative time display to impact (e.g. -5.0s, +0.0s, +4.2s)
  const relTimeSec = (currentTimeMs - impactAtMs) / 1000;
  const formattedRelTime = `${relTimeSec >= 0 ? '+' : ''}${relTimeSec.toFixed(2)}s`;

  // Impact marker position on 0-100% scale
  const impactPercent = (impactAtMs / durationMs) * 100;
  const currentPercent = (currentTimeMs / durationMs) * 100;

  return (
    <div
      dir="ltr"
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg bg-stage-bg/90 backdrop-blur-md border border-white/12 shadow-2 text-stage-ink select-none ${className}`}
    >
      {/* 1. Play / Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-md flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-stage-ink focus-visible:outline-2 focus-visible:outline-brand"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current translate-x-0.5" />
        )}
      </button>

      {/* 2. Go to Impact Quick Jump */}
      <button
        type="button"
        onClick={goToImpact}
        title="Go to Impact (T=0)"
        className={`px-2 py-1 rounded-sm text-xs font-mono font-semibold flex items-center gap-1 transition-colors ${
          Math.abs(currentTimeMs - impactAtMs) < 100
            ? 'bg-stage-impact text-white'
            : 'bg-white/8 hover:bg-white/15 text-stage-ink'
        }`}
      >
        <Zap className="w-3 h-3 fill-current" />
        <span>T=0</span>
      </button>

      {/* 3. Scrubber Slider with Impact Marker */}
      <div className="relative flex items-center w-36 sm:w-48 h-6 group">
        {/* Track Background */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-75"
            style={{ width: `${currentPercent}%` }}
          />
        </div>

        {/* Impact Marker Tick (T=0) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-stage-impact pointer-events-none z-10"
          style={{ left: `${impactPercent}%`, transform: 'translate(-50%, -50%)' }}
          title="Impact Point"
        />

        {/* Interactive Native Range */}
        <input
          type="range"
          min={0}
          max={durationMs}
          step={50}
          value={currentTimeMs}
          onChange={(e) => setTime(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          aria-label="Replay time scrubber"
        />

        {/* Thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border border-black/40 shadow-1 pointer-events-none transition-transform group-hover:scale-110"
          style={{ left: `${currentPercent}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* 4. Timestamp Readout (Mono) */}
      <div className="font-mono text-xs font-semibold px-2 py-0.5 rounded-sm bg-black/40 text-stage-ink min-w-[58px] text-center tabular-nums">
        {formattedRelTime}
      </div>

      {/* 5. Speed Multiplier Selector (0.25x / 0.5x / 1.0x) */}
      <div className="flex items-center rounded-sm bg-black/40 p-0.5 border border-white/10 text-[11px] font-mono">
        {[0.25, 0.5, 1.0].map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={() => setSpeedMultiplier(rate)}
            className={`px-1.5 py-0.5 rounded-sm transition-colors ${
              speedMultiplier === rate
                ? 'bg-brand text-white font-bold'
                : 'text-stage-muted hover:text-stage-ink'
            }`}
          >
            {rate}×
          </button>
        ))}
      </div>
    </div>
  );
}

export default ReplayControls;
