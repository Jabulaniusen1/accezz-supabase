/**
 * Server-side API authentication helpers.
 *
 * Two strategies are supported:
 *   1. Internal secret  — lightweight secret header for server-to-server or cron calls.
 *   2. Supabase session — full JWT verification for user-facing endpoints.
 */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/** Constant-time string comparison (avoids leaking the secret through timing). */
export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/** True when the request carries a valid x-internal-secret header. */
export function isInternalRequest(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  const provided = req.headers.get('x-internal-secret');
  return Boolean(secret && provided && safeEqual(provided, secret));
}

/**
 * Verify the `x-internal-secret` header matches INTERNAL_API_SECRET.
 * Returns null on success, or a 401/500 NextResponse on failure.
 */
export function requireInternalSecret(req: NextRequest): NextResponse | null {
  if (!process.env.INTERNAL_API_SECRET) {
    console.error('[apiAuth] INTERNAL_API_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  if (!isInternalRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * Resolve the Supabase user from the request's Bearer token, if any.
 * Returns null for anonymous requests or invalid tokens.
 */
export async function getOptionalUser(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * Verify the caller is an authenticated Supabase user.
 * Reads the Bearer token from the Authorization header.
 * Returns the user on success, or a 401 NextResponse on failure.
 */
export async function requireAuth(req: NextRequest): Promise<{ error: NextResponse } | { userId: string; user: User }> {
  const user = await getOptionalUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { userId: user.id, user };
}
