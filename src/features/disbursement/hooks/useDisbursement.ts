import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { disbursementService } from '@/features/disbursement/services/disbursement.service';
import { toast } from '@/store/ui.store';
import { formatCurrency } from '@/lib/format';
import type { ToastTone } from '@/store/ui.store';
import type {
  Actor,
  ClearanceFilter,
  MarkPaidInput,
  MarkPaidResult,
  PayableFilter,
  PayableKey,
} from '@/features/disbursement/types';

export const disbursementKeys = {
  all: ['disbursement'] as const,
  payables: (actor: Actor, filter: PayableFilter) => ['disbursement', 'payables', actor.employeeId, filter] as const,
  detail: (actor: Actor, key: PayableKey | null) => ['disbursement', 'detail', actor.employeeId, key] as const,
  preview: (actor: Actor, items: PayableKey[]) => ['disbursement', 'preview', actor.employeeId, items] as const,
  clearances: (actor: Actor, filter: ClearanceFilter) => ['disbursement', 'clearances', actor.employeeId, filter] as const,
};

export function usePayables(actor: Actor, filter: PayableFilter = {}, enabled = true) {
  return useQuery({
    queryKey: disbursementKeys.payables(actor, filter),
    queryFn: () => disbursementService.search(actor, filter),
    enabled,
    retry: false,
  });
}

export function usePayableDetail(actor: Actor, key: PayableKey | null) {
  return useQuery({
    queryKey: disbursementKeys.detail(actor, key),
    queryFn: () => disbursementService.detail(actor, key as PayableKey),
    enabled: Boolean(key),
    retry: false,
  });
}

/** Preview wajib sebelum eksekusi (FD-32 k4) — selalu dibaca segar. */
export function useMarkPreview(actor: Actor, items: PayableKey[], enabled: boolean) {
  return useQuery({
    queryKey: disbursementKeys.preview(actor, items),
    queryFn: () => disbursementService.preview(actor, items),
    enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useClearances(actor: Actor, filter: ClearanceFilter = {}, enabled = true) {
  return useQuery({
    queryKey: disbursementKeys.clearances(actor, filter),
    queryFn: () => disbursementService.clearances(actor, filter),
    enabled,
    retry: false,
  });
}

/**
 * Tanpa kunci: penandaan mengubah layar modul lain (Benefit Disbursement
 * History, bantahan & selisih Cash Advance), jadi seluruh cache dimuat ulang.
 */
function useDisbursementMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useMarkPaid = () =>
  useDisbursementMutation<{ actor: Actor; input: MarkPaidInput }, MarkPaidResult>(
    ({ actor, input }) => disbursementService.markPaid(actor, input),
    (result) => ({
      text: `201 Created — ${result.markedCount} baris ditandai dibayar (${formatCurrency(result.totalAmount)}) · action ${result.actionId}. Baris keluar dari daftar belum ditandai.`,
    }),
  );

export const useReverseMark = () =>
  useDisbursementMutation<{ actor: Actor; markId: string; requestNo: string; reasonNote: string }>(
    ({ actor, markId, reasonNote }) => disbursementService.reverseMark(actor, markId, reasonNote).then(() => undefined),
    (_result, { requestNo }) => ({
      text: `201 Created — tanda ${requestNo} dibalik lewat baris lawan-arah; payable kembali ke daftar belum ditandai bila sumbernya masih layak.`,
      tone: 'warn',
    }),
  );

export const useDeclareSettled = () =>
  useDisbursementMutation<{ actor: Actor; id: string; employee: string; note: string }>(
    ({ actor, id, note }) => disbursementService.declareSettled(actor, id, note).then(() => undefined),
    (_result, { employee }) => ({
      text: `200 OK — tanggungan ${employee} dinyatakan tuntas (DECLARED_SETTLED). Status terminal; resolved_at menjadi jangkar masa simpan.`,
    }),
  );
