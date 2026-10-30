import { create } from 'zustand';

export interface ReplayStoreState {
  currentTimeMs: number;
  durationMs: number;
  impactAtMs: number;
  isPlaying: boolean;
  speedMultiplier: number;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setTime: (timeMs: number) => void;
  setSpeedMultiplier: (multiplier: number) => void;
  goToImpact: () => void;
  step: (deltaMs: number) => void;
  reset: () => void;
}

export const useReplayStore = create<ReplayStoreState>((set) => ({
  currentTimeMs: 5000, // Start right at impact point
  durationMs: 16000,   // 16-second blackbox recording window
  impactAtMs: 5000,    // Impact occurs at t = 5.0 s
  isPlaying: false,
  speedMultiplier: 1.0,

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setTime: (timeMs: number) =>
    set((state) => ({
      currentTimeMs: Math.max(0, Math.min(timeMs, state.durationMs)),
    })),

  setSpeedMultiplier: (speedMultiplier: number) => set({ speedMultiplier }),

  goToImpact: () =>
    set((state) => ({
      currentTimeMs: state.impactAtMs,
      isPlaying: false,
    })),

  step: (deltaMs: number) =>
    set((state) => {
      if (!state.isPlaying) return state;
      const nextTime = state.currentTimeMs + deltaMs * state.speedMultiplier;
      if (nextTime >= state.durationMs) {
        return { currentTimeMs: state.durationMs, isPlaying: false };
      }
      return { currentTimeMs: nextTime };
    }),

  reset: () =>
    set((state) => ({
      currentTimeMs: state.impactAtMs,
      isPlaying: false,
      speedMultiplier: 1.0,
    })),
}));
