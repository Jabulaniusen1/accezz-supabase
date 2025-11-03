import { supabase } from './supabaseClient';

/**
 * Order type based on database schema
 */
interface Order {
  id: string;
  event_id: string;
  buyer_user_id: string | null;
  buyer_full_name: string | null;
  buyer_email: string;
  buyer_phone: string | null;
  currency: string | null;
  total_amount: number;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  payment_provider: string | null;
  payment_reference: string | null;
  meta: {
    ticketTypeName?: string;
    quantity?: number;
    attendees?: Array<{ name: string; email: string }>;
  } | null;
  created_at: string;
  updated_at: string;
}

/**
 * Ticket type based on database schema
 */
interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  details: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Helper function to send ticket email after tickets are created
 */
async function sendTicketEmail({
  orderId,
  order,
  ticketType,
  ticketCodes,
}: {
  orderId: string;
  order: Order;
  ticketType: TicketType;
  ticketCodes: string[];
}): Promise<void> {
  try {
    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title, date, time, venue, location')
      .eq('id', order.event_id)
      .single();

    if (eventError) {
      console.error('[sendTicketEmail] Error fetching event:', eventError);
      return;
    }

    // Fetch primary ticket to get QR code URL and ticket ID
    const { data: primaryTicket } = await supabase
      .from('tickets')
      .select('qr_code_url, id, ticket_code')
      .eq('order_id', orderId)
      .eq('attendee_email', order.buyer_email)
      .limit(1)
      .single();

    // Format date and time
    const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) : 'TBD';

    const eventTime = event.time || 'TBD';

    // Send email via API route
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/emails/ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: order.buyer_email,
        fullName: order.buyer_full_name,
        eventTitle: event.title || 'Event',
        eventDate,
        eventTime,
        venue: event.venue || event.location || 'TBD',
        ticketType: ticketType.name,
        quantity: ticketCodes.length,
        ticketCodes,
        totalAmount: order.total_amount,
        currency: order.currency,
        orderId,
        qrCodeUrl: primaryTicket?.qr_code_url,
        ticketId: primaryTicket?.id,
        primaryTicketCode: primaryTicket?.ticket_code || ticketCodes[0],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to send ticket email');
    }

    console.log('[sendTicketEmail] Ticket email sent successfully');
  } catch (error) {
    console.error('[sendTicketEmail] Error:', error);
    // Don't throw - this is a background operation
  }
}

interface CreateOrderParams {
  eventId: string;
  ticketTypeName: string;
  quantity: number;
  email: string;
  phone: string;
  fullName: string;
  attendees?: Array<{ name: string; email: string }> | null;
  currency?: string;
}

// Internal data shapes are inferred per-query; explicit TicketCreationData not needed

/**
 * Generate a unique ticket code
 */
function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate QR code image and store in Supabase Storage
 * Returns the public URL of the stored QR code
 */
async function generateAndStoreQRCode(ticketId: string, ticketCode: string): Promise<string> {
  try {
    // Generate validation URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || '';
    const validateUrl = `${baseUrl}/validate-ticket?ticketId=${ticketId}&signature=${ticketCode}`;
    
    // Dynamically import QRCode
    const qrcodeModule = await import('qrcode');
    const QRCodeLib = qrcodeModule.default;
    
    // Generate QR code as data URL (PNG)
    const qrCodeDataUrl = await QRCodeLib.toDataURL(validateUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // Convert data URL to blob
    const response = await fetch(qrCodeDataUrl);
    const blob = await response.blob();

    // Note: We don't need auth session for QR generation
    // For QR codes, we'll use a simpler path structure
    // Path: tickets/{ticketId}/qr-code.png
    const filePath = `tickets/${ticketId}/qr-code.png`;
    const { error: uploadError } = await supabase.storage
      .from('ticket-qr')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading QR code:', uploadError);
      // Fallback to data URL if upload fails
      return qrCodeDataUrl;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ticket-qr')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback: return a QR code service URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || '';
    const encodedUrl = encodeURIComponent(`${baseUrl}/validate-ticket?ticketId=${ticketId}&signature=${ticketCode}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedUrl}`;
  }
}

/**
 * Create an order in Supabase
 */
export async function createOrder(params: CreateOrderParams): Promise<{ orderId: string; totalAmount: number }> {
  try {
    console.log('[createOrder] Starting order creation for eventId:', params.eventId);
    
    // Fetch event to get ticket type details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, currency')
      .eq('id', params.eventId)
      .single();

    if (eventError) {
      console.error('[createOrder] Error fetching event:', eventError);
      throw eventError;
    }
    console.log('[createOrder] Event fetched successfully:', event?.id);

    // Fetch ticket type
    const { data: ticketType, error: ticketTypeError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', params.eventId)
      .eq('name', params.ticketTypeName)
      .single();

    if (ticketTypeError) {
      console.error('[createOrder] Error fetching ticket type:', ticketTypeError);
      throw ticketTypeError;
    }
    if (!ticketType) {
      console.error('[createOrder] Ticket type not found:', params.ticketTypeName);
      throw new Error('Ticket type not found');
    }
    console.log('[createOrder] Ticket type found:', ticketType.name);

    // Check if enough tickets are available
    const available = ticketType.quantity - ticketType.sold;
    if (available < params.quantity) {
      console.error('[createOrder] Insufficient tickets:', { available, requested: params.quantity });
      throw new Error(`Only ${available} ticket(s) available`);
    }

    // Calculate total amount
    const totalAmount = ticketType.price * params.quantity;
    const currency = params.currency || event?.currency || 'NGN';

    // Get current session (optional - for logged-in users)
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[createOrder] Session:', session ? 'authenticated' : 'anonymous');

    // Create order
    console.log('[createOrder] Inserting order with data:', {
      event_id: params.eventId,
      buyer_email: params.email,
      total_amount: totalAmount
    });
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        event_id: params.eventId,
        buyer_user_id: session?.user?.id || null,
        buyer_full_name: params.fullName,
        buyer_email: params.email,
        buyer_phone: params.phone,
        currency: currency,
        total_amount: totalAmount,
        status: 'pending',
        meta: {
          ticketTypeName: params.ticketTypeName,
          quantity: params.quantity,
          attendees: params.attendees || null,
        },
      })
      .select('id')
      .single();

    if (orderError) {
      console.error('[createOrder] Error creating order:', orderError);
      console.error('[createOrder] Full error details:', JSON.stringify(orderError, null, 2));
      throw orderError;
    }

    console.log('[createOrder] Order created successfully:', order.id);
    return {
      orderId: order.id,
      totalAmount: totalAmount,
    };
  } catch (error: unknown) {
    console.error('[createOrder] Error creating order:', error);
    throw error;
  }
}

/**
 * Create tickets for a paid order
 */
export async function createTicketsForOrder(orderId: string): Promise<string[]> {
  try {
    // Fetch order details (don't join events to avoid RLS issues)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Ensure order is paid (required by RLS policy)
    if (order.status !== 'paid') {
      throw new Error('Order must be paid before creating tickets');
    }

    const meta = order.meta as { ticketTypeName?: string; quantity?: number; attendees?: Array<{ name: string; email: string }>; } | null;
    const ticketTypeName = meta?.ticketTypeName;
    const quantity = meta?.quantity || 1;
    const attendees = meta?.attendees || [];

    console.log('[createTicketsForOrder] Fetching ticket type:', { ticketTypeName, eventId: order.event_id });

    // Fetch ticket type
    const { data: ticketType, error: ticketTypeError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', order.event_id)
      .eq('name', ticketTypeName)
      .single();

    if (ticketTypeError || !ticketType) {
      console.error('[createTicketsForOrder] Ticket type lookup error:', ticketTypeError);
      console.error('[createTicketsForOrder] Meta data:', meta);
      console.error('[createTicketsForOrder] Looking for:', ticketTypeName);
      throw new Error(`Ticket type not found: ${ticketTypeName}`);
    }
    
    console.log('[createTicketsForOrder] Ticket type found:', ticketType.name);

    // Create tickets and generate QR codes
    const ticketCodes: string[] = [];
    
    // Primary attendee
    const primaryTicketCode = generateTicketCode();
    ticketCodes.push(primaryTicketCode);
    
    // Insert primary ticket first to get its ID for QR code generation
    const { data: primaryTicket, error: primaryTicketError } = await supabase
      .from('tickets')
      .insert({
        order_id: orderId,
        event_id: order.event_id,
        ticket_type_id: ticketType.id,
        ticket_code: primaryTicketCode,
        qr_code_url: '', // Will be updated after generation
        attendee_name: order.buyer_full_name,
        attendee_email: order.buyer_email,
        price: ticketType.price,
        currency: order.currency,
        validation_status: 'valid',
      })
      .select('id')
      .single();

    if (primaryTicketError) throw primaryTicketError;

    // Create all additional tickets first (without QR codes for speed)
    const additionalTicketInserts: Array<{
      order_id: string;
      event_id: string;
      ticket_type_id: string;
      ticket_code: string;
      qr_code_url: string;
      attendee_name: string;
      attendee_email: string;
      price: number;
      currency: string;
      validation_status: string;
    }> = [];

    for (let i = 0; i < Math.min(attendees.length, quantity - 1); i++) {
      const attendee = attendees[i];
      const ticketCode = generateTicketCode();
      ticketCodes.push(ticketCode);
      
      additionalTicketInserts.push({
        order_id: orderId,
        event_id: order.event_id,
        ticket_type_id: ticketType.id,
        ticket_code: ticketCode,
        qr_code_url: '', // Will be generated in background
        attendee_name: attendee.name,
        attendee_email: attendee.email,
        price: ticketType.price,
        currency: order.currency,
        validation_status: 'valid',
      });
    }

    // Insert all additional tickets at once
    if (additionalTicketInserts.length > 0) {
      const { data: additionalTickets, error: additionalTicketError } = await supabase
        .from('tickets')
        .insert(additionalTicketInserts)
        .select('id, ticket_code');

      if (additionalTicketError) throw additionalTicketError;

      // Generate QR codes for all tickets in background (non-blocking)
      const allTicketsToGenerate = [
        { id: primaryTicket.id, code: primaryTicketCode },
        ...(additionalTickets || []).map((t: { id: string; ticket_code: string }) => ({ id: t.id, code: t.ticket_code }))
      ];

      // Generate QR codes asynchronously (don't wait)
      Promise.all(
        allTicketsToGenerate.map(async ({ id, code }) => {
          try {
            const qrUrl = await generateAndStoreQRCode(id, code);
            await supabase
              .from('tickets')
              .update({ qr_code_url: qrUrl })
              .eq('id', id);
          } catch (error) {
            console.error(`Failed to generate QR code for ticket ${id}:`, error);
          }
        })
      ).catch(err => console.error('Background QR generation error:', err));
    } else {
      // Generate primary QR code in background if no additional tickets
      generateAndStoreQRCode(primaryTicket.id, primaryTicketCode)
        .then(qrUrl => {
          return supabase
            .from('tickets')
            .update({ qr_code_url: qrUrl })
            .eq('id', primaryTicket.id);
        })
        .catch(err => console.error('Background QR generation error:', err));
    }

    // Update ticket type sold count (using the function from schema)
    // Note: The schema has a function `issue_tickets_and_update_inventory` but it requires order to be paid
    // We'll manually update the sold count
    const { error: updateError } = await supabase
      .from('ticket_types')
      .update({ sold: ticketType.sold + quantity })
      .eq('id', ticketType.id);

    if (updateError) {
      console.error('Error updating ticket sold count:', updateError);
      // Don't throw - tickets are created, we can fix inventory later
    }

    // Send ticket email (non-blocking, don't wait for it)
    sendTicketEmail({
      orderId,
      order,
      ticketType,
      ticketCodes,
    }).catch(err => {
      console.error('Failed to send ticket email:', err);
      // Don't throw - tickets are created successfully
    });

    return ticketCodes;
  } catch (error: unknown) {
    console.error('Error creating tickets:', error);
    throw error;
  }
}

/**
 * Update order status to paid
 */
export async function markOrderAsPaid(orderId: string, paymentReference?: string, paymentProvider: string = 'paystack'): Promise<void> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        payment_reference: paymentReference,
        payment_provider: paymentProvider,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;
  } catch (error: unknown) {
    console.error('Error marking order as paid:', error);
    throw error;
  }
}

/**
 * Create free tickets (for price = 0)
 */
export async function createFreeTickets(params: CreateOrderParams): Promise<{ ticketId: string }> {
  try {
    // Create order with paid status immediately for free tickets
    const { orderId } = await createOrder(params);

    // Mark as paid immediately
    await markOrderAsPaid(orderId, `FREE-${orderId}`, 'free');

    // Create tickets
    await createTicketsForOrder(orderId);

    // Return the first ticket ID
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('order_id', orderId)
      .limit(1)
      .single();

    if (ticketError) throw ticketError;

    return { ticketId: ticket.id };
  } catch (error: unknown) {
    console.error('Error creating free tickets:', error);
    throw error;
  }
}