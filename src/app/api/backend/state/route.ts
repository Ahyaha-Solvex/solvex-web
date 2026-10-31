import { NextResponse } from 'next/server';
import { getServerEngine } from '@/lib/data/serverEngine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const engine = getServerEngine();
  return NextResponse.json({
    ok: true,
    incidents: engine.incidents,
    ambulances: engine.ambulances,
    online: engine.online,
    updatedAt: engine.updatedAt,
  });
}
