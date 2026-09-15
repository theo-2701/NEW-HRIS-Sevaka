import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cashAdvanceService } from '@/features/cash-advance/services/cash-advance.service';
import { toast } from '@/store/ui.store';
import { formatCurrency } from '@/lib/format';
import { DIFFERENCE_TYPE_LABEL, SETTLEMENT_METHOD_LABEL } from '@/features/cash-advance/types';
import type { AdvanceFilter } from '@/features/cash-advance/services/cash-advance.service';
import type {
  Actor,
  AdvanceDraft,
  Decision,
  ReviewInput,
  SettlementDraft,
  SettlementMethod,
} from '@/features/cash-advance/types';
import type { ToastTone } from '@/store/ui.store';

export const cashAdvanceKeys = {
  all: ['cash-advance'] as const,
  config: ['cash-advance', 'config'] as const,
  purposes: ['cash-advance', 'purposes'] as const,
  advances: (actor: Actor, filter: AdvanceFilter) => ['cash-advance', 'advances', actor.employeeId, filter] as const,
  settlements: ['cash-advance', 'settlements'] as const,
  differences: ['cash-advance', 'differences'] as const,
};

export function useCashAdvanceConfig() {
  return useQuery({ queryKey: cashAdvanceKeys.config, queryFn: () => cashAdvanceService.config() });
}

export function usePurposeTypes() {
  return useQuery({ queryKey: cashAdvanceKeys.purposes, queryFn: () => cashAdvanceService.purposeTypes() });
}

export function useAdvances(actor: Actor, filter: AdvanceFilter = {}) {
  return useQuery({
    queryKey: cashAdvanceKeys.advances(actor, filter),
    queryFn: () => cashAdvanceService.advances(actor, filter),
  });
}

export function useSettlements() {
  return useQuery({ queryKey: cashAdvanceKeys.settlements, queryFn: () => cashAdvanceService.settlements() });
}

export function useDifferences() {
  return useQuery({ queryKey: cashAdvanceKeys.differences, queryFn: () => cashAdvanceService.differences() });
}

function useCashAdvanceMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useSubmitAdvance = () =>
  useCashAdvanceMutation<{ actor: Actor; draft: AdvanceDraft }, { requestNo: string; amount: number; onBehalf: boolean }>(
    async ({ actor, draft }) => {
      const row = await cashAdvanceService.submitAdvance(actor, draft);
      return { requestNo: row.requestNo, amount: row.amount, onBehalf: Boolean(row.createdOnBehalfEmployeeId) };
    },
    (result) => ({
      text: `201 Created — ${result.requestNo} terkirim (${formatCurrency(result.amount)}), status SUBMITTED${result.onBehalf ? ' · dibuat atas nama penerima' : ''}.`,
    }),
  );

export const useCancelAdvance = () =>
  useCashAdvanceMutation<{ actor: Actor; id: string; requestNo: string }>(
    ({ actor, id }) => cashAdvanceService.cancelAdvance(actor, id).then(() => undefined),
    (_result, { requestNo }) => ({ text: `200 OK — ${requestNo} ditarik selagi masih SUBMITTED.`, tone: 'warn' }),
  );

export const useRepudiateAdvance = () =>
  useCashAdvanceMutation<{ actor: Actor; id: string; requestNo: string; reasonNote: string }>(
    ({ actor, id, reasonNote }) => cashAdvanceService.repudiateAdvance(actor, id, reasonNote).then(() => undefined),
    (_result, { requestNo }) => ({
      text: `200 OK — ${requestNo} dibantah penerima (REPUDIATED). Pembuat dan petugas keuangan dikabari; jalur keluar status ini masih GAP-8.`,
      tone: 'info',
    }),
  );

export const useCancelTravel = () =>
  useCashAdvanceMutation<{ actor: Actor; id: string; requestNo: string; reasonNote: string }>(
    ({ actor, id, reasonNote }) => cashAdvanceService.cancelTravel(actor, id, reasonNote).then(() => undefined),
    (_result, { requestNo }) => ({
      text: `200 OK — dinas ${requestNo} dicatat batal tanpa gerbang persetujuan. Seluruh nominal menjadi sisa di tahap penutup.`,
      tone: 'info',
    }),
  );

export const useSubmitSettlement = () =>
  useCashAdvanceMutation<
    { actor: Actor; advanceId: string; draft: SettlementDraft },
    { settlementNo: string; items: number; warnings: number }
  >(
    async ({ actor, advanceId, draft }) => {
      const row = await cashAdvanceService.submitSettlement(actor, advanceId, draft);
      return { settlementNo: row.settlementNo, items: row.items.length, warnings: row.similarityWarnings.length };
    },
    (result) => ({
      text: `201 Created — ${result.settlementNo} diserahkan (${result.items} nota)${result.warnings ? ` · ${result.warnings} peringatan kemiripan untuk pemeriksa` : ''}. Menunggu Finance Officer menandai nota.`,
    }),
  );

export const useReviewSettlement = () =>
  useCashAdvanceMutation<{ actor: Actor; id: string; settlementNo: string; input: ReviewInput }>(
    ({ actor, id, input }) => cashAdvanceService.reviewSettlement(actor, id, input).then(() => undefined),
    (_result, { settlementNo, input }) => ({
      text: `200 OK — ${settlementNo} UNDER_REVIEW (${input.flags.length} nota ditandai). Ini penandaan, bukan keputusan.`,
    }),
  );

/**
 * 5.12 kembali 202; mock lalu memainkan konsumsi `workflow.process.completed`
 * sebagai langkah terpisah supaya kedua peristiwa terlihat berurutan.
 */
export function useDecideSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ actor, id, decision }: { actor: Actor; id: string; decision: Decision; settlementNo: string }) => {
      await cashAdvanceService.decideSettlement(actor, id, decision);
      return decision;
    },
    onSuccess: async (decision, { actor, id, settlementNo }) => {
      toast(`202 Accepted — keputusan ${settlementNo} diteruskan ke proses persetujuan.`, 'info');
      const difference = await cashAdvanceService.completeSettlementWorkflow(id, decision, actor.employeeId);
      toast(
        decision === 'REJECT'
          ? `workflow.process.completed — ${settlementNo} REJECTED.`
          : difference
            ? `workflow.process.completed — ${settlementNo} ACCEPTED · ${DIFFERENCE_TYPE_LABEL[difference.differenceType]} ${formatCurrency(difference.amount)} (${difference.status}).`
            : `workflow.process.completed — ${settlementNo} ACCEPTED, tanpa selisih.`,
        'ok',
      );
      void queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useSetSurplusMethod = () =>
  useCashAdvanceMutation<{ actor: Actor; id: string; method: SettlementMethod; reasonNote: string; requestNo: string }>(
    ({ actor, id, method, reasonNote }) =>
      cashAdvanceService.setSurplusMethod(actor, id, method, reasonNote).then(() => undefined),
    (_result, { method, requestNo }) => ({
      text:
        method === 'RETURNED_OUTSIDE_HRIS'
          ? `200 OK — sisa ${requestNo} dicatat ${SETTLEMENT_METHOD_LABEL[method]} dan tuntas (SETTLED).`
          : `200 OK — sisa ${requestNo} dipotong lewat payroll; tuntas setelah konfirmasi payroll.`,
    }),
  );

export function useApproveExtra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ actor, id, decision }: { actor: Actor; id: string; decision: Decision; requestNo: string }) => {
      await cashAdvanceService.approveExtra(actor, id, decision);
      return decision;
    },
    onSuccess: async (decision, { id, requestNo }) => {
      toast(`202 Accepted — lapis tambahan ${requestNo} diteruskan.`, 'info');
      const row = await cashAdvanceService.completeExtraWorkflow(id, decision);
      toast(`workflow.process.completed — kekurangan ${requestNo} ${row.status}.`, 'ok');
      void queryClient.invalidateQueries({ queryKey: cashAdvanceKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
