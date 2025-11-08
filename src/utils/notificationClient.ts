'use client';

import { supabase } from './supabaseClient';
type NotificationPayload =
  | { type: 'ticket_purchase'; orderId: string }
  | { type: 'location_booking'; bookingId: string }
  | { type: 'withdrawal_request'; withdrawalId: string }
  | { type: 'withdrawal_approved'; withdrawalId: string };

const NOTIFICATION_ENDPOINT = '/api/notifications';

async function buildAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (accessToken) {
      return {
        Authorization: `Bearer ${accessToken}`,
      };
    }
  } catch (error) {
    console.warn('[notificationClient] Failed to get session for notifications', error);
  }

  return {};
}

async function postNotification(payload: NotificationPayload) {
  try {
    const authHeaders = await buildAuthHeaders();
    const response = await fetch(NOTIFICATION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.warn(
        '[notificationClient] Failed to post notification',
        payload.type,
        response.status,
        error
      );
    }
  } catch (error) {
    console.warn('[notificationClient] Error posting notification', payload.type, error);
  }
}

export async function notifyTicketPurchase(orderId: string) {
  if (!orderId) return;
  await postNotification({ type: 'ticket_purchase', orderId });
}

export async function notifyLocationBooking(bookingId: string) {
  if (!bookingId) return;
  await postNotification({ type: 'location_booking', bookingId });
}

export async function notifyWithdrawalRequest(withdrawalId: string) {
  if (!withdrawalId) return;
  await postNotification({ type: 'withdrawal_request', withdrawalId });
}

export async function notifyWithdrawalApproved(withdrawalId: string) {
  if (!withdrawalId) return;
  await postNotification({ type: 'withdrawal_approved', withdrawalId });
}

