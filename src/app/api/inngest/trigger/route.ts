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

    console.log('[Inngest Trigger] Received request:', { eventName, hasData: !!data });

    if (!eventName) {
      console.error('[Inngest Trigger] Missing eventName');
      return NextResponse.json(
        { error: 'Missing eventName' },
        { status: 400 }
      );
    }

    // Check if eventKey is configured
    if (!process.env.INNGEST_EVENT_KEY) {
      console.warn('[Inngest Trigger] INNGEST_EVENT_KEY not set - events may not be sent in production');
    }

    console.log('[Inngest Trigger] Sending event to Inngest:', { eventName, data });
    
    const result = await inngest.send({
      name: eventName,
      data: data || {},
    });

    console.log('[Inngest Trigger] Event sent successfully:', { 
      eventName, 
      ids: result.ids,
      hasEventKey: !!process.env.INNGEST_EVENT_KEY 
    });

    return NextResponse.json(
      { 
        message: 'Event triggered successfully',
        ids: result.ids,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('[Inngest Trigger] Error triggering Inngest event:', error);
    const message = error instanceof Error ? error.message : 'Failed to trigger event';
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : { error: String(error) };
    
    return NextResponse.json(
      { 
        error: message,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}

