import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processPaymentSuccess } from '@/utils/paymentUtils';

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error('[Webhook] Webhook secret not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';
    const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    if (signature !== expected) {
      console.error('[Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.event;
    const eventData = event?.data;

    console.log('[Webhook] Received event:', { eventType, reference: eventData?.reference });

    // Process charge.success events
    if (eventType === 'charge.success') {
      const reference = eventData?.reference;
      const orderId = eventData?.metadata?.orderId;
      const status = eventData?.status;

      // Validate required fields
      if (!reference) {
        console.error('[Webhook] Missing reference in charge.success event');
        return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
      }

      if (!orderId) {
        console.error('[Webhook] Missing orderId in charge.success event metadata');
        return NextResponse.json({ error: 'Missing orderId in metadata' }, { status: 400 });
      }

      if (status !== 'success') {
        console.log('[Webhook] Charge status is not success:', status);
        return NextResponse.json({ received: true, processed: false, reason: 'status_not_success' });
      }

      // Process payment (idempotent - handles duplicate webhooks)
      console.log('[Webhook] Processing payment success:', { orderId, reference });
      
      // Process asynchronously - return 200 immediately to acknowledge webhook
      // Paystack expects quick response, so we don't wait for ticket creation
      processPaymentSuccess(orderId, reference, 'paystack')
        .then(result => {
          if (result.success) {
            console.log('[Webhook] Payment processed successfully:', { orderId, reference, ticketsCreated: result.ticketsCreated });
          } else {
            console.error('[Webhook] Payment processing failed:', { orderId, reference, message: result.message });
          }
        })
        .catch(error => {
          console.error('[Webhook] Error processing payment:', { orderId, reference, error });
        });

      // Return 200 immediately (webhook acknowledged)
      return NextResponse.json({ 
        received: true, 
        processed: true, 
        event: eventType,
        orderId,
        reference 
      });
    }

    // For other event types, just acknowledge
    console.log('[Webhook] Event type not processed:', eventType);
    return NextResponse.json({ 
      received: true, 
      processed: false, 
      event: eventType,
      reason: 'event_type_not_handled' 
    });
  } catch (err: unknown) {
    console.error('[Webhook] Error processing webhook:', err);
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


