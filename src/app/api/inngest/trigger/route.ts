import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/utils/inngest';
import { requireInternalSecret } from '@/utils/apiAuth';

/**
 * Internal API route to trigger Inngest events.
 * Requires the x-internal-secret header to prevent public abuse.
 */
export async function POST(req: NextRequest) {
  const authError = requireInternalSecret(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { eventName, data } = body;

    if (!eventName) {
      return NextResponse.json({ error: 'Missing eventName' }, { status: 400 });
    }

    const result = await inngest.send({
      name: eventName,
      data: data || {},
    });

    return NextResponse.json({ message: 'Event triggered successfully', ids: result.ids }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to trigger event';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

