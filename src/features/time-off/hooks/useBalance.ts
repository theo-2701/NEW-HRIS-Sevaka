import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { balanceService } from '@/features/time-off/services/balance.service';
import { toast } from '@/store/ui.store';
import type { AdjustmentDraft, BalanceFilter, LedgerFilter, Session } from '@/features/time-off/types';

export const balanceKeys = {
  all: ['time-off', 'balance'] as const,
  balances: (filter: BalanceFilter) => ['time-off', 'balance', 'rows', filter] as const,
  ledger: (filter: LedgerFilter) => ['time-off', 'balance', 'ledger', filter] as const,
  years: ['time-off', 'balance', 'years'] as const,
};

export function useBalances(filter: BalanceFilter) {
  return useQuery({ queryKey: balanceKeys.balances(filter), queryFn: () => balanceService.balances(filter) });
}

export function useLedger(filter: LedgerFilter) {
  return useQuery({ queryKey: balanceKeys.ledger(filter), queryFn: () => balanceService.ledger(filter) });
}

export function useBalanceYears() {
  return useQuery({ queryKey: balanceKeys.years, queryFn: () => balanceService.years() });
}

export function useCreateAdjustment(session: Session) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: AdjustmentDraft) => balanceService.createAdjustment(session, draft),
    onSuccess: () => {
      toast('201 — penyesuaian ditulis; saldo berjalan dihitung ulang dari ledger.', 'ok');
      void queryClient.invalidateQueries({ queryKey: balanceKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
