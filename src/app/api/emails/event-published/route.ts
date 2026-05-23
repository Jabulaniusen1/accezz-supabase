import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, generateEventPublishedEmailHTML } from '@/utils/emailUtils';

export async function POST(req: NextRequest) {
  // Verify the caller's Supabase JWT
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { eventTitle, eventSlug, eventId } = await req.json() as {
      eventTitle?: string;
      eventSlug?: string;
      eventId?: string;
    };

    if (!eventTitle || !eventId) {
      return NextResponse.json({ error: 'eventTitle and eventId are required' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';
    const fullName = (user.user_metadata?.full_name as string | undefined)
      || user.email.split('@')[0];

    const html = generateEventPublishedEmailHTML({
      fullName,
      eventTitle,
      eventUrl: `${baseUrl}/${eventSlug || eventId}`,
      dashboardUrl: `${baseUrl}/dashboard`,
      affiliateSettingsUrl: `${baseUrl}/update/${eventId}`,
      blogUrl: 'https://accezzlive.com/blog',
    });

    await sendEmail({
      to: user.email,
      subject: `Your event is live! 🎉`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[event-published email] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
