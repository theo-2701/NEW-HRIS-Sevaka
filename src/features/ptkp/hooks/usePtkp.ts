import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ptkpService } from '@/features/ptkp/services/ptkp.service';
import { toast } from '@/store/ui.store';
import { shortCode } from '@/features/ptkp/types';
import type { PtkpAdjustmentDraft } from '@/features/ptkp/types';
import { formatDate } from '@/lib/format';

export const ptkpKeys = {
  subjects: ['ptkp', 'subjects'] as const,
  periods: (employeeId: string) => ['ptkp', 'periods', employeeId] as const,
};

export function usePtkpSubjects() {
  return useQuery({ queryKey: ptkpKeys.subjects, queryFn: () => ptkpService.subjects() });
}

export function usePtkpPeriods(employeeId: string | undefined) {
  return useQuery({
    queryKey: ptkpKeys.periods(employeeId ?? ''),
    queryFn: () => ptkpService.periods(employeeId!),
    enabled: Boolean(employeeId),
  });
}

export function useAdjustPtkp(employeeId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draft: PtkpAdjustmentDraft) => ptkpService.adjust(employeeId!, draft),
    onSuccess: (period) => {
      toast(
        `PTKP diubah ke ${shortCode(period.code)}. Periode baru aktif sejak ${formatDate(period.effectiveFrom)}.`,
        'ok',
      );
      void queryClient.invalidateQueries({ queryKey: ptkpKeys.periods(employeeId ?? '') });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
