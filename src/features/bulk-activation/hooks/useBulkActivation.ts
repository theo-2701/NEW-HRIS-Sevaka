import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bulkActivationService } from '@/features/bulk-activation/services/bulk-activation.service';
import type { ActivationFilter } from '@/features/bulk-activation/types';
import { toast } from '@/store/ui.store';

const keys = { all: ['bulk-activation'] as const };

/** Penyegaran otomatis tiap 5 detik — hanya selama masih ada baris `SENDING` (§9.1). */
export function useActivationAccounts(filter: ActivationFilter) {
  return useQuery({
    queryKey: [...keys.all, filter],
    queryFn: () => bulkActivationService.list(filter),
    refetchInterval: (query) => ((query.state.data ?? []).some((row) => row.invitationStatus === 'SENDING') ? 5000 : false),
  });
}

export function useSendInvitations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, force }: { ids: string[]; force?: boolean }) => bulkActivationService.send(ids, force),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.all }),
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export function useUpdateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email, phoneNumber }: { id: string; email: string; phoneNumber: string }) =>
      bulkActivationService.update(id, { email, phoneNumber }),
    onSuccess: (row) => {
      toast(`Saved. A new activation link is on its way to ${row.email}.`, 'ok');
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
