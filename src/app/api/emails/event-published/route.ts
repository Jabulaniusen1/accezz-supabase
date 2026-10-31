import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateEventPublishedEmailHTML } from '@/utils/emailUtils';
import { supabaseAdmin } from '@/utils/processOrder';
import { requireAuth } from '@/utils/apiAuth';

/**
 * "Your event is live" email to the organizer. Sent once per event, only to
 * the event's owner, with the title and link taken from the database.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ('error' in auth) return auth.error;
  const { user } = auth;
  if (!user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { eventId } = await req.json().catch(() => ({})) as { eventId?: string };
    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Claim the send atomically; only the owner's own event, only once
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('events')
      .update({ published_email_sent_at: new Date().toISOString() })
      .eq('id', eventId)
      .eq('user_id', user.id)
      .is('published_email_sent_at', null)
      .select('id, title, slug');
    if (claimError) {
      console.error('[event-published email] claim failed:', claimError);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }
    const event = claimed?.[0];
    if (!event) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';
    const fullName = (user.user_metadata?.full_name as string | undefined)
      || user.email.split('@')[0];

    const html = generateEventPublishedEmailHTML({
      fullName,
      eventTitle: event.title,
      eventUrl: `${baseUrl}/${encodeURIComponent(event.slug || event.id)}`,
      dashboardUrl: `${baseUrl}/dashboard`,
      affiliateSettingsUrl: `${baseUrl}/update/${event.id}`,
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
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
