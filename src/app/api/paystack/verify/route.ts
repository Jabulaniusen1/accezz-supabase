import { NextRequest, NextResponse, after } from 'next/server';
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

    // Schedule order processing to run after the response is sent.
    // next/server `after()` keeps the function alive post-response on Vercel,
    // so ticket creation, QR generation, and emails don't block the client.
    // The function is fully idempotent, so a concurrent webhook call is safe.
    if (status === 'success' && orderId) {
      const capturedOrderId = orderId;
      after(async () => {
        try {
          await processSuccessfulPayment(capturedOrderId, reference);
        } catch (err) {
          console.error('[verify] processSuccessfulPayment error:', err);
        }
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
