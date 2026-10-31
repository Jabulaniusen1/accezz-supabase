import { NextRequest, NextResponse, after } from 'next/server';
import { fulfilOrder } from '@/utils/processOrder';

// Issuing tickets also renders QR codes and sends emails (up to 20 per order)
export const maxDuration = 60;

// Paystack statuses that mean "not settled yet" (bank transfer, USSD, etc.)
const PENDING_STATUSES = new Set(['ongoing', 'pending', 'processing', 'queued']);

export async function GET(req: NextRequest) {
  try {
    // Only use server-side key — NEVER fall back to a NEXT_PUBLIC_ variable
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('[verify] PAYSTACK_SECRET_KEY is not set');
      return NextResponse.json({ error: 'Payments are not configured' }, { status: 500 });
    }

    const reference = req.nextUrl.searchParams.get('reference');
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${secretKey}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.status) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const paystackStatus: string = data.data?.status || 'failed';
    const orderId: string | undefined = data.data?.metadata?.orderId;
    const amountPaid = typeof data.data?.amount === 'number' ? data.data.amount / 100 : null;
    const currency: string | null = data.data?.currency || null;

    // Fulfil after the response is sent; the webhook does the same and
    // fulfil_order makes the two idempotent.
    if (paystackStatus === 'success' && orderId) {
      after(async () => {
        try {
          await fulfilOrder(orderId, { provider: 'paystack', reference, amountPaid, currency });
        } catch (err) {
          console.error('[verify] fulfilOrder error:', err);
        }
      });
    }

    const status = paystackStatus === 'success'
      ? 'success'
      : PENDING_STATUSES.has(paystackStatus) ? 'pending' : 'failed';

    // Only what the success page needs — never the raw transaction
    return NextResponse.json({ status, orderId: orderId || null });
  } catch (err: unknown) {
    console.error('[verify] Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
