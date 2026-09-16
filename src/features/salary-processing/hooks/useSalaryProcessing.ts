import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salaryProcessingService } from '@/features/salary-processing/services/salary-processing.service';
import { periodLabel } from '@/features/salary-processing/rules';
import { toast } from '@/store/ui.store';
import type {
  Actor,
  FindingFilter,
  ImportDraft,
  ImportFilter,
  PeriodFilter,
  ResolveInput,
  RunInput,
} from '@/features/salary-processing/types';

export const salaryProcessingKeys = {
  all: ['salary-processing'] as const,
  periods: (filter: PeriodFilter) => ['salary-processing', 'periods', filter] as const,
  history: (id: string) => ['salary-processing', 'history', id] as const,
  params: (id: string) => ['salary-processing', 'params', id] as const,
  findings: (periodId: string, filter: FindingFilter) => ['salary-processing', 'findings', periodId, filter] as const,
  imports: (filter: ImportFilter) => ['salary-processing', 'imports', filter] as const,
};

export function usePeriods(filter: PeriodFilter = {}) {
  return useQuery({
    queryKey: salaryProcessingKeys.periods(filter),
    queryFn: () => salaryProcessingService.searchPeriods(filter),
  });
}

export function useStateHistory(periodId: string | null) {
  return useQuery({
    queryKey: salaryProcessingKeys.history(periodId ?? ''),
    queryFn: () => salaryProcessingService.stateHistory(periodId as string),
    enabled: Boolean(periodId),
  });
}

export function useParamSnapshot(periodId: string | null) {
  return useQuery({
    queryKey: salaryProcessingKeys.params(periodId ?? ''),
    queryFn: () => salaryProcessingService.paramSnapshot(periodId as string),
    enabled: Boolean(periodId),
  });
}

export function useFindings(periodId: string | null, filter: FindingFilter = {}) {
  return useQuery({
    queryKey: salaryProcessingKeys.findings(periodId ?? '', filter),
    queryFn: () => salaryProcessingService.searchFindings(periodId as string, filter),
    enabled: Boolean(periodId),
  });
}

export function useImports(filter: ImportFilter = {}) {
  return useQuery({
    queryKey: salaryProcessingKeys.imports(filter),
    queryFn: () => salaryProcessingService.searchImports(filter),
  });
}

function useProcessingMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      toast(message(result), 'ok');
      void queryClient.invalidateQueries({ queryKey: salaryProcessingKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useRunPeriod = () =>
  useProcessingMutation(
    ({ actor, input }: { actor: Actor; input: RunInput }) => salaryProcessingService.runPeriod(actor, input),
    (result) =>
      result.branch === 'INSERT'
        ? `${periodLabel(result.period)} dihitung — periode baru berstatus Calculated.`
        : `${periodLabel(result.period)} dihitung ulang — parameter beku diperbarui.`,
  );

export const useReviewPeriod = () =>
  useProcessingMutation(
    ({ actor, id }: { actor: Actor; id: string }) => salaryProcessingService.reviewPeriod(actor, id),
    (period) => `${periodLabel(period)} ditinjau dan menunggu pemeriksaan HR Manager.`,
  );

export const useResolveFinding = () =>
  useProcessingMutation(
    ({ actor, id, input }: { actor: Actor; id: string; input: ResolveInput }) =>
      salaryProcessingService.resolveFinding(actor, id, input),
    (finding) => `${finding.id} ditutup sebagai ${finding.finalState === 'DITERIMA' ? 'Diterima' : 'Diperbaiki'}.`,
  );

export const useBulkResolve = () =>
  useProcessingMutation(
    ({ actor, ids, reason }: { actor: Actor; ids: string[]; reason: string }) =>
      salaryProcessingService.bulkResolve(actor, ids, reason),
    (result) =>
      `${result.resolvedCount} temuan ditutup sebagai Diterima${result.skipped.length ? `, ${result.skipped.length} dilewati karena sudah tertutup` : ''}.`,
  );

export const useSubmitImport = () =>
  useProcessingMutation(
    ({ actor, draft }: { actor: Actor; draft: ImportDraft }) => salaryProcessingService.submitImport(actor, draft),
    (result) =>
      result.supersededId
        ? `Koreksi ${result.row.monthYear} tersimpan; baris lama dinonaktifkan dan menunggu verifikasi.`
        : `Impor ${result.row.monthYear} tersimpan dan menunggu verifikasi.`,
  );

export const useVerifyImport = () =>
  useProcessingMutation(
    ({ actor, id }: { actor: Actor; id: string }) => salaryProcessingService.verifyImport(actor, id),
    (row) => `Impor ${row.monthYear} diverifikasi.`,
  );
