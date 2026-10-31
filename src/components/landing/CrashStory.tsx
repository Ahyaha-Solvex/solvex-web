'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ArrowRight } from 'lucide-react';

const CrashScene = dynamic(() => import('./CrashScene').then((m) => m.CrashScene), { ssr: false });

const IMPACT = 0.36;       // share of the section's scroll at which the car hits the wall
const SETTLE = 0.05;       // scroll share the shake and flash take to die down
// Seconds after impact, and the scroll share at which each moment takes over.
const STEPS = [
  { key: 'detected', at: IMPACT, seconds: 0.2 },
  { key: 'alert', at: 0.52, seconds: 3 },
  { key: 'estimate', at: 0.68, seconds: 8 },
  { key: 'hospital', at: 0.84, seconds: 40 },
] as const;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function CrashStory() {
  const t = useTranslations('landing.crash');
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const progress = useRef(0);
  const [crashed, setCrashed] = useState(false);
  const [step, setStep] = useState(0);
  const [near, setNear] = useState(false);

  // The 3D scene exists only around this section, so the rest of the page stays light.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const watcher = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      rootMargin: '100% 0px',
    });
    watcher.observe(section);
    return () => watcher.disconnect();
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;

    const tick = () => {
      const section = sectionRef.current;
      if (section) {
        const travel = section.offsetHeight - window.innerHeight;
        const target = reduced ? 1 : clamp(-section.getBoundingClientRect().top / travel);
        progress.current += (target - progress.current) * 0.16;
        const p = progress.current;

        const after = clamp((p - IMPACT) / SETTLE);
        const shake = after > 0 && after < 1 ? Math.sin(after * 60) * 12 * (1 - after) : 0;
        if (stageRef.current) stageRef.current.style.transform = `translate3d(${shake}px, ${shake * 0.5}px, 0)`;
        if (flashRef.current) flashRef.current.style.opacity = String(after > 0 ? 0.55 * (1 - after) : 0);

        setCrashed(p >= IMPACT);
        let current = 0;
        STEPS.forEach((s, i) => {
          if (p >= s.at) current = i;
        });
        setStep(current);

        if (timerRef.current) {
          const a = STEPS[current];
          const b = STEPS[Math.min(current + 1, STEPS.length - 1)];
          const span = b.at - a.at || 1;
          const value = a.seconds + (b.seconds - a.seconds) * clamp((p - a.at) / span);
          timerRef.current.textContent = `+${value.toFixed(1)} s`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const moment = STEPS[step].key;
  const last = step === STEPS.length - 1;

  return (
    <section id="crash" ref={sectionRef} className="relative h-[600vh] bg-bg" dir="ltr">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div ref={stageRef} className="absolute inset-0" role="img" aria-label={t('carLabel')}>
          {near && <CrashScene progress={progress} impact={IMPACT} settle={SETTLE} />}
          <div ref={flashRef} className="absolute inset-0 pointer-events-none" style={{ background: 'var(--flag-red)', opacity: 0 }} />
        </div>

        <p
          className="absolute inset-x-0 top-[10vh] px-6 text-center font-semibold tracking-tight text-ink transition-opacity duration-300 pointer-events-none"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 3.25rem)', opacity: crashed ? 0 : 1 }}
        >
          {t('intro')}
        </p>

        {/* Toast: it carries the story after the impact */}
        <div
          className="absolute top-20 inset-x-0 mx-auto w-[min(92vw,640px)] rounded-2xl p-6 md:p-8 text-white shadow-2 transition-all duration-300"
          style={{
            background: 'var(--flag-red)',
            opacity: crashed ? 1 : 0,
            transform: crashed ? 'none' : 'translateY(-24px)',
            pointerEvents: crashed ? 'auto' : 'none',
          }}
          role="alert"
          aria-hidden={!crashed}
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-bold tracking-tight" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
              {t('toastTitle')}
            </h2>
            <span ref={timerRef} className="font-mono font-bold text-xl whitespace-nowrap" />
          </div>
          <div key={moment} className="carousel-text mt-3" dir="auto">
            <p className="text-lg md:text-xl font-semibold">{t(`${moment}.title`)}</p>
            <p className="mt-1 opacity-90">{t(`${moment}.detail`)}</p>
          </div>
          {last && (
            <div className="carousel-text mt-5 flex flex-wrap gap-3">
              {(['hospital', 'responder'] as const).map((target) => (
                <Link
                  key={target}
                  href={`/${target}`}
                  className="h-11 px-5 rounded-full bg-white text-ink text-sm font-semibold flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  <span>{t(`open.${target}`)}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs opacity-75" dir="auto">{t('note')}</p>
        </div>
      </div>
    </section>
  );
}
