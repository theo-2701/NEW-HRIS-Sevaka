import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loanService } from '@/features/loan/services/loan.service';
import { toast } from '@/store/ui.store';
import { formatCurrency } from '@/lib/format';
import type { LoanFilter, LoanRejectInput } from '@/features/loan/services/loan.service';
import type { AcknowledgementOutcome, LoanDraft } from '@/features/loan/types';
import type { ToastTone } from '@/store/ui.store';

export const loanKeys = {
  all: ['loan'] as const,
  config: ['loan', 'config'] as const,
  exposure: ['loan', 'exposure'] as const,
  list: (filter: LoanFilter) => ['loan', 'list', filter] as const,
  detail: (id: string) => ['loan', 'detail', id] as const,
  installments: (id: string) => ['loan', 'installments', id] as const,
};

export function useLoanConfig() {
  return useQuery({ queryKey: loanKeys.config, queryFn: () => loanService.config() });
}

export function useLoanExposure() {
  return useQuery({ queryKey: loanKeys.exposure, queryFn: () => loanService.exposure() });
}

export function useLoans(filter: LoanFilter = {}) {
  return useQuery({ queryKey: loanKeys.list(filter), queryFn: () => loanService.loans(filter) });
}

export function useLoan(id: string) {
  return useQuery({ queryKey: loanKeys.detail(id), queryFn: () => loanService.loan(id), enabled: Boolean(id) });
}

export function useLoanInstallments(id: string) {
  return useQuery({
    queryKey: loanKeys.installments(id),
    queryFn: () => loanService.installments(id),
    enabled: Boolean(id),
  });
}

function useLoanMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: loanKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useSubmitLoan = () =>
  useLoanMutation<LoanDraft, { requestNo: string; principalAmount: number; tenorMonths: number }>(
    async (draft) => {
      const row = await loanService.submitLoan(draft);
      return { requestNo: row.requestNo, principalAmount: row.principalAmount, tenorMonths: row.tenorMonths };
    },
    (result) => ({
      text: `201 Created — ${result.requestNo} terkirim (${formatCurrency(result.principalAmount)} · ${result.tenorMonths} bulan). Instance workflow dimulai; pokoknya ditahan terhadap plafon Anda.`,
    }),
  );

export const useCancelLoan = () =>
  useLoanMutation<{ id: string; requestNo: string }>(
    ({ id }) => loanService.cancelLoan(id).then(() => undefined),
    (_result, { requestNo }) => ({
      text: `200 OK — ${requestNo} dibatalkan selagi masih SUBMITTED. Reservasinya dilepas.`,
      tone: 'warn',
    }),
  );

export const useWithdrawLoan = () =>
  useLoanMutation<{ id: string; requestNo: string }>(
    ({ id }) => loanService.withdrawLoan(id).then(() => undefined),
    (_result, { requestNo }) => ({
      text: `200 OK — ${requestNo} ditarik setelah ambang AWAITING_CALCULATION. Reservasinya dilepas.`,
      tone: 'warn',
    }),
  );

/** Keputusan atasan kembali 202: statusnya ditulis saat workflow selesai. */
export const useApproveLoan = () =>
  useLoanMutation<{ id: string; status: string }>(
    ({ id }) => loanService.approveLoan(id).then(() => undefined),
    (_result, { status }) => ({
      text: `202 Accepted — keputusan diteruskan ke proses approval. Statusnya masih ${status}.`,
      tone: 'info',
    }),
  );

export const useRejectLoan = () =>
  useLoanMutation<LoanRejectInput & { requestNo: string; reasonName: string }>(
    (input) => loanService.rejectLoan(input).then(() => undefined),
    (_result, input) => ({
      text: `202 Accepted — penolakan ${input.requestNo} karena "${input.reasonName}" diteruskan ke proses approval.`,
      tone: 'info',
    }),
  );

export const useAcknowledgeSchedule = () =>
  useLoanMutation<{ id: string; outcome: AcknowledgementOutcome; requestNo: string }>(
    ({ id, outcome }) => loanService.acknowledgeSchedule(id, outcome).then(() => undefined),
    (_result, { outcome, requestNo }) =>
      outcome === 'ACK'
        ? {
            text: `200 OK — jadwal diakui. ${requestNo} kini APPROVED dan masuk daftar pencairan.`,
          }
        : {
            text: `200 OK — jadwal ditolak. Reservasi ${requestNo} dilepas; Anda boleh mengajukan permintaan baru.`,
            tone: 'info',
          },
  );
