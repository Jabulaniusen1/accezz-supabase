import { supabase } from './supabaseClient';
import type { OrderCharges } from './fees';

/**
 * Browser helpers for checkout. Orders are priced, created and fulfilled on
 * the server (/api/orders, /api/paystack/*); nothing here writes to the
 * database directly.
 */

export interface CreateOrderParams {
  eventId: string;
  ticketTypeId?: string;
  ticketTypeName: string;
  quantity: number;
  email: string;
  phone: string;
  fullName: string;
  gender?: string;
  attendees?: Array<{ name: string; email: string; gender?: string }> | null;
  affiliateCode?: string | null;
}

export interface CreateOrderResult extends OrderCharges {
  orderId: string;
  currency: string;
  /** Free orders are fulfilled immediately; tickets already exist. */
  free: boolean;
}

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null) as { error?: string } | null;
  return data?.error || fallback;
}

/** Create an order (and, for free tickets, issue the tickets). */
export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(await readError(res, 'Could not create your order. Please try again.'));
  }
  return res.json() as Promise<CreateOrderResult>;
}

/** Start Paystack checkout for a pending order; returns the hosted checkout URL. */
export async function startPaystackCheckout(orderId: string): Promise<string> {
  const res = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      callbackUrl: `${window.location.origin}/success?orderId=${encodeURIComponent(orderId)}`,
    }),
  });
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to start payment'));
  }
  const data = await res.json() as { authorization_url?: string };
  if (!data.authorization_url) {
    throw new Error('Invalid response from payment initializer');
  }
  return data.authorization_url;
}

/** Attach a guest order to the signed-in account (email must match). */
export async function linkOrderToAccount(orderId: string): Promise<boolean> {
  const headers = await authHeaders();
  if (!headers.Authorization) return false;
  const res = await fetch('/api/orders/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ orderId }),
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => null) as { linked?: boolean } | null;
  return Boolean(data?.linked);
}

/** Order + tickets for the success and invoice pages. */
export async function fetchOrderDetails<T = unknown>(orderId: string): Promise<T> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(await readError(res, 'Order not found'));
  }
  return res.json() as Promise<T>;
}
