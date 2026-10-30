import { create } from 'zustand';
import type { BodyRegion } from '../data/types';

interface UiStoreState {
  scenarioDrawerOpen: boolean;
  hoveredRegion: BodyRegion | null;
  selectedRegion: BodyRegion | null;
  speedMultiplier: number;
  witnessesEnabled: boolean;

  setScenarioDrawerOpen: (open: boolean) => void;
  setHoveredRegion: (region: BodyRegion | null) => void;
  setSelectedRegion: (region: BodyRegion | null) => void;
  setSpeedMultiplier: (speed: number) => void;
  setWitnessesEnabled: (enabled: boolean) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  scenarioDrawerOpen: false,
  hoveredRegion: null,
  selectedRegion: null,
  speedMultiplier: 1.0,
  witnessesEnabled: true,

  setScenarioDrawerOpen: (open: boolean) => set({ scenarioDrawerOpen: open }),
  setHoveredRegion: (region: BodyRegion | null) => set({ hoveredRegion: region }),
  setSelectedRegion: (region: BodyRegion | null) => set({ selectedRegion: region }),
  setSpeedMultiplier: (speedMultiplier: number) => set({ speedMultiplier }),
  setWitnessesEnabled: (witnessesEnabled: boolean) => set({ witnessesEnabled }),
}));
