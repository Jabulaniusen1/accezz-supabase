import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/utils/inngest';

/**
 * API route to trigger Inngest events
 * This allows client-side code to trigger Inngest events via API
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventName, data } = body;

    if (!eventName) {
      return NextResponse.json(
        { error: 'Missing eventName' },
        { status: 400 }
      );
    }

    // Trigger the Inngest event
    // In production, this requires INNGEST_EVENT_KEY to be set
    const result = await inngest.send({
      name: eventName,
      data: data || {},
    });

    // Log the result for debugging
    console.log('[Inngest] Event sent:', { eventName, ids: result.ids });

    return NextResponse.json(
      { message: 'Event triggered successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error triggering Inngest event:', error);
    const message = error instanceof Error ? error.message : 'Failed to trigger event';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

