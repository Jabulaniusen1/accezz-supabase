import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateWelcomeEmailHTML } from '@/utils/emailUtils';
import { supabaseAdmin } from '@/utils/processOrder';

// Only accounts created this recently can trigger their welcome email
const MAX_ACCOUNT_AGE_MS = 15 * 60 * 1000;

/**
 * Send the welcome email for a just-created account.
 *
 * Called from the signup page (no session yet, because email confirmation is
 * required). To stop this being used to email arbitrary people, the address
 * must belong to an account created in the last few minutes, the email is
 * sent at most once per account, and the name comes from the account itself.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as { email?: string } | null;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { data: matches } = await supabaseAdmin.rpc('get_user_info_by_email', { p_email: email });
    const userId = Array.isArray(matches) && matches[0]?.user_id;
    if (!userId) {
      // Same response as success: don't reveal whether an account exists
      return NextResponse.json({ ok: true });
    }

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!user) return NextResponse.json({ ok: true });

    const isNew = Date.now() - new Date(user.created_at).getTime() < MAX_ACCOUNT_AGE_MS;
    if (!isNew || user.app_metadata?.welcome_email_sent) {
      return NextResponse.json({ ok: true });
    }

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, welcome_email_sent: true },
    });

    const meta = user.user_metadata || {};
    const fullName = String(meta.full_name || meta.fullName || 'there');

    await sendEmail({
      to: user.email || email,
      subject: 'Welcome to Accezz! 🎉',
      html: generateWelcomeEmailHTML(fullName),
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('[emails/welcome] Failed to send welcome email:', error);
    return NextResponse.json({ error: 'Failed to send welcome email' }, { status: 500 });
  }
}
