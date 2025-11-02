import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// This route requires admin authentication
// It uses service role to access auth.users table

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
      });
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable'
      }, { status: 500 });
    }

    // Get session from cookies or Authorization header
    const cookieStore = await cookies();
    const authHeader = request.headers.get('authorization');
    
    let accessToken: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.replace('Bearer ', '');
    } else {
      // Try to get from cookies - Supabase stores tokens with different cookie names
      const possibleCookies = ['sb-access-token', 'supabase-auth-token'];
      for (const cookieName of possibleCookies) {
        const cookie = cookieStore.get(cookieName);
        if (cookie) {
          accessToken = cookie.value;
          break;
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized - No access token provided' }, { status: 401 });
    }

    // Create admin client to verify user is admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user from token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get request body
    const { user_ids } = await request.json();

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ emails: [], names: [] });
    }

    // Fetch names from profiles table (more reliable than user_metadata)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', user_ids);

    const profileMap = new Map<string, string>();
    if (profiles && !profilesError) {
      profiles.forEach((profile: { user_id: string; full_name: string | null }) => {
        if (profile.full_name) {
          profileMap.set(profile.user_id, profile.full_name);
        }
      });
    }

    // Use service role to access auth.users for emails
    let emails: [string, string][] = [];
    let names: [string, string][] = [];

    try {
      const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

      if (usersError) {
        console.error('Error fetching users from auth:', usersError);
        // Fallback: try to get emails individually if listUsers fails
        for (const userId of user_ids) {
          try {
            const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (!userError && user?.email) {
              emails.push([userId, user.email]);
            }
          } catch (err) {
            console.error(`Error fetching user ${userId}:`, err);
          }
        }
      } else {
        // Map user IDs to emails and names
        user_ids.forEach((userId: string) => {
          const authUser = authUsers.users.find(u => u.id === userId);
          if (authUser) {
            emails.push([userId, authUser.email || 'N/A']);
          }
          
          // Prefer profile name over user_metadata
          const profileName = profileMap.get(userId);
          if (profileName) {
            names.push([userId, profileName]);
          } else if (authUser?.user_metadata?.full_name) {
            names.push([userId, authUser.user_metadata.full_name]);
          }
        });
      }
    } catch (authError) {
      console.error('Error accessing auth.users:', authError);
      return NextResponse.json({ 
        error: 'Failed to fetch user emails', 
        details: authError instanceof Error ? authError.message : 'Unknown error'
      }, { status: 500 });
    }

    return NextResponse.json({ emails, names });
  } catch (error) {
    console.error('Error in users-emails API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

