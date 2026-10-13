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
  useManpowerMutation<RequisitionDraft, Requisition>(
    (draft) => manpowerService.createRequisition(draft),
    (row) => ({ text: `${row.id} submitted. Waiting for a different HR Manager to decide.` }),
    manpowerKeys.requisitions,
  );

export const useUpdateRequisition = () =>
  useManpowerMutation<{ id: string; draft: RequisitionDraft }>(
    ({ id, draft }) => manpowerService.updateRequisition(id, draft),
    (_result, { id }) => ({ text: `${id} updated.` }),
    manpowerKeys.requisitions,
  );

export const useCancelRequisition = () =>
  useManpowerMutation<{ id: string }>(
    ({ id }) => manpowerService.cancelRequisition(id),
    (_result, { id }) => ({ text: `${id} cancelled.`, tone: 'warn' }),
    manpowerKeys.requisitions,
  );

/** Tanpa toast galat: 422 Tutup ditampilkan di dalam dialog alasan (FSD §3.1). */
export function useCloseRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => manpowerService.closeRequisition(id, reason),
    onSuccess: (_result, { id }) => {
      toast(`${id} closed.`, 'ok');
      void queryClient.invalidateQueries({ queryKey: manpowerKeys.requisitions });
    },
  });
}

export const useApproveRequisition = () =>
  useManpowerMutation<{ id: string; unitId: string; note: string }>(
    ({ id, note }) => manpowerService.approveRequisition(id, note),
    (_result, { id, unitId }) => ({
      text: `${id} approved. Open seats are prepared for ${labelOf(UNIT_OPTIONS, unitId)}.`,
    }),
    manpowerKeys.requisitions,
  );

export const useRejectRequisition = () =>
  useManpowerMutation<{ id: string; note: string }>(
    ({ id, note }) => manpowerService.rejectRequisition(id, note),
    (_result, { id }) => ({ text: `${id} rejected.`, tone: 'warn' }),
    manpowerKeys.requisitions,
  );

export const useCreatePlan = () =>
  useManpowerMutation<PlanDraft, ManpowerPlan>(
    (draft) => manpowerService.createPlan(draft),
    (row) => ({ text: `${row.title} saved as a draft with ${row.lines.length} target line(s).` }),
    manpowerKeys.plans,
  );
