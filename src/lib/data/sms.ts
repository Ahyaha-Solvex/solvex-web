import { z } from 'zod';
import type { ParsedSms } from './types';

export const parsedSmsSchema = z.object({
  id: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time format (HH:MM)'),
  confidence: z.number().min(0).max(100),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXTREME']),
  occupants: z.number().int().min(1),
  bloodType: z.string().optional(),
});

export type ParseSmsResult =
  | { ok: true; data: ParsedSms }
  | { ok: false; error: string };

/**
 * Parses a standard blackbox SMS alert line according to DATA_CONTRACT.md:
 * SOS|36.3741,3.9012|02:13|C85|SEV:HIGH|OCC:2|O+|ID4821
 */
export function parseSms(raw: string): ParseSmsResult {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'Empty or invalid SMS payload' };
  }

  const trimmed = raw.trim();
  const parts = trimmed.split('|');

  if (parts.length < 6) {
    return { ok: false, error: `Insufficient SMS segments (expected at least 6, got ${parts.length})` };
  }

  // Segment 0: Must be 'SOS'
  if (parts[0] !== 'SOS') {
    return { ok: false, error: `Invalid header '${parts[0]}' (expected 'SOS')` };
  }

  // Segment 1: Coordinates lat,lng
  const coordParts = parts[1].split(',');
  if (coordParts.length !== 2) {
    return { ok: false, error: `Invalid coordinate pair '${parts[1]}' (expected lat,lng)` };
  }
  const lat = parseFloat(coordParts[0]);
  const lng = parseFloat(coordParts[1]);
  if (isNaN(lat) || isNaN(lng)) {
    return { ok: false, error: `Non-numeric coordinates in '${parts[1]}'` };
  }

  // Segment 2: Time HH:MM
  const time = parts[2];

  // Segment 3: Confidence C<0-100>
  if (!parts[3].startsWith('C')) {
    return { ok: false, error: `Invalid confidence format '${parts[3]}' (expected C<score>)` };
  }
  const confidence = parseInt(parts[3].slice(1), 10);
  if (isNaN(confidence)) {
    return { ok: false, error: `Non-numeric confidence in '${parts[3]}'` };
  }

  // Segment 4: SEV:<LEVEL>
  if (!parts[4].startsWith('SEV:')) {
    return { ok: false, error: `Invalid severity prefix in '${parts[4]}' (expected SEV:<LEVEL>)` };
  }
  const severity = parts[4].slice(4).toUpperCase();

  // Segment 5: OCC:<int>
  if (!parts[5].startsWith('OCC:')) {
    return { ok: false, error: `Invalid occupant prefix in '${parts[5]}' (expected OCC:<int>)` };
  }
  const occupants = parseInt(parts[5].slice(4), 10);
  if (isNaN(occupants)) {
    return { ok: false, error: `Non-numeric occupants in '${parts[5]}'` };
  }

  // Optional segments 6 & 7: BloodType and/or ID<digits>
  let bloodType: string | undefined;
  let id = '';

  if (parts.length > 6) {
    if (parts[6].startsWith('ID')) {
      id = parts[6].slice(2);
    } else {
      bloodType = parts[6];
      if (parts.length > 7 && parts[7].startsWith('ID')) {
        id = parts[7].slice(2);
      }
    }
  }

  // Fallback ID if missing
  if (!id) {
    return { ok: false, error: 'Missing incident ID field in SMS (expected ID<digits>)' };
  }

  const candidate = {
    id,
    lat,
    lng,
    time,
    confidence,
    severity,
    occupants,
    bloodType,
  };

  const validation = parsedSmsSchema.safeParse(candidate);
  if (!validation.success) {
    return {
      ok: false,
      error: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
    };
  }

  return { ok: true, data: validation.data };
}

/**
 * Encodes a parsed SMS object back to standard blackbox 160-char SMS string
 */
export function formatSms(data: ParsedSms): string {
  const parts = [
    'SOS',
    `${data.lat.toFixed(4)},${data.lng.toFixed(4)}`,
    data.time,
    `C${Math.round(data.confidence)}`,
    `SEV:${data.severity}`,
    `OCC:${data.occupants}`,
  ];
  if (data.bloodType) {
    parts.push(data.bloodType);
  }
  parts.push(`ID${data.id}`);
  return parts.join('|');
}
