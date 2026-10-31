'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

/** Whether there is a Supabase session; follows sign-in / sign-out live. */
export function useIsLoggedIn() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setIsLoggedIn(Boolean(session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return [isLoggedIn, setIsLoggedIn] as const;
}
