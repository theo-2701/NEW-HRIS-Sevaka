import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { atsBridgeService } from '@/features/ats-bridge/services/ats-bridge.service';
import type { AtsFilter, MaterializeInput } from '@/features/ats-bridge/types';
import { toast } from '@/store/ui.store';

const keys = { all: ['ats-bridge'] as const };

export function useAtsBridges(filter: AtsFilter) {
  return useQuery({ queryKey: [...keys.all, 'search', filter], queryFn: () => atsBridgeService.search(filter) });
}

export function useAtsBridge(id: string | null) {
  return useQuery({
    queryKey: [...keys.all, 'detail', id],
    queryFn: () => atsBridgeService.detail(id!),
    enabled: Boolean(id),
  });
}

function useAtsMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, message?: (result: TResult) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (message) toast(message(result), 'ok');
      void queryClient.invalidateQueries({ queryKey: keys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useInviteCandidate = () =>
  useAtsMutation(atsBridgeService.invite, (row) => `Invitation sent to ${row.candidateEmail}. The link is valid for 24 hours.`);

export const useResendLink = () =>
  useAtsMutation((id: string) => atsBridgeService.resendLink(id), (row) => `A new link was sent to ${row.candidateEmail}. The old link no longer works.`);

export const useDeleteCandidate = () => useAtsMutation((id: string) => atsBridgeService.remove(id), () => 'Candidate deleted.');

export const useMaterializeCandidate = () =>
  useAtsMutation(({ id, input, key }: { id: string; input: MaterializeInput; key: string }) =>
    atsBridgeService.materialize(id, input, key),
  );
