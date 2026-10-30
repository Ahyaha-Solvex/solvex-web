'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollSequence } from './ScrollSequence';
import { ComponentCarousel } from './ComponentCarousel';
import { SequenceSimulator } from './SequenceSimulator';
import sequenceData from '@/lib/sequence.json';

export function BlackboxSection() {
  const t = useTranslations('landing.sequence');
  const sectionRef = useRef<HTMLDivElement>(null);

  const totalFrames = sequenceData.desktop.count;

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isSimulatorMode, setIsSimulatorMode] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(3); // ESP32 center

  // Check URL query for ?debug=1 or ?simulator=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('debug') === '1' || params.get('simulator') === '1') {
        setIsSimulatorMode(true);
      }
    }
  }, []);

  // Frame progress: 0 to 1
  const progress = totalFrames > 1 ? currentFrame / (totalFrames - 1) : 0;

  // Autoplay ticker when isPlaying is true
  useEffect(() => {
    if (!isPlaying) return;
    const baseFps = 10;
    const intervalMs = 1000 / (baseFps * speed);

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= totalFrames - 1) {
          setIsPlaying(false);
          return totalFrames - 1;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, speed, totalFrames]);

  // Scroll listener when NOT in manual simulator mode
  useEffect(() => {
    if (isSimulatorMode) return;

    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const scrollHeight = section.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;

      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / scrollHeight));
      const targetFrame = Math.round(p * (totalFrames - 1));
      setCurrentFrame(targetFrame);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isSimulatorMode, totalFrames]);

  // Handoff to carousel in Phase B / C (frames 320 to 338 or progress > 0.95)
  const isCarouselActive = currentFrame >= totalFrames - 10;
  const carouselOpacity = Math.max(0, Math.min(1, (currentFrame - (totalFrames - 16)) / 6));

  const textOpacity = Math.max(0, 1 - progress / 0.15);

  const handleFrameChange = (frame: number) => {
    setCurrentFrame(frame);
    setIsSimulatorMode(true);
  };

  const togglePlay = () => {
    setIsSimulatorMode(true);
    setIsPlaying((p) => !p);
  };

  return (
    <section
      id="sequence"
      ref={sectionRef}
      className={`relative w-full ${isSimulatorMode ? 'h-screen' : 'h-[450vh]'} bg-bg`}
    >
      {/* Sticky Viewport Stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between">
        {/* Upper Stage: Blackbox 2D Canvas */}
        <div className="relative w-full h-full flex items-center justify-center">
          {/* ScrollSequence Canvas */}
          <div
            className="absolute inset-0 w-full h-full transition-opacity duration-300"
            style={{ opacity: isCarouselActive ? 1 - carouselOpacity : 1 }}
          >
            <ScrollSequence
              externalFrame={currentFrame}
              onFrameUpdate={(f) => setCurrentFrame(f)}
            />
          </div>

          {/* Interactive Component Carousel (Handoff overlay) */}
          <div
            className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-500 ${
              isCarouselActive ? 'pointer-events-auto' : 'pointer-events-none opacity-0'
            }`}
            style={{ opacity: isCarouselActive ? carouselOpacity : 0 }}
          >
            <div className="w-full max-w-6xl mx-auto pt-4 md:pt-8">
              <ComponentCarousel
                activeIndex={carouselIndex}
                onSelectComponent={setCarouselIndex}
              />
            </div>
          </div>

          {/* Intro Text Overlay (fades out in first 15% of scroll) */}
          <div
            className="absolute bottom-24 inset-x-0 mx-auto text-center px-4 max-w-xl transition-opacity duration-300 pointer-events-none"
            style={{ opacity: textOpacity }}
          >
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-ink mb-2">
              {t('title')}
            </h2>
            <p className="text-base md:text-xl text-muted font-normal">
              {t('lead')}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-muted uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              <span>{t('scrollHint')}</span>
            </div>
          </div>
        </div>

        {/* Floating Simulator HUD - Only active with ?debug=1 or ?simulator=1 */}
        {isSimulatorMode && (
          <SequenceSimulator
            currentFrame={currentFrame}
            totalFrames={totalFrames}
            onFrameChange={handleFrameChange}
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            speed={speed}
            onSpeedChange={setSpeed}
          />
        )}
      </div>
    </section>
  );
}
