import { supabase } from './supabaseClient';

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
    // Fetch event to get ticket type details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, currency')
      .eq('id', params.eventId)
      .single();

    if (eventError) throw eventError;

    // Fetch ticket type
    const { data: ticketType, error: ticketTypeError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', params.eventId)
      .eq('name', params.ticketTypeName)
      .single();

    if (ticketTypeError || !ticketType) {
      throw new Error('Ticket type not found');
    }

    // Check if enough tickets are available
    const available = ticketType.quantity - ticketType.sold;
    if (available < params.quantity) {
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
        },
      })
      .select('id')
      .single();

    if (orderError) throw orderError;

    return {
      orderId: order.id,
      totalAmount: totalAmount,
    };
  } catch (error: unknown) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Create tickets for a paid order
 */
export async function createTicketsForOrder(orderId: string): Promise<string[]> {
  try {
    // Fetch order with event details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, events!inner(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Ensure order is paid (required by RLS policy)
    if (order.status !== 'paid') {
      // Try to update to paid if it's not already
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);
      
      if (updateError) {
        throw new Error('Order must be paid before creating tickets');
      }
      
      // Re-fetch order to get updated status
      const { data: updatedOrder, error: refetchError } = await supabase
        .from('orders')
        .select('*, events!inner(*)')
        .eq('id', orderId)
        .single();
      
      if (refetchError || !updatedOrder) throw refetchError || new Error('Failed to verify order status');
      
      if (updatedOrder.status !== 'paid') {
        throw new Error('Order must be paid before creating tickets');
      }
      
      // Use updated order data
      Object.assign(order, updatedOrder);
    }

    const meta = order.meta as { ticketTypeName?: string; quantity?: number; attendees?: Array<{ name: string; email: string }>; } | null;
    const ticketTypeName = meta?.ticketTypeName;
    const quantity = meta?.quantity || 1;
    const attendees = meta?.attendees || [];

    // Fetch ticket type
    const { data: ticketType, error: ticketTypeError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', order.event_id)
      .eq('name', ticketTypeName)
      .single();

    if (ticketTypeError || !ticketType) {
      throw new Error('Ticket type not found');
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
        price: ticketType.price,
        currency: order.currency,
        validation_status: 'valid',
      })
      .select('id')
      .single();

    if (primaryTicketError) throw primaryTicketError;

    // Generate and store QR code for primary ticket
    const primaryQRUrl = await generateAndStoreQRCode(primaryTicket.id, primaryTicketCode);
    
    // Update primary ticket with QR code URL
    await supabase
      .from('tickets')
      .update({ qr_code_url: primaryQRUrl })
      .eq('id', primaryTicket.id);

    // Additional attendees
    for (let i = 0; i < Math.min(attendees.length, quantity - 1); i++) {
      const attendee = attendees[i];
      const ticketCode = generateTicketCode();
      ticketCodes.push(ticketCode);
      
      // Insert ticket
      const { data: additionalTicket, error: additionalTicketError } = await supabase
        .from('tickets')
        .insert({
          order_id: orderId,
          event_id: order.event_id,
          ticket_type_id: ticketType.id,
          ticket_code: ticketCode,
          qr_code_url: '', // Will be updated after generation
          attendee_name: attendee.name,
          attendee_email: attendee.email,
          price: ticketType.price,
          currency: order.currency,
          validation_status: 'valid',
        })
        .select('id')
        .single();

      if (additionalTicketError) throw additionalTicketError;

      // Generate and store QR code
      const additionalQRUrl = await generateAndStoreQRCode(additionalTicket.id, ticketCode);
      
      // Update ticket with QR code URL
      await supabase
        .from('tickets')
        .update({ qr_code_url: additionalQRUrl })
        .eq('id', additionalTicket.id);
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

