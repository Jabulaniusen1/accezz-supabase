import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

/**
 * Generate QR code for a ticket and store it
 * This is called by Inngest function to generate QR codes asynchronously
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, ticketCode } = body;

    if (!ticketId || !ticketCode) {
      return NextResponse.json(
        { error: 'Missing required fields: ticketId, ticketCode' },
        { status: 400 }
      );
    }

    // Generate validation URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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

    // Upload to Supabase Storage
    const filePath = `tickets/${ticketId}/qr-code.png`;
    const { error: uploadError } = await supabase.storage
      .from('ticket-qr')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('[generate-qr] Error uploading QR code:', uploadError);
      // Fallback to data URL if upload fails
      return NextResponse.json({ qrCodeUrl: qrCodeDataUrl });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('ticket-qr')
      .getPublicUrl(filePath);

    // Update ticket with QR code URL
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ qr_code_url: publicUrl })
      .eq('id', ticketId);

    if (updateError) {
      console.error('[generate-qr] Error updating ticket with QR code URL:', updateError);
      // Still return the URL even if update fails
    }

    return NextResponse.json({ qrCodeUrl: publicUrl });
  } catch (error: unknown) {
    console.error('[generate-qr] Error generating QR code:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate QR code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


