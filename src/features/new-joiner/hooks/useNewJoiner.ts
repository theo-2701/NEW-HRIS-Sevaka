import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { newJoinerService } from '@/features/new-joiner/services/new-joiner.service';
import { toast } from '@/store/ui.store';
import type { CandidateDraft, MaterializePayload } from '@/features/new-joiner/types';
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

export const useMaterializeCandidate = () =>
  useCandidateMutation<{ payload: MaterializePayload; name: string }>(
    ({ payload }) => newJoinerService.materialize(payload),
    (_result, { name }) => `${name} dimaterialisasi. Undangan akun dikirim; karyawan berstatus WAITING.`,
  );
