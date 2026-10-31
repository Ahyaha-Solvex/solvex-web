'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { IncidentSource } from '@/lib/data/source';
import { simSource } from '@/lib/data/sim/scenario';
import { liveSource } from '@/lib/data/live/LiveSource';
import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useReplayStore } from '@/lib/stores/replayStore';
import { useUiStore } from '@/lib/stores/uiStore';
import { ScenarioPanel } from '@/components/app/ScenarioPanel';

declare global {
  interface Window {
    __SOLVEX_SIM__?: {
      source: IncidentSource;
      incidentStore: typeof useIncidentStore;
      replayStore: typeof useReplayStore;
      uiStore: typeof useUiStore;
    };
  }
}

const SourceContext = createContext<IncidentSource | null>(null);

export function useIncidentSource(): IncidentSource {
  const ctx = useContext(SourceContext);
  if (!ctx) {
    throw new Error('useIncidentSource must be used within a SourceProvider');
  }
  return ctx;
}

export function SourceProvider({ children }: { children: React.ReactNode }) {
  const [source] = useState<IncidentSource>(() =>
    process.env.NEXT_PUBLIC_SOURCE === 'sim' ? simSource : liveSource
  );

  useEffect(() => {
    const applyEvent = useIncidentStore.getState().applyEvent;
    const unsubscribe = source.subscribe(applyEvent);
    source.start();

    if (typeof window !== 'undefined') {
      window.__SOLVEX_SIM__ = {
        source,
        incidentStore: useIncidentStore,
        replayStore: useReplayStore,
        uiStore: useUiStore,
      };
    }

    return () => {
      unsubscribe();
      source.stop();
    };
  }, [source]);

  return (
    <SourceContext.Provider value={source}>
      {children}
      <ScenarioPanel />
    </SourceContext.Provider>
  );
}
