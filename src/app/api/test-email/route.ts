import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateWelcomeEmailHTML } from '@/utils/emailUtils';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('[test-email] Testing email configuration');
    console.log('[test-email] Environment check:', {
      hasZeptoMailPassword: !!process.env.ZEPTOMAIL_PASSWORD,
      hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
      hasGmailUser: !!process.env.GMAIL_USER,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    });

    const html = generateWelcomeEmailHTML('Test User');

    await sendEmail({
      to: email,
      subject: 'Test Email - Accezz Email System',
      html,
    });

    console.log('[test-email] Test email sent successfully to:', email);
    return NextResponse.json({ 
      message: 'Test email sent successfully',
      email,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('[test-email] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to send test email';
    return NextResponse.json({ 
      error: message,
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Test email endpoint. Send POST request with { "email": "your@email.com" }',
    environment: {
      hasZeptoMailPassword: !!process.env.ZEPTOMAIL_PASSWORD,
      hasGmailPassword: !!process.env.GMAIL_APP_PASSWORD,
      hasGmailUser: !!process.env.GMAIL_USER,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    },
  });
}
