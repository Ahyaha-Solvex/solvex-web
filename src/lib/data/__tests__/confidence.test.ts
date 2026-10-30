import { describe, it, expect } from 'vitest';
import { computeConfidence } from '../confidence';

describe('Confidence Score & Ladder (DATA_CONTRACT.md)', () => {
  it('computes RN5 initial impact score (40 + 30 + 15 = 85)', () => {
    const res = computeConfidence({
      blackboxImpact: true,
      airbagOrRollover: true,
      suddenStop: true,
    });

    expect(res.score).toBe(85);
    expect(res.status).toBe('likely');
    expect(res.ladder).toBe('likely');
  });

  it('determines suspected status for low confidence (<70)', () => {
    const res = computeConfidence({
      blackboxImpact: true, // 40
      phoneImpact: true, // +15 = 55
    });

    expect(res.score).toBe(55);
    expect(res.status).toBe('suspected');
    expect(res.ladder).toBe('suspected');
  });

  it('determines log_only ladder for score below 40', () => {
    const res = computeConfidence({
      phoneImpact: true, // 15
      noMovementAfterwards: true, // 10 -> total 25
    });

    expect(res.score).toBe(25);
    expect(res.status).toBe('suspected');
    expect(res.ladder).toBe('log_only');
  });

  it('jumps to 100 with witness_confirmed upon witness confirmation', () => {
    const res = computeConfidence({
      blackboxImpact: true,
      witnessConfirmed: true,
    });

    expect(res.score).toBe(100);
    expect(res.status).toBe('witness_confirmed');
    expect(res.ladder).toBe('alert');
  });

  it('jumps to 100 with witness_confirmed upon SOS button press', () => {
    const res = computeConfidence({
      sosButton: true,
    });

    expect(res.score).toBe(100);
    expect(res.status).toBe('witness_confirmed');
  });

  it('sets status to confirmed upon dispatcher confirmation', () => {
    const res = computeConfidence({
      blackboxImpact: true,
      dispatcherConfirmed: true,
    });

    expect(res.status).toBe('confirmed');
  });

  it('zeroes score and sets suspected status when citizen replies I am OK', () => {
    const res = computeConfidence({
      blackboxImpact: true,
      airbagOrRollover: true,
      witnessConfirmed: true,
      userOk: true,
    });

    expect(res.score).toBe(0);
    expect(res.status).toBe('suspected');
    expect(res.ladder).toBe('log_only');
  });
});
