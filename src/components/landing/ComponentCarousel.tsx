'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  CAROUSEL_COMPONENTS,
  INITIAL_CENTER_INDEX,
  getFocusStyle,
} from './carousel.layout';

export interface ComponentCarouselProps {
  className?: string;
  onSelectComponent?: (index: number) => void;
  activeIndex?: number;
}

export function ComponentCarousel({
  className = '',
  onSelectComponent,
  activeIndex: controlledIndex,
}: ComponentCarouselProps) {
  const t = useTranslations('landing.carousel');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [internalIndex, setInternalIndex] = useState(INITIAL_CENTER_INDEX);
  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  const setActiveIndex = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, CAROUSEL_COMPONENTS.length - 1));
      setInternalIndex(clamped);
      if (onSelectComponent) onSelectComponent(clamped);
    },
    [onSelectComponent]
  );

  const handlePrev = useCallback(() => {
    setActiveIndex(activeIndex - 1);
  }, [activeIndex, setActiveIndex]);

  const handleNext = useCallback(() => {
    setActiveIndex(activeIndex + 1);
  }, [activeIndex, setActiveIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        if (isRTL) handleNext();
        else handlePrev();
      } else if (e.key === 'ArrowRight') {
        if (isRTL) handlePrev();
        else handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, isRTL]);

  const activeComp = CAROUSEL_COMPONENTS[activeIndex];

  return (
    <div className={`relative w-full flex flex-col items-center justify-between select-none ${className}`}>
      {/* 7 Modules Stage Row */}
      <div className="relative w-full h-72 md:h-80 flex items-center justify-center overflow-visible">
        {CAROUSEL_COMPONENTS.map((comp, idx) => {
          const distance = idx - activeIndex;
          const style = getFocusStyle(distance);
          const isFocused = distance === 0;

          // Compute horizontal offset
          // Desktop pitch ~ 14.5vw, Mobile pitch ~ 50vw
          const offsetStyle: React.CSSProperties = {
            transform: `translateX(calc(${distance} * var(--pitch, 14.5vw))) scale(${style.scale})`,
            opacity: style.opacity,
            filter: style.blur > 0 ? `blur(${style.blur}px)` : 'none',
            zIndex: 10 - Math.abs(distance),
            transition: 'all 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          };

          return (
            <div
              key={comp.id}
              onClick={() => setActiveIndex(idx)}
              style={offsetStyle}
              className={`absolute top-1/2 -translate-y-1/2 w-32 h-32 md:w-52 md:h-52 cursor-pointer flex items-center justify-center rounded-2xl p-2 transition-shadow ${
                isFocused ? 'drop-shadow-lg' : 'hover:opacity-80'
              }`}
              role="button"
              tabIndex={0}
              aria-label={t(`${comp.id}.title`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setActiveIndex(idx);
                }
              }}
            >
              {isFocused ? (
                <video
                  src={`/components/${comp.id}.mp4`}
                  poster={`/components/${comp.id}.webp`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain mix-blend-multiply pointer-events-none"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/components/${comp.id}.webp`}
                  alt={t(`${comp.id}.title`)}
                  className="w-full h-full object-contain mix-blend-multiply pointer-events-none"
                />
              )}
            </div>
          );
        })}

        {/* Navigation Chevrons */}
        <div className="absolute inset-x-4 md:inset-x-12 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none z-20">
          <button
            type="button"
            onClick={isRTL ? handleNext : handlePrev}
            disabled={isRTL ? activeIndex === CAROUSEL_COMPONENTS.length - 1 : activeIndex === 0}
            className="w-12 h-12 rounded-full bg-surface border border-border shadow-1 text-ink flex items-center justify-center hover:border-border-strong disabled:opacity-20 disabled:cursor-not-allowed pointer-events-auto transition-all focus-visible:outline-none"
            aria-label="Previous component"
          >
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          </button>

          <button
            type="button"
            onClick={isRTL ? handlePrev : handleNext}
            disabled={isRTL ? activeIndex === 0 : activeIndex === CAROUSEL_COMPONENTS.length - 1}
            className="w-12 h-12 rounded-full bg-surface border border-border shadow-1 text-ink flex items-center justify-center hover:border-border-strong disabled:opacity-20 disabled:cursor-not-allowed pointer-events-auto transition-all focus-visible:outline-none"
            aria-label="Next component"
          >
            <ChevronRight className="w-5 h-5 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* Component Description Card & Dots */}
      <div className="w-full max-w-xl text-center px-4 mt-6 z-10">
        <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-ink transition-all">
          {t(`${activeComp.id}.title`)}
        </h3>
        <p className="text-base md:text-lg text-muted mt-2 leading-relaxed max-w-md mx-auto min-h-[3rem] transition-all">
          {t(`${activeComp.id}.desc`)}
        </p>

        {/* Counter and 7 Dots */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <span className="text-xs font-mono font-semibold text-muted tracking-widest">
            {activeIndex + 1} / {CAROUSEL_COMPONENTS.length}
          </span>
          <div className="flex items-center gap-1.5">
            {CAROUSEL_COMPONENTS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === activeIndex
                    ? 'w-6 bg-brand'
                    : 'w-2 bg-border-strong hover:bg-muted'
                }`}
                aria-label={`Go to component ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
