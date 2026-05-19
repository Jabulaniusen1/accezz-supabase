import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processSuccessfulPayment } from '@/utils/processOrder';

export async function POST(req: NextRequest) {
  try {
    // Require a dedicated webhook secret — never fall back to the secret key
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[webhook] PAYSTACK_WEBHOOK_SECRET is not set — rejecting request');
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
        // Await before returning — fire-and-forget is killed by Vercel on response.
        // Paystack allows up to 30 s for a webhook response, which is enough.
        try {
          await processSuccessfulPayment(orderId, reference);
        } catch (err) {
          console.error('[webhook] processSuccessfulPayment error:', err);
          // Still return 200 so Paystack doesn't retry — idempotency guards prevent double-processing
        }
      }
    }

    return NextResponse.json({ received: true, event: event?.event || 'unknown' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
