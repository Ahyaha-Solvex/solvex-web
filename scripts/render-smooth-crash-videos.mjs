import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const playwrightPath = '/home/mnwr/.npm/_npx/e41f203b7505f1fb/node_modules/playwright';
const { chromium } = require(playwrightPath);

const BASE_URL = 'http://localhost:3001';
const OUTPUT_DIR = '/home/mnwr/Desktop/SOLVEX/videos';
const FRAMERATE = 30;
const STEP_MS = 1000 / FRAMERATE; // 33.3333 ms per frame for exact 1.0x real-time speed

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function takeScreenshotWithRetry(page, options, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await page.screenshot(options);
    } catch (err) {
      console.warn(`Screenshot attempt ${i + 1} failed, retrying in 800ms...`);
      if (i === retries - 1) throw err;
      await page.waitForTimeout(800);
    }
  }
}

async function renderScenario({
  name,
  outputFileName,
  scenarioButtonName,
  startTimeMs,
  endTimeMs,
  initialHoldFrames = 15,
  finalHoldFrames = 30,
}) {
  const outputFilePath = path.join(OUTPUT_DIR, outputFileName);

  console.log(`\n======================================================`);
  console.log(`🎬 Rendering: ${name}`);
  console.log(`Button: ${scenarioButtonName}`);
  console.log(`Output: ${outputFilePath}`);
  console.log(`======================================================`);

  const tmpFramesDir = `/tmp/render_frames_${Date.now()}`;
  fs.mkdirSync(tmpFramesDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  console.log('Navigating to 3D stage lab...');
  await page.goto(`${BASE_URL}/en/lab/stage`, { waitUntil: 'domcontentloaded' });

  // Wait for simulator bridge to be mounted
  await page.waitForFunction(
    () => Boolean(window.__SOLVEX_SIM__?.source && window.__SOLVEX_SIM__?.incidentStore),
    { timeout: 30000 }
  );
  await page.waitForTimeout(1000);

  // Click scenario toggle button on stage UI
  console.log(`Selecting scenario: "${scenarioButtonName}"...`);
  const scenarioBtn = page.getByRole('button', { name: scenarioButtonName });
  await scenarioBtn.click();
  await page.waitForTimeout(600);

  // Lock manual timing and set start time
  await page.evaluate((t) => {
    window.__SOLVEX_MANUAL_TICK__ = true;
    const { source, replayStore } = window.__SOLVEX_SIM__;
    source.stop();
    replayStore.getState().setTime(t);
    replayStore.getState().play();
  }, startTimeMs);

  // Wait for WebGL compilation and initial frame stabilization
  console.log('Warming up WebGL 3D scene...');
  await page.waitForTimeout(2500);

  // Verify active incident state in browser
  const activeInc = await page.evaluate(() => {
    const inc = window.__SOLVEX_SIM__.incidentStore.getState().getActiveIncident();
    return {
      id: inc?.id,
      label: inc?.position?.roadLabel,
      deltaV: inc?.crash?.deltaVKmh,
      impactDeg: inc?.crash?.impactDirectionDeg,
      rollover: inc?.crash?.rollover,
    };
  });
  console.log('Active scenario parameters:', activeInc);

  // Calculate frame timeline
  const activeDurationMs = endTimeMs - startTimeMs;
  const activeFrameCount = Math.round(activeDurationMs / STEP_MS);
  const totalFrames = initialHoldFrames + activeFrameCount + finalHoldFrames;

  console.log(`Total frames to capture: ${totalFrames} (${(totalFrames / FRAMERATE).toFixed(2)}s video)`);
  console.log(`- Initial hold: ${initialHoldFrames} frames (${(initialHoldFrames / FRAMERATE).toFixed(2)}s)`);
  console.log(`- Active replay: ${activeFrameCount} frames (${(activeFrameCount / FRAMERATE).toFixed(2)}s)`);
  console.log(`- Final hold: ${finalHoldFrames} frames (${(finalHoldFrames / FRAMERATE).toFixed(2)}s)`);

  const startTime = Date.now();
  let frameIdx = 0;

  // 1. Initial Hold frames
  for (let h = 0; h < initialHoldFrames; h++) {
    const framePath = path.join(tmpFramesDir, `frame_${String(frameIdx).padStart(5, '0')}.jpg`);
    await takeScreenshotWithRetry(page, { path: framePath, type: 'jpeg', quality: 95 });
    frameIdx++;
    if (frameIdx % 15 === 0 || frameIdx === initialHoldFrames) {
      process.stdout.write(`\rCaptured [${frameIdx}/${totalFrames}] frames...`);
    }
  }

  // 2. Active Replay frames with exact delta-t stepping
  for (let f = 0; f < activeFrameCount; f++) {
    const currentSimTime = startTimeMs + f * STEP_MS;

    await page.evaluate((t) => {
      window.__SOLVEX_SIM__.replayStore.getState().setTime(t);
    }, currentSimTime);

    // Wait for two requestAnimationFrame cycles so React and Three.js flush to canvas
    await page.evaluate(() => {
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
    });

    const framePath = path.join(tmpFramesDir, `frame_${String(frameIdx).padStart(5, '0')}.jpg`);
    await takeScreenshotWithRetry(page, { path: framePath, type: 'jpeg', quality: 95 });
    frameIdx++;

    if (frameIdx % 15 === 0 || frameIdx === initialHoldFrames + activeFrameCount) {
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\rCaptured [${frameIdx}/${totalFrames}] frames (${elapsedSec}s elapsed)...`);
    }
  }

  // 3. Final Hold frames at settled state
  for (let h = 0; h < finalHoldFrames; h++) {
    const framePath = path.join(tmpFramesDir, `frame_${String(frameIdx).padStart(5, '0')}.jpg`);
    await takeScreenshotWithRetry(page, { path: framePath, type: 'jpeg', quality: 95 });
    frameIdx++;
    if (frameIdx % 15 === 0 || frameIdx === totalFrames) {
      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\rCaptured [${frameIdx}/${totalFrames}] frames (${elapsedSec}s elapsed)...`);
    }
  }

  console.log(`\nAll ${totalFrames} frames captured in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
  await browser.close();

  // 4. Encode to crystal-clear, smooth MP4 using ffmpeg
  console.log(`Encoding MP4 with FFmpeg -> ${outputFilePath}...`);

  const ffmpegCmd = [
    'ffmpeg',
    '-y',
    '-framerate', String(FRAMERATE),
    '-i', path.join(tmpFramesDir, 'frame_%05d.jpg'),
    '-c:v', 'libx264',
    '-crf', '17',
    '-preset', 'slow',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    `"${outputFilePath}"`,
  ].join(' ');

  execSync(ffmpegCmd, { stdio: 'inherit' });

  // Clean up temporary frame JPGs
  fs.rmSync(tmpFramesDir, { recursive: true, force: true });
  console.log(`✅ Finished: ${outputFilePath}\n`);
}

async function main() {
  console.log('🚀 Starting Smooth 3D Video Production for SolvEx Hackathon\n');

  // =========================================================================
  // VIDEO 1: 3D Crashing Video (Highway Collision & Rollover)
  // =========================================================================
  await renderScenario({
    name: '3D Crashing Event — High-Speed Collision & Rollover',
    outputFileName: '3d-crash-event.mp4',
    scenarioButtonName: 'Collision & Rollover',
    startTimeMs: 2400,   // -2.6s before impact: highway approach at 84 km/h
    endTimeMs: 7400,     // +2.4s after impact: full crumple, debris, flip, slide to rest
    initialHoldFrames: 15, // 0.5s pre-roll hold
    finalHoldFrames: 30,   // 1.0s settled wreck observation hold
  });

  // =========================================================================
  // VIDEO 2: 3D Triggered but Non-Crashing Video (Controlled Emergency Braking)
  // =========================================================================
  await renderScenario({
    name: '3D Triggered Non-Crash Event — Controlled Emergency Braking',
    outputFileName: '3d-triggered-non-crash-event.mp4',
    scenarioButtonName: 'Emergency Braking (No Crash)',
    startTimeMs: 1800,   // -3.2s before stop: approaching at 86 km/h
    endTimeMs: 6800,     // +1.8s post-stop: emergency brake deceleration to 0 km/h before barrier
    initialHoldFrames: 15, // 0.5s pre-roll hold
    finalHoldFrames: 30,   // 1.0s post-stop verification hold
  });

  console.log('🎉 Both 3D presentation videos generated successfully!');
}

main().catch((err) => {
  console.error('Fatal error during video render:', err);
  process.exit(1);
});
