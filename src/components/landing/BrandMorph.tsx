'use client';

import React, { useEffect, useRef } from 'react';

export function BrandMorph() {
  const floatingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const floatingEl = floatingRef.current;
    if (!floatingEl) return;

    let heroEl: HTMLElement | null = null;
    let navEl: HTMLElement | null = null;
    let heroRect = { left: 0, top: 0, width: 1, height: 1 };
    let navRect = { left: 0, top: 0, width: 1, height: 1 };
    let heroPageY = 0;
    let heroPageX = 0;
    let scaleRatio = 0.45;
    let rafId: number | null = null;

    const measure = () => {
      heroEl = document.getElementById('hero-brand-word');
      navEl = document.getElementById('nav-brand-text');
      if (!heroEl || !navEl) return;

      const hr = heroEl.getBoundingClientRect();
      const nr = navEl.getBoundingClientRect();

      heroRect = { left: hr.left, top: hr.top, width: hr.width, height: hr.height };
      navRect = { left: nr.left, top: nr.top, width: nr.width, height: nr.height };

      heroPageY = hr.top + window.scrollY;
      heroPageX = hr.left;

      if (hr.width > 0 && nr.width > 0) {
        scaleRatio = nr.width / hr.width;
      }

      // Match floating element's typography to heroEl for 1:1 subpixel fidelity
      const heroComputed = window.getComputedStyle(heroEl);
      floatingEl.style.fontSize = heroComputed.fontSize;
      floatingEl.style.lineHeight = heroComputed.lineHeight;
      floatingEl.style.letterSpacing = heroComputed.letterSpacing;
      floatingEl.style.fontFamily = heroComputed.fontFamily;
      floatingEl.style.fontWeight = heroComputed.fontWeight;
    };

    // Smooth cubic ease-in-out
    const easeInOut = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const updatePosition = () => {
      if (!heroEl || !navEl) {
        measure();
        if (!heroEl || !navEl) return;
      }

      const scrollY = window.scrollY;
      // Complete transition smoothly across the first 220px of scroll
      const scrollRange = 220;
      const rawP = Math.min(1, Math.max(0, scrollY / scrollRange));

      if (prefersReducedMotion) {
        if (scrollY > 60) {
          heroEl.style.opacity = '0';
          navEl.style.opacity = '1';
        } else {
          heroEl.style.opacity = '1';
          navEl.style.opacity = '0';
        }
        floatingEl.style.opacity = '0';
        return;
      }

      const p = easeInOut(rawP);

      if (rawP <= 0.01) {
        // Top of page: hero brand word is visible in the Ayah, navbar brand is empty, floating is hidden
        heroEl.style.opacity = '1';
        navEl.style.opacity = '0';
        floatingEl.style.opacity = '0';
      } else if (rawP >= 0.98) {
        // Scrolled down: navbar brand is visible, hero is hidden, floating is hidden
        heroEl.style.opacity = '0';
        navEl.style.opacity = '1';
        floatingEl.style.opacity = '0';
      } else {
        // Mid-scroll transition: float gracefully from hero position into navbar brand slot
        heroEl.style.opacity = '0';
        navEl.style.opacity = '0';
        floatingEl.style.opacity = '1';

        const currentHeroY = heroPageY - scrollY;
        const currentHeroX = heroPageX;

        const deltaY = (navRect.height - heroRect.height * scaleRatio) / 2;
        const targetX = navRect.left;
        const targetY = navRect.top + deltaY;

        const x = currentHeroX + (targetX - currentHeroX) * p;
        const y = currentHeroY + (targetY - currentHeroY) * p;
        const scale = 1 + (scaleRatio - 1) * p;

        floatingEl.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      }
    };

    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
    };

    const onResize = () => {
      measure();
      updatePosition();
    };

    // Measure after mount and after fonts are confirmed loaded
    const timer = setTimeout(() => {
      measure();
      updatePosition();
    }, 60);

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        measure();
        updatePosition();
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div
      ref={floatingRef}
      className="fixed pointer-events-none select-none z-50 font-arabic font-bold text-[#D21034] origin-top-left"
      style={{
        top: 0,
        left: 0,
        opacity: 0,
        willChange: 'transform, opacity',
      }}
      aria-hidden="true"
    >
      أَحْيَاهَا
    </div>
  );
}
