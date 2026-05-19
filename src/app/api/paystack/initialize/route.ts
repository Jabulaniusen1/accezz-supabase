import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/processOrder';

export async function POST(req: NextRequest) {
  try {
    // Only use server-side key — NEVER fall back to a NEXT_PUBLIC_ variable
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY not configured' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const { email, amount, currency = 'NGN', orderId, callbackUrl, affiliateCode } = body || {};

    if (!email || !amount || !orderId) {
      return NextResponse.json({ error: 'Missing required fields: email, amount, orderId' }, { status: 400 });
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

    // Persist affiliateCode into the order meta so processOrder can attribute commission
    if (affiliateCode && orderId) {
      try {
        const { data: currentOrder } = await supabaseAdmin
          .from('orders')
          .select('meta')
          .eq('id', orderId)
          .single();
        const existingMeta = (currentOrder?.meta as Record<string, unknown>) || {};
        await supabaseAdmin
          .from('orders')
          .update({ meta: { ...existingMeta, affiliateCode } })
          .eq('id', orderId);
      } catch {
        // Non-critical — don't block payment initialization
      }
    }

    const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(amount) * 100),
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

    if (!initRes.ok || !initJson?.status) {
      const message = initJson?.message || raw || 'Failed to initialize transaction';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!initJson?.data?.authorization_url) {
      return NextResponse.json({ error: 'Missing authorization_url from Paystack' }, { status: 400 });
    }

    return NextResponse.json({
      authorization_url: initJson.data.authorization_url,
      access_code: initJson.data?.access_code,
      reference,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


