import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateTicketEmailHTML } from '@/utils/emailUtils';
import { generateReceiptPDF } from '@/utils/receiptPDF';
import { supabase } from '@/utils/supabaseClient';

/**
 * Generate QR code for a ticket if not already available
 */
async function ensureQRCodeUrl(ticketCode: string, ticketId?: string): Promise<string | null> {
  try {
    // If we have a ticket ID, check if QR code exists
    if (ticketId) {
      const { data: ticket } = await supabase
        .from('tickets')
        .select('qr_code_url, id')
        .eq('id', ticketId)
        .single();
      
      if (ticket?.qr_code_url) {
        return ticket.qr_code_url;
      }
    }

    // Generate QR code on-the-fly if not available
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const validateUrl = `${baseUrl}/validate-ticket?ticketId=${ticketId || 'unknown'}&signature=${ticketCode}`;
    
    // Use QR code library to generate
    const qrcode = await import('qrcode');
    const qrCodeDataUrl = await qrcode.default.toDataURL(validateUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Fallback to external service
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const encodedUrl = encodeURIComponent(`${baseUrl}/validate-ticket?ticketId=${ticketId || 'unknown'}&signature=${ticketCode}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodedUrl}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      fullName,
      eventTitle,
      eventDate,
      eventTime,
      venue,
      ticketType,
      quantity,
      ticketCodes,
      totalAmount,
      currency,
      orderId,
      qrCodeUrl,
      ticketId,
      primaryTicketCode,
    } = body;

    if (!email || !fullName || !eventTitle) {
      return NextResponse.json(
        { error: 'Missing required fields: email, fullName, eventTitle' },
        { status: 400 }
      );
    }

    const html = generateTicketEmailHTML({
      fullName,
      eventTitle,
      eventDate: eventDate || 'TBD',
      eventTime: eventTime || 'TBD',
      venue: venue || 'TBD',
      ticketType: ticketType || 'General',
      quantity: quantity || 1,
      ticketCodes: ticketCodes || [],
      totalAmount: totalAmount || 0,
      currency: currency || 'NGN',
      orderId: orderId || 'N/A',
      qrCodeUrl,
    });

    // Ensure we have a QR code URL for the PDF
    let finalQrCodeUrl = qrCodeUrl;
    if (!finalQrCodeUrl && primaryTicketCode) {
      // Generate QR code on-the-fly if not available
      finalQrCodeUrl = await ensureQRCodeUrl(primaryTicketCode, ticketId) || undefined;
    }

    // Generate PDF receipt
    let pdfAttachment = null;
    try {
      // eventDate might be formatted string or ISO date - PDF generator will handle both
      const pdfBuffer = await generateReceiptPDF({
        eventTitle,
        eventDate: eventDate !== 'TBD' ? eventDate : undefined,
        eventTime: eventTime !== 'TBD' ? eventTime : undefined,
        venue: venue !== 'TBD' ? venue : undefined,
        ticketType: ticketType || 'General',
        price: totalAmount || 0,
        currency: currency || 'NGN',
        qrCodeUrl: finalQrCodeUrl || undefined,
        fullName,
        orderId: orderId || 'N/A',
        ticketCode: primaryTicketCode,
        ticketId: ticketId,
      });

      // Create safe filename
      const safeEventTitle = eventTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const fileName = `${safeEventTitle}_Receipt_${orderId || 'ticket'}.pdf`;

      pdfAttachment = {
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      };
    } catch (pdfError) {
      console.error('Error generating PDF receipt:', pdfError);
      // Continue without PDF attachment if generation fails
    }

    await sendEmail({
      to: email,
      subject: `Your Tickets for ${eventTitle}`,
      html,
      attachments: pdfAttachment ? [pdfAttachment] : undefined,
    });

    return NextResponse.json(
      { message: 'Ticket email sent successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error sending ticket email:', error);
    const message = error instanceof Error ? error.message : 'Failed to send ticket email';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

