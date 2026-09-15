import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeSettingsService } from '@/features/finance-settings/services/finance-settings.service';
import { gradeName } from '@/features/finance-settings/mock-data';
import { formatDelta } from '@/features/finance-settings/rules';
import { toast } from '@/store/ui.store';
import { formatCurrency } from '@/lib/format';
import type { ToastTone } from '@/store/ui.store';
import type { Actor, LoanLimit, LoanLimitDraft, LoanLimitFilter, LoanLimitPatch } from '@/features/finance-settings/types';

export const financeSettingsKeys = {
  limits: (actor: Actor, filter: LoanLimitFilter) => ['finance-settings', 'limits', actor.employeeId, filter] as const,
  purposes: (actor: Actor) => ['finance-settings', 'purposes', actor.employeeId] as const,
  reasons: (actor: Actor) => ['finance-settings', 'reasons', actor.employeeId] as const,
};

export function useLoanLimits(actor: Actor, filter: LoanLimitFilter = {}) {
  return useQuery({
    queryKey: financeSettingsKeys.limits(actor, filter),
    queryFn: () => financeSettingsService.loanLimits(actor, filter),
    retry: false,
  });
}

export function usePurposeTypeBoard(actor: Actor) {
  return useQuery({
    queryKey: financeSettingsKeys.purposes(actor),
    queryFn: () => financeSettingsService.purposeTypes(actor),
    retry: false,
  });
}

export function useRejectionReasonBoard(actor: Actor) {
  return useQuery({
    queryKey: financeSettingsKeys.reasons(actor),
    queryFn: () => financeSettingsService.rejectionReasons(actor),
    retry: false,
  });
}

/** Tanpa kunci: plafon dibaca layar Loan, jadi seluruh cache dimuat ulang. */
function useSettingsMutation<TVars, TResult>(
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

export const useCreateLoanLimit = () =>
  useSettingsMutation<{ actor: Actor; draft: LoanLimitDraft }, LoanLimit>(
    ({ actor, draft }) => financeSettingsService.createLoanLimit(actor, draft),
    (row) => ({
      text: `201 Created — plafon ${gradeName(row.jobGradeId)} ${formatCurrency(row.limitAmount)} tersimpan.`,
    }),
  );

export const useUpdateLoanLimit = () =>
  useSettingsMutation<{ actor: Actor; limit: LoanLimit; patch: LoanLimitPatch }, LoanLimit>(
    ({ actor, limit, patch }) => financeSettingsService.updateLoanLimit(actor, limit.id, patch),
    (row, { limit }) => {
      const delta = formatDelta(limit.limitAmount, row.limitAmount);
      return {
        text: `200 OK — plafon ${gradeName(row.jobGradeId)} diperbarui${delta ? ` (${delta})` : ''}${row.isActive ? '' : ', nonaktif'}. Tidak berlaku surut ke pinjaman berjalan.`,
      };
    },
  );

export const useDeleteLoanLimit = () =>
  useSettingsMutation<{ actor: Actor; limit: LoanLimit }, void>(
    ({ actor, limit }) => financeSettingsService.deleteLoanLimit(actor, limit.id),
    (_result, { limit }) => ({
      text: `200 OK — plafon ${gradeName(limit.jobGradeId)} dihapus (soft delete); tidak lagi berlaku untuk pengajuan baru.`,
      tone: 'warn',
    }),
  );
