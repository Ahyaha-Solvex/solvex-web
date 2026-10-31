'use client';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import sequenceData from '@/lib/sequence.json';

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ScrollSequenceHandle {
  draw: (frame: number) => void;
}

const NAV_HEIGHT = 64;
const FRAME_SHARE = 0.72;   // the frames take the upper part of the viewport, text goes below
const EDGE_FADE = 0.07;     // parts leaving the frame dissolve instead of being cut off
const BATCH = 12;

/** Where a frame sits inside the stage. The carousel uses the same rectangle. */
export function fitFrame(stageW: number, stageH: number): FrameRect {
  const aspect = sequenceData.aspect;
  let h = stageH * FRAME_SHARE;
  let w = h * aspect;
  if (stageW <= 768) {
    w = stageW * 1.7;
    h = w / aspect;
  }
  return { x: (stageW - w) / 2, y: NAV_HEIGHT, w, h };
}

export const ScrollSequence = forwardRef<ScrollSequenceHandle>(function ScrollSequence(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const shownRef = useRef(0);
  const count = sequenceData.count;
  const [isMobile, setIsMobile] = useState(false);

  const paint = useCallback(
    (frame: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !canvas.clientWidth) return;
      const index = Math.max(0, Math.min(frame, count - 1));

      let img: HTMLImageElement | null = null;
      for (let d = 0; d < count && !img; d++) {
        img = imagesRef.current[index - d] ?? imagesRef.current[index + d] ?? null;
      }
      if (!img) return;

      const dpr = canvas.width / canvas.clientWidth;
      const rect = fitFrame(canvas.clientWidth, canvas.clientHeight);
      const x = rect.x * dpr;
      const y = rect.y * dpr;
      const w = rect.w * dpr;
      const h = rect.h * dpr;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, x, y, w, h);

      ctx.globalCompositeOperation = 'destination-out';
      const edge = Math.min(w, h) * EDGE_FADE;
      const strips: [number, number, number, number, number, number, number, number][] = [
        [x, 0, x + edge, 0, x, y, edge, h],
        [x + w, 0, x + w - edge, 0, x + w - edge, y, edge, h],
        [0, y, 0, y + edge, x, y, w, edge],
        [0, y + h, 0, y + h - edge, x, y + h - edge, w, edge],
      ];
      for (const [x0, y0, x1, y1, rx, ry, rw, rh] of strips) {
        const fade = ctx.createLinearGradient(x0, y0, x1, y1);
        fade.addColorStop(0, 'rgba(0,0,0,1)');
        fade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fade;
        ctx.fillRect(rx, ry, rw, rh);
      }
      ctx.globalCompositeOperation = 'source-over';
      shownRef.current = index;
    },
    [count]
  );

  useImperativeHandle(ref, () => ({ draw: paint }), [paint]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const folder = isMobile ? 'mobile' : 'desktop';
    imagesRef.current = new Array(count).fill(null);

    const load = (index: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (!cancelled) {
            imagesRef.current[index] = img;
            if (index === shownRef.current) paint(index);
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = `/sequence/blackbox/${folder}/f_${String(index + 1).padStart(4, '0')}.webp`;
      });

    (async () => {
      await load(0);
      for (let i = 1; i < count && !cancelled; i += BATCH) {
        await Promise.all(
          Array.from({ length: Math.min(BATCH, count - i) }, (_, k) => load(i + k))
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [count, isMobile, paint]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      paint(shownRef.current);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [paint]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />;
});
