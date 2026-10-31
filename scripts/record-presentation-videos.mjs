import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/mnwr/.npm/_npx/e41f203b7505f1fb/node_modules/playwright');

const BASE_URL = 'http://localhost:3001';
const OUT_DIR = '/home/mnwr/Desktop/SOLVEX/videos';
const TMP_DIR = '/tmp/solvex-1080p-raw';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TMP_DIR, { recursive: true });

/**
 * Injects an animated Presenter Cursor + Click Ripple overlay into the page
 */
async function injectPresenterCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('__solvex_cursor__')) return;

    const style = document.createElement('style');
    style.textContent = `
      #__solvex_cursor__ {
        position: fixed;
        top: 0;
        left: 0;
        width: 28px;
        height: 28px;
        pointer-events: none;
        z-index: 2147483647;
        transform: translate(960px, 540px);
        transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45));
      }
      .__solvex_ripple__ {
        position: fixed;
        width: 44px;
        height: 44px;
        margin-left: -22px;
        margin-top: -22px;
        border-radius: 9999px;
        border: 3px solid #FF4D5E;
        background: rgba(255, 77, 94, 0.22);
        pointer-events: none;
        z-index: 2147483646;
        animation: __solvex_ripple_anim__ 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      @keyframes __solvex_ripple_anim__ {
        0% { transform: scale(0.35); opacity: 1; }
        100% { transform: scale(1.65); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    const cursor = document.createElement('div');
    cursor.id = '__solvex_cursor__';
    cursor.innerHTML = `
      <svg viewBox="0 0 28 28" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 3L23 13.5L14.5 15.8L10.5 24L5 3Z" fill="#FFFFFF" stroke="#0F1F2E" stroke-width="2.2" stroke-linejoin="round"/>
      </svg>
    `;
    document.body.appendChild(cursor);

    window.__movePresenterCursor__ = (x, y) => {
      const el = document.getElementById('__solvex_cursor__');
      if (el) {
        el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      }
    };

    window.__pulsePresenterClick__ = (x, y) => {
      const ripple = document.createElement('div');
      ripple.className = '__solvex_ripple__';
      ripple.style.left = `${Math.round(x)}px`;
      ripple.style.top = `${Math.round(y)}px`;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 560);
    };
  });
}

async function moveCursorTo(page, x, y, waitMs = 520) {
  await injectPresenterCursor(page);
  await page.evaluate(([cx, cy]) => {
    window.__movePresenterCursor__?.(cx, cy);
  }, [x, y]);
  await page.waitForTimeout(waitMs);
}

async function cursorClick(page, locator, pauseAfterMs = 1200) {
  await injectPresenterCursor(page);
  const count = await locator.count();
  if (count === 0) return false;
  const target = locator.first();
  const box = await target.boundingBox();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.evaluate(([x, y]) => {
      window.__movePresenterCursor__?.(x, y);
    }, [cx, cy]);
    await page.waitForTimeout(500);
    await page.evaluate(([x, y]) => {
      window.__pulsePresenterClick__?.(x, y);
    }, [cx, cy]);
  }
  await target.click({ force: true });
  await page.waitForTimeout(pauseAfterMs);
  return true;
}

async function recordScenario(name, maxDurationSec, setupFn, actionFn) {
  console.log(`\n=== Recording ${name} (1920x1080) ===`);
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: TMP_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const contextStartMs = Date.now();
  const page = await context.newPage();

  // Setup phase (navigation + model warmup) — trimmed out of final MP4
  await setupFn(page);
  await injectPresenterCursor(page);

  const actionStartSec = Math.max(0, (Date.now() - contextStartMs) / 1000 - 0.1);

  // Action phase (recorded into the final MP4)
  await actionFn(page);

  const actionDurationSec = Math.min(maxDurationSec, (Date.now() - contextStartMs) / 1000 - actionStartSec);

  const video = page.video();
  await context.close();
  await browser.close();

  const rawWebmPath = await video.path();
  const finalMp4Path = path.join(OUT_DIR, `${name}.mp4`);

  execSync(
    `ffmpeg -y -ss ${actionStartSec.toFixed(2)} -t ${Math.min(19.0, Math.max(10, actionDurationSec)).toFixed(2)} -i "${rawWebmPath}" -c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p -movflags +faststart "${finalMp4Path}"`,
    { stdio: 'ignore' }
  );

  const durationOut = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalMp4Path}"`
  )
    .toString()
    .trim();

  console.log(`✓ Saved ${finalMp4Path} (${Number(durationOut).toFixed(1)}s)`);
}

async function waitSimReady(page) {
  await page.waitForFunction(() => Boolean(window.__SOLVEX_SIM__), { timeout: 15000 });
}

async function main() {
  // ---------------------------------------------------------------------------
  // 01: 3D Crash — High-Speed Rollover Impact
  // ---------------------------------------------------------------------------
  await recordScenario(
    '01-3d-crash-rollover-impact',
    15.5,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        const { source, replayStore } = window.__SOLVEX_SIM__;
        source.stop();
        replayStore.getState().pause();
        replayStore.getState().setTime(800);
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      await moveCursorTo(page, 880, 520, 300);
      await page.evaluate(() => {
        const { replayStore } = window.__SOLVEX_SIM__;
        replayStore.getState().setSpeedMultiplier(1.0);
        replayStore.getState().setTime(800);
        replayStore.getState().play();
      });
      await page.waitForTimeout(7200);
      // Replay impact in 0.5x slow motion
      const speedHalfBtn = page.getByRole('button', { name: '0.5x' });
      if (await speedHalfBtn.count()) {
        await cursorClick(page, speedHalfBtn, 400);
      }
      await page.evaluate(() => {
        const { replayStore } = window.__SOLVEX_SIM__;
        replayStore.getState().setTime(4300);
        replayStore.getState().setSpeedMultiplier(0.5);
        replayStore.getState().play();
      });
      await page.waitForTimeout(5500);
    }
  );

  // ---------------------------------------------------------------------------
  // 02: 3D Crash — Frontal/Angled Skid Impact (No Rollover)
  // ---------------------------------------------------------------------------
  await recordScenario(
    '02-3d-crash-frontal-skid-no-rollover',
    15.0,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        const { source, incidentStore, replayStore } = window.__SOLVEX_SIM__;
        source.stop();
        const inc = JSON.parse(JSON.stringify(incidentStore.getState().getActiveIncident()));
        inc.position.roadLabel = 'RN5, km 94 · Frontal Barrier Skid';
        inc.crash = {
          speedBeforeKmh: 84,
          deltaVKmh: 38,
          impactDirectionDeg: 35,
          rollover: false,
          airbagDeployed: true,
          beltUsed: true,
          multipleImpacts: false,
          peakG: 22.4,
        };
        incidentStore.getState().applyEvent({ type: 'incident_upsert', incident: inc });
        replayStore.getState().pause();
        replayStore.getState().setTime(1000);
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      await moveCursorTo(page, 900, 500, 300);
      await page.evaluate(() => {
        const { replayStore } = window.__SOLVEX_SIM__;
        replayStore.getState().setSpeedMultiplier(1.0);
        replayStore.getState().setTime(1000);
        replayStore.getState().play();
      });
      await page.waitForTimeout(6800);
      await page.evaluate(() => {
        const { replayStore } = window.__SOLVEX_SIM__;
        replayStore.getState().setTime(4300);
        replayStore.getState().setSpeedMultiplier(0.5);
        replayStore.getState().play();
      });
      await page.waitForTimeout(5500);
    }
  );

  // ---------------------------------------------------------------------------
  // 03: 3D Triggered, Not Crashing — Emergency Hard Braking Before Obstacle
  // ---------------------------------------------------------------------------
  await recordScenario(
    '03-3d-triggered-no-crash-hard-braking',
    15.0,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        const { source, incidentStore, replayStore } = window.__SOLVEX_SIM__;
        source.stop();
        const inc = JSON.parse(JSON.stringify(incidentStore.getState().getActiveIncident()));
        inc.position.roadLabel = 'RN5 · Hard Braking Trigger (No Collision)';
        inc.m2 = { p: 0.42, level: 'low' };
        inc.confidence = { score: 42, status: 'suspected' };
        inc.occupants[0].m3 = { level: 'low', probability: 0.08 };
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
        inc.timeline = [
          { t: '00:02', kind: 'Cancel', label: 'Controlled emergency braking stop — no impact detected' },
          { t: '00:00', kind: 'm2', label: 'Accelerometer threshold triggered (-1.3g longitudinal)' },
        ];
        incidentStore.getState().applyEvent({ type: 'incident_upsert', incident: inc });
        replayStore.getState().pause();
        replayStore.getState().setTime(500);
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      await moveCursorTo(page, 900, 480, 300);
      await page.evaluate(() => {
        const { replayStore } = window.__SOLVEX_SIM__;
        replayStore.getState().setSpeedMultiplier(1.0);
        replayStore.getState().setTime(500);
        replayStore.getState().play();
      });
      await page.waitForTimeout(7000);
      await page.evaluate(() => {
        const { replayStore } = window.__SOLVEX_SIM__;
        replayStore.getState().setTime(2600);
        replayStore.getState().setSpeedMultiplier(0.5);
        replayStore.getState().play();
      });
      await page.waitForTimeout(5500);
    }
  );

  // ---------------------------------------------------------------------------
  // 04: 3D Triggered, Not Crashing — High-G Evasive Lane Swerve
  // ---------------------------------------------------------------------------
  await recordScenario(
    '04-3d-triggered-no-crash-evasive-swerve',
    15.0,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        const { source, incidentStore, replayStore } = window.__SOLVEX_SIM__;
        source.stop();
        const inc = JSON.parse(JSON.stringify(incidentStore.getState().getActiveIncident()));
        inc.position.roadLabel = 'A1 East · Lateral G-Spike (Evasive Swerve)';
        inc.m2 = { p: 0.38, level: 'low' };
        inc.confidence = { score: 45, status: 'suspected' };
        inc.occupants[0].m3 = { level: 'low', probability: 0.05 };
        inc.crash = {
          speedBeforeKmh: 88,
          deltaVKmh: 14,
          impactDirectionDeg: 65,
          rollover: false,
          airbagDeployed: false,
          beltUsed: true,
          multipleImpacts: false,
          peakG: 1.6,
        };
        inc.timeline = [
          { t: '00:03', kind: 'Cancel', label: 'Vehicle continuing at 82 km/h — evasive maneuver only' },
          { t: '00:00', kind: 'm2', label: 'Gyroscope & lateral g-spike triggered (evasive swerve)' },
        ];
        incidentStore.getState().applyEvent({ type: 'incident_upsert', incident: inc });
        replayStore.getState().pause();
        replayStore.getState().setTime(1500);
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      await moveCursorTo(page, 900, 480, 300);
      await page.evaluate(() => {
        const { replayStore } = window.__SOLVEX_SIM__;
        replayStore.getState().setSpeedMultiplier(1.0);
        replayStore.getState().setTime(1500);
        replayStore.getState().play();
      });
      await page.waitForTimeout(7000);
      await page.evaluate(() => {
        const { replayStore } = window.__SOLVEX_SIM__;
        replayStore.getState().setTime(3200);
        replayStore.getState().setSpeedMultiplier(0.5);
        replayStore.getState().play();
      });
      await page.waitForTimeout(5500);
    }
  );

  // ---------------------------------------------------------------------------
  // 05: 3D Triggered, Not Crashing — Road Bump + Driver "I am OK" (0%)
  // ---------------------------------------------------------------------------
  await recordScenario(
    '05-3d-triggered-no-crash-road-bump-driver-ok',
    16.0,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        const { source, incidentStore, replayStore } = window.__SOLVEX_SIM__;
        source.stop();
        const inc = JSON.parse(JSON.stringify(incidentStore.getState().getActiveIncident()));
        inc.position.roadLabel = 'CW 127 · Road Pothole Jolt (Non-Crash)';
        inc.m2 = { p: 0.32, level: 'low' };
        inc.confidence = { score: 45, status: 'suspected' };
        inc.occupants[0].m3 = { level: 'low', probability: 0.04 };
        inc.crash = {
          speedBeforeKmh: 72,
          deltaVKmh: 8,
          impactDirectionDeg: -10,
          rollover: false,
          airbagDeployed: false,
          beltUsed: true,
          multipleImpacts: false,
          peakG: 2.1,
        };
        inc.timeline = [
          { t: '00:00', kind: 'm2', label: 'Vertical z-axis jolt detected — awaiting driver check' },
        ];
        incidentStore.getState().applyEvent({ type: 'incident_upsert', incident: inc });
        replayStore.getState().pause();
        replayStore.getState().setTime(2200);
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      await page.evaluate(() => {
        const { replayStore } = window.__SOLVEX_SIM__;
        replayStore.getState().setSpeedMultiplier(1.0);
        replayStore.getState().setTime(2200);
        replayStore.getState().play();
      });
      await page.waitForTimeout(4200);

      // Move cursor to floating Scenario button and open it
      const floatBtn = page.locator('.ant-float-btn');
      await cursorClick(page, floatBtn, 1200);

      // Click "Simuler Conducteur : Je vais bien (0%)"
      const okBtn = page.getByRole('button', { name: /Je vais bien/i });
      if (await okBtn.count()) {
        await cursorClick(page, okBtn, 1600);
      }

      // Close drawer to show 0% confidence on the main dashboard
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.uiStore.getState().setScenarioDrawerOpen(false);
      });
      await moveCursorTo(page, 1680, 220, 600);
      await page.waitForTimeout(3500);
    }
  );

  // ---------------------------------------------------------------------------
  // 06: Responder — Confidence Ladder Escalation (Suspected -> Likely -> Witness -> SOS 100%)
  // ---------------------------------------------------------------------------
  await recordScenario(
    '06-responder-confidence-escalation-witness-sos',
    16.0,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        const { source, incidentStore } = window.__SOLVEX_SIM__;
        source.stop();
        const inc = JSON.parse(JSON.stringify(incidentStore.getState().getActiveIncident()));
        inc.confidence = { score: 52, status: 'suspected' };
        inc.timeline = [
          { t: '00:00', kind: 'm2', label: 'Initial accelerometer spike detected (52% Suspected)' },
        ];
        incidentStore.getState().applyEvent({ type: 'incident_upsert', incident: inc });
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      // Point cursor at Confidence Ladder in Right Rail
      await moveCursorTo(page, 1720, 215, 1800);

      // Step 2: Likely (76%)
      await page.evaluate(() => {
        const { incidentStore } = window.__SOLVEX_SIM__;
        const inc = JSON.parse(JSON.stringify(incidentStore.getState().getActiveIncident()));
        inc.confidence = { score: 76, status: 'likely' };
        inc.timeline.unshift({
          t: '00:05',
          kind: 'm2',
          label: 'Vehicle immobile + M2 crash signature matched (76% Likely)',
        });
        incidentStore.getState().applyEvent({ type: 'incident_upsert', incident: inc });
      });
      await page.waitForTimeout(3400);

      // Step 3: Witness Confirmed (90%)
      await page.evaluate(() => {
        const { incidentStore } = window.__SOLVEX_SIM__;
        const inc = JSON.parse(JSON.stringify(incidentStore.getState().getActiveIncident()));
        inc.confidence = { score: 90, status: 'witness_confirmed' };
        inc.timeline.unshift({
          t: '00:18',
          kind: 'witness',
          label: 'Witness call on line 14 confirmed crash at PK 112 (90%)',
        });
        incidentStore.getState().applyEvent({ type: 'incident_upsert', incident: inc });
      });
      await page.waitForTimeout(3400);

      // Step 4: Hardware SOS Button (100% Confirmed)
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.source.triggerSos();
      });
      await page.waitForTimeout(4200);
    }
  );

  // ---------------------------------------------------------------------------
  // 07: Responder — Offline 2G / SMS Fallback Mode
  // ---------------------------------------------------------------------------
  await recordScenario(
    '07-responder-offline-2g-sms-fallback',
    16.0,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.source.stop();
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      const floatBtn = page.locator('.ant-float-btn');
      await cursorClick(page, floatBtn, 1200);

      // Toggle network switch inside Scenario Drawer
      const netSwitch = page.locator('.ant-drawer-body .ant-switch').first();
      await cursorClick(page, netSwitch, 1800);

      // Close Scenario Drawer
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.uiStore.getState().setScenarioDrawerOpen(false);
      });
      await page.waitForTimeout(1500);

      // Click the SMS tab in the right rail
      const smsTab = page.getByRole('tab', { name: 'SMS' });
      await cursorClick(page, smsTab, 4500);
    }
  );

  // ---------------------------------------------------------------------------
  // 08: Responder — Manual Phone Call Intake & 4-Question Severity Triage
  // ---------------------------------------------------------------------------
  await recordScenario(
    '08-responder-phone-call-triage-intake',
    16.5,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.source.stop();
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      const newCallBtn = page.getByRole('button', { name: /New call/i });
      await cursorClick(page, newCallBtn, 1000);

      const locInput = page.locator('input[placeholder*="Road"]');
      if (await locInput.count()) {
        await cursorClick(page, locInput, 400);
        await locInput.fill('Autoroute Est-Ouest, PK 142, Lakhdaria');
        await page.waitForTimeout(900);
      }

      // Toggle the severity questions in the modal with visible cursor clicks
      const noButtons = page.locator('.ant-modal').getByText('No', { exact: true });
      if ((await noButtons.count()) > 0) {
        await cursorClick(page, noButtons.first(), 900); // Conscious: No
      }

      const yesButtons = page.locator('.ant-modal').getByText('Yes', { exact: true });
      if ((await yesButtons.count()) >= 4) {
        await cursorClick(page, yesButtons.nth(2), 900); // Heavy bleeding: Yes
        await cursorClick(page, yesButtons.nth(3), 900); // Trapped: Yes
      }

      const submitBtn = page.getByRole('button', { name: /Log incident/i });
      await cursorClick(page, submitBtn, 4200);
    }
  );

  // ---------------------------------------------------------------------------
  // 09: Responder — Dead Zone Preventive Watch & Overdue Alert
  // ---------------------------------------------------------------------------
  await recordScenario(
    '09-responder-dead-zone-preventive-watch',
    17.0,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.source.stop();
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.source.startDeadZone();
      });
      await page.waitForTimeout(1800);

      // Click "Warn them not to go"
      const warnBtn = page.getByRole('button', { name: /Warn them not to go/i });
      await cursorClick(page, warnBtn, 1600);

      // Click "Say help can't reach them"
      const noHelpBtn = page.getByRole('button', { name: /Say help can't reach them/i });
      await cursorClick(page, noHelpBtn, 1800);

      // Escalate to Overdue and select in queue
      await page.evaluate(() => {
        const { incidentStore } = window.__SOLVEX_SIM__;
        const state = incidentStore.getState();
        const zoneInc = Object.values(state.incidents).find((i) => i.deadZone);
        if (zoneInc) {
          state.selectIncident(zoneInc.id);
          const updated = JSON.parse(JSON.stringify(zoneInc));
          updated.deadZone.phase = 'overdue';
          updated.deadZone.acknowledged = false;
          updated.deadZone.lastSeenAt = '02:14';
          updated.confidence = { score: 65, status: 'likely' };
          updated.timeline.unshift({
            t: '01:00',
            kind: 'zone_overdue',
            label: 'Karim is not back: Emergency contact and Gendarmerie alerted',
          });
          state.applyEvent({ type: 'incident_upsert', incident: updated });
        }
      });
      await moveCursorTo(page, 620, 75, 4500);
    }
  );

  // ---------------------------------------------------------------------------
  // 10: Responder — Crash Confirmation, Ambulance Dispatch & Ligne Jaune
  // ---------------------------------------------------------------------------
  await recordScenario(
    '10-responder-ambulance-dispatch-and-yellow-line',
    16.5,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.source.stop();
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      // 1. Confirm Crash
      const confirmBtn = page.getByRole('button', { name: /Confirm Crash/i });
      await cursorClick(page, confirmBtn, 1500);

      // 2. Open Ambulance Fleet Drawer
      const assignBtn = page.getByRole('button', { name: /Assign Ambulance/i });
      await cursorClick(page, assignBtn, 1800);

      // 3. Click Assign button inside drawer
      const drawerAssignBtn = page.locator('.ant-drawer-body button.ant-btn-primary').first();
      if (await drawerAssignBtn.count()) {
        await cursorClick(page, drawerAssignBtn, 2200);
      }

      // 4. Switch to Map view to inspect ambulance route and 500m perimeter
      const mapToggle = page.locator('.ant-segmented-item').filter({ hasText: 'Map' }).first();
      await cursorClick(page, mapToggle, 4500);
    }
  );

  // ---------------------------------------------------------------------------
  // 11: Responder — Citizen & Medic Solidarity Broadcast + First-Aid Cards
  // ---------------------------------------------------------------------------
  await recordScenario(
    '11-responder-solidarity-and-first-aid-cards',
    16.5,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.source.stop();
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      // 1. Open Solidarity Broadcast Popover
      const solidarityBtn = page.getByRole('button', { name: /Call for Solidarity/i });
      await cursorClick(page, solidarityBtn, 1500);

      // 2. Click Broadcast Alert
      const broadcastBtn = page.getByRole('button', { name: /Broadcast Alert/i });
      await cursorClick(page, broadcastBtn, 1800);

      // 3. Call a volunteer directly
      const callVolBtn = page.getByRole('button', { name: /^Call$/i }).first();
      await cursorClick(page, callVolBtn, 2200);

      // 4. Confirm the accepted medic/helper to send First-Aid Guidance Cards
      const confirmHelperBtn = page.getByRole('button', { name: /^Confirm$/i }).first();
      await cursorClick(page, confirmHelperBtn, 3800);
    }
  );

  // ---------------------------------------------------------------------------
  // 12: Responder — Multi-Victim START Triage & Hospital Load-Balancing
  // ---------------------------------------------------------------------------
  await recordScenario(
    '12-responder-multi-victim-triage-and-hospitals',
    15.5,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.source.stop();
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      // 1. Click Red START Triage on Victim 1
      const redTriageBtn = page.locator('table button[role="radio"]').nth(2);
      await cursorClick(page, redTriageBtn, 1400);

      // 2. Click Yellow START Triage on Victim 2
      const yellowTriageBtn2 = page.locator('table tr').nth(1).locator('button[role="radio"]').nth(1);
      await cursorClick(page, yellowTriageBtn2, 1400);

      // 3. Route Victim 2 to second hospital
      const secondHospitalSelect = page.locator('table .ant-select').nth(1);
      await cursorClick(page, secondHospitalSelect, 1000);
      const secondOption = page.locator('.ant-select-item-option').nth(1);
      if (await secondOption.count()) {
        await cursorClick(page, secondOption, 1600);
      }

      // 4. Call Driver & Call Emergency Contact
      const callDriverBtn = page.getByRole('button', { name: /^Driver$/i });
      await cursorClick(page, callDriverBtn, 1400);

      const callContactBtn = page.getByRole('button', { name: /Emergency contact/i });
      await cursorClick(page, callContactBtn, 3000);
    }
  );

  // ---------------------------------------------------------------------------
  // 13: Hospital — Incoming Queue, Clinical Record, Live Vitals & Prep Checklist
  // ---------------------------------------------------------------------------
  await recordScenario(
    '13-hospital-incoming-queue-and-clinical-record',
    16.0,
    async (page) => {
      await page.goto(`${BASE_URL}/en/hospital`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.source.stop();
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      // Check off ER Preparation Checklist items with animated cursor
      const checkboxes = page.locator('.ant-checkbox-wrapper');
      const count = await checkboxes.count();
      for (let i = 0; i < Math.min(3, count); i++) {
        await cursorClick(page, checkboxes.nth(i), 1100);
      }

      // Switch to second incoming patient in the left queue and back
      const queueButtons = page.locator('aside button[aria-pressed]');
      if ((await queueButtons.count()) >= 2) {
        await cursorClick(page, queueButtons.nth(1), 2400);
        await cursorClick(page, queueButtons.nth(0), 2500);
      }
    }
  );

  // ---------------------------------------------------------------------------
  // 14: Hospital — 3D Anatomical Digital Twin & M4 Regional Focus
  // ---------------------------------------------------------------------------
  await recordScenario(
    '14-hospital-3d-digital-twin-anatomical-scan',
    17.5,
    async (page) => {
      await page.goto(`${BASE_URL}/en/hospital`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.source.stop();
      });
      const openTwinBtn = page.getByRole('button', { name: /Open digital twin/i });
      if (await openTwinBtn.count()) {
        await openTwinBtn.click({ force: true });
      }
      await page.waitForTimeout(2500);
    },
    async (page) => {
      await moveCursorTo(page, 960, 480, 1200);

      // Click Thorax in the right rail Injury Map
      const regionButtons = page.locator('aside').last().locator('div[role="button"]');
      if ((await regionButtons.count()) >= 3) {
        await cursorClick(page, regionButtons.nth(0), 2400); // Thorax (88%)
        await cursorClick(page, regionButtons.nth(2), 2400); // Spine & Neck (62% - Back view)
        await cursorClick(page, regionButtons.nth(1), 2200); // Lower Limbs (65%)
      }

      // Click Reset view button on the 3D stage
      const resetBtn = page.getByRole('button', { name: /Reset view/i });
      await cursorClick(page, resetBtn, 1600);

      // Click Patient 2 tab in top bar
      const tabs = page.locator('header button[role="tab"]');
      if ((await tabs.count()) >= 2) {
        await cursorClick(page, tabs.nth(1), 2800);
      }
    }
  );

  // ---------------------------------------------------------------------------
  // 15: Hospital 3D Twin & Responder Role Handoff (Seamless End-to-End Sync)
  // ---------------------------------------------------------------------------
  await recordScenario(
    '15-end-to-end-responder-to-hospital-twin-handoff',
    16.5,
    async (page) => {
      await page.goto(`${BASE_URL}/en/responder`, { waitUntil: 'domcontentloaded' });
      await waitSimReady(page);
      await page.evaluate(() => {
        window.__SOLVEX_SIM__.source.stop();
      });
      await page.waitForTimeout(2200);
    },
    async (page) => {
      // 1. In Responder Victims table, click "Digital twin" link for Victim 1
      const twinLink = page.getByRole('button', { name: /Digital twin/i }).first();
      await cursorClick(page, twinLink, 2200);

      // 2. Now on Hospital Record view -> Click "Open digital twin" button
      const openTwinBtn = page.getByRole('button', { name: /Open digital twin/i });
      await cursorClick(page, openTwinBtn, 2400);

      // 3. Focus Thorax on the 3D Digital Twin
      const regionButtons = page.locator('aside').last().locator('div[role="button"]');
      if ((await regionButtons.count()) >= 1) {
        await cursorClick(page, regionButtons.nth(0), 2800);
      }

      // 4. Switch to Back view on the 3D stage
      const backToggle = page.locator('.ant-segmented-item').filter({ hasText: 'Back' }).first();
      await cursorClick(page, backToggle, 3000);
    }
  );

  console.log('\n🎉 All 15 Full HD (1920x1080) presentation videos generated in /home/mnwr/Desktop/SOLVEX/videos/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
