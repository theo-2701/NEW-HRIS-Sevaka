import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { massResignationService } from '@/features/mass-resignation/services/mass-resignation.service';
import { toast } from '@/store/ui.store';
import type { BatchDraft, MassBatch } from '@/features/mass-resignation/types';
import type { ToastTone } from '@/store/ui.store';

export const massResignationKeys = {
  list: ['mass-resignations'] as const,
  pool: ['mass-resignations', 'pool'] as const,
};

/**
 * Daftar batch. Selama ada batch PROCESSING, daftar di-refetch tiap detik
 * supaya progres spawn yang di-throttle terlihat bergerak.
 */
export function useBatches() {
  return useQuery({
    queryKey: massResignationKeys.list,
    queryFn: () => massResignationService.list(),
    refetchInterval: (query) =>
      (query.state.data as MassBatch[] | undefined)?.some((row) => row.status === 'PROCESSING') ? 1000 : false,
  });
}

export function useEmployeePool(enabled: boolean) {
  return useQuery({ queryKey: massResignationKeys.pool, queryFn: () => massResignationService.pool(), enabled });
}

function useBatchMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: massResignationKeys.list });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

/** Dry-run tidak mengubah apa pun — jadi bukan mutasi berinvalidasi. */
export function useDryRun() {
  return useMutation({
    mutationFn: (employeeIds: string[]) => massResignationService.dryRun(employeeIds),
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateBatch = () =>
  useBatchMutation<BatchDraft, MassBatch>(
    (draft) => massResignationService.createDraft(draft),
    (row) => ({ text: `${row.id} tersimpan sebagai draft dengan ${row.total} karyawan.` }),
  );

export const useSubmitBatch = () =>
  useBatchMutation<{ id: string }>(
    ({ id }) => massResignationService.submit(id),
    (_result, { id }) => ({ text: `${id} diajukan untuk persetujuan.`, tone: 'info' }),
  );

export const useApproveBatch = () =>
  useBatchMutation<{ id: string; note: string }, string>(
    ({ id, note }) => massResignationService.approve(id, note),
    (_hash, { id }) => ({ text: `${id} disetujui. Seleksi dibekukan sebagai hash.` }),
  );

export const useRejectBatch = () =>
  useBatchMutation<{ id: string; note: string }>(
    ({ id, note }) => massResignationService.reject(id, note),
    (_result, { id }) => ({ text: `${id} ditolak dan dibatalkan.`, tone: 'warn' }),
  );

export const useProcessBatch = () =>
  useBatchMutation<{ id: string; selectionHash: string }, string>(
    ({ id, selectionHash }) => massResignationService.process(id, selectionHash),
    (correlation, { id }) => ({
      text: `${id} diproses — offboarding ter-throttle dilahirkan (${correlation}).`,
      tone: 'info',
    }),
  );

export const useHaltBatch = () =>
  useBatchMutation<{ id: string; reason: string; progress: number; total: number; correlationId?: string }>(
    ({ id, reason }) => massResignationService.halt(id, reason),
    (_result, { id, progress, total, correlationId }) => ({
      text: `${id} di-halt pada ${progress}/${total}. Instance berjalan ditangguhkan lewat ${correlationId ?? 'correlation id'}.`,
      tone: 'warn',
    }),
  );

export const useResumeBatch = () =>
  useBatchMutation<{ id: string; note: string }>(
    ({ id, note }) => massResignationService.resume(id, note),
    (_result, { id }) => ({ text: `${id} dilanjutkan.`, tone: 'info' }),
  );

export const useCancelRemaining = () =>
  useBatchMutation<{ id: string; note: string; progress: number; total: number }>(
    ({ id, note }) => massResignationService.cancelRemaining(id, note),
    (_result, { id, progress, total }) => ({
      text: `${id} disudahi sebagian — ${progress}/${total} diproses, sisanya dibatalkan.`,
      tone: 'warn',
    }),
  );
