import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { periodService } from '@/features/performance/services/period.service';
import { toast } from '@/store/ui.store';
import type { PerfActor, PeriodSearch } from '@/features/performance/types';

export const periodKeys = {
  all: ['performance', 'periods'] as const,
  list: (role: string, query: PeriodSearch) => ['performance', 'periods', 'list', role, query] as const,
  detail: (role: string, id: string) => ['performance', 'periods', 'detail', role, id] as const,
  preview: (role: string) => ['performance', 'periods', 'preview', role] as const,
  gaps: (role: string, id: string) => ['performance', 'periods', 'gaps', role, id] as const,
};

export const usePeriods = (actor: PerfActor, query: PeriodSearch, enabled: boolean) =>
  useQuery({
    queryKey: periodKeys.list(actor.role, query),
    queryFn: () => periodService.search(actor, query),
    enabled,
  });

export const usePeriod = (actor: PerfActor, id: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: periodKeys.detail(actor.role, id ?? ''),
    queryFn: () => periodService.get(actor, id!),
    enabled: enabled && Boolean(id),
    retry: false,
  });

export const useEligibilityPreview = (actor: PerfActor, enabled: boolean) =>
  useQuery({ queryKey: periodKeys.preview(actor.role), queryFn: () => periodService.eligibilityPreview(actor), enabled });

export const useEligibilityGaps = (actor: PerfActor, id: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: periodKeys.gaps(actor.role, id ?? ''),
    queryFn: () => periodService.eligibilityGaps(actor, id!),
    enabled: enabled && Boolean(id),
  });

function usePeriodMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, success: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast(success, 'ok');
      void queryClient.invalidateQueries({ queryKey: periodKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useOpenPeriod = (actor: PerfActor) =>
  usePeriodMutation((name: string) => periodService.open(actor, name), 'Periode penilaian dibuka.');

export const useStartSigning = (actor: PerfActor) =>
  usePeriodMutation((id: string) => periodService.startSigning(actor, id), 'Pengesahan dimulai.');

export const useClosePeriod = (actor: PerfActor) =>
  usePeriodMutation((id: string) => periodService.close(actor, id), 'Periode ditutup.');
