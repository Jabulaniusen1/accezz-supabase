import { supabase } from './supabaseClient';

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(params: { email: string; password: string; fullName?: string; phone?: string; userType?: "creator" | "customer"; country?: string; city?: string; }) {
  const { email, password, fullName, phone, userType = "customer", country, city } = params;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        user_type: userType,
        country,
        city,
      },
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}


