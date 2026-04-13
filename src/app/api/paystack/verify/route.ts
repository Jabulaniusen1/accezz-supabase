import { NextRequest, NextResponse } from 'next/server';
import { processSuccessfulPayment } from '@/utils/processOrder';

export async function GET(req: NextRequest) {
  try {
    // Only use server-side key — NEVER fall back to a NEXT_PUBLIC_ variable
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY not configured' }, { status: 500 });
    }

    const reference = req.nextUrl.searchParams.get('reference');
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${secretKey}` }
    });
    const data = await res.json();
    if (!res.ok || !data?.status) {
      return NextResponse.json({ error: data?.message || 'Verification failed' }, { status: 400 });
    }

    const status: string = data.data.status; // success | failed | abandoned
    const orderId: string | undefined = data.data?.metadata?.orderId;
    const amount: number | undefined = typeof data.data.amount === 'number' ? data.data.amount / 100 : undefined;

    // When Paystack confirms success, process the order here as a fallback in case
    // the webhook fires late or isn't yet configured (e.g. test mode without a tunnel).
    if (status === 'success' && orderId) {
      processSuccessfulPayment(orderId, reference).catch((err) => {
        console.error('[verify] processSuccessfulPayment error:', err);
      });
    }

    return NextResponse.json({
      status,
      reference,
      orderId,
      amount,
      raw: data.data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
