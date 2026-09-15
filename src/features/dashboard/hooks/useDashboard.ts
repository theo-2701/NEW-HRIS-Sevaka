import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '@/features/dashboard/services/dashboard.service';
import { toast } from '@/store/ui.store';

export const dashboardKeys = {
  summary: ['dashboard', 'summary'] as const,
  lockedAccounts: ['dashboard', 'locked-accounts'] as const,
  homeStats: ['dashboard', 'home-stats'] as const,
  me: ['dashboard', 'me'] as const,
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

export function useHomeStats() {
  return useQuery({ queryKey: dashboardKeys.homeStats, queryFn: () => dashboardService.getHomeStats() });
}

export function useMe() {
  return useQuery({ queryKey: dashboardKeys.me, queryFn: () => dashboardService.getMe() });
}
