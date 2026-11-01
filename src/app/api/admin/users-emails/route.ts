import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/utils/processOrder';
import { requireAuth } from '@/utils/apiAuth';

const PAGE_SIZE = 1000;
const MAX_IDS = 5000;

/** Admin only: emails and display names for a list of user ids. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', auth.userId)
    .maybeSingle();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  try {
    const { user_ids } = await request.json().catch(() => ({ user_ids: [] }));
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ emails: [], names: [] });
    }
    const wanted = new Set<string>(user_ids.slice(0, MAX_IDS).map(String));

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', Array.from(wanted));
    const profileNames = new Map<string, string>();
    (profiles || []).forEach((p: { user_id: string; full_name: string | null }) => {
      if (p.full_name) profileNames.set(p.user_id, p.full_name);
    });

    // Page through auth users until every requested id is found
    const found = new Map<string, User>();
    for (let page = 1; found.size < wanted.size; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
      if (error) {
        console.error('[admin/users-emails] listUsers failed:', error);
        return NextResponse.json({ error: 'Failed to fetch user emails' }, { status: 500 });
      }
      data.users.forEach((u) => { if (wanted.has(u.id)) found.set(u.id, u); });
      if (data.users.length < PAGE_SIZE) break;
    }

    const emails: [string, string][] = [];
    const names: [string, string][] = [];
    wanted.forEach((userId) => {
      const authUser = found.get(userId);
      if (authUser) emails.push([userId, authUser.email || 'N/A']);
      const name = profileNames.get(userId) || (authUser?.user_metadata?.full_name as string | undefined);
      if (name) names.push([userId, name]);
    });

    return NextResponse.json({ emails, names });
  } catch (error) {
    console.error('[admin/users-emails] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
