import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY || process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY not configured' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    const { email, amount, currency = 'NGN', orderId, callbackUrl } = body || {};

    if (!email || !amount || !orderId) {
      return NextResponse.json({ error: 'Missing required fields: email, amount, orderId' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const callback = callbackUrl || `${baseUrl}/success?orderId=${encodeURIComponent(orderId)}`;

    const reference = `ORD-${orderId}-${Date.now()}`;

    const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
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


