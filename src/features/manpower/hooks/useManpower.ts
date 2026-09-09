import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { manpowerService } from '@/features/manpower/services/manpower.service';
import { toast } from '@/store/ui.store';
import { UNIT_OPTIONS, labelOf } from '@/features/manpower/types';
import type { ManpowerPlan, PlanDraft, Requisition, RequisitionDraft } from '@/features/manpower/types';
import type { ToastTone } from '@/store/ui.store';

export const manpowerKeys = {
  requisitions: ['manpower', 'requisitions'] as const,
  plans: ['manpower', 'plans'] as const,
};

export function useRequisitions() {
  return useQuery({ queryKey: manpowerKeys.requisitions, queryFn: () => manpowerService.requisitions() });
}

export function useManpowerPlans() {
  return useQuery({ queryKey: manpowerKeys.plans, queryFn: () => manpowerService.plans() });
}

function useManpowerMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
  invalidate: readonly string[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: invalidate });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateRequisition = () =>
  useManpowerMutation<{ draft: RequisitionDraft; submitNow: boolean }, Requisition>(
    ({ draft, submitNow }) => manpowerService.createRequisition(draft, submitNow),
    (row, { submitNow }) =>
      submitNow
        ? {
            text: `${row.id} diajukan untuk persetujuan. Menunggu HR Manager lain (SoD).`,
            tone: 'info',
          }
        : { text: `${row.id} tersimpan sebagai draft. Bisa diubah dan diajukan nanti.` },
    manpowerKeys.requisitions,
  );

export const useSubmitRequisition = () =>
  useManpowerMutation<{ id: string }>(
    ({ id }) => manpowerService.submitRequisition(id),
    (_result, { id }) => ({ text: `${id} diajukan untuk persetujuan.`, tone: 'info' }),
    manpowerKeys.requisitions,
  );

export const useApproveRequisition = () =>
  useManpowerMutation<{ id: string; unitId: string; note: string }>(
    ({ id, note }) => manpowerService.approveRequisition(id, note),
    (_result, { id, unitId }) => ({
      text: `${id} disetujui. Kursi terbuka disiapkan untuk ${labelOf(UNIT_OPTIONS, unitId)}.`,
    }),
    manpowerKeys.requisitions,
  );

export const useRejectRequisition = () =>
  useManpowerMutation<{ id: string; note: string }>(
    ({ id, note }) => manpowerService.rejectRequisition(id, note),
    (_result, { id }) => ({ text: `${id} ditolak.`, tone: 'warn' }),
    manpowerKeys.requisitions,
  );

export const useCreatePlan = () =>
  useManpowerMutation<PlanDraft, ManpowerPlan>(
    (draft) => manpowerService.createPlan(draft),
    (row) => ({ text: `${row.title} tersimpan sebagai draft dengan ${row.lines.length} baris target.` }),
    manpowerKeys.plans,
  );
