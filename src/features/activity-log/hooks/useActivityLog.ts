import { useQuery } from '@tanstack/react-query';
import { activityLogService } from '@/features/activity-log/services/activity-log.service';
import type { ActivityFamily, ActivityLogQuery } from '@/features/activity-log/types';

export const activityLogKeys = {
  all: ['activity-log'] as const,
  search: (family: ActivityFamily, query: ActivityLogQuery) => ['activity-log', family, query] as const,
};

export function useActivityLog<F extends ActivityFamily>(family: F, query: ActivityLogQuery) {
  return useQuery({
    queryKey: activityLogKeys.search(family, query),
    queryFn: () => activityLogService.search(family, query),
  });
}
