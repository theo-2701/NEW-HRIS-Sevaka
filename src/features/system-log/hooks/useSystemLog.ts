import { useQuery } from '@tanstack/react-query';
import { systemLogService } from '@/features/system-log/services/system-log.service';
import type { SystemLogRole } from '@/features/system-log/types';

/** Hanya jalan sesudah tombol Search (atau `?trace_id=`); tanpa coba ulang otomatis. */
export const useTraceSearch = (role: SystemLogRole, traceId: string) =>
  useQuery({
    queryKey: ['system-log', 'trace', role, traceId],
    queryFn: () => systemLogService.searchTrace(role, traceId),
    enabled: Boolean(traceId),
    retry: false,
  });

export const useErrorCodeSearch = (role: SystemLogRole, criteria: { code: string; from: string; to: string } | null) =>
  useQuery({
    queryKey: ['system-log', 'error-code', role, criteria],
    queryFn: () => systemLogService.searchErrorCode(role, criteria!.code, new Date(criteria!.from), new Date(criteria!.to)),
    enabled: Boolean(criteria),
    retry: false,
  });
