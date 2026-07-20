import { NextRequest, NextResponse } from 'next/server';
import { timingSafeStringEqual } from '@/lib/budgetAuth';
import { ingestSimpleFin } from '@/lib/budget/simplefin/sync';

/**
 * Triggered daily by Vercel Cron (see vercel.json), which sends `Authorization: Bearer
 * ${CRON_SECRET}` automatically -- checked here so this route can't be run by a random request
 * to the public path. Also callable manually (same header) for on-demand syncs outside the
 * Overview page's "Sync now" button.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization');
  const expected = secret ? `Bearer ${secret}` : null;

  if (!expected || !header || !timingSafeStringEqual(header, expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await ingestSimpleFin();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
