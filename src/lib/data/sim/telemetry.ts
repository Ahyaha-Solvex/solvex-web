import type { TelemetryWindow } from '../types';

/**
 * Generates a realistic 16-second 100 Hz telemetry window matching RN5 guardrail crash scenario.
 * Blackbox axes convention: x forward, y left, z up (gravity +1g on z).
 * Impact direction 270° (left lateral impact).
 */
export function generateRn5Telemetry(): TelemetryWindow {
  const sampleRateHz = 100;
  const totalSeconds = 16;
  const totalSamples = sampleRateHz * totalSeconds; // 1600 samples
  const impactAtMs = 4000;

  const accel: [number, number, number][] = [];
  const gyro: [number, number, number][] = [];

  for (let i = 0; i < totalSamples; i++) {
    const tMs = (i / sampleRateHz) * 1000;

    if (tMs < impactAtMs) {
      // Pre-impact cruising at 90 km/h: minor road vibrations
      const noiseX = (Math.sin(i * 0.3) + Math.cos(i * 0.7)) * 0.05;
      const noiseY = (Math.sin(i * 0.4) - Math.cos(i * 0.9)) * 0.04;
      const noiseZ = 1.0 + (Math.sin(i * 0.5) * 0.06); // 1g gravity

      accel.push([noiseX, noiseY, noiseZ]);
      gyro.push([noiseX * 4, noiseY * 3, noiseZ * 2]);
    } else if (tMs >= impactAtMs && tMs < impactAtMs + 250) {
      // Primary impact spike (impact direction 270° left side)
      const progress = (tMs - impactAtMs) / 250;
      const envelope = Math.sin(progress * Math.PI);
      const ax = -6.5 * envelope + (Math.random() - 0.5) * 1.5;
      const ay = 16.8 * envelope + (Math.random() - 0.5) * 2.0; // strong lateral g
      const az = 1.0 + 4.2 * envelope;

      accel.push([ax, ay, az]);
      gyro.push([-45 * envelope, 65 * envelope, -120 * envelope]);
    } else if (tMs >= impactAtMs + 250 && tMs < impactAtMs + 500) {
      // Secondary rebound impact (multiple impacts = true)
      const progress = (tMs - (impactAtMs + 250)) / 250;
      const envelope = Math.sin(progress * Math.PI);
      const ax = -3.2 * envelope;
      const ay = -7.5 * envelope;
      const az = 1.0 + 2.1 * envelope;

      accel.push([ax, ay, az]);
      gyro.push([20 * envelope, -30 * envelope, 45 * envelope]);
    } else if (tMs >= impactAtMs + 500 && tMs < 8000) {
      // Decelerating slide to rest
      const decay = Math.exp(-(tMs - (impactAtMs + 500)) / 1200);
      const ax = -1.2 * decay + (Math.random() - 0.5) * 0.2;
      const ay = 0.5 * decay + (Math.random() - 0.5) * 0.2;
      const az = 1.0 + (Math.random() - 0.5) * 0.1;

      accel.push([ax, ay, az]);
      gyro.push([15 * decay, -10 * decay, 25 * decay]);
    } else {
      // Vehicle at complete rest post-crash
      accel.push([0, 0, 1.0]);
      gyro.push([0, 0, 0]);
    }
  }

  const speedKmh1Hz = [
    90, 90, 89, 88, // pre-impact
    55, 38, 22, 9, 0, 0, 0, 0, 0, 0, 0, 0, // post-impact deceleration to 0 km/h
  ];

  return {
    sampleRateHz,
    impactAtMs,
    accel,
    gyro,
    speedKmh1Hz,
  };
}
