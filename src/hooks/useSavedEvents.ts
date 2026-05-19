'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

export function useSavedEvents() {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user.id ?? null;
      setUserId(uid);
      if (!uid) { setLoading(false); return; }

      supabase
        .from('saved_events')
        .select('event_id')
        .eq('user_id', uid)
        .then(({ data }) => {
          setSavedIds(new Set((data || []).map(r => r.event_id as string)));
          setLoading(false);
        });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const toggle = useCallback(async (eventId: string) => {
    if (!userId) return;

    const isSaved = savedIds.has(eventId);

    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(eventId); else next.add(eventId);
      return next;
    });

    if (isSaved) {
      await supabase.from('saved_events').delete().eq('user_id', userId).eq('event_id', eventId);
    } else {
      await supabase.from('saved_events').insert({ user_id: userId, event_id: eventId });
    }
  }, [userId, savedIds]);

  return { savedIds, loading, toggle, isLoggedIn: !!userId };
}
