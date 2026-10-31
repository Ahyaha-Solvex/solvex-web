import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerEngine } from '@/lib/data/serverEngine';

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('confirm'), incidentId: z.string() }),
  z.object({
    action: z.literal('assignAmbulance'),
    incidentId: z.string(),
    ambulanceId: z.string(),
  }),
  z.object({
    action: z.literal('dispatchToHospital'),
    incidentId: z.string(),
    hospitalId: z.string(),
    ambulanceId: z.string().optional(),
  }),
  z.object({
    action: z.literal('callForHelp'),
    incidentId: z.string(),
    radiusM: z.number(),
  }),
  z.object({
    action: z.literal('callVolunteer'),
    incidentId: z.string(),
    personId: z.string(),
  }),
  z.object({
    action: z.literal('confirmHelper'),
    incidentId: z.string(),
    personId: z.string(),
  }),
  z.object({
    action: z.literal('callContact'),
    incidentId: z.string(),
    who: z.enum(['driver', 'contact']),
  }),
  z.object({
    action: z.literal('setTriage'),
    incidentId: z.string(),
    occupantId: z.string(),
    color: z.enum(['green', 'yellow', 'red', 'black']),
  }),
  z.object({
    action: z.literal('assignHospital'),
    incidentId: z.string(),
    occupantId: z.string(),
    hospitalId: z.string(),
  }),
  z.object({
    action: z.literal('reportPhoneCall'),
    report: z.object({
      roadLabel: z.string(),
      victims: z.number(),
      conscious: z.boolean(),
      breathing: z.boolean(),
      bleeding: z.boolean(),
      trapped: z.boolean(),
    }),
  }),
  z.object({
    action: z.literal('warnDriver'),
    incidentId: z.string(),
    message: z.enum(['dont_go', 'no_help']),
  }),
  z.object({ action: z.literal('acknowledge'), incidentId: z.string() }),
  z.object({ action: z.literal('close'), incidentId: z.string() }),
  z.object({ action: z.literal('toggleNetwork'), online: z.boolean() }),
  z.object({ action: z.literal('toggleWitnesses'), enabled: z.boolean() }),
  z.object({ action: z.literal('setSpeed'), multiplier: z.number() }),
  z.object({ action: z.literal('restart') }),
  z.object({ action: z.literal('triggerUserOk') }),
  z.object({ action: z.literal('triggerSos') }),
  z.object({ action: z.literal('startDeadZone') }),
  z.object({ action: z.literal('triggerIsolatedCrash') }),
  z.object({ action: z.literal('triggerMultiWitnessCrash') }),
]);

export async function POST(request: Request) {
  try {
    const raw: unknown = await request.json();
    const parsed = ActionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const engine = getServerEngine();
    const { source } = engine;
    const cmd = parsed.data;

    switch (cmd.action) {
      case 'confirm':
        source.confirm(cmd.incidentId);
        break;
      case 'assignAmbulance':
        source.assignAmbulance(cmd.incidentId, cmd.ambulanceId);
        break;
      case 'dispatchToHospital':
        source.dispatchToHospital(cmd.incidentId, cmd.hospitalId, cmd.ambulanceId);
        break;
      case 'callForHelp':
        source.callForHelp(cmd.incidentId, cmd.radiusM);
        break;
      case 'callVolunteer':
        source.callVolunteer(cmd.incidentId, cmd.personId);
        break;
      case 'confirmHelper':
        source.confirmHelper(cmd.incidentId, cmd.personId);
        break;
      case 'callContact':
        source.callContact(cmd.incidentId, cmd.who);
        break;
      case 'setTriage':
        source.setTriage(cmd.incidentId, cmd.occupantId, cmd.color);
        break;
      case 'assignHospital':
        source.assignHospital(cmd.incidentId, cmd.occupantId, cmd.hospitalId);
        break;
      case 'reportPhoneCall':
        source.reportPhoneCall(cmd.report);
        break;
      case 'warnDriver':
        source.warnDriver(cmd.incidentId, cmd.message);
        break;
      case 'acknowledge':
        source.acknowledge(cmd.incidentId);
        break;
      case 'close':
        source.close(cmd.incidentId);
        break;
      case 'toggleNetwork':
        source.toggleNetwork(cmd.online);
        break;
      case 'toggleWitnesses':
        source.toggleWitnesses(cmd.enabled);
        break;
      case 'setSpeed':
        source.setSpeed(cmd.multiplier);
        break;
      case 'restart':
        source.restart();
        break;
      case 'triggerUserOk':
        source.triggerUserOk();
        break;
      case 'triggerSos':
        source.triggerSos();
        break;
      case 'startDeadZone':
        source.startDeadZone();
        break;
      case 'triggerIsolatedCrash':
        source.triggerIsolatedCrash();
        break;
      case 'triggerMultiWitnessCrash':
        source.triggerMultiWitnessCrash();
        break;
    }

    return NextResponse.json({
      ok: true,
      incidents: engine.incidents,
      ambulances: engine.ambulances,
      online: engine.online,
      updatedAt: engine.updatedAt,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 500 }
    );
  }
}
