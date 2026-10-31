'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollSequence, fitFrame, type FrameRect, type ScrollSequenceHandle } from './ScrollSequence';
import { ComponentCarousel } from './ComponentCarousel';
import sequenceData from '@/lib/sequence.json';

const SCREWS_SHARE = [0.1, 0.5];   // share of the frame scroll spent before and through the screws
const SEQUENCE_END = 0.92;      // share of the section's scroll spent on frames; the rest holds the carousel
const FRAME_SMOOTHING = 0.14;
const LED = { x: 0.331, y: 0.307, size: 0.034 };   // green LED on the first frame, as a share of the frame

export function BlackboxSection() {
  const t = useTranslations('landing.sequence');
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<ScrollSequenceHandle>(null);
  const [line, setLine] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [carousel, setCarousel] = useState(false);
  const [rect, setRect] = useState<FrameRect | null>(null);
  const [reduced, setReduced] = useState(false);

  const story = sequenceData.story;
  const last = sequenceData.count - 1;

  // Scroll to frame, piecewise: the frames between the 2nd and 3rd story lines are the screws.
  const paced = useCallback(
    (p: number) => {
      const stops = [
        [0, 0],
        [SCREWS_SHARE[0], story[1].frame],
        [SCREWS_SHARE[1], story[2].frame],
        [1, last],
      ];
      const i = stops.findIndex(([share], n) => n > 0 && p <= share);
      const [p0, f0] = stops[i - 1];
      const [p1, f1] = stops[i];
      return f0 + ((p - p0) / (p1 - p0)) * (f1 - f0);
    },
    [last, story]
  );

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const measure = () => {
      const stage = stageRef.current;
      if (stage) setRect(fitFrame(stage.clientWidth, stage.clientHeight));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (reduced) {
      setCarousel(true);
      return;
    }
    let raf = 0;
    let current = 0;
    let drawn = -1;

    const tick = () => {
      const section = sectionRef.current;
      if (section) {
        const travel = section.offsetHeight - window.innerHeight;
        const scrolled = -section.getBoundingClientRect().top;
        const progress = Math.max(0, Math.min(1, scrolled / travel));
        const target = paced(Math.min(1, progress / SEQUENCE_END));
        current += (target - current) * FRAME_SMOOTHING;
        if (Math.abs(target - current) < 0.02) current = target;

        const frame = Math.round(current);
        if (frame !== drawn) {
          drawn = frame;
          sequenceRef.current?.draw(frame);
          let active = 0;
          story.forEach((entry, i) => {
            if (frame >= entry.frame) active = i;
          });
          setLine(active);
          setAtStart(frame < 2);
          setCarousel(frame >= last - 1);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [last, paced, reduced, story]);

  const lineHeight = 'clamp(2.25rem, 3.6vw, 3.25rem)';

  return (
    <section id="sequence" ref={sectionRef} className={`relative w-full bg-bg ${reduced ? 'h-screen' : 'h-[1300vh]'}`}>
      <div ref={stageRef} className="sticky top-0 h-screen w-full overflow-hidden">
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: carousel ? 0 : 1 }}
        >
          <ScrollSequence ref={sequenceRef} />
        </div>

        {rect && (
          <div
            className="led-pulse absolute pointer-events-none transition-opacity"
            style={{
              left: rect.x + rect.w * LED.x,
              top: rect.y + rect.h * LED.y,
              width: rect.w * LED.size,
              height: rect.w * LED.size,
              translate: '-50% -50%',
              display: atStart ? 'block' : 'none',
            }}
          />
        )}

        {/* Story lines: the current one is lit, like lyrics */}
        <div
          className="absolute inset-x-0 bottom-[3vh] px-6 text-center pointer-events-none overflow-hidden transition-opacity duration-300"
          style={{ height: `calc(${lineHeight} * 2)`, opacity: carousel ? 0 : 1 }}
          aria-live="polite"
        >
          <div
            className="transition-transform duration-500 ease-out"
            style={{ transform: `translateY(calc(${lineHeight} * ${-line}))` }}
          >
            {story.map((entry, i) => (
              <p
                key={entry.key}
                className="font-semibold tracking-tight text-ink transition-opacity duration-500"
                style={{
                  opacity: i === line ? 1 : 0.14,
                  height: lineHeight,
                  lineHeight,
                  fontSize: 'clamp(1.25rem, 2.4vw, 2.125rem)',
                }}
              >
                {t(`story.${entry.key}`)}
              </p>
            ))}
          </div>
        </div>

        {rect && <ComponentCarousel rect={rect} visible={carousel} />}
      </div>
    </section>
  );
}
