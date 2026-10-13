import { useState, type ReactNode } from 'react';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUiStore } from '@/store/ui.store';

/** Provider global: React Query. Zustand tidak butuh provider. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Status & kode galat terakhir disimpan supaya modal galat bisa menampilkan kode service-nya.
        mutationCache: new MutationCache({ onError: (error) => useUiStore.getState().recordError(error) }),
        defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
