import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { newJoinerService } from '@/features/new-joiner/services/new-joiner.service';
import { toast } from '@/store/ui.store';
import type { CandidateDraft, CandidateProfile, InviteDraft, MaterializePayload } from '@/features/new-joiner/types';
import type { AddEmployeeValues } from '@/features/new-joiner/addEmployee';

export const newJoinerKeys = {
  list: ['new-joiners'] as const,
};

export function useCandidates() {
  return useQuery({ queryKey: newJoinerKeys.list, queryFn: () => newJoinerService.list() });
}

/** Semua mutasi New Joiner memakai invalidasi + penanganan galat yang sama. */
function useCandidateMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  onDone: (result: TResult, vars: TVars) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      toast(onDone(result, vars), 'ok');
      queryClient.invalidateQueries({ queryKey: newJoinerKeys.list });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateCandidate = () =>
  useCandidateMutation<{ draft: CandidateDraft; submitNow: boolean }>(
    ({ draft, submitNow }) => newJoinerService.create(draft, submitNow),
    (_result, { draft, submitNow }) =>
      submitNow
        ? `${draft.name} diajukan untuk persetujuan. Checker lain yang memutuskan (SoD).`
        : `${draft.name} tersimpan sebagai draft. Pakai Submit untuk mengajukan.`,
  );

export const useSubmitCandidate = () =>
  useCandidateMutation<{ id: string; name: string }>(
    ({ id }) => newJoinerService.submit(id),
    (_result, { name }) => `${name} diajukan. Menunggu persetujuan checker.`,
  );

export const useApproveCandidate = () =>
  useCandidateMutation<{ id: string; name: string; note: string }, number>(
    ({ id, note }) => newJoinerService.approve(id, note),
    (autoRejected, { name }) =>
      autoRejected > 0
        ? `${name} disetujui — kursi ditahan. ${autoRejected} kandidat saingan otomatis ditolak.`
        : `${name} disetujui — kursi ditahan sampai tanggal kedaluwarsa.`,
  );

export const useRejectCandidate = () =>
  useCandidateMutation<{ id: string; name: string; note: string }>(
    ({ id, note }) => newJoinerService.reject(id, note),
    (_result, { name }) => `${name} ditolak.`,
  );

export const useCancelCandidate = () =>
  useCandidateMutation<{ id: string; name: string }>(
    ({ id }) => newJoinerService.cancel(id),
    (_result, { name }) => `${name} dibatalkan sebelum kontrak ditandatangani. Kursi dilepas.`,
  );

export const useDeleteCandidate = () =>
  useCandidateMutation<{ id: string; name: string }>(
    ({ id }) => newJoinerService.remove(id),
    (_result, { name }) => `Draft ${name} dihapus.`,
  );

/** Jalur manual Add Employee — tidak menyentuh daftar kandidat. */
export const useAddEmployee = () =>
  useCandidateMutation<AddEmployeeValues>(
    (values) => newJoinerService.addEmployee(values),
    (_result, values) => `${values.fullName} ditambahkan ke direktori dengan status WAITING.`,
  );

export const useInviteCandidate = () =>
  useCandidateMutation<InviteDraft, { status: string; email: string }>(
    (draft) => newJoinerService.invite(draft),
    (row) =>
      row.status === 'WAITING_CANDIDATE'
        ? `Invitation sent to ${row.email}. The candidate fills in their own data; the link is valid for 24 hours.`
        : 'Candidate added from ATS as a draft. Submit it for approval when ready.',
  );

export const useResendCandidateLink = () =>
  useCandidateMutation<{ id: string; email: string }>(
    ({ id }) => newJoinerService.resendLink(id),
    (_result, { email }) => `A new link was sent to ${email}; the old one no longer works.`,
  );

export const useAtsOptions = (enabled: boolean) =>
  useQuery({ queryKey: [...newJoinerKeys.list, 'ats-options'], queryFn: async () => newJoinerService.atsOptions(), enabled });

export const usePortalState = (token: string) =>
  useQuery({ queryKey: ['candidate-portal', token], queryFn: () => newJoinerService.portalState(token), enabled: Boolean(token), retry: false });

export const usePortalSubmit = () =>
  useMutation({ mutationFn: ({ token, profile }: { token: string; profile: CandidateProfile }) => newJoinerService.portalSubmit(token, profile) });

export const useMaterializeCandidate = () =>
  useCandidateMutation<{ payload: MaterializePayload; name: string }>(
    ({ payload }) => newJoinerService.materialize(payload),
    (_result, { name }) => `${name} is now an employee (WAITING). Their company email and phone join the Email and Phone Verification queue.`,
  );
