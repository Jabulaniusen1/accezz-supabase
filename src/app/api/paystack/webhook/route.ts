import { NextRequest, NextResponse } from 'next/server';
import { finalizeWhatsAppPayment } from '@/lib/whatsapp/flow';
import { verifyPaystackSignature } from '@/lib/paystack';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';
    if (!verifyPaystackSignature(signature, rawBody)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event?.event === 'charge.success') {
      try {
        await finalizeWhatsAppPayment(event);
      } catch (error) {
        console.error('[paystack webhook] Failed to finalize WhatsApp payment', error);
      }
    }

    return NextResponse.json({ received: true, event: event?.event || event?.data?.status || 'unknown' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


