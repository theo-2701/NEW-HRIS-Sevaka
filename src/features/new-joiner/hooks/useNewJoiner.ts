import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { atsCandidatesForNewJoiner, newJoinerService } from '@/features/new-joiner/services/new-joiner.service';
import { toast } from '@/store/ui.store';
import type { Candidate, CandidateDraft, InviteDraft, MaterializePayload } from '@/features/new-joiner/types';
import type { AddEmployeeValues } from '@/features/new-joiner/addEmployee';

export const newJoinerKeys = {
  list: ['new-joiners'] as const,
  atsAvailable: ['ats-bridge', 'available-for-new-joiner'] as const,
};

export function useCandidates() {
  return useQuery({ queryKey: newJoinerKeys.list, queryFn: () => newJoinerService.list() });
}

/** Kandidat ATS untuk sumber "From ATS": lengkap, bukan asal Bulk Import, belum dipegang calon aktif. */
export function useAtsCandidatesForNewJoiner(enabled: boolean) {
  return useQuery({ queryKey: newJoinerKeys.atsAvailable, queryFn: atsCandidatesForNewJoiner, enabled });
}

export function useSuggestedNik(enabled: boolean) {
  return useQuery({ queryKey: ['new-joiners', 'suggest-nik'], queryFn: () => newJoinerService.suggestNik(), enabled });
}

/** Semua mutasi New Joiner memakai invalidasi + penanganan galat yang sama (ATS ikut, karena saling tertaut). */
function useCandidateMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  onDone: (result: TResult, vars: TVars) => string | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const message = onDone(result, vars);
      if (message) toast(message, 'ok');
      void queryClient.invalidateQueries({ queryKey: newJoinerKeys.list });
      void queryClient.invalidateQueries({ queryKey: ['ats-bridge'] });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

/** Tanpa toast — hasilnya ditampilkan di dialog "Invitation sent" / "Candidate added". */
export const useInviteCandidate = () =>
  useCandidateMutation<InviteDraft, Candidate>(
    (draft) => newJoinerService.invite(draft),
    () => null,
  );

export const useResendCandidateLink = () =>
  useCandidateMutation<{ id: string; email: string }>(
    ({ id }) => newJoinerService.resendLink(id),
    (_result, { email }) => `A new link was sent to ${email}. The previous link no longer works.`,
  );

export const useUpdateCandidate = () =>
  useCandidateMutation<{ id: string; draft: CandidateDraft }>(
    ({ id, draft }) => newJoinerService.update(id, draft),
    (_result, { draft }) => `${draft.name}'s draft was updated.`,
  );

export const useSubmitCandidate = () =>
  useCandidateMutation<{ id: string; name: string }>(
    ({ id }) => newJoinerService.submit(id),
    (_result, { name }) => `${name} was submitted and is waiting for a checker.`,
  );

export const useApproveCandidate = () =>
  useCandidateMutation<{ id: string; name: string; note: string }, number>(
    ({ id, note }) => newJoinerService.approve(id, note),
    (autoRejected, { name }) =>
      autoRejected > 0
        ? `${name} was approved and the seat is held. ${autoRejected} other candidate(s) for this position were rejected automatically.`
        : `${name} was approved. The seat is held until the expiry date.`,
  );

export const useCancelCandidate = () =>
  useCandidateMutation<{ id: string; name: string }>(
    ({ id }) => newJoinerService.cancel(id),
    (_result, { name }) => `${name} was cancelled. The seat is released.`,
  );

export const useDeleteCandidate = () =>
  useCandidateMutation<{ id: string; name: string }>(
    ({ id }) => newJoinerService.remove(id),
    (_result, { name }) => `${name}'s draft was deleted.`,
  );

/** Jalur manual Add Employee — tidak menyentuh daftar kandidat. */
export const useAddEmployee = () =>
  useCandidateMutation<AddEmployeeValues>(
    (values) => newJoinerService.addEmployee(values),
    (_result, values) => `${values.fullName} ditambahkan ke direktori dengan status WAITING.`,
  );

/** Tanpa toast — dialog "Employee created" menampilkan hasil, termasuk peringatan NIK kembar. */
export const useMaterializeCandidate = () =>
  useCandidateMutation<MaterializePayload, { nikAlsoUsed: boolean }>(
    (payload) => newJoinerService.materialize(payload),
    () => null,
  );
