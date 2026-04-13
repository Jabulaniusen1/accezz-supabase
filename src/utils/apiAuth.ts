/**
 * Server-side API authentication helpers.
 *
 * Two strategies are supported:
 *   1. Internal secret  — lightweight secret header for server-to-server or cron calls.
 *   2. Supabase session — full JWT verification for user-facing endpoints.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Verify the `x-internal-secret` header matches INTERNAL_API_SECRET.
 * Returns null on success, or a 401/500 NextResponse on failure.
 */
export function requireInternalSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfigured: INTERNAL_API_SECRET not set' }, { status: 500 });
  }
  const provided = req.headers.get('x-internal-secret');
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/**
 * Verify the caller is an authenticated Supabase user.
 * Reads the Bearer token from the Authorization header.
 * Returns null on success (and sets userId), or a 401 NextResponse on failure.
 */
export async function requireAuth(req: NextRequest): Promise<{ error: NextResponse } | { userId: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const token = authHeader.replace('Bearer ', '');

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { userId: user.id };
}
