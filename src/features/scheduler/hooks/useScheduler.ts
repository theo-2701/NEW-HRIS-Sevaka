import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulerService } from '@/features/scheduler/services/scheduler.service';
import { toast } from '@/store/ui.store';
import type { AssignmentFilter, BulkResult } from '@/features/scheduler/services/scheduler.service';
import type { AssignmentDraft, BulkDraft, SchedulerRole, Shift, ShiftDraft } from '@/features/scheduler/types';
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
      text: id ? 'Shift pattern updated.' : 'Shift pattern saved to the catalogue.',
    }),
  );

export const useToggleShift = () =>
  useSchedulerMutation<{ id: string }, Shift>(
    ({ id }) => schedulerService.toggleShift(id),
    (row) => ({
      text: row.isActive
        ? 'Pattern reactivated.'
        : 'Pattern retired; roster rows pointing to it stay valid.',
    }),
  );

export const useDeleteShift = () =>
  useSchedulerMutation<{ id: string }>(
    ({ id }) => schedulerService.deleteShift(id),
    () => ({ text: 'Shift pattern deleted.', tone: 'warn' }),
  );

export const useSaveAssignment = () =>
  useSchedulerMutation<{ draft: AssignmentDraft; id?: string }>(
    ({ draft, id }) => schedulerService.saveAssignment(draft, id).then(() => undefined),
    (_result, { id }) => ({
      text: id
        ? 'Roster row overwritten and stamped as an individual adjustment.'
        : 'Roster row created; the next bulk run will skip it.',
    }),
  );

export const useDeleteAssignment = () =>
  useSchedulerMutation<{ id: string }>(
    ({ id }) => schedulerService.deleteAssignment(id),
    () => ({ text: 'Roster row deleted.', tone: 'warn' }),
  );

export const useRunBulk = () =>
  useSchedulerMutation<{ draft: BulkDraft; role: SchedulerRole }, BulkResult>(
    ({ draft, role }) => schedulerService.runBulk(draft, role),
    (result) => ({
      text: `${result.created} created, ${result.overwritten} overwritten, ${result.skipped} skipped (${result.skippedIndividual} individual, ${result.skippedSwap} swap) across ${result.employees} employees.`,
    }),
  );

export const useCreateSwap = () =>
  useSchedulerMutation<{ requesterAssignmentId: string; counterpartAssignmentId: string }>(
    ({ requesterAssignmentId, counterpartAssignmentId }) =>
      schedulerService.createSwap(requesterAssignmentId, counterpartAssignmentId).then(() => undefined),
    () => ({ text: 'Swap requested; no roster changes until a supervisor approves it.' }),
  );

/** Keputusan tukar (K9): 200 diterima, roster bertukar saat workflow selesai. */
export function useDecideSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: 'APPROVED' | 'REJECTED' }) => {
      await schedulerService.decideSwap(id, kind);
      return kind;
    },
    onSuccess: async (kind, { id }) => {
      toast('Swap decision received and passed on to the approval process.', 'info');
      await schedulerService.completeSwapWorkflow(id, kind);
      toast(
        kind === 'APPROVED'
          ? 'Swap approved; both roster rows exchanged patterns as one package.'
          : 'Swap rejected; no roster changed.',
        kind === 'APPROVED' ? 'ok' : 'warn',
      );
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useWithdrawSwap = () =>
  useSchedulerMutation<{ id: string }>(
    ({ id }) => schedulerService.withdrawSwap(id).then(() => undefined),
    () => ({
      text: 'Swap withdrawn (status CANCELLED); the request stays on record and no roster is touched.',
      tone: 'warn',
    }),
  );
