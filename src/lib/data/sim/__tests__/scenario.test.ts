import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SimSource } from '../scenario';
import { useIncidentStore } from '@/lib/stores/incidentStore';
import type { Incident, SourceEvent } from '../../types';

describe('SimSource & IncidentStore (CP1 Data Layer)', () => {
  let sim: SimSource;

  beforeEach(() => {
    sim = new SimSource();
    useIncidentStore.setState({
      incidents: {},
      activeIncidentId: null,
      ambulances: [],
      online: true,
      eventLog: [],
    });
  });

  afterEach(() => {
    sim.stop();
  });

  it('subscribes and emits initial state to listener', () => {
    const events: SourceEvent[] = [];
    sim.subscribe((ev) => events.push(ev));

    expect(events.length).toBeGreaterThanOrEqual(3);
    const hasIncident = events.some((e) => e.type === 'incident_upsert');
    const hasAmbulances = events.some((e) => e.type === 'ambulances');
    const hasNetwork = events.some((e) => e.type === 'network' && e.online === true);

    expect(hasIncident).toBe(true);
    expect(hasAmbulances).toBe(true);
    expect(hasNetwork).toBe(true);
  });

  it('toggles network off and transitions to SMS-only path', () => {
    const events: SourceEvent[] = [];
    sim.subscribe((ev) => events.push(ev));

    sim.toggleNetwork(false);

    expect(sim.isOnline()).toBe(false);
    const networkEvent = events.find((e) => e.type === 'network' && !e.online);
    expect(networkEvent).toBeDefined();

    // Verify last incident emitted has channel 'sms' and no telemetry
    const incidentEvents = events.filter((e) => e.type === 'incident_upsert');
    const lastIncident = incidentEvents[incidentEvents.length - 1];
    if (lastIncident && lastIncident.type === 'incident_upsert') {
      expect(lastIncident.incident.channel).toBe('sms');
      expect(lastIncident.incident.telemetry).toBeUndefined();
      expect(lastIncident.incident.crash).toBeUndefined();
    }
  });

  it('restarts scenario cleanly', () => {
    const events: SourceEvent[] = [];
    sim.subscribe((ev) => events.push(ev));

    sim.confirm('inc-rn5-4821');
    sim.restart();

    // After restart, online default incident is restored
    expect(sim.isOnline()).toBe(true);
  });

  it('confirms crash via dispatcher action', () => {
    let activeInc: Incident | null = null;
    sim.subscribe((ev) => {
      if (ev.type === 'incident_upsert') activeInc = ev.incident;
    });

    sim.confirm('inc-rn5-4821');

    expect(activeInc).toBeDefined();
    if (activeInc) {
      expect((activeInc as Incident).confidence.status).toBe('confirmed');
      expect((activeInc as Incident).confidence.score).toBe(100);
    }
  });

  it('assigns ambulance and produces outbound SMS notification', () => {
    const events: SourceEvent[] = [];
    sim.subscribe((ev) => events.push(ev));

    sim.assignAmbulance('inc-rn5-4821', 'amb-102');

    const lastIncidentEv = events.filter((e) => e.type === 'incident_upsert').pop();
    expect(lastIncidentEv).toBeDefined();
    if (lastIncidentEv && lastIncidentEv.type === 'incident_upsert') {
      expect(lastIncidentEv.incident.lifecycle).toBe('dispatched');
      expect(lastIncidentEv.incident.dispatch.ambulanceId).toBe('amb-102');
      expect(lastIncidentEv.incident.dispatch.etaToSceneS).toBe(660);

      // Verify outbound SMS was added
      const outboundSms = lastIncidentEv.incident.sms.find((s) => s.dir === 'out');
      expect(outboundSms).toBeDefined();
      expect(outboundSms?.raw).toContain('Protection Civile: Ambulance engagée');
    }
  });

  it('integrates cleanly with Zustand store applyEvent reducer', () => {
    const store = useIncidentStore.getState();
    sim.subscribe((ev) => store.applyEvent(ev));

    const active = useIncidentStore.getState().getActiveIncident();
    expect(active).toBeDefined();
    expect(active?.id).toBe('inc-rn5-4821');

    // Ambulances populated
    expect(useIncidentStore.getState().ambulances.length).toBe(3);
    // Event log contains entries
    expect(useIncidentStore.getState().eventLog.length).toBeGreaterThan(0);
  });
});
