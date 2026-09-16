import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { payrollAuthorizationService } from '@/features/payroll-authorization/services/payroll-authorization.service';
import { salaryProcessingService } from '@/features/salary-processing/services/salary-processing.service';
import { salaryProcessingKeys } from '@/features/salary-processing/hooks/useSalaryProcessing';
import { periodLabel } from '@/features/salary-processing/rules';
import { toast } from '@/store/ui.store';
import type { Actor, ReopenInput } from '@/features/payroll-authorization/types';

export const authorizationKeys = {
  all: ['payroll-authorization'] as const,
  traits: ['payroll-authorization', 'traits'] as const,
  proposals: ['payroll-authorization', 'proposals'] as const,
  decided: ['payroll-authorization', 'decided'] as const,
  batches: ['payroll-authorization', 'batches'] as const,
  pending: ['payroll-authorization', 'handover-pending'] as const,
  pickups: ['payroll-authorization', 'pickups'] as const,
  reexports: ['payroll-authorization', 'reexports'] as const,
};

export const useTraitQueue = () =>
  useQuery({ queryKey: authorizationKeys.traits, queryFn: () => payrollAuthorizationService.traitQueue() });

export const useProposalQueue = () =>
  useQuery({ queryKey: authorizationKeys.proposals, queryFn: () => payrollAuthorizationService.proposalQueue() });

export const useDecidedProposals = () =>
  useQuery({ queryKey: authorizationKeys.decided, queryFn: () => payrollAuthorizationService.decidedProposals() });

export const useBatches = () =>
  useQuery({ queryKey: authorizationKeys.batches, queryFn: () => payrollAuthorizationService.batches() });

export const useHandoverPending = () =>
  useQuery({ queryKey: authorizationKeys.pending, queryFn: () => payrollAuthorizationService.handoverPending() });

export const usePickupLog = () =>
  useQuery({ queryKey: authorizationKeys.pickups, queryFn: () => payrollAuthorizationService.pickupLog() });

export const useReexportLog = () =>
  useQuery({ queryKey: authorizationKeys.reexports, queryFn: () => payrollAuthorizationService.reexportLog() });

/** Periode dipakai bersama Salary Processing — seluruh cache kedua modul disegarkan sekaligus. */
function useAuthorizationMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      toast(message(result), 'ok');
      void queryClient.invalidateQueries({ queryKey: authorizationKeys.all });
      void queryClient.invalidateQueries({ queryKey: salaryProcessingKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useLockPeriod = () =>
  useAuthorizationMutation(
    ({ actor, id }: { actor: Actor; id: string }) => salaryProcessingService.lockPeriod(actor, id),
    (period) => `${periodLabel(period)} dikunci — angkanya tidak bisa dihitung ulang sampai dibuka kembali.`,
  );

export const useReopenPeriod = () =>
  useAuthorizationMutation(
    ({ actor, id, input }: { actor: Actor; id: string; input: ReopenInput }) =>
      salaryProcessingService.reopenPeriod(actor, id, input),
    (period) => `${periodLabel(period)} dibuka kembali ke ${period.status} beserta alasannya.`,
  );

export const useAuthorizeHandover = () =>
  useAuthorizationMutation(
    ({ actor, id }: { actor: Actor; id: string }) => salaryProcessingService.authorizeHandover(actor, id),
    (period) => `${periodLabel(period)} diserahkan — baris jembatannya menunggu diambil sistem klien.`,
  );

export const useApproveTrait = () =>
  useAuthorizationMutation(
    ({ actor, id }: { actor: Actor; id: string }) => payrollAuthorizationService.approveTrait(actor, id),
    (row) => `Usulan sifat ${row.componentCode} disetujui — berlaku mulai ${row.proposedEffectiveFrom}.`,
  );

export const useRejectTrait = () =>
  useAuthorizationMutation(
    ({ actor, id }: { actor: Actor; id: string }) => payrollAuthorizationService.rejectTrait(actor, id),
    (row) => `Usulan sifat ${row.componentCode} ditolak — sifat aktifnya tidak berubah.`,
  );

export const useApproveProposal = () =>
  useAuthorizationMutation(
    ({ actor, id }: { actor: Actor; id: string }) => payrollAuthorizationService.approveProposal(actor, id),
    (row) => `Usulan ${row.id} disetujui dan berlaku mulai ${row.effectiveFrom}.`,
  );

export const useRejectProposal = () =>
  useAuthorizationMutation(
    ({ actor, id, reason }: { actor: Actor; id: string; reason: string }) =>
      payrollAuthorizationService.rejectProposal(actor, id, reason),
    (row) => `Usulan ${row.id} ditolak beserta alasannya.`,
  );

export const useApproveBatch = () =>
  useAuthorizationMutation(
    ({ actor, id }: { actor: Actor; id: string }) => payrollAuthorizationService.approveBatch(actor, id),
    (row) => `${row.batchName} disetujui.`,
  );

export const useRejectBatch = () =>
  useAuthorizationMutation(
    ({ actor, id, reason }: { actor: Actor; id: string; reason: string }) =>
      payrollAuthorizationService.rejectBatch(actor, id, reason),
    (row) => `${row.batchName} ditolak beserta alasannya.`,
  );

export const useRequestReexport = () =>
  useAuthorizationMutation(
    ({ actor, periodId, reason }: { actor: Actor; periodId: string; reason: string }) =>
      payrollAuthorizationService.requestReexport(actor, periodId, reason),
    () => 'Ekspor ulang disetujui — baris jembatan disalin ulang dan menunggu diambil klien.',
  );
