'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { IncidentSource } from '@/lib/data/source';
import { simSource } from '@/lib/data/sim/scenario';
import { useIncidentStore } from '@/lib/stores/incidentStore';
import { ScenarioPanel } from '@/components/app/ScenarioPanel';

const SourceContext = createContext<IncidentSource | null>(null);

export function useIncidentSource(): IncidentSource {
  const ctx = useContext(SourceContext);
  if (!ctx) {
    throw new Error('useIncidentSource must be used within a SourceProvider');
  }
  return ctx;
}

export function SourceProvider({ children }: { children: React.ReactNode }) {
  const [source] = useState<IncidentSource>(() => simSource);

  useEffect(() => {
    const applyEvent = useIncidentStore.getState().applyEvent;
    const unsubscribe = source.subscribe(applyEvent);
    source.start();

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
