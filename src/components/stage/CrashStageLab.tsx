'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useIncidentStore } from '@/lib/stores/incidentStore';
import { useReplayStore } from '@/lib/stores/replayStore';
import { ReplayControls } from '@/components/stage/ReplayControls';
import { TelemetryReadout } from '@/components/stage/TelemetryReadout';
import type { Incident } from '@/lib/data/types';

const CrashScene = dynamic(() => import('@/components/stage/CrashScene'), { ssr: false });

export function CrashStageLab() {
  const { incidents, activeIncidentId } = useIncidentStore();
  const incident: Incident | null = activeIncidentId ? incidents[activeIncidentId] ?? null : null;
  const [scenarioMode, setScenarioMode] = useState<'crash' | 'non_crash'>('crash');

  const setCrashScenario = () => {
    setScenarioMode('crash');
    const store = useIncidentStore.getState();
    const active = store.getActiveIncident();
    const inc = JSON.parse(JSON.stringify(active || {}));
    inc.id = 'inc-rn5-crash';
    inc.channel = 'data';
    inc.position = { roadLabel: 'RN5, km 94 · High-Speed Barrier Collision', lat: 36.32, lng: 3.88 };
    inc.m2 = { p: 0.94, level: 'extreme' };
    inc.confidence = { score: 96, status: 'confirmed' };
    inc.crash = {
      speedBeforeKmh: 84,
      deltaVKmh: 42,
      impactDirectionDeg: 90,
      rollover: true,
      airbagDeployed: true,
      beltUsed: true,
      multipleImpacts: false,
      peakG: 22.4,
    };
    store.applyEvent({ type: 'incident_upsert', incident: inc });
    store.selectIncident(inc.id);

    const replay = useReplayStore.getState();
    replay.pause();
    replay.setTime(2200);
  };

  const setNonCrashScenario = () => {
    setScenarioMode('non_crash');
    const store = useIncidentStore.getState();
    const active = store.getActiveIncident();
    const inc = JSON.parse(JSON.stringify(active || {}));
    inc.id = 'inc-rn5-noncrash';
    inc.channel = 'data';
    inc.position = { roadLabel: 'RN5, km 94 · Controlled Emergency Braking (No Collision)', lat: 36.32, lng: 3.88 };
    inc.m2 = { p: 0.38, level: 'low' };
    inc.confidence = { score: 38, status: 'suspected' };
    inc.crash = {
      speedBeforeKmh: 86,
      deltaVKmh: 12,
      impactDirectionDeg: 0,
      rollover: false,
      airbagDeployed: false,
      beltUsed: true,
      multipleImpacts: false,
      peakG: 1.3,
    };
    store.applyEvent({ type: 'incident_upsert', incident: inc });
    store.selectIncident(inc.id);

    const replay = useReplayStore.getState();
    replay.pause();
    replay.setTime(1600);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stage-bg select-none">
      {/* 1. Fullscreen 3D Scene */}
      <div className="absolute inset-0">
        <CrashScene incident={incident} active={true} />
      </div>

      {/* 2. Top Header HUD with Scenario Selector */}
      <div className="absolute top-4 inset-x-6 z-20 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 bg-stage-bg/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/12 shadow-2">
          <span className="font-bold text-sm tracking-tight text-[#E8EEEA]">3D Blackbox Simulation Stage</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30">
            {incident?.position?.roadLabel || 'Simulated Stream'}
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 bg-stage-bg/90 backdrop-blur-md p-1.5 rounded-xl border border-white/12 shadow-2">
          <button
            type="button"
            onClick={setCrashScenario}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              scenarioMode === 'crash'
                ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                : 'text-stage-ink hover:bg-white/10'
            }`}
          >
            Collision & Rollover
          </button>
          <button
            type="button"
            onClick={setNonCrashScenario}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              scenarioMode === 'non_crash'
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'text-stage-ink hover:bg-white/10'
            }`}
          >
            Emergency Braking (No Crash)
          </button>
        </div>
      </div>

      {/* 3. Bottom HUD Overlay: Telemetry Readout & Replay Controls */}
      <div className="absolute bottom-6 start-6 z-20 flex flex-col gap-2.5 items-start pointer-events-auto">
        <TelemetryReadout crash={incident?.crash} telemetry={incident?.telemetry} />
        <ReplayControls />
      </div>
    </div>
  );
}

export default CrashStageLab;
