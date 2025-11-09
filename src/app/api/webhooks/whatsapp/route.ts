import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/flow';

type WhatsappWebhookEntry = {
  id?: string;
  changes?: Array<{
    field?: string;
    value?: {
      messages?: Array<{
        id: string;
        from: string;
        type?: string;
        timestamp?: string;
        text?: { body?: string };
      }>;
    };
  }>;
};

type WhatsappWebhookPayload = {
  object?: string;
  entry?: WhatsappWebhookEntry[];
};

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as WhatsappWebhookPayload;
    const entries = payload.entry ?? [];

    await Promise.all(
      entries.flatMap((entry) => {
        const changes = entry.changes ?? [];
        return changes.flatMap((change) => {
          const messages = change.value?.messages ?? [];
          return messages.map(async (message) => {
            try {
              await handleIncomingMessage(message);
            } catch (error) {
              console.error('[whatsapp webhook] Failed to process message', error);
            }
          });
        });
      }),
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[whatsapp webhook] Error', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}


