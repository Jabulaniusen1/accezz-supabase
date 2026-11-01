'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Older service workers cached API/Supabase responses (personal data,
  // ticket state). They no longer do; remove what earlier versions stored, once.
  useEffect(() => {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    const flag = 'swCacheCleanup:v1';
    try {
      if (localStorage.getItem(flag)) return;
      localStorage.setItem(flag, '1');
    } catch {
      return;
    }
    caches.delete('apis').catch(() => {});
    caches.delete('cross-origin').catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}