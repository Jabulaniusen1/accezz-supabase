import { supabase } from './supabaseClient';
import { notifyTicketPurchase } from './notificationClient';

// Removed unused import: fetchEventBySlug

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
 * Helper function to send individual ticket emails to each attendee
 */
async function sendTicketEmailsToAttendees({
  orderId,
  order,
  ticketType,
}: {
  orderId: string;
  order: Order;
  ticketType: TicketType;
}): Promise<void> {
  try {
    // Fetch all tickets for this order
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, ticket_code, qr_code_url, attendee_name, attendee_email')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (ticketsError || !tickets || tickets.length === 0) {
      console.error('[sendTicketEmailsToAttendees] Error fetching tickets:', ticketsError);
      return;
    }

    // Fetch event details once
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title, start_time, end_time, venue, location, address, city, country, is_virtual, virtual_details')
      .eq('id', order.event_id)
      .single();

    if (eventError) {
      console.error('[sendTicketEmailsToAttendees] Error fetching event:', eventError);
      return;
    }

    const isVirtualEvent = Boolean(event.is_virtual);
    const virtualDetails = (event.virtual_details as Record<string, unknown> | null) || null;
    const rawMeetingUrl = typeof virtualDetails?.meetingUrl === 'string' ? virtualDetails.meetingUrl.trim() : '';
    const rawMeetingId = typeof virtualDetails?.meetingId === 'string' ? virtualDetails.meetingId.trim() : '';
    const virtualPlatform = typeof virtualDetails?.platform === 'string' ? virtualDetails.platform : undefined;

    let virtualAccessLink: string | undefined;
    if (rawMeetingUrl) {
      virtualAccessLink = rawMeetingUrl;
    } else if (virtualPlatform === 'zoom' && rawMeetingId) {
      virtualAccessLink = `https://zoom.us/j/${rawMeetingId}`;
    }

    const formatPlatform = (value?: string) => {
      if (!value) return 'Online Event';
      return value
        .split(/[-_]/g)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
    };

    const physicalVenueParts = [
      event.venue,
      event.location,
      event.address,
      event.city,
      event.country,
    ].filter((part) => typeof part === 'string' && part.trim().length > 0);

    const eventVenue = isVirtualEvent
      ? `${formatPlatform(virtualPlatform)} (Online)`
      : physicalVenueParts.join(', ') || 'TBD';

    // Format date and time
    const startDate = event.start_time ? new Date(event.start_time) : null;
    const endDate = event.end_time ? new Date(event.end_time) : null;

    const eventDate = startDate
      ? startDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'TBD';

    const formatTime = (date: Date | null) =>
      date
        ? date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })
        : null;

    const startTimeFormatted = formatTime(startDate);
    const endTimeFormatted = formatTime(endDate);

    const eventTime =
      startTimeFormatted && endTimeFormatted
        ? `${startTimeFormatted} - ${endTimeFormatted}`
        : startTimeFormatted || endTimeFormatted || 'TBD';

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Send individual email to each ticket holder
    const emailPromises = tickets.map(async (ticket) => {
      try {
        const response = await fetch(`${baseUrl}/api/emails/ticket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
          },
          body: JSON.stringify({
            email: ticket.attendee_email,
            fullName: ticket.attendee_name,
            eventTitle: event.title || 'Event',
            eventDate,
            eventTime,
            venue: eventVenue,
            ticketType: ticketType.name,
            quantity: 1, // Each email is for one ticket
            ticketCodes: [ticket.ticket_code],
            totalAmount: ticketType.price,
            currency: order.currency,
            orderId,
            qrCodeUrl: ticket.qr_code_url,
            ticketId: ticket.id,
            primaryTicketCode: ticket.ticket_code,
            isVirtual: isVirtualEvent,
            virtualAccessLink,
            virtualPlatform,
            virtualMeetingId: rawMeetingId || undefined,
          }),
        });

        if (!response.ok) {
          // Read the body once — either as JSON or plain text
          const raw = await response.text().catch(() => '');
          let errorMessage = `Failed to send ticket email: ${response.status}`;
          try {
            const parsed = JSON.parse(raw) as { error?: string };
            if (parsed.error) errorMessage = parsed.error;
          } catch {
            if (raw) errorMessage = raw;
          }
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('[sendTicketEmailsToAttendees] Failed to send email:', error instanceof Error ? error.message : error);
        // Continue sending to other attendees even if one fails
      }
    });

    await Promise.all(emailPromises);
  } catch (error) {
    console.error('[sendTicketEmailsToAttendees] Error:', error);
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
  gender?: string;
  attendees?: Array<{ name: string; email: string; gender?: string }> | null;
  currency?: string;
}

// Removed unused type: TicketCreationData - internal data shapes are inferred per-query

/**
 * Generate a cryptographically secure unique ticket code
 */
function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
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

    // Upload successful, continue to get public URL

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
    
    // Fetch event to get ticket type details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, currency')
      .eq('id', params.eventId)
      .single();

    if (eventError) {
      console.error('[createOrder] Error fetching event:', eventError?.message);
      throw eventError;
    }

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

    // Create order
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
          primaryBuyerGender: params.gender || null,
        },
      })
      .select('id')
      .single();

    if (orderError) {
      throw orderError;
    }


    // Trigger Inngest event to send abandoned cart email after 20 seconds
    // Only trigger for paid tickets (not free tickets)
    if (totalAmount > 0) {
      try {
        // Use API route to trigger Inngest event (works from both client and server)
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        const triggerUrl = `${baseUrl}/api/inngest/trigger`;
        const response = await fetch(triggerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
          },
          body: JSON.stringify({
            eventName: 'order/created',
            data: {
              orderId: order.id,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Inngest trigger failed: ${response.status}`);
        }
      } catch (inngestError) {
        // Non-fatal — order is created; abandoned cart email will not be scheduled
        console.error('[createOrder] Inngest trigger error:', inngestError instanceof Error ? inngestError.message : inngestError);
      }
    }

    return {
      orderId: order.id,
      totalAmount: totalAmount,
    };
  } catch (error: unknown) {
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

    const meta = order.meta as { 
      ticketTypeName?: string; 
      quantity?: number; 
      attendees?: Array<{ name: string; email: string; gender?: string }>; 
      primaryBuyerGender?: string;
    } | null;
    const ticketTypeName = meta?.ticketTypeName;
    const quantity = meta?.quantity || 1;
    const attendees = meta?.attendees || [];
    const primaryBuyerGender = meta?.primaryBuyerGender || null;


    // Fetch ticket type
    const { data: ticketType, error: ticketTypeError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', order.event_id)
      .eq('name', ticketTypeName)
      .single();

    if (ticketTypeError || !ticketType) {
      console.error('[createTicketsForOrder] Ticket type lookup error:', ticketTypeError?.message);
      throw new Error(`Ticket type not found: ${ticketTypeName}`);
    }
    

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
        gender: primaryBuyerGender,
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
      gender: string | null;
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
        gender: attendee.gender || null,
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

    // Atomically increment sold count — prevents overselling race conditions
    const { error: updateError } = await supabase.rpc('increment_ticket_sold', {
      ticket_type_id: ticketType.id,
      amount: quantity,
    });

    if (updateError) {
      // Don't throw — tickets are already created, inventory can be corrected
    }

    // Send ticket emails to each attendee (non-blocking, don't wait for it)
    sendTicketEmailsToAttendees({
      orderId,
      order,
      ticketType,
    }).catch(err => {
      console.error('Failed to send ticket emails:', err);
      // Don't throw - tickets are created successfully
    });

    // Notify event creator about ticket purchase (non-blocking)
    notifyTicketPurchase(orderId).catch(err => {
      console.error('Failed to send ticket purchase notification:', err);
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
export async function createFreeTickets(params: CreateOrderParams): Promise<{ ticketId: string; orderId: string }> {
  try {
    // Create order with paid status immediately for free tickets
    const { orderId } = await createOrder(params);

    // Mark as paid immediately
    await markOrderAsPaid(orderId, `FREE-${orderId}`, 'free');

    // Create tickets
    await createTicketsForOrder(orderId);
    await notifyTicketPurchase(orderId);

    // Return the first ticket ID
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('order_id', orderId)
      .limit(1)
      .single();

    if (ticketError) throw ticketError;

    return { ticketId: ticket.id, orderId };
  } catch (error: unknown) {
    console.error('Error creating free tickets:', error);
    throw error;
  }
}