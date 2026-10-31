'use client';

import React from 'react';

export interface StageFrameProps {
  children?: React.ReactNode;
  overlay?: React.ReactNode;
  height?: string | number;
  showGrid?: boolean;
  /** No dark stage: the model sits directly on the page. */
  bare?: boolean;
  className?: string;
}

export function StageFrame({
  children,
  overlay,
  height = '520px',
  showGrid = true,
  bare = false,
  className = '',
}: StageFrameProps) {
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{ height: heightStyle }}
    >
      {/* 1. Dark Stage Canvas with Fade Mask (Rule 140) */}
      <div
        className={`${bare ? '' : 'stage'} absolute inset-0 w-full h-full flex items-center justify-center pointer-events-auto`}
        aria-hidden="true"
      >
        {/* 48px Stage Grid for Depth (Rule 158) */}
        {showGrid && !bare && (
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: `linear-gradient(to right, var(--stage-grid) 1px, transparent 1px),
                                linear-gradient(to bottom, var(--stage-grid) 1px, transparent 1px)`,
              backgroundSize: '48px 48px',
            }}
          />
        )}

        {/* 3D Scene / Canvas Container */}
        <div className="relative z-0 w-full h-full flex items-center justify-center">
          {children}
        </div>
      </div>

      {/* 2. Unmasked Interactive Overlay Sibling (Rule 158: NEVER clipped by mask) */}
      {overlay && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {overlay}
        </div>
      )}
    </div>
  );
}
