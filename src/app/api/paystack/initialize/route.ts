import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/processOrder';

/**
 * Start a Paystack checkout for an existing pending order.
 * Amount, currency and email come from the order (priced by /api/orders),
 * never from the request body.
 */
export async function POST(req: NextRequest) {
  try {
    // Only use server-side key — NEVER fall back to a NEXT_PUBLIC_ variable
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('[initialize] PAYSTACK_SECRET_KEY is not set');
      return NextResponse.json({ error: 'Payments are not configured' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const { orderId, callbackUrl } = (body || {}) as { orderId?: string; callbackUrl?: string };

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, amount_due, currency, buyer_email, meta')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'This order has already been processed' }, { status: 409 });
    }
    // Tickets plus the service charge and Paystack fee
    const amount = Number(order.amount_due);
    if (!(amount > 0)) {
      return NextResponse.json({ error: 'This order does not need payment' }, { status: 400 });
    }

    // Re-check availability right before the customer pays
    const meta = (order.meta as Record<string, unknown> | null) || {};
    if (typeof meta.ticketTypeId === 'string') {
      const { data: ticketType } = await supabaseAdmin
        .from('ticket_types')
        .select('quantity, sold')
        .eq('id', meta.ticketTypeId)
        .maybeSingle();
      const quantity = Number(meta.quantity) || 1;
      if (ticketType && Number(ticketType.quantity) - Number(ticketType.sold) < quantity) {
        return NextResponse.json({ error: 'Sorry, these tickets sold out before checkout' }, { status: 409 });
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    // Validate callbackUrl against trusted origins to prevent open redirect
    const allowedHosts = new Set([
      new URL(baseUrl).host,
      req.nextUrl.host,
    ]);
    let callback = `${baseUrl}/success?orderId=${encodeURIComponent(orderId)}`;
    if (callbackUrl) {
      try {
        const parsed = new URL(callbackUrl);
        if (allowedHosts.has(parsed.host)) {
          callback = callbackUrl;
        }
      } catch {
        // malformed URL — use default
      }
    }

    const reference = `ORD-${orderId}-${Date.now()}`;
    const currency = (order.currency || 'NGN').toUpperCase();

    const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: order.buyer_email,
        amount: Math.round(amount * 100),
        currency,
        reference,
        callback_url: callback,
        metadata: {
          orderId,
          integration: 'accezz-supabase'
        }
      })
    });

    const raw = await initRes.text();
    let initJson: { status?: boolean; data?: { authorization_url?: string; access_code?: string }; message?: string } | null = null;
    try { initJson = raw ? (JSON.parse(raw) as { status?: boolean; data?: { authorization_url?: string; access_code?: string }; message?: string }) : null; } catch { initJson = null; }

    if (!initRes.ok || !initJson?.status || !initJson.data?.authorization_url) {
      console.error('[initialize] Paystack initialize failed:', initRes.status, initJson?.message || raw);
      return NextResponse.json({ error: initJson?.message || 'Failed to start payment' }, { status: 400 });
    }

    await supabaseAdmin
      .from('orders')
      .update({ payment_provider: 'paystack', payment_reference: reference })
      .eq('id', orderId)
      .eq('status', 'pending');

    return NextResponse.json({
      authorization_url: initJson.data.authorization_url,
      access_code: initJson.data.access_code,
      reference,
    });
  } catch (err: unknown) {
    console.error('[initialize] Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
