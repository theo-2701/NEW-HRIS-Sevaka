import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transitionService } from '@/features/transitions/services/transition.service';
import { toast } from '@/store/ui.store';
import { TYPE_LABEL } from '@/features/transitions/types';
import type { TaskStatus, TransitionDraft } from '@/features/transitions/types';

export const transitionKeys = {
  list: ['transitions'] as const,
  detail: (id: string) => ['transitions', id] as const,
};

export const useMyTasks = (tab: 'tasks' | 'approvals') =>
  useQuery({ queryKey: [...transitionKeys.list, 'mine', tab], queryFn: () => transitionService.myTasks(tab) });

export const useEscalations = (enabled: boolean) =>
  useQuery({ queryKey: [...transitionKeys.list, 'escalations'], queryFn: () => transitionService.escalations(), enabled });

export const useClosureQueue = (enabled: boolean) =>
  useQuery({ queryKey: [...transitionKeys.list, 'closure'], queryFn: () => transitionService.closureQueue(), enabled });

export const useMyTransitions = (employee: string) =>
  useQuery({ queryKey: [...transitionKeys.list, 'ess', employee], queryFn: () => transitionService.myTransitions(employee) });

export function useTransitions() {
  return useQuery({ queryKey: transitionKeys.list, queryFn: () => transitionService.list() });
}

export function useTransition(id: string | undefined) {
  return useQuery({
    queryKey: transitionKeys.detail(id ?? ''),
    queryFn: () => transitionService.get(id!),
    enabled: Boolean(id),
  });
}

/** Semua mutasi transisi menyegarkan list + detail sekaligus. */
function useTransitionMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: 'ok' | 'info' | 'warn' },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: transitionKeys.list });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateTransition = () =>
  useTransitionMutation<TransitionDraft, { status: string; employee: string }>(
    async (draft) => {
      const row = await transitionService.create(draft);
      return { status: row.status, employee: row.employee };
    },
    (row, draft) => ({
      text:
        row.status === 'IN_APPROVAL'
          ? `The ${TYPE_LABEL[draft.type].toLowerCase()} for ${row.employee} was submitted and waits for approval.`
          : `The ${TYPE_LABEL[draft.type].toLowerCase()} for ${row.employee} was created and its tasks are open.`,
    }),
  );

export const useCompleteTask = () =>
  useTransitionMutation<{ transitionId: string; taskId: string }, TaskStatus>(
    ({ transitionId, taskId }) => transitionService.completeTask(transitionId, taskId),
    (status) =>
      status === 'AWAITING_CONFIRM'
        ? { text: 'Marked as done. Waiting for the employee to confirm.', tone: 'info' }
        : status === 'AWAITING_APPROVAL'
          ? { text: 'Marked as done. Waiting for approval.', tone: 'info' }
          : { text: 'The task is completed.' },
  );

export const useConfirmTask = () =>
  useTransitionMutation<{ transitionId: string; taskId: string }>(
    ({ transitionId, taskId }) => transitionService.confirmTask(transitionId, taskId),
    () => ({ text: 'Confirmed.' }),
  );

export const useWaiveTask = () =>
  useTransitionMutation<{
    transitionId: string;
    taskId: string;
    control: 'STANDARD' | 'ELEVATED';
    reason: string;
  }>(
    ({ transitionId, taskId, control, reason }) =>
      transitionService.waiveTask(transitionId, taskId, { control, reason }),
    (_result, { control }) => ({
      text: `The task was waived (${control.toLowerCase()} control, recorded in the audit log).`,
      tone: 'warn',
    }),
  );

export const useApproveTask = () =>
  useTransitionMutation<{ transitionId: string; taskId: string }>(
    ({ transitionId, taskId }) => transitionService.approveTask(transitionId, taskId),
    () => ({ text: 'The task was approved.' }),
  );

export const useRejectTask = () =>
  useTransitionMutation<{ transitionId: string; taskId: string; reason: string }>(
    ({ transitionId, taskId, reason }) => transitionService.rejectTask(transitionId, taskId, reason),
    () => ({ text: 'The task was returned to the handler with your reason.', tone: 'warn' }),
  );

export const useCloseOnboarding = () =>
  useTransitionMutation<{ transitionId: string; note: string }, number>(
    ({ transitionId, note }) => transitionService.closeOnboarding(transitionId, note),
    (closed) => ({ text: `Onboarding closed. ${closed} task(s) were closed.` }),
  );

export const useForceRelease = () =>
  useTransitionMutation<{ transitionId: string; employee: string; reason: string }>(
    ({ transitionId, reason }) => transitionService.forceRelease(transitionId, reason),
    (_result, { employee }) => ({
      text: `Clearance was force-released (recorded in the audit log). ${employee}'s offboarding is completed.`,
      tone: 'warn',
    }),
  );
