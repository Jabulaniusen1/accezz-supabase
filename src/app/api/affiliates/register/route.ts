import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/utils/processOrder';
import { createClient } from '@supabase/supabase-js';

function generateAffiliateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusable chars
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    // Auth
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await req.json();
    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    // Check affiliate program is enabled for this event
    const { data: settings } = await supabaseAdmin
      .from('affiliate_settings')
      .select('enabled, commission_type, commission_value')
      .eq('event_id', eventId)
      .single();

    if (!settings?.enabled) {
      return NextResponse.json({ error: 'Affiliate program not enabled for this event' }, { status: 400 });
    }

    // Check if user is the event creator (can't affiliate own event)
    const { data: event } = await supabaseAdmin
      .from('events')
      .select('user_id, title, slug')
      .eq('id', eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.user_id === user.id) {
      return NextResponse.json({ error: 'You cannot affiliate your own event' }, { status: 400 });
    }

    // Check if user already has an affiliate record for this event
    const { data: existing } = await supabaseAdmin
      .from('affiliates')
      .select('id, affiliate_code')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single();

    if (existing) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';
      return NextResponse.json({
        affiliateCode: existing.affiliate_code,
        affiliateLink: `${baseUrl}/${event.slug}?ref=${existing.affiliate_code}`,
        alreadyRegistered: true,
      });
    }

    // Generate unique affiliate code
    let affiliateCode = generateAffiliateCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: clash } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('affiliate_code', affiliateCode)
        .single();
      if (!clash) break;
      affiliateCode = generateAffiliateCode();
      attempts++;
    }

    const { data: affiliate, error: insertErr } = await supabaseAdmin
      .from('affiliates')
      .insert({
        user_id: user.id,
        event_id: eventId,
        affiliate_code: affiliateCode,
      })
      .select('id, affiliate_code')
      .single();

    if (insertErr || !affiliate) {
      return NextResponse.json({ error: 'Failed to register affiliate' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';
    return NextResponse.json({
      affiliateCode: affiliate.affiliate_code,
      affiliateLink: `${baseUrl}/${event.slug}?ref=${affiliate.affiliate_code}`,
      commissionType: settings.commission_type,
      commissionValue: settings.commission_value,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
