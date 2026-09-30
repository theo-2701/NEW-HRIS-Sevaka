import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kpiService } from '@/features/performance/services/kpi.service';
import { toast } from '@/store/ui.store';
import type { KpiDraft, KpiSearch, PerfActor } from '@/features/performance/types';

export const kpiKeys = {
  all: ['performance', 'kpi'] as const,
  list: (role: string, query: KpiSearch) => ['performance', 'kpi', 'list', role, query] as const,
  detail: (role: string, id: string) => ['performance', 'kpi', 'detail', role, id] as const,
  grades: (role: string) => ['performance', 'kpi', 'grades', role] as const,
};

export const useKpiItems = (actor: PerfActor, query: KpiSearch, enabled: boolean) =>
  useQuery({ queryKey: kpiKeys.list(actor.role, query), queryFn: () => kpiService.search(actor, query), enabled });

export const useKpiItem = (actor: PerfActor, id: string | null) =>
  useQuery({
    queryKey: kpiKeys.detail(actor.role, id ?? ''),
    queryFn: () => kpiService.get(actor, id!),
    enabled: Boolean(id),
  });

export const useJobGrades = (actor: PerfActor, enabled: boolean) =>
  useQuery({ queryKey: kpiKeys.grades(actor.role), queryFn: () => kpiService.jobGrades(actor), enabled });

function useKpiMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, success: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast(success, 'ok');
      void queryClient.invalidateQueries({ queryKey: kpiKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateKpi = (actor: PerfActor) =>
  useKpiMutation(
    ({ draft, idempotencyKey }: { draft: KpiDraft; idempotencyKey: string }) =>
      kpiService.create(actor, draft, idempotencyKey),
    'Item daftar induk dibuat.',
  );

export const useUpdateKpi = (actor: PerfActor) =>
  useKpiMutation(
    ({ id, patch }: { id: string; patch: Partial<KpiDraft> }) => kpiService.update(actor, id, patch),
    'Item daftar induk diperbarui.',
  );

export const useDeactivateKpi = (actor: PerfActor) =>
  useKpiMutation((id: string) => kpiService.deactivate(actor, id), 'Item daftar induk dinonaktifkan.');
