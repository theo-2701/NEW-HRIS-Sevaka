import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { atsBridgeService } from '@/features/ats-bridge/services/ats-bridge.service';
import type { AtsFilter } from '@/features/ats-bridge/services/ats-bridge.service';
import type { AtsRole, MaterializeDraft } from '@/features/ats-bridge/types';
import { toast } from '@/store/ui.store';

const keys = { all: ['ats-bridge'] as const };

export const useAtsCandidates = (filter: AtsFilter) =>
  useQuery({ queryKey: [...keys.all, filter], queryFn: () => atsBridgeService.search(filter) });

function useAtsMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, message?: (result: TResult) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      if (message) toast(message(result), 'ok');
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useInviteCandidate = () =>
  useAtsMutation(
    ({ email, requestor }: { email: string; requestor: string }) => atsBridgeService.invite(email, requestor),
    (row) => `Invitation sent to ${row.candidateEmail}. The link is valid for 24 hours.`,
  );

export const useResendAtsLink = () =>
  useAtsMutation((id: string) => atsBridgeService.resendLink(id), (row) => `A new link was sent to ${row.candidateEmail}.`);

export const useDeleteAtsCandidate = (role: AtsRole) =>
  useAtsMutation((id: string) => atsBridgeService.remove(role, id), () => 'Candidate deleted; the link no longer works.');

/** Tanpa toast sukses — hasilnya (sandi kotak surat) ditampilkan di modal. */
export const useMaterializeCandidate = () =>
  useAtsMutation(({ id, draft, key }: { id: string; draft: MaterializeDraft; key: string }) =>
    atsBridgeService.materialize(id, draft, key),
  );
