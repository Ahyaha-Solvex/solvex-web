import { describe, it, expect } from 'vitest';
import { parseSms, formatSms } from '../sms';

describe('SMS Alert Parser (DATA_CONTRACT.md)', () => {
  it('parses the reference spec SMS string correctly', () => {
    const raw = 'SOS|36.3741,3.9012|02:13|C85|SEV:HIGH|OCC:2|O+|ID4821';
    const result = parseSms(raw);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.id).toBe('4821');
    expect(result.data.lat).toBe(36.3741);
    expect(result.data.lng).toBe(3.9012);
    expect(result.data.time).toBe('02:13');
    expect(result.data.confidence).toBe(85);
    expect(result.data.severity).toBe('HIGH');
    expect(result.data.occupants).toBe(2);
    expect(result.data.bloodType).toBe('O+');
  });

  it('parses valid SMS without blood type', () => {
    const raw = 'SOS|36.3741,3.9012|14:45|C92|SEV:EXTREME|OCC:1|ID9901';
    const result = parseSms(raw);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.id).toBe('9901');
    expect(result.data.bloodType).toBeUndefined();
    expect(result.data.severity).toBe('EXTREME');
    expect(result.data.confidence).toBe(92);
  });

  it('ignores extra trailing fields gracefully', () => {
    const raw = 'SOS|36.3741,3.9012|02:13|C75|SEV:MEDIUM|OCC:3|A-|ID1234|EXTRA_BATTERY_98|LORA_RSSI_-84';
    const result = parseSms(raw);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.id).toBe('1234');
    expect(result.data.bloodType).toBe('A-');
    expect(result.data.confidence).toBe(75);
  });

  it('rejects SMS with invalid header', () => {
    const raw = 'ALERT|36.3741,3.9012|02:13|C85|SEV:HIGH|OCC:2|ID4821';
    const result = parseSms(raw);
    expect(result.ok).toBe(false);
  });

  it('rejects SMS with non-numeric coordinates', () => {
    const raw = 'SOS|abc,def|02:13|C85|SEV:HIGH|OCC:2|ID4821';
    const result = parseSms(raw);
    expect(result.ok).toBe(false);
  });

  it('rejects SMS with invalid severity', () => {
    const raw = 'SOS|36.3741,3.9012|02:13|C85|SEV:CRITICAL|OCC:2|ID4821';
    const result = parseSms(raw);
    expect(result.ok).toBe(false);
  });

  it('rejects SMS with out of range confidence', () => {
    const raw = 'SOS|36.3741,3.9012|02:13|C150|SEV:HIGH|OCC:2|ID4821';
    const result = parseSms(raw);
    expect(result.ok).toBe(false);
  });

  it('correctly roundtrips formatted SMS', () => {
    const original = {
      id: '4821',
      lat: 36.3741,
      lng: 3.9012,
      time: '02:13',
      confidence: 85,
      severity: 'HIGH' as const,
      occupants: 2,
      bloodType: 'O+',
    };
    const encoded = formatSms(original);
    expect(encoded).toBe('SOS|36.3741,3.9012|02:13|C85|SEV:HIGH|OCC:2|O+|ID4821');

    const reparsed = parseSms(encoded);
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      expect(reparsed.data).toEqual(original);
    }
  });
});
