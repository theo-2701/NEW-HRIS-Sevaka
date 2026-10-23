import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { oncallService } from '@/features/oncall/services/oncall.service';
import { oncallActivityService } from '@/features/oncall/services/oncall-activity.service';
import { toast } from '@/store/ui.store';
import type { ActivityFilter } from '@/features/oncall/services/oncall-activity.service';
import type { OncallFilter } from '@/features/oncall/services/oncall.service';
import type { OncallDraft } from '@/features/oncall/types';
import type { OncallSession } from '@/features/oncall/mock-data';
import type { ToastTone } from '@/store/ui.store';

export const oncallKeys = {
  all: ['oncall'] as const,
  list: (filter: OncallFilter) => ['oncall', 'assignments', filter] as const,
  activity: (filter: ActivityFilter) => ['oncall', 'activity', filter] as const,
};

export function useOncallAssignments(filter: OncallFilter) {
  return useQuery({ queryKey: oncallKeys.list(filter), queryFn: () => oncallService.list(filter) });
}

export function useOncallActivity(filter: ActivityFilter) {
  return useQuery({ queryKey: oncallKeys.activity(filter), queryFn: () => oncallActivityService.list(filter) });
}

function useOncallMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: oncallKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useSaveOncall = (session: OncallSession) =>
  useOncallMutation<{ draft: OncallDraft; id?: string }, { extra: boolean }>(
    async ({ draft, id }) => {
      const row = await oncallService.save(session, draft, id);
      return { extra: Boolean(row.requiresExtraApprovalReason) };
    },
    (result, { id }) => ({
      text: id
        ? `Standby window updated.${result.extra ? ' The extra approval layer stays on.' : ' The extra approval layer is off.'}`
        : `Standby window saved as Pending approval.${result.extra ? ' Its cap exceeds the daily cap, so the HR layer is required.' : ''}`,
    }),
  );

/** Keputusan roster siaga (K9): 200 diterima, status ditulis saat workflow selesai. */
export function useDecideOncall(session: OncallSession) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: 'APPROVED' | 'REJECTED' }) => {
      await oncallService.decide(session, id, kind);
      return kind;
    },
    onSuccess: async (kind, { id }) => {
      toast('Decision received and passed on to the approval process.', 'info');
      await oncallService.completeOncallWorkflow(session, id, kind);
      toast(
        kind === 'APPROVED'
          ? 'The window is now Scheduled and authorizes call-outs up to its cap.'
          : 'The window was Rejected and will never issue call-outs.',
        kind === 'APPROVED' ? 'ok' : 'warn',
      );
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCancelOncall = () =>
  useOncallMutation<{ id: string }>(
    ({ id }) => oncallService.cancel(id).then(() => undefined),
    () => ({ text: 'Window cancelled; the row stays on record and does not disappear.', tone: 'warn' }),
  );
