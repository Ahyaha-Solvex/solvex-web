'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import sequenceData from '@/lib/sequence.json';

export interface ScrollSequenceProps {
  className?: string;
  externalFrame?: number;
  onFrameUpdate?: (frame: number, progress: number) => void;
}

export function ScrollSequence({
  className = '',
  externalFrame,
  onFrameUpdate,
}: ScrollSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  const count = isMobile ? sequenceData.mobile.count : sequenceData.desktop.count;
  const folder = isMobile ? 'mobile' : 'desktop';

  const frameUrl = useCallback(
    (index: number) => {
      const clamped = Math.max(1, Math.min(index + 1, count));
      const pad = String(clamped).padStart(4, '0');
      return `/sequence/blackbox/${folder}/f_${pad}.webp`;
    },
    [count, folder]
  );

  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const shownFrameRef = useRef<number>(-1);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Canvas drawing
  const drawFrame = useCallback(
    (frameIndex: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const idx = Math.max(0, Math.min(frameIndex, count - 1));

      // Nearest loaded fallback
      let img: HTMLImageElement | null = null;
      for (let d = 0; d < count; d++) {
        const left = imagesRef.current[idx - d];
        if (left && left.complete && left.naturalWidth) {
          img = left;
          break;
        }
        const right = imagesRef.current[idx + d];
        if (right && right.complete && right.naturalWidth) {
          img = right;
          break;
        }
      }

      if (!img) return;

      const cw = canvas.width;
      const ch = canvas.height;

      // Clear with ivory background so mix-blend-mode blends seamlessly
      ctx.fillStyle = '#FAF8F3';
      ctx.fillRect(0, 0, cw, ch);

      // Fit contain inside the upper 58% of viewport per SPEC_LANDING (leaving bottom 30% for copy)
      const targetMaxH = ch * 0.58;
      const targetMaxW = cw * 0.90;
      const scale = Math.min(targetMaxW / img.naturalWidth, targetMaxH / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;

      const x = (cw - w) / 2;
      // Center the device vertically around 38% from top of viewport
      const y = (ch * 0.38) - (h / 2);

      ctx.drawImage(img, x, y, w, h);
      shownFrameRef.current = idx;
    },
    [count]
  );

  // Preload frames in batches
  useEffect(() => {
    imagesRef.current = new Array(count).fill(null);
    shownFrameRef.current = -1;
    setLoadedCount(0);
    let cancelled = false;

    const loadSingle = async (idx: number) => {
      if (imagesRef.current[idx]) return imagesRef.current[idx];
      const img = new Image();
      img.src = frameUrl(idx);
      try {
        if (img.decode) {
          await img.decode();
        } else {
          await new Promise((res) => {
            img.onload = () => res(null);
            img.onerror = () => res(null);
          });
        }
      } catch {
        // Fallback or ignore abort
      }
      if (!cancelled) {
        imagesRef.current[idx] = img;
        setLoadedCount((c) => c + 1);
        if (shownFrameRef.current === idx || (shownFrameRef.current === -1 && idx === 0)) {
          drawFrame(idx);
        }
      }
      return img;
    };

    (async () => {
      // 1. Immediately load first frame and K5 end frames
      await loadSingle(0);
      if (cancelled) return;
      if (count > 8) {
        await loadSingle(count - 1);
      }

      // 2. Load keyframes across duration (every 25 frames)
      const keyframeIndices = [];
      for (let i = 0; i < count; i += 25) {
        keyframeIndices.push(i);
      }
      await Promise.all(keyframeIndices.map(loadSingle));
      if (cancelled) return;

      // 3. Batch load remaining frames
      for (let i = 0; i < count; i += 12) {
        if (cancelled) return;
        const batch = [];
        for (let k = 0; k < 12; k++) {
          if (i + k < count) {
            batch.push(loadSingle(i + k));
          }
        }
        await Promise.all(batch);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [count, frameUrl, drawFrame]);

  // Resize canvas according to devicePixelRatio
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    if (shownFrameRef.current >= 0) {
      drawFrame(shownFrameRef.current);
    } else {
      drawFrame(0);
    }
  }, [drawFrame]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Redraw when externalFrame changes (Simulator mode or scrub)
  useEffect(() => {
    if (externalFrame !== undefined) {
      drawFrame(externalFrame);
      if (onFrameUpdate) {
        onFrameUpdate(externalFrame, count > 1 ? externalFrame / (count - 1) : 0);
      }
    }
  }, [externalFrame, drawFrame, count, onFrameUpdate]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full mix-blend-multiply block pointer-events-none"
      />

      {/* Loading progress indicator during initial load */}
      {loadedCount < 5 && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/80 backdrop-blur-sm z-10 transition-opacity">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-border-strong border-t-brand animate-spin" />
            <span className="text-xs font-mono text-muted">
              Loading blackbox sequence ({loadedCount}/{count})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
