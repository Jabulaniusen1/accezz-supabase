import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateWelcomeEmailHTML } from '@/utils/emailUtils';
import { requireInternalSecret } from '@/utils/apiAuth';

export async function POST(req: NextRequest) {
  const authError = requireInternalSecret(req);
  if (authError) return authError;

  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const html = generateWelcomeEmailHTML('Test User');

    await sendEmail({
      to: email,
      subject: 'Test Email - Accezz Email System',
      html,
    });

    return NextResponse.json({
      message: 'Test email sent successfully',
      email,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send test email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET intentionally removed — it exposed internal configuration details.
