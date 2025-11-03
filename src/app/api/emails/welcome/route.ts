import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateWelcomeEmailHTML } from '@/utils/emailUtils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, fullName } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const html = generateWelcomeEmailHTML(fullName || 'there');
    
    await sendEmail({
      to: email,
      subject: 'Welcome to Accezz! 🎉',
      html,
    });

    return NextResponse.json(
      { message: 'Welcome email sent successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error sending welcome email:', error);
    const message = error instanceof Error ? error.message : 'Failed to send welcome email';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

