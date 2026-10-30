'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Play, Pause, RotateCcw, Zap } from 'lucide-react';
import { useReplayStore } from '@/lib/stores/replayStore';

export interface ReplayControlsProps {
  className?: string;
}

export function ReplayControls({ className = '' }: ReplayControlsProps) {
  const t = useTranslations('responder');

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
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0B1310]/85 backdrop-blur-md border border-white/10 shadow-lg text-white select-none ${className}`}
    >
      {/* 1. Play / Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white focus-visible:outline-2 focus-visible:outline-[#006233]"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-white" />
        ) : (
          <Play className="w-4 h-4 fill-white translate-x-0.5" />
        )}
      </button>

      {/* 2. Go to Impact Quick Jump */}
      <button
        type="button"
        onClick={goToImpact}
        title="Go to Impact (T=0)"
        className={`px-2 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1 transition-colors ${
          Math.abs(currentTimeMs - impactAtMs) < 100
            ? 'bg-[#FF4D5E] text-white shadow-[0_0_8px_rgba(255,77,94,0.4)]'
            : 'bg-white/5 hover:bg-white/15 text-zinc-300'
        }`}
      >
        <Zap className="w-3 h-3 fill-current" />
        <span>T=0</span>
      </button>

      {/* 3. Scrubber Slider with Impact Marker */}
      <div className="relative flex items-center w-36 sm:w-48 h-6 group">
        {/* Track Background */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/15 overflow-hidden">
          {/* Progress fill */}
          <div
            className="h-full bg-[#006233] transition-all duration-75"
            style={{ width: `${currentPercent}%` }}
          />
        </div>

        {/* Impact Marker Tick (T=0) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-full bg-[#FF4D5E] pointer-events-none z-10 shadow-[0_0_6px_#FF4D5E]"
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
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border border-black/40 shadow pointer-events-none transition-transform group-hover:scale-110"
          style={{ left: `${currentPercent}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* 4. Timestamp Readout (Mono) */}
      <div
        className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-black/40 text-emerald-400 min-w-[56px] text-center"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {formattedRelTime}
      </div>

      {/* 5. Speed Multiplier Selector (0.25x / 0.5x / 1.0x) */}
      <div className="flex items-center rounded-lg bg-black/40 p-0.5 border border-white/5 text-[11px] font-mono">
        {[0.25, 0.5, 1.0].map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={() => setSpeedMultiplier(rate)}
            className={`px-1.5 py-0.5 rounded transition-colors ${
              speedMultiplier === rate
                ? 'bg-[#006233] text-white font-bold'
                : 'text-zinc-400 hover:text-white'
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
