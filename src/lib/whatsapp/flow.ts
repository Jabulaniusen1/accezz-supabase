import { type SupabaseClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { initializePaystackTransaction } from '@/lib/paystack';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsappImageMessage, sendWhatsappTextMessage } from './api';

type WhatsappStage =
  | 'initial'
  | 'awaiting_ticket_choice'
  | 'awaiting_quantity'
  | 'awaiting_email'
  | 'awaiting_payment'
  | 'completed';

type TicketOption = {
  id: string;
  name: string;
  price: number;
  available: number;
};

type SessionMetadata = {
  eventTitle?: string;
  currency?: string;
  ticketOptions?: TicketOption[];
  ticketTypeName?: string;
  ticketPrice?: number;
  totalAmount?: number;
  paystackAuthorizationUrl?: string;
  [key: string]: unknown;
};

type WhatsappSessionRow = {
  id: string | number;
  buyer_phone: string;
  stage?: string | null;
  event_id?: string | null;
  ticket_type_id?: string | null;
  quantity?: number | null;
  buyer_email?: string | null;
  order_id?: string | null;
  paystack_reference?: string | null;
  paystack_access_code?: string | null;
  metadata?: unknown;
};

type WhatsappSession = {
  id: string;
  phone: string;
  stage: WhatsappStage;
  eventId: string | null;
  ticketTypeId: string | null;
  quantity: number | null;
  buyerEmail: string | null;
  orderId: string | null;
  paystackReference: string | null;
  paystackAccessCode: string | null;
  metadata: SessionMetadata;
};

type WhatsappTextMessage = {
  id: string;
  from: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
};

type PaystackMetadata = {
  orderId?: string;
  sessionId?: string;
  eventId?: string;
  ticketTypeId?: string;
  ticketTypeName?: string;
  quantity?: number;
  buyerPhone?: string;
  channel?: string;
  [key: string]: unknown;
};

type PaystackChargeSuccessEvent = {
  event: string;
  data: {
    status?: string;
    reference?: string;
    metadata?: PaystackMetadata;
    amount?: number;
    currency?: string;
  };
};

const RESET_KEYWORDS = new Set(['restart', 'reset', 'start over', 'startover']);

function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) {
    return trimmed;
  }
  return `+${trimmed}`;
}

function formatCurrency(amount: number, currency = 'NGN'): string {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

async function getSession(client: SupabaseClient, phone: string): Promise<WhatsappSession | null> {
  const { data, error } = await client
    .from('whatsapp_sessions')
    .select('*')
    .eq('buyer_phone', phone)
    .maybeSingle();

  if (error) {
    console.error('[whatsapp flow] Failed to fetch session', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapSessionRow(data);
}

function mapSessionRow(row: WhatsappSessionRow): WhatsappSession {
  return {
    id: String(row.id),
    phone: String(row.buyer_phone),
    stage: (row.stage || 'initial') as WhatsappStage,
    eventId: row.event_id || null,
    ticketTypeId: row.ticket_type_id || null,
    quantity: typeof row.quantity === 'number' ? row.quantity : row.quantity ? Number(row.quantity) : null,
    buyerEmail: row.buyer_email || null,
    orderId: row.order_id || null,
    paystackReference: row.paystack_reference || null,
    paystackAccessCode: row.paystack_access_code || null,
    metadata: typeof row.metadata === 'object' && row.metadata !== null ? row.metadata as SessionMetadata : {},
  };
}

async function saveSession(client: SupabaseClient, session: WhatsappSession | null, updates: Partial<WhatsappSession> & { metadata?: SessionMetadata; lastMessage?: string; phone?: string }): Promise<WhatsappSession> {
  const now = new Date().toISOString();
  const stage = updates.stage ?? session?.stage ?? 'initial';
  const eventId = updates.eventId === undefined ? session?.eventId ?? null : updates.eventId;
  const ticketTypeId = updates.ticketTypeId === undefined ? session?.ticketTypeId ?? null : updates.ticketTypeId;
  const quantity =
    updates.quantity === undefined
      ? session?.quantity ?? null
      : updates.quantity === null
        ? null
        : Number(updates.quantity);
  const buyerEmail = updates.buyerEmail === undefined ? session?.buyerEmail ?? null : updates.buyerEmail;
  const orderId = updates.orderId === undefined ? session?.orderId ?? null : updates.orderId;
  const paystackReference = updates.paystackReference === undefined ? session?.paystackReference ?? null : updates.paystackReference;
  const paystackAccessCode = updates.paystackAccessCode === undefined ? session?.paystackAccessCode ?? null : updates.paystackAccessCode;

  const payload: Record<string, unknown> = {
    stage,
    event_id: eventId,
    ticket_type_id: ticketTypeId,
    quantity,
    buyer_email: buyerEmail,
    order_id: orderId,
    paystack_reference: paystackReference,
    paystack_access_code: paystackAccessCode,
    metadata: {
      ...(session?.metadata || {}),
      ...(updates.metadata || {}),
    },
    last_message: updates.lastMessage ?? null,
    last_message_at: now,
  };

  if (session) {
    const { data, error } = await client
      .from('whatsapp_sessions')
      .update(payload)
      .eq('id', session.id)
      .select('*')
      .single();

    if (error) {
      console.error('[whatsapp flow] Failed to update session', error);
      throw error;
    }

    return mapSessionRow(data);
  }

  if (!updates.phone && !session?.phone) {
    throw new Error('Cannot create a session without a phone number');
  }

  const { data, error } = await client
    .from('whatsapp_sessions')
    .insert({
      buyer_phone: updates.phone ?? session?.phone,
      ...payload,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[whatsapp flow] Failed to insert session', error);
    throw error;
  }

  return mapSessionRow(data);
}

async function resetSession(client: SupabaseClient, session: WhatsappSession | null, phone: string, incomingMessage: string): Promise<WhatsappSession> {
  if (session) {
    return saveSession(client, session, {
      stage: 'initial',
      eventId: null,
      ticketTypeId: null,
      quantity: null,
      buyerEmail: null,
      orderId: null,
      paystackReference: null,
      paystackAccessCode: null,
      metadata: {},
      lastMessage: incomingMessage,
    });
  }

  return saveSession(client, null, {
    phone,
    stage: 'initial',
    eventId: null,
    metadata: {},
    lastMessage: incomingMessage,
  });
}

async function fetchEventWithTickets(client: SupabaseClient, eventId: string) {
  const [{ data: event, error: eventError }, { data: tickets, error: ticketsError }] = await Promise.all([
    client
      .from('events')
      .select('id, title, currency, status, visibility')
      .eq('id', eventId)
      .maybeSingle(),
    client
      .from('ticket_types')
      .select('id, name, price, quantity, sold')
      .eq('event_id', eventId)
      .order('price', { ascending: true }),
  ]);

  if (eventError) throw eventError;
  if (ticketsError) throw ticketsError;

  if (!event) {
    throw new Error('Event not found');
  }

  const ticketOptions: TicketOption[] = (tickets || [])
    .map((ticket) => {
      const price = Number(ticket.price ?? 0);
      const quantity = Number(ticket.quantity ?? 0);
      const sold = Number(ticket.sold ?? 0);
      const available = Math.max(0, quantity - sold);
      return {
        id: String(ticket.id),
        name: String(ticket.name),
        price,
        available,
      };
    })
    .filter((ticket) => ticket.available > 0);

  return {
    event,
    ticketOptions,
  };
}

async function sendIntroMessage(to: string, eventIdHint?: string) {
  const introLines = [
    '👋 Hi! I can help you purchase tickets instantly.',
    'To get started, tap the event link shared with you or send:',
    '`buy-event-<event-id>`',
  ];

  if (eventIdHint) {
    introLines.push('', `Example: buy-event-${eventIdHint}`);
  }

  await sendWhatsappTextMessage({
    to,
    body: introLines.join('\n'),
    previewUrl: false,
  });
}

export async function handleIncomingMessage(message: WhatsappTextMessage): Promise<void> {
  if (!message || message.type !== 'text') {
    return;
  }

  const text = message.text?.body?.trim();
  if (!text) {
    return;
  }

  const phone = normalizePhone(message.from);
  if (!phone) {
    return;
  }

  const textNormalized = text.toLowerCase().trim();
  const supabase = getSupabaseAdmin();
  let session = await getSession(supabase, phone);

  if (RESET_KEYWORDS.has(textNormalized)) {
    session = await resetSession(supabase, session, phone, text);
    await sendIntroMessage(phone);
    return;
  }

  if (textNormalized.startsWith('buy-event-')) {
    await handleEventSelection({
      supabase,
      session,
      phone,
      incomingText: textNormalized,
      rawText: text,
    });
    return;
  }

  if (!session || session.stage === 'initial') {
    await sendIntroMessage(phone);
    session = await resetSession(supabase, session, phone, text);
    return;
  }

  switch (session.stage) {
    case 'awaiting_ticket_choice':
      await handleTicketChoice({ supabase, session, phone, text, rawLower: textNormalized });
      break;
    case 'awaiting_quantity':
      await handleQuantity({ supabase, session, phone, text, rawLower: textNormalized });
      break;
    case 'awaiting_email':
      await handleEmail({ supabase, session, phone, text });
      break;
    case 'awaiting_payment':
      await handleAwaitingPayment({ supabase, session, phone, text, rawLower: textNormalized });
      break;
    case 'completed':
      await sendWhatsappTextMessage({
        to: phone,
        body: '✅ Your last order is complete. To start a new purchase, send the event link again or type `buy-event-<event-id>`.',
        previewUrl: false,
      });
      break;
    default:
      await sendIntroMessage(phone);
      session = await resetSession(supabase, session, phone, text);
  }
}

async function handleEventSelection(params: { supabase: SupabaseClient; session: WhatsappSession | null; phone: string; incomingText: string; rawText: string; }): Promise<void> {
  const { supabase, session, phone, incomingText, rawText } = params;
  const match = incomingText.match(/buy-event-([a-z0-9\-]+)/i);
  const eventIdRaw = match?.[1];

  if (!eventIdRaw) {
    await sendWhatsappTextMessage({
      to: phone,
      body: "I couldn't find that event code. Please double-check the link and try again.",
      previewUrl: false,
    });
    return;
  }

  try {
    const { event, ticketOptions } = await fetchEventWithTickets(supabase, eventIdRaw);

    if (event.status !== 'published' || event.visibility !== 'public') {
      await sendWhatsappTextMessage({
        to: phone,
        body: 'This event is not currently available for sale. Please contact the organizer for details.',
        previewUrl: false,
      });
      await resetSession(supabase, session, phone, rawText);
      return;
    }

    if (!ticketOptions.length) {
      await sendWhatsappTextMessage({
        to: phone,
        body: `🎟 ${event.title}\n\nAll tickets are currently sold out. Please check back later or contact the organizer.`,
        previewUrl: false,
      });
      await resetSession(supabase, session, phone, rawText);
      return;
    }

    const list = ticketOptions
      .map((ticket, idx) => `${idx + 1}. ${ticket.name} — ${formatCurrency(ticket.price, event.currency || 'NGN')} (${ticket.available} left)`)
      .join('\n');

    await sendWhatsappTextMessage({
      to: phone,
      body: `🎟 Event: ${event.title}\n\nAvailable Tickets:\n${list}\n\nReply with the number of the ticket you want.`,
      previewUrl: false,
    });

    await saveSession(supabase, session, {
      phone,
      stage: 'awaiting_ticket_choice',
      eventId: event.id,
      ticketTypeId: null,
      quantity: null,
      buyerEmail: null,
      orderId: null,
      metadata: {
        eventTitle: event.title,
        currency: event.currency || 'NGN',
        ticketOptions,
      },
      lastMessage: rawText,
    });
  } catch (error) {
    console.error('[whatsapp flow] handleEventSelection error', error);
    await sendWhatsappTextMessage({
      to: phone,
      body: 'Something went wrong fetching this event. Please try again shortly or contact support.',
      previewUrl: false,
    });
  }
}

async function handleTicketChoice(params: { supabase: SupabaseClient; session: WhatsappSession; phone: string; text: string; rawLower: string; }) {
  const { supabase, session, phone, text } = params;

  const ticketOptions = session.metadata.ticketOptions ?? [];
  if (!ticketOptions.length) {
    await sendWhatsappTextMessage({
      to: phone,
      body: 'Ticket options expired. Send the event link again to refresh availability.',
      previewUrl: false,
    });
    await resetSession(supabase, session, phone, text);
    return;
  }

  const choiceNumber = Number.parseInt(text.trim(), 10);
  if (Number.isNaN(choiceNumber) || choiceNumber < 1 || choiceNumber > ticketOptions.length) {
    await sendWhatsappTextMessage({
      to: phone,
      body: `Please reply with a number between 1 and ${ticketOptions.length}.`,
      previewUrl: false,
    });
    return;
  }

  const selected = ticketOptions[choiceNumber - 1];
  await sendWhatsappTextMessage({
    to: phone,
    body: `You selected *${selected.name}* (${formatCurrency(selected.price, session.metadata.currency || 'NGN')}).\nHow many tickets would you like to buy?`,
    previewUrl: false,
  });

  await saveSession(supabase, session, {
    stage: 'awaiting_quantity',
    ticketTypeId: selected.id,
    metadata: {
      ...session.metadata,
      ticketTypeName: selected.name,
      ticketPrice: selected.price,
    },
    lastMessage: text,
  });
}

async function handleQuantity(params: { supabase: SupabaseClient; session: WhatsappSession; phone: string; text: string; rawLower: string; }) {
  const { supabase, session, phone, text } = params;

  if (!session.ticketTypeId) {
    await sendWhatsappTextMessage({
      to: phone,
      body: 'Please pick a ticket type first. Send the event link again to restart.',
      previewUrl: false,
    });
    await resetSession(supabase, session, phone, text);
    return;
  }

  const requestedQuantity = Number.parseInt(text.trim(), 10);
  if (Number.isNaN(requestedQuantity) || requestedQuantity <= 0) {
    await sendWhatsappTextMessage({
      to: phone,
      body: 'Please enter a valid quantity (e.g. 1, 2, 3).',
      previewUrl: false,
    });
    return;
  }

  const { data: ticketType, error } = await supabase
    .from('ticket_types')
    .select('id, name, price, quantity, sold, event_id')
    .eq('id', session.ticketTypeId)
    .maybeSingle();

  if (error || !ticketType) {
    console.error('[whatsapp flow] ticket type lookup failed', error);
    await sendWhatsappTextMessage({
      to: phone,
      body: 'That ticket type is no longer available. Please choose again.',
      previewUrl: false,
    });
    await resetSession(supabase, session, phone, text);
    return;
  }

  const available = Math.max(0, Number(ticketType.quantity ?? 0) - Number(ticketType.sold ?? 0));
  if (requestedQuantity > available) {
    await sendWhatsappTextMessage({
      to: phone,
      body: `Only ${available} ticket(s) are left for ${ticketType.name}. Please choose a lower quantity.`,
      previewUrl: false,
    });
    return;
  }

  const ticketPrice = Number(ticketType.price ?? session.metadata.ticketPrice ?? 0);
  const totalAmount = ticketPrice * requestedQuantity;

  await sendWhatsappTextMessage({
    to: phone,
    body: `Great! That will be ${formatCurrency(totalAmount, session.metadata.currency || 'NGN')} for ${requestedQuantity} ${ticketType.name} ticket(s).\n\nReply with the email address we should send your receipt to.`,
    previewUrl: false,
  });

  await saveSession(supabase, session, {
    stage: 'awaiting_email',
    quantity: requestedQuantity,
    metadata: {
      ...session.metadata,
      ticketPrice,
      totalAmount,
    },
    lastMessage: text,
  });
}

function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
  return emailRegex.test(value.trim());
}

async function handleEmail(params: { supabase: SupabaseClient; session: WhatsappSession; phone: string; text: string; }) {
  const { supabase, session, phone, text } = params;
  const email = text.trim();

  if (!isValidEmail(email)) {
    await sendWhatsappTextMessage({
      to: phone,
      body: 'Please enter a valid email address so we can send your tickets and receipt.',
      previewUrl: false,
    });
    return;
  }

  if (!session.eventId || !session.ticketTypeId || !session.quantity) {
    await sendWhatsappTextMessage({
      to: phone,
      body: 'Session expired. Please send the event link again to restart.',
      previewUrl: false,
    });
    await resetSession(supabase, session, phone, text);
    return;
  }

  const metadata = session.metadata;
  const totalAmount = metadata.totalAmount ?? (metadata.ticketPrice ?? 0) * session.quantity;
  const currency = metadata.currency || 'NGN';
  const ticketTypeName = metadata.ticketTypeName || 'Ticket';

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        event_id: session.eventId,
        buyer_user_id: null,
        buyer_full_name: null,
        buyer_email: email,
        buyer_phone: phone,
        currency,
        total_amount: totalAmount,
        status: 'pending',
        payment_provider: 'paystack',
        meta: {
          ticketTypeId: session.ticketTypeId,
          ticketTypeName,
          quantity: session.quantity,
          channel: 'whatsapp',
          sessionId: session.id,
        },
      })
      .select('*')
      .single();

    if (orderError || !order) {
      throw orderError || new Error('Failed to create order');
    }

    const baseUrl = process.env.PAYSTACK_WHATSAPP_CALLBACK_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
    const callbackUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/paystack/webhook` : undefined;

    const init = await initializePaystackTransaction({
      email,
      amountKobo: Math.round(totalAmount * 100),
      currency,
      reference: `WHT-${order.id}`,
      metadata: {
        orderId: order.id,
        sessionId: session.id,
        eventId: session.eventId,
        ticketTypeId: session.ticketTypeId,
        ticketTypeName,
        quantity: session.quantity,
        buyerPhone: phone,
        channel: 'whatsapp',
      },
      callbackUrl,
    });

    await Promise.all([
      supabase
        .from('orders')
        .update({
          payment_reference: init.reference,
          meta: {
            ...(order.meta || {}),
            paystackReference: init.reference,
          },
        })
        .eq('id', order.id),
      saveSession(supabase, session, {
        stage: 'awaiting_payment',
        buyerEmail: email,
        orderId: order.id,
        paystackReference: init.reference,
        paystackAccessCode: init.accessCode ?? null,
        metadata: {
          ...metadata,
          paystackAuthorizationUrl: init.authorizationUrl,
        },
        lastMessage: text,
      }),
    ]);

    await sendWhatsappTextMessage({
      to: phone,
      body: `Great! You're purchasing ${session.quantity} ${ticketTypeName} ticket(s) for ${metadata.eventTitle ?? 'the event'}.\n\nTotal: ${formatCurrency(totalAmount, currency)}\n\nTap to pay now:\n${init.authorizationUrl}\n\nI'll confirm your tickets as soon as the payment clears.`,
      previewUrl: true,
    });
  } catch (error) {
    console.error('[whatsapp flow] Failed to initialize Paystack transaction', error);
    await sendWhatsappTextMessage({
      to: phone,
      body: 'We could not start the payment right now. Please try again in a moment or contact support.',
      previewUrl: false,
    });
  }
}

async function handleAwaitingPayment(params: { supabase: SupabaseClient; session: WhatsappSession; phone: string; text: string; rawLower: string; }) {
  const { supabase, session, phone, rawLower } = params;

  if (rawLower.includes('link')) {
    const url = session.metadata.paystackAuthorizationUrl;
    if (url) {
      await sendWhatsappTextMessage({
        to: phone,
        body: `Here's your payment link again 👇\n${url}`,
        previewUrl: true,
      });
    } else {
      await sendWhatsappTextMessage({
        to: phone,
        body: 'I do not have a payment link on file. Please restart with the event link.',
        previewUrl: false,
      });
    }
    return;
  }

  if (rawLower.includes('status') || rawLower.includes('paid')) {
    if (!session.orderId) {
      await sendWhatsappTextMessage({
        to: phone,
        body: 'No active order found. Please restart with the event link.',
        previewUrl: false,
      });
      return;
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('status')
      .eq('id', session.orderId)
      .maybeSingle();

    if (error || !order) {
      await sendWhatsappTextMessage({
        to: phone,
        body: 'Still waiting for payment confirmation. If you already paid, you will receive tickets shortly.',
        previewUrl: false,
      });
      return;
    }

    if (order.status === 'paid') {
      await sendWhatsappTextMessage({
        to: phone,
        body: '✅ Payment confirmed! Your tickets are on the way.',
        previewUrl: false,
      });
    } else {
      await sendWhatsappTextMessage({
        to: phone,
        body: 'Payment is still pending. You can retry the payment link or reach out if you need help.',
        previewUrl: false,
      });
    }

    return;
  }

  await sendWhatsappTextMessage({
    to: phone,
    body: 'Once you complete payment, I will send your tickets here. Reply with "link" if you need the payment URL again.',
    previewUrl: false,
  });
}

function generateTicketCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return code;
}

type IssuedTicket = {
  id: string;
  ticketCode: string;
};

async function issueTickets(client: SupabaseClient, params: { orderId: string; eventId: string; ticketTypeId: string; quantity: number; currency: string | null; price: number; buyerEmail: string | null; buyerName: string | null; }): Promise<IssuedTicket[]> {
  const { orderId, eventId, ticketTypeId, quantity, currency, price, buyerEmail, buyerName } = params;
  const ticketRows = Array.from({ length: quantity }).map(() => ({
    order_id: orderId,
    event_id: eventId,
    ticket_type_id: ticketTypeId,
    ticket_code: generateTicketCode(),
    qr_code_url: null,
    attendee_name: buyerName,
    attendee_email: buyerEmail,
    price,
    currency,
    validation_status: 'valid',
  }));

  const { data, error } = await client
    .from('tickets')
    .insert(ticketRows)
    .select('id, ticket_code');

  if (error) {
    throw error;
  }

  return data?.map((row: { id: string; ticket_code: string }) => ({
    id: String(row.id),
    ticketCode: String(row.ticket_code),
  })) ?? [];
}

async function incrementTicketSales(client: SupabaseClient, ticketTypeId: string, quantity: number) {
  const { data: current, error: fetchError } = await client
    .from('ticket_types')
    .select('sold')
    .eq('id', ticketTypeId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const currentSold = Number(current?.sold ?? 0);
  const { error: updateError } = await client
    .from('ticket_types')
    .update({ sold: currentSold + quantity })
    .eq('id', ticketTypeId);

  if (updateError) {
    throw updateError;
  }
}

function resolveBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.PAYSTACK_WHATSAPP_CALLBACK_URL ||
    '';
  return base ? base.replace(/\/$/, '') : '';
}

async function generateAndAttachTicketQr(client: SupabaseClient, params: { ticketId: string; ticketCode: string; orderId: string; }): Promise<string | null> {
  const { ticketId, ticketCode, orderId } = params;
  try {
    const baseUrl = resolveBaseUrl();
    const validationUrl = baseUrl
      ? `${baseUrl}/validate-ticket?ticketId=${encodeURIComponent(ticketId)}&signature=${encodeURIComponent(ticketCode)}`
      : `https://accezz.app/validate-ticket?ticketId=${encodeURIComponent(ticketId)}&signature=${encodeURIComponent(ticketCode)}`;

    const dataUrl = await QRCode.toDataURL(validationUrl, {
      width: 400,
      margin: 2,
    });

    const [, base64] = dataUrl.split(',');
    if (!base64) {
      throw new Error('Invalid QR data');
    }

    const buffer = Buffer.from(base64, 'base64');
    const filePath = `tickets/${orderId}/${ticketId}.png`;
    const uploadResult = await client.storage
      .from('ticket-qr')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const { data: publicUrlData } = client.storage.from('ticket-qr').getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;

    await client
      .from('tickets')
      .update({ qr_code_url: publicUrl })
      .eq('id', ticketId);

    return publicUrl;
  } catch (error) {
    console.error('[whatsapp flow] Failed to generate QR code', error);
    return null;
  }
}

export async function finalizeWhatsAppPayment(event: PaystackChargeSuccessEvent): Promise<void> {
  if (!event?.data?.metadata || event.data.metadata.channel !== 'whatsapp') {
    return;
  }

  const metadata = event.data.metadata;
  const orderId = metadata.orderId;
  const sessionId = metadata.sessionId;
  const ticketTypeId = metadata.ticketTypeId;
  const quantity = Number(metadata.quantity ?? 1);
  const reference = event.data.reference;
  const buyerPhone = metadata.buyerPhone ? normalizePhone(String(metadata.buyerPhone)) : null;

  if (!orderId || !sessionId || !ticketTypeId || !reference) {
    console.warn('[whatsapp flow] Missing metadata in Paystack webhook', metadata);
    return;
  }

  const supabase = getSupabaseAdmin();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) {
    console.error('[whatsapp flow] Failed to fetch order', orderError);
    return;
  }

  if (!order) {
    console.error('[whatsapp flow] Order not found for Paystack webhook', orderId);
    return;
  }

  if (order.status === 'paid') {
    return;
  }

  const totalAmount = Number(event.data.amount ? event.data.amount / 100 : order.total_amount);
  const currency = event.data.currency || order.currency || 'NGN';

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      payment_reference: reference,
      payment_provider: 'paystack',
      total_amount: totalAmount,
      currency,
      meta: {
        ...(order.meta || {}),
        paystackEvent: event.data,
      },
    })
    .eq('id', orderId);

  if (updateError) {
    console.error('[whatsapp flow] Failed to update order status', updateError);
    return;
  }

  const { data: ticketType, error: ticketTypeError } = await supabase
    .from('ticket_types')
    .select('id, event_id, name, price, quantity, sold')
    .eq('id', ticketTypeId)
    .maybeSingle();

  if (ticketTypeError || !ticketType) {
    console.error('[whatsapp flow] Ticket type not found during finalization', ticketTypeError);
    return;
  }

  const available = Math.max(0, Number(ticketType.quantity ?? 0) - Number(ticketType.sold ?? 0));
  if (available < quantity) {
    console.error('[whatsapp flow] Not enough inventory to issue tickets', { available, quantity });
    return;
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError) {
    console.error('[whatsapp flow] Failed to fetch session during finalization', sessionError);
  }

  const sessionRecord = sessionData ? mapSessionRow(sessionData) : null;

  try {
    const ticketPrice = Number(ticketType.price ?? (order.total_amount && quantity ? order.total_amount / quantity : 0));
    const issuedTickets = await issueTickets(supabase, {
      orderId,
      eventId: ticketType.event_id,
      ticketTypeId,
      quantity,
      currency,
      price: ticketPrice,
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_full_name,
    });

    const ticketCodes = issuedTickets.map((ticket) => ticket.ticketCode);

    const qrUrls = await Promise.all(
      issuedTickets.map((ticket) =>
        generateAndAttachTicketQr(supabase, {
          ticketId: ticket.id,
          ticketCode: ticket.ticketCode,
          orderId,
        }),
      ),
    );

    await incrementTicketSales(supabase, ticketTypeId, quantity);

    if (sessionRecord) {
      await saveSession(supabase, sessionRecord, {
        stage: 'completed',
        orderId,
        paystackReference: reference,
        metadata: {
          ...(sessionRecord.metadata || {}),
          issuedTickets: ticketCodes,
          qrUrls,
        },
        lastMessage: 'charge.success',
      });
    }

    if (buyerPhone) {
      const eventTitle =
        sessionRecord?.metadata.eventTitle ||
        metadata.eventTitle ||
        ticketType.name;

      const codesList = ticketCodes.length
        ? ticketCodes.map((code) => `• ${code}`).join('\n')
        : 'Your tickets are attached to your order.';

      const totalFormatted = formatCurrency(totalAmount, currency);
      const receiptMessage = [
        '✅ Payment confirmed!',
        '',
        `Event: ${eventTitle}`,
        `Ticket: ${metadata.ticketTypeName || ticketType.name}`,
        `Quantity: ${quantity}`,
        `Total Paid: ${totalFormatted}`,
        '',
        'Ticket Codes:',
        codesList,
        '',
        'Your QR codes are sent below. Show any of them at the event gate 🎟️',
      ].join('\n');

      await sendWhatsappTextMessage({
        to: buyerPhone,
        body: receiptMessage,
        previewUrl: false,
      });

      await Promise.all(
        qrUrls
          .map((url, index) => ({ url, code: ticketCodes[index] }))
          .filter((item) => item.url)
          .map((item) =>
            sendWhatsappImageMessage({
              to: buyerPhone,
              imageUrl: item.url as string,
              caption: `Ticket code: ${item.code}`,
            }).catch((error) => {
              console.error('[whatsapp flow] Failed to send QR image', error);
            }),
          ),
      );
    }
  } catch (error) {
    console.error('[whatsapp flow] Failed to finalize WhatsApp order', error);
  }
}


