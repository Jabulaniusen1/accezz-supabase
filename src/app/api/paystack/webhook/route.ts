import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature') || '';
    const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

    if (signature !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // Handle transfer status updates for withdrawals
    const type = event?.event as string | undefined;
    if (type && type.startsWith('transfer.')) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      const data = event?.data || {};
      const transferCode = data?.transfer_code || data?.transfer_code || null;
      const status = data?.status || (type === 'transfer.success' ? 'success' : type === 'transfer.failed' ? 'failed' : null);

      if (transferCode && status) {
        await supabaseAdmin
          .from('payouts')
          .update({ status, raw: event })
          .eq('transfer_code', transferCode);
      }
    }

    return NextResponse.json({ received: true, event: event?.event || event?.data?.status || 'unknown' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


