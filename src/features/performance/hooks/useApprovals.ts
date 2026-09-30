import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { WORKFLOW_DELAY_MS, approvalService } from '@/features/performance/services/approval.service';
import { sheetKeys } from '@/features/performance/hooks/useSheets';
import { toast } from '@/store/ui.store';
import type { DecisionDraft, PerfActor } from '@/features/performance/types';

export const approvalKeys = {
  all: ['performance', 'approvals'] as const,
  pending: (who: string, query: object) => ['performance', 'approvals', 'pending', who, query] as const,
  rounds: (who: string, id: string) => ['performance', 'approvals', 'rounds', who, id] as const,
  quota: ['performance', 'approvals', 'quota'] as const,
};

export const usePendingApprovals = (
  actor: PerfActor,
  query: { page: number; size: number; sortDirection: 'ASC' | 'DESC' },
  enabled: boolean,
) =>
  useQuery({
    queryKey: approvalKeys.pending(actor.employeeId, query),
    queryFn: () => approvalService.pending(actor, query),
    enabled,
  });

export const useApprovalRounds = (actor: PerfActor, id: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: approvalKeys.rounds(actor.employeeId, id ?? ''),
    queryFn: () => approvalService.rounds(actor, id!),
    enabled: enabled && Boolean(id),
    retry: false,
  });

export const useReturnQuota = (enabled: boolean) =>
  useQuery({ queryKey: approvalKeys.quota, queryFn: () => approvalService.returnQuota(), enabled });

/**
 * `202 FORWARDED` — status belum berubah saat respons tiba. Antrean & lembar dibaca ulang setelah
 * jeda alur kerja, padanan "verifikasi lewat GET sesudah jeda" di UIC §1.7.
 */
export function useDecide(actor: PerfActor, sheetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draft: DecisionDraft) => approvalService.decide(actor, sheetId, draft),
    onSuccess: (result) => {
      toast(`${result.message} Status lembar diperbarui setelah proses selesai.`, 'info');
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
        void queryClient.invalidateQueries({ queryKey: sheetKeys.all });
      }, WORKFLOW_DELAY_MS + 300);
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
