import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { fulfilOrder, supabaseAdmin } from '@/utils/processOrder';
import { safeEqual } from '@/utils/apiAuth';

// Issuing tickets also renders QR codes and sends emails (up to 20 per order)
export const maxDuration = 60;

type PaystackEvent = {
  event?: string;
  data?: {
    status?: string;
    reference?: string;
    transaction_reference?: string;
    amount?: number;
    currency?: string;
    metadata?: { orderId?: string };
  };
};

const ORDER_REFERENCE_RE = /^ORD-([0-9a-f-]{36})-\d+$/i;

export async function POST(req: NextRequest) {
  // Paystack signs webhooks with the account's secret key (there is no separate webhook secret)
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error('[webhook] PAYSTACK_SECRET_KEY is not set — rejecting request');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature') || '';
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  if (!safeEqual(signature, expected)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    if (event.event === 'charge.success' && event.data?.status === 'success') {
      const orderId = event.data.metadata?.orderId;
      if (orderId) {
        // Awaited: Vercel stops the function once the response is sent.
        // Infrastructure errors throw and return 500, so Paystack retries.
        await fulfilOrder(orderId, {
          provider: 'paystack',
          reference: event.data.reference || null,
          amountPaid: typeof event.data.amount === 'number' ? event.data.amount / 100 : null,
          currency: event.data.currency || null,
        });
      }
    }

    if (event.event === 'refund.processed') {
      await handleRefund(event.data);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook] Processing failed:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handleRefund(data: PaystackEvent['data']) {
  const reference = data?.transaction_reference || data?.reference;
  if (!reference) return;

  let { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount')
    .eq('payment_reference', reference)
    .maybeSingle();

  if (!order) {
    const match = ORDER_REFERENCE_RE.exec(reference);
    if (match) {
      ({ data: order } = await supabaseAdmin
        .from('orders')
        .select('id, total_amount')
        .eq('id', match[1])
        .maybeSingle());
    }
  }
  if (!order) {
    console.warn('[webhook] Refund for unknown reference:', reference);
    return;
  }

  // Partial refunds leave the tickets valid; an admin decides what to revoke
  const refundedKobo = Number(data?.amount) || 0;
  if (refundedKobo < Math.round(Number(order.total_amount) * 100)) {
    console.warn('[webhook] Partial refund recorded without revoking tickets:', order.id, refundedKobo);
    return;
  }

  const { error } = await supabaseAdmin.rpc('refund_order', { p_order_id: order.id, p_reference: reference });
  if (error) throw new Error(`refund_order failed: ${error.message}`);
}
