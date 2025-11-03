import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || process.env.NEXT_PUBLIC_PAYSTACK_SECRET_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!PAYSTACK_SECRET) {
      return NextResponse.json({ error: 'Paystack secret not configured' }, { status: 500 });
    }

    const { amount } = await req.json();
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Authenticate via Authorization: Bearer <access_token>
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : undefined;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = userData.user;

    // Fetch profile for bank details and recipient code
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('account_name, account_number, bank_code, bank_name, currency, paystack_recipient_code')
      .eq('user_id', user.id)
      .single();
    if (pErr) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 400 });
    }

    const currency = profile?.currency || 'NGN';
    if (!profile?.account_number || !profile?.bank_code) {
      return NextResponse.json({ error: 'Add and verify your bank details first' }, { status: 400 });
    }

    // Compute available balance for this user directly
    const { data: revenueRows, error: revErr } = await supabaseAdmin
      .from('orders')
      .select('total_amount, events!inner(user_id)')
      .eq('status', 'paid')
      .eq('events.user_id', user.id);
    if (revErr) {
      return NextResponse.json({ error: 'Could not compute revenue' }, { status: 500 });
    }
    const revenueSum = (revenueRows || []).reduce((sum: number, r: any) => sum + Number(r.total_amount || 0), 0);

    const { data: payoutRows, error: payoutsErr } = await supabaseAdmin
      .from('payouts')
      .select('amount')
      .eq('user_id', user.id)
      .in('status', ['pending', 'success']);
    if (payoutsErr) {
      return NextResponse.json({ error: 'Could not compute payouts' }, { status: 500 });
    }
    const payoutSum = (payoutRows || []).reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
    const available = Number(revenueSum) - Number(payoutSum);
    if (amount > available) {
      return NextResponse.json({ error: 'Amount exceeds available balance' }, { status: 400 });
    }

    // Ensure transfer recipient exists on Paystack
    let recipientCode = profile?.paystack_recipient_code as string | null;
    if (!recipientCode) {
      const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: profile.account_name || user.email || 'Accezz User',
          account_number: profile.account_number,
          bank_code: profile.bank_code,
          currency,
        }),
      });
      const recipientData = await recipientRes.json();
      if (!recipientRes.ok || !recipientData?.status) {
        return NextResponse.json({ error: recipientData?.message || 'Failed to create transfer recipient' }, { status: 400 });
      }
      recipientCode = recipientData?.data?.recipient_code;
      if (recipientCode) {
        await supabaseAdmin
          .from('profiles')
          .update({ paystack_recipient_code: recipientCode })
          .eq('user_id', user.id);
      }
    }

    if (!recipientCode) {
      return NextResponse.json({ error: 'Recipient setup failed' }, { status: 500 });
    }

    // Initiate transfer (amount must be in kobo)
    const reference = `WD-${user.id}-${Date.now()}`;
    const initiateRes = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(amount * 100),
        recipient: recipientCode,
        reason: 'Event earnings withdrawal',
        reference,
      }),
    });
    const initiateData = await initiateRes.json();
    if (!initiateRes.ok || !initiateData?.status) {
      return NextResponse.json({ error: initiateData?.message || 'Transfer initiation failed' }, { status: 400 });
    }

    const transferCode = initiateData?.data?.transfer_code || null;

    // Record payout as pending (reserve balance)
    await supabaseAdmin
      .from('payouts')
      .insert({
        user_id: user.id,
        amount,
        currency,
        recipient_code: recipientCode,
        transfer_code: transferCode,
        reference,
        status: 'pending',
        raw: initiateData || null,
      });

    return NextResponse.json({
      status: 'pending',
      reference,
      transfer_code: transferCode,
      message: 'Withdrawal initiated. You will be notified when it completes.'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


