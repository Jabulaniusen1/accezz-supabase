import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getAdminUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();
  if (!profile?.is_admin) return null;
  return user;
}

// GET — list locations (both pending and approved) for admin review
export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // 'pending' | 'approved' | null (all)

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  let query = supabaseAdmin
    .from('locations')
    .select('id, name, address, city, country, latitude, longitude, is_active, created_at, user_id')
    .order('created_at', { ascending: false });

  if (status === 'pending') query = query.eq('is_active', false);
  else if (status === 'approved') query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ locations: data });
}

// PATCH — approve a location (set is_active = true)
export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { locationId } = await req.json() as { locationId?: string };
  if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { error } = await supabaseAdmin
    .from('locations')
    .update({ is_active: true })
    .eq('id', locationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — reject and remove a pending location
export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { locationId } = await req.json() as { locationId?: string };
  if (!locationId) return NextResponse.json({ error: 'locationId required' }, { status: 400 });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const { error } = await supabaseAdmin
    .from('locations')
    .delete()
    .eq('id', locationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
