import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulerService } from '@/features/scheduler/services/scheduler.service';
import { toast } from '@/store/ui.store';
import type { AssignmentFilter, BulkResult } from '@/features/scheduler/services/scheduler.service';
import type { AssignmentDraft, BulkDraft, Shift, ShiftDraft } from '@/features/scheduler/types';
import type { ToastTone } from '@/store/ui.store';

export const schedulerKeys = {
  all: ['scheduler'] as const,
  shifts: ['scheduler', 'shifts'] as const,
  assignments: (filter: AssignmentFilter) => ['scheduler', 'assignments', filter] as const,
  swaps: ['scheduler', 'swaps'] as const,
};

export function useShifts() {
  return useQuery({ queryKey: schedulerKeys.shifts, queryFn: () => schedulerService.shifts() });
}

export function useAssignments(filter: AssignmentFilter) {
  return useQuery({
    queryKey: schedulerKeys.assignments(filter),
    queryFn: () => schedulerService.assignments(filter),
  });
}

export function useSwaps() {
  return useQuery({ queryKey: schedulerKeys.swaps, queryFn: () => schedulerService.swaps() });
}

function useSchedulerMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: schedulerKeys.all });
      // Kalender efektif membaca roster sebagai lapis teratas.
      void queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useSaveShift = () =>
  useSchedulerMutation<{ draft: ShiftDraft; id?: string }>(
    ({ draft, id }) => schedulerService.saveShift(draft, id).then(() => undefined),
    (_result, { id }) => ({
      text: id ? '200 — pola shift diperbarui.' : '201 — pola shift tersimpan ke katalog.',
    }),
  );

export const useToggleShift = () =>
  useSchedulerMutation<{ id: string }, Shift>(
    ({ id }) => schedulerService.toggleShift(id),
    (row) => ({
      text: row.isActive
        ? '200 — pola diaktifkan kembali.'
        : '200 — pola dipensiunkan; baris roster yang menunjuknya tetap sah.',
    }),
  );

export const useDeleteShift = () =>
  useSchedulerMutation<{ id: string }>(
    ({ id }) => schedulerService.deleteShift(id),
    () => ({ text: '200 — pola shift dihapus.', tone: 'warn' }),
  );

export const useSaveAssignment = () =>
  useSchedulerMutation<{ draft: AssignmentDraft; id?: string }>(
    ({ draft, id }) => schedulerService.saveAssignment(draft, id).then(() => undefined),
    (_result, { id }) => ({
      text: id
        ? '200 — baris roster ditimpa dan dicap sebagai penyesuaian individual.'
        : '201 — baris roster dibuat; bulk berikutnya akan melangkahinya.',
    }),
  );

export const useDeleteAssignment = () =>
  useSchedulerMutation<{ id: string }>(
    ({ id }) => schedulerService.deleteAssignment(id),
    () => ({ text: '200 — baris roster dihapus.', tone: 'warn' }),
  );

export const useRunBulk = () =>
  useSchedulerMutation<BulkDraft, BulkResult>(
    (draft) => schedulerService.runBulk(draft),
    (result) => ({
      text: `200 — ${result.created} dibuat, ${result.overwritten} ditulis ulang, ${result.skipped} dilangkahi (${result.skippedIndividual} individual, ${result.skippedSwap} swap) pada ${result.employees} karyawan.`,
    }),
  );

export const useCreateSwap = () =>
  useSchedulerMutation<{ requesterAssignmentId: string; counterpartAssignmentId: string }>(
    ({ requesterAssignmentId, counterpartAssignmentId }) =>
      schedulerService.createSwap(requesterAssignmentId, counterpartAssignmentId).then(() => undefined),
    () => ({ text: '201 — tukar diajukan; tidak ada roster yang berubah sampai supervisor menyetujuinya.' }),
  );

export const useDecideSwap = () =>
  useSchedulerMutation<{ id: string; kind: 'APPROVED' | 'REJECTED' }>(
    ({ id, kind }) => schedulerService.decideSwap(id, kind).then(() => undefined),
    (_result, { kind }) => ({
      text:
        kind === 'APPROVED'
          ? '200 — tukar disetujui; kedua baris roster bertukar pola sebagai satu paket.'
          : '200 — tukar ditolak; tidak ada roster yang berubah.',
      tone: kind === 'APPROVED' ? 'ok' : 'warn',
    }),
  );

export const useWithdrawSwap = () =>
  useSchedulerMutation<{ id: string }>(
    ({ id }) => schedulerService.withdrawSwap(id).then(() => undefined),
    () => ({
      text: '200 — tukar ditarik (status CANCELLED); permintaannya tinggal sebagai jejak dan tidak ada roster yang tersentuh.',
      tone: 'warn',
    }),
  );
