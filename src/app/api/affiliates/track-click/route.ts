import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/processOrder';

export async function POST(req: NextRequest) {
  try {
    const { affiliateCode } = await req.json();
    if (!affiliateCode) {
      return NextResponse.json({ error: 'affiliateCode required' }, { status: 400 });
    }

    // Increment click count — fire and forget style (non-critical)
    const { data: affiliate } = await supabaseAdmin
      .from('affiliates')
      .select('id, clicks')
      .eq('affiliate_code', affiliateCode)
      .single();

    if (affiliate) {
      await supabaseAdmin
        .from('affiliates')
        .update({ clicks: affiliate.clicks + 1 })
        .eq('id', affiliate.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Non-critical — don't fail the user's page load
    return NextResponse.json({ ok: true });
  }
}
