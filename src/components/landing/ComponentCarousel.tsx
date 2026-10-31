'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import sequenceData from '@/lib/sequence.json';
import type { FrameRect } from './ScrollSequence';
import {
  CAROUSEL_COMPONENTS,
  INITIAL_CENTER_INDEX,
  getFocusStyle,
  ringDistance,
} from './carousel.layout';

const ComponentViewer = dynamic(() => import('./ComponentViewer').then((m) => m.ComponentViewer), {
  ssr: false,
});

const SETTLE_MS = 650;      // the slide must end before the live model takes over
const MIN_LOADER_MS = 500;    // long enough to read, even on a cached model
const VIEWER_SCALE = 1.5;   // the live model needs room to rotate past the still's bounds
const TEXT_TOP = 0.8;       // text starts below the row, as a share of the frame height

export interface ComponentCarouselProps {
  rect: FrameRect;
  visible: boolean;
}

export function ComponentCarousel({ rect, visible }: ComponentCarouselProps) {
  const t = useTranslations('landing.carousel');
  const [active, setActive] = useState(INITIAL_CENTER_INDEX);
  const [live, setLive] = useState(false);       // the viewer is mounted for the centre item
  const [ready, setReady] = useState(false);     // the model is on screen, so the still can hide
  const [failed, setFailed] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [held, setHeld] = useState(false);
  const readyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const previous = useRef<number[]>(CAROUSEL_COMPONENTS.map((_, i) => ringDistance(i, INITIAL_CENTER_INDEX, CAROUSEL_COMPONENTS.length)));

  const count = CAROUSEL_COMPONENTS.length;
  const step = useCallback((by: number) => setActive((a) => (a + by + count) % count), [count]);

  // The model is dropped first, then the next one loads once its slide has ended.
  useEffect(() => {
    setLive(false);
    setReady(false);
    setFailed(false);
    setShowLoader(false);
    if (!visible) return;
    const mount = setTimeout(() => setLive(true), SETTLE_MS);
    const loader = setTimeout(() => setShowLoader(true), SETTLE_MS);
    return () => {
      clearTimeout(mount);
      clearTimeout(loader);
      clearTimeout(readyTimer.current);
    };
  }, [active, visible]);

  const handleReady = useCallback(() => {
    clearTimeout(readyTimer.current);
    readyTimer.current = setTimeout(() => setReady(true), MIN_LOADER_MS);
  }, []);
  const handleError = useCallback(() => setFailed(true), []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, visible]);

  const current = CAROUSEL_COMPONENTS[active];
  const stage = rect.x * 2 + rect.w;
  const pos = rect.y + rect.h * sequenceData.carousel.esp32.cy;

  return (
    <div
      className={`absolute inset-0 select-none transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      {CAROUSEL_COMPONENTS.map((comp, i) => {
        const distance = ringDistance(i, active, count);
        const wrapped = Math.abs(distance - previous.current[i]) > 1;
        previous.current[i] = distance;
        const focus = getFocusStyle(distance);
        const meta = sequenceData.carousel[comp.id];
        const width = rect.w * meta.w;
        const height = rect.h * meta.h;
        const centered = distance === 0;
        const viewerSize = Math.max(width, height) * VIEWER_SCALE;

        return (
          <div
            key={comp.id}
            className="absolute"
            style={{
              left: '50%',
              top: pos,
              width,
              height,
              zIndex: 10 - Math.abs(distance),
              opacity: focus.opacity,
              filter: focus.blur ? `blur(${focus.blur}px)` : 'none',
              transform: `translate(calc(-50% + ${focus.x * rect.w}px), -50%) scale(${focus.scale})`,
              // An item crossing the ring's seam must not slide across the stage.
              transition: wrapped
                ? 'opacity var(--dur-carousel) var(--ease-in-out)'
                : 'transform var(--dur-carousel) var(--ease-in-out), opacity var(--dur-carousel) var(--ease-in-out), filter var(--dur-carousel) var(--ease-in-out)',
            }}
          >
            <div className={`absolute inset-0 ${centered ? 'carousel-bob' : ''}`} data-held={held}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/components/${comp.id}.webp`}
                alt={t(`${comp.id}.title`)}
                draggable={false}
                className="w-full h-full object-contain transition-opacity duration-200"
                style={{ opacity: centered && ready ? 0 : 1 }}
                onClick={() => !centered && setActive(i)}
              />

              {centered && visible && live && !failed && (
                <div
                  className="absolute transition-opacity duration-200"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: viewerSize,
                    height: viewerSize,
                    translate: '-50% -50%',
                    opacity: ready ? 1 : 0,
                  }}
                >
                  <ComponentViewer
                    key={comp.id}
                    id={comp.id}
                    label={t('rotate')}
                    onReady={handleReady}
                    onError={handleError}
                    onHold={setHeld}
                  />
                </div>
              )}

              {centered && showLoader && !ready && !failed && (
                <div
                  role="status"
                  aria-label={t('loading')}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 px-4 rounded-full bg-surface border border-border shadow-1 flex items-center gap-2 text-sm font-medium text-ink whitespace-nowrap"
                >
                  <span className="w-4 h-4 rounded-full border-2 border-border-strong border-t-brand animate-spin" />
                  {t('loading')}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Fog at both ends of the row */}
      <div className="absolute inset-y-0 left-0 w-[16%] z-20 pointer-events-none bg-gradient-to-r from-bg to-transparent" />
      <div className="absolute inset-y-0 right-0 w-[16%] z-20 pointer-events-none bg-gradient-to-l from-bg to-transparent" />

      {[
        { by: -1, Icon: ChevronLeft, label: t('prev'), side: 'left-4 md:left-12' },
        { by: 1, Icon: ChevronRight, label: t('next'), side: 'right-4 md:right-12' },
      ].map(({ by, Icon, label, side }) => (
        <button
          key={by}
          type="button"
          onClick={() => step(by)}
          aria-label={label}
          tabIndex={visible ? 0 : -1}
          className={`absolute ${side} z-30 w-12 h-12 -translate-y-1/2 rounded-full bg-surface border border-border shadow-1 text-ink flex items-center justify-center hover:border-border-strong transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand`}
          style={{ top: pos }}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}

      <div
        key={current.id}
        className="carousel-text absolute inset-x-0 mx-auto px-6 text-center max-w-2xl z-30"
        style={{ top: rect.y + rect.h * TEXT_TOP, maxWidth: Math.min(640, stage) }}
      >
        <h3 className="font-semibold tracking-tight text-ink" style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)' }}>
          {t(`${current.id}.title`)}
        </h3>
        <p className="text-lg md:text-xl text-muted mt-3 leading-relaxed">{t(`${current.id}.desc`)}</p>
      </div>
    </div>
  );
}
