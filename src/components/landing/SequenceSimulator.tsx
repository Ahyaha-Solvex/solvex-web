'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Play, Pause, RotateCcw, Sliders } from 'lucide-react';
import sequenceData from '@/lib/sequence.json';

export interface SequenceSimulatorProps {
  currentFrame: number;
  totalFrames: number;
  onFrameChange: (frame: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  className?: string;
  isExpanded?: boolean;
}

export function SequenceSimulator({
  currentFrame,
  totalFrames,
  onFrameChange,
  isPlaying,
  onTogglePlay,
  speed,
  onSpeedChange,
  className = '',
  isExpanded = true,
}: SequenceSimulatorProps) {
  const t = useTranslations('landing.sequence');
  const [open, setOpen] = useState(isExpanded);

  const clips = sequenceData.desktop.clips || [];

  // Determine active clip (1-based frame comparison)
  const frame1Based = currentFrame + 1;
  const activeClip = clips.find(
    (c) => frame1Based >= c.startFrame && frame1Based <= c.endFrame
  ) || clips[0];

  const progressPercent = totalFrames > 1 ? ((currentFrame / (totalFrames - 1)) * 100).toFixed(1) : '0';

  const clipNames: Record<string, string> = {
    c1: 'C1: Rotate 90° Overhead',
    c2: 'C2: Turn & Tilt 3D',
    c3: 'C3: Device Opens & Modules Emerge',
    c4: 'C4: Align into Horizontal Row',
    k5_hold: 'K5: Row Carousel Handoff',
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-3xl transition-all duration-300 ${className}`}
    >
      <div className="bg-surface/95 backdrop-blur-md border border-border shadow-2 rounded-2xl p-4 text-ink flex flex-col gap-3">
        {/* Top Header / Status Row */}
        <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPlaying ? 'bg-brand' : 'bg-muted'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPlaying ? 'bg-brand' : 'bg-muted'}`} />
            </span>
            <span className="font-semibold text-xs tracking-tight uppercase text-ink">
              {t('simulatorTitle')}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 border border-border text-brand font-mono font-bold">
              {activeClip ? (clipNames[activeClip.id] || activeClip.id.toUpperCase()) : 'K1 START'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted">
              {t('frame')}: <strong className="text-ink">{currentFrame + 1}</strong> / {totalFrames} ({progressPercent}%)
            </span>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="p-1 rounded text-muted hover:text-ink hover:bg-surface-2 transition-colors focus-visible:outline-none"
              title="Toggle Controls"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {open && (
          <>
            {/* Scrubber Range Slider */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="relative w-full">
                <input
                  type="range"
                  min={0}
                  max={totalFrames - 1}
                  value={currentFrame}
                  onChange={(e) => onFrameChange(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-surface-2 border border-border rounded-lg appearance-none cursor-pointer accent-brand focus-visible:outline-none"
                />

                {/* Clip Breakpoint Markers */}
                <div className="w-full flex justify-between text-[10px] font-mono text-muted mt-1 px-1 pointer-events-none">
                  {clips.map((c) => (
                    <span key={c.id} style={{ left: `${(c.startFrame / totalFrames) * 100}%` }}>
                      {c.id.toUpperCase()}
                    </span>
                  ))}
                  <span>K5</span>
                </div>
              </div>
            </div>

            {/* Playback Controls & Clip Jump Buttons */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              {/* Play / Pause / Reset */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="h-8 px-3.5 rounded-lg bg-brand text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-brand-hover active:scale-95 transition-all shadow-sm focus-visible:outline-none"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>{t('pause')}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t('play')}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onFrameChange(0)}
                  className="h-8 px-2.5 rounded-lg bg-surface-2 border border-border text-ink hover:bg-border/40 text-xs font-medium flex items-center gap-1 transition-colors focus-visible:outline-none"
                  title="Reset to frame 0"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-muted" />
                </button>

                {/* Speed Multipliers */}
                <div className="flex items-center border border-border rounded-lg bg-surface-2 overflow-hidden text-xs font-mono">
                  {[0.5, 1, 2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSpeedChange(s)}
                      className={`px-2 py-1 transition-colors ${
                        speed === s
                          ? 'bg-brand text-white font-bold'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Stage Quick Jump Buttons */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[11px] font-mono text-muted me-1">{t('jumpTo')}:</span>
                <button
                  type="button"
                  onClick={() => onFrameChange(0)}
                  className={`px-2 py-1 rounded text-xs font-mono transition-colors border ${
                    currentFrame === 0
                      ? 'bg-brand-subtle border-brand text-brand-press font-bold'
                      : 'bg-surface border-border text-ink hover:border-border-strong'
                  }`}
                >
                  K1 START
                </button>
                {clips.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onFrameChange(c.startFrame - 1)}
                    className={`px-2 py-1 rounded text-xs font-mono transition-colors border ${
                      activeClip?.id === c.id && currentFrame !== 0
                        ? 'bg-brand-subtle border-brand text-brand-press font-bold'
                        : 'bg-surface border-border text-ink hover:border-border-strong'
                    }`}
                  >
                    {c.id.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
