import { describe, it, expect, beforeEach } from 'vitest';
import { useReplayStore } from '../replayStore';

describe('replayStore', () => {
  beforeEach(() => {
    useReplayStore.getState().reset();
  });

  it('initializes with default 16s window and 5s impact', () => {
    const state = useReplayStore.getState();
    expect(state.durationMs).toBe(16000);
    expect(state.impactAtMs).toBe(5000);
    expect(state.currentTimeMs).toBe(5000);
    expect(state.isPlaying).toBe(false);
    expect(state.speedMultiplier).toBe(1.0);
  });

  it('handles play, pause, and togglePlay', () => {
    const store = useReplayStore.getState();
    store.play();
    expect(useReplayStore.getState().isPlaying).toBe(true);

    store.pause();
    expect(useReplayStore.getState().isPlaying).toBe(false);

    store.togglePlay();
    expect(useReplayStore.getState().isPlaying).toBe(true);
  });

  it('clamps time between 0 and durationMs', () => {
    const store = useReplayStore.getState();
    store.setTime(-500);
    expect(useReplayStore.getState().currentTimeMs).toBe(0);

    store.setTime(20000);
    expect(useReplayStore.getState().currentTimeMs).toBe(16000);

    store.setTime(8500);
    expect(useReplayStore.getState().currentTimeMs).toBe(8500);
  });

  it('jumps directly to impact time', () => {
    const store = useReplayStore.getState();
    store.setTime(12000);
    store.play();

    store.goToImpact();
    expect(useReplayStore.getState().currentTimeMs).toBe(5000);
    expect(useReplayStore.getState().isPlaying).toBe(false);
  });

  it('advances time on step according to speed multiplier and stops at duration end', () => {
    const store = useReplayStore.getState();
    store.setTime(4000);
    store.play();
    store.setSpeedMultiplier(0.5);

    // 1000ms delta at 0.5x speed advances 500ms
    store.step(1000);
    expect(useReplayStore.getState().currentTimeMs).toBe(4500);

    // Advance to end
    store.setTime(15500);
    store.setSpeedMultiplier(1.0);
    store.step(1000);
    expect(useReplayStore.getState().currentTimeMs).toBe(16000);
    expect(useReplayStore.getState().isPlaying).toBe(false);
  });
});
