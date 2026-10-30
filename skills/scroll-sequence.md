# Skill — scroll-driven frame sequence

Use for the landing blackbox section.

```tsx
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Props = {
  frameCount: number;
  frameUrl: (i: number) => string;   // 0-based
  scrollLength?: string;             // e.g. '+=400%'
  onProgress?: (p: number, frame: number) => void;
};

export function ScrollSequence({ frameCount, frameUrl, scrollLength = '+=400%', onProgress }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const section = sectionRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const images: (HTMLImageElement | undefined)[] = new Array(frameCount);
    let shown = -1;
    const state = { frame: 0 };

    const nearestLoaded = (i: number) => {
      for (let d = 0; d < frameCount; d++) {
        const a = images[i - d]; if (a?.complete && a.naturalWidth) return a;
        const b = images[i + d]; if (b?.complete && b.naturalWidth) return b;
      }
    };

    const draw = (i: number) => {
      const img = nearestLoaded(i);
      if (!img) return;
      const { width: cw, height: ch } = canvas;
      const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight); // cover
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      shown = i;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      draw(Math.max(shown, 0));
    };

    const load = (i: number) => new Promise<void>((res) => {
      const img = new Image();
      img.src = frameUrl(i);
      img.onload = () => { images[i] = img; res(); };
      img.onerror = () => res();
    });

    let cancelled = false;
    (async () => {
      await load(0); if (cancelled) return;
      resize();
      for (let i = 1; i < frameCount; i += 10) {
        await Promise.all(Array.from({ length: 10 }, (_, k) => i + k < frameCount ? load(i + k) : Promise.resolve()));
        if (cancelled) return;
      }
    })();

    const ctxGsap = gsap.context(() => {
      gsap.to(state, {
        frame: frameCount - 1,
        ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: scrollLength,
          pin: true, scrub: 0.5,
          onUpdate: (self) => onProgress?.(self.progress, Math.round(state.frame)),
        },
        onUpdate: () => { const f = Math.round(state.frame); if (f !== shown) draw(f); },
      });
    }, section);

    window.addEventListener('resize', resize);
    return () => { cancelled = true; window.removeEventListener('resize', resize); ctxGsap.revert(); };
  }, [frameCount, frameUrl, scrollLength, onProgress]);

  return (
    <div ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-[var(--bg)]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full mix-blend-multiply" />
    </div>
  );
}
```
Lenis + GSAP wiring (in the `(marketing)` layout client component):
```ts
const lenis = new Lenis({ lerp: 0.1 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```
Frame URL: `/sequence/blackbox/${device}/f_${String(i + 1).padStart(4, '0')}.webp`. Frame counts come from `lib/sequence.json`. Mobile: `matchMedia('(max-width: 768px)')` picks `mobile`.
The frames have a pure white background: draw the canvas with `mix-blend-mode: multiply` (Tailwind `mix-blend-multiply`) over the ivory section so white becomes the page color. The last 8 frames are the exact K5 composite; the carousel crossfades in at progress 1. Frame counts and clip boundaries come from `lib/sequence.json`.
