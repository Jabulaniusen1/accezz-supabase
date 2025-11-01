import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'PAYSTACK_SECRET_KEY not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country') || 'nigeria';
    
    // Normalize country name for Paystack (lowercase, keep full name)
    const normalizedCountry = country.toLowerCase();

    // Fetch banks from Paystack
    const banksRes = await fetch(
      `https://api.paystack.co/bank?country=${encodeURIComponent(normalizedCountry)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const banksData = await banksRes.json();

    if (!banksRes.ok || !banksData.status) {
      return NextResponse.json(
        { error: banksData.message || 'Failed to fetch banks' },
        { status: 400 }
      );
    }

    // Map Paystack format to our format
    const banks = banksData.data.map((bank: { code: string; name: string }) => ({
      code: bank.code,
      name: bank.name
    }));

    return NextResponse.json({ banks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

