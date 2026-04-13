import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processSuccessfulPayment } from '@/utils/processOrder';

export async function POST(req: NextRequest) {
  try {
    // Only use server-side keys — NEVER fall back to a NEXT_PUBLIC_ variable
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';
    const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event?: string;
      data?: {
        status?: string;
        reference?: string;
        metadata?: { orderId?: string };
      };
    };

    // Handle successful charge
    if (event.event === 'charge.success' && event.data?.status === 'success') {
      const reference = event.data.reference || '';
      const orderId = event.data.metadata?.orderId || '';

      if (orderId) {
        // Process asynchronously so we can return 200 immediately
        processSuccessfulPayment(orderId, reference).catch((err) => {
          console.error('[webhook] processSuccessfulPayment error:', err);
        });
      }
    }

    return NextResponse.json({ received: true, event: event?.event || 'unknown' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
