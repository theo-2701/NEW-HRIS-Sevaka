import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bulkActivationService } from '@/features/bulk-activation/services/bulk-activation.service';
import type { InvitationStatus } from '@/features/bulk-activation/types';
import { toast } from '@/store/ui.store';

const keys = { all: ['bulk-activation'] as const };

/** Muat ulang tiap 5 detik selama masih ada baris Sending (CATATAN 12 Okt). */
export const usePendingAccounts = (filter: { search: string; status?: InvitationStatus }) =>
  useQuery({
    queryKey: [...keys.all, filter],
    queryFn: () => bulkActivationService.list(filter),
    refetchInterval: (query) => (query.state.data?.some((row) => row.invitationStatus === 'SENDING') ? 5000 : false),
  });

export function useSendInvitations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, force }: { ids: string[]; force: boolean }) => bulkActivationService.send(ids, force),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.all }),
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email, phone }: { id: string; email: string; phone: string }) =>
      bulkActivationService.update(id, email, phone),
    onSuccess: (row) => {
      toast(`Saved. A new activation link is on its way to ${row.email}.`, 'ok');
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
  });
}
