import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/utils/apiAuth';

// Resolving an account number to a name uses our Paystack key and reveals
// personal data, so only signed-in users (setting up payouts) may call it.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;

  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY not configured' }, { status: 500 });
    }

    const body = await req.json();
    const { account_number, bank_code } = body;

    if (!account_number || !bank_code) {
      return NextResponse.json(
        { error: 'Missing required fields: account_number, bank_code' },
        { status: 400 }
      );
    }

    // Call Paystack resolve account API
    const paystackRes = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(account_number)}&bank_code=${encodeURIComponent(bank_code)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      return NextResponse.json(
        { error: paystackData.message || 'Failed to verify bank account' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      account_name: paystackData.data.account_name,
      account_number: paystackData.data.account_number,
    });
  } catch (err: unknown) {
    console.error('[paystack/verify-bank]', err);
    const message = 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

