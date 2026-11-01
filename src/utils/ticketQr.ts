/**
 * Server-only: render a ticket's QR code and store it in the `ticket-qr` bucket.
 * Only the service role can write to that bucket (see migration 018).
 */
import crypto from 'crypto';
import QRCode from 'qrcode';
import type { SupabaseClient } from '@supabase/supabase-js';

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://accezzlive.com';
}

export function ticketValidationUrl(ticketId: string, ticketCode: string): string {
  return `${getBaseUrl()}/validate-ticket?ticketId=${encodeURIComponent(ticketId)}&signature=${encodeURIComponent(ticketCode)}`;
}

/**
 * Generates the QR image, uploads it under an unguessable path, saves the URL
 * on the ticket and returns it. Falls back to a hosted QR service URL if the
 * upload fails, so emails always have an image.
 */
export async function storeTicketQr(
  supabaseAdmin: SupabaseClient,
  ticketId: string,
  ticketCode: string
): Promise<string> {
  const validateUrl = ticketValidationUrl(ticketId, ticketCode);
  let qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(validateUrl)}`;

  try {
    const png = await QRCode.toBuffer(validateUrl, { width: 400, margin: 2 });
    const path = `tickets/${ticketId}/${crypto.randomBytes(12).toString('hex')}.png`;
    const { error } = await supabaseAdmin.storage
      .from('ticket-qr')
      .upload(path, png, { contentType: 'image/png', upsert: true });
    if (error) throw error;
    qrCodeUrl = supabaseAdmin.storage.from('ticket-qr').getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.error('[ticketQr] QR upload failed, using fallback URL:', err instanceof Error ? err.message : err);
  }

  await supabaseAdmin.from('tickets').update({ qr_code_url: qrCodeUrl }).eq('id', ticketId);
  return qrCodeUrl;
}
