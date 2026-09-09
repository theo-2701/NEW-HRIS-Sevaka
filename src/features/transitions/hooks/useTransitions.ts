import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transitionService } from '@/features/transitions/services/transition.service';
import { toast } from '@/store/ui.store';
import { TYPE_LABEL } from '@/features/transitions/types';
import type { TaskStatus, TransitionDraft } from '@/features/transitions/types';

export const transitionKeys = {
  list: ['transitions'] as const,
  detail: (id: string) => ['transitions', id] as const,
};

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
          ? `${TYPE_LABEL[draft.type]} untuk ${row.employee} dibuat — menunggu persetujuan parent-chain.`
          : `${TYPE_LABEL[draft.type]} untuk ${row.employee} dibuat — task sudah dilahirkan.`,
    }),
  );

export const useCompleteTask = () =>
  useTransitionMutation<{ transitionId: string; taskId: string }, TaskStatus>(
    ({ transitionId, taskId }) => transitionService.completeTask(transitionId, taskId),
    (status) =>
      status === 'AWAITING_CONFIRM'
        ? { text: 'Task ditandai selesai oleh PIC. Menunggu konfirmasi karyawan.', tone: 'info' }
        : { text: 'Task selesai.' },
  );

export const useConfirmTask = () =>
  useTransitionMutation<{ transitionId: string; taskId: string }>(
    ({ transitionId, taskId }) => transitionService.confirmTask(transitionId, taskId),
    () => ({ text: 'Penerimaan dikonfirmasi. Task selesai.' }),
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
      text: `Task di-waive (kontrol ${control.toLowerCase()}, tercatat di audit log).`,
      tone: 'warn',
    }),
  );

export const useForceRelease = () =>
  useTransitionMutation<{ transitionId: string; employee: string; reason: string }>(
    ({ transitionId, reason }) => transitionService.forceRelease(transitionId, reason),
    (_result, { employee }) => ({
      text: `Clearance di-force-release (tercatat di audit log). Offboarding ${employee} selesai.`,
      tone: 'warn',
    }),
  );
