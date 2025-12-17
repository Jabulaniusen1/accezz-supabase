import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  if (typeof window !== 'undefined') {
    console.error('This will cause authentication failures');
  }
}

// Custom fetch with retry logic for network errors
const fetchWithRetry = async (
  url: RequestInfo | URL,
  options: RequestInit = {},
  retries = 2,
  delay = 1000
): Promise<Response> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Retry on server errors (5xx) or timeout
    if (!response.ok && retries > 0 && (response.status >= 500 || response.status === 408)) {
      console.warn(`[Supabase] Server error ${response.status}, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }

    return response;
  } catch (error: unknown) {
    clearTimeout(setTimeout(() => {}, 0)); // Clear any pending timeout

    // Retry on network errors
    if (retries > 0 && (error instanceof TypeError || error instanceof DOMException || (error as Error)?.name === 'AbortError')) {
      const errorName = error instanceof Error ? error.name : 'Unknown';
      console.warn(`[Supabase] Network error (${errorName}), retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const supabase: SupabaseClient = createClient(
  supabaseUrl, 
  supabaseAnonKey, 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      fetch: fetchWithRetry,
    },
  }
);