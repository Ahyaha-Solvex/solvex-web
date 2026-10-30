import type { ConfidenceStatus } from './types';

export interface ConfidenceFactors {
  blackboxImpact?: boolean; // +40
  airbagOrRollover?: boolean; // +30
  phoneImpact?: boolean; // +15
  suddenStop?: boolean; // +15
  noMovementAfterwards?: boolean; // +10
  sosButton?: boolean; // Jump to 100
  voiceTrigger?: boolean; // Jump to 100
  witnessConfirmed?: boolean; // Jump to 100 & status witness_confirmed
  userOk?: boolean; // Force to 0
  dispatcherConfirmed?: boolean; // status confirmed
}

export interface ConfidenceEvaluation {
  score: number;
  status: ConfidenceStatus;
  ladder: 'log_only' | 'suspected' | 'likely' | 'alert';
}

/**
 * Computes confidence score and status per DATA_CONTRACT.md ladder
 */
export function computeConfidence(factors: ConfidenceFactors): ConfidenceEvaluation {
  // Citizen "I'm OK" immediately zeroes the confidence
  if (factors.userOk) {
    return {
      score: 0,
      status: 'suspected',
      ladder: 'log_only',
    };
  }

  let score = 0;

  if (factors.blackboxImpact) score += 40;
  if (factors.airbagOrRollover) score += 30;
  if (factors.phoneImpact) score += 15;
  if (factors.suddenStop) score += 15;
  if (factors.noMovementAfterwards) score += 10;

  // Overrides jumping to 100
  if (factors.sosButton || factors.voiceTrigger || factors.witnessConfirmed) {
    score = 100;
  }

  // Cap score between 0 and 100
  score = Math.min(100, Math.max(0, score));

  // Determine ladder band
  let ladder: 'log_only' | 'suspected' | 'likely' | 'alert';
  if (score < 40) {
    ladder = 'log_only';
  } else if (score < 70) {
    ladder = 'suspected';
  } else if (score < 90) {
    ladder = 'likely';
  } else {
    ladder = 'alert';
  }

  // Determine status mapping:
  // <70 suspected, 70–90 likely, ≥90 likely until a witness or SOS → witness_confirmed, dispatcher confirm → confirmed.
  let status: ConfidenceStatus;

  if (factors.dispatcherConfirmed) {
    status = 'confirmed';
  } else if (factors.witnessConfirmed || factors.sosButton) {
    status = 'witness_confirmed';
  } else if (score >= 70) {
    status = 'likely';
  } else {
    status = 'suspected';
  }

  return { score, status, ladder };
}
