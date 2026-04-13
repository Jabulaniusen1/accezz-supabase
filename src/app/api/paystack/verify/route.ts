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

    // When Paystack confirms success, process the order synchronously before returning.
    // Fire-and-forget does NOT work on Vercel — the serverless function is frozen
    // the moment a response is sent, killing any background async work.
    if (status === 'success' && orderId) {
      try {
        await processSuccessfulPayment(orderId, reference);
      } catch (err) {
        console.error('[verify] processSuccessfulPayment error:', err);
        // Don't block the response — tickets may already exist (idempotent)
      }
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
