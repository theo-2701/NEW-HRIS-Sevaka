import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '@/features/dashboard/services/dashboard.service';
import { toast } from '@/store/ui.store';

export const dashboardKeys = {
  summary: ['dashboard', 'summary'] as const,
  lockedAccounts: ['dashboard', 'locked-accounts'] as const,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: () => dashboardService.getSummary(),
  });
}

export function useLockedAccounts(enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.lockedAccounts,
    queryFn: () => dashboardService.getLockedAccounts(),
    enabled,
  });
}

export function useUnlockAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (employeeId: string) => dashboardService.unlockAccount(employeeId),
    onSuccess: () => {
      toast('Akun berhasil dibuka.', 'ok');
      queryClient.invalidateQueries({ queryKey: dashboardKeys.lockedAccounts });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.summary });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
