import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { overtimeService } from '@/features/overtime/services/overtime.service';
import { toast } from '@/store/ui.store';
import type { DailyFilter, DecisionResult, RequestFilter } from '@/features/overtime/services/overtime.service';
import type { OvertimeDraft, OvertimeSession } from '@/features/overtime/types';

export const overtimeKeys = {
  all: ['overtime'] as const,
  requests: (employeeId: string, filter: RequestFilter) => ['overtime', 'requests', employeeId, filter] as const,
  daily: (employeeId: string, filter: DailyFilter) => ['overtime', 'daily', employeeId, filter] as const,
};

export function useOvertimeRequests(session: OvertimeSession, filter: RequestFilter) {
  return useQuery({
    queryKey: overtimeKeys.requests(session.employeeId, filter),
    queryFn: () => overtimeService.requests(session, filter),
  });
}

export function useOvertimeDaily(session: OvertimeSession, filter: DailyFilter) {
  return useQuery({
    queryKey: overtimeKeys.daily(session.employeeId, filter),
    queryFn: () => overtimeService.daily(session, filter),
  });
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: overtimeKeys.all });
}

export function useSaveOvertime(session: OvertimeSession) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ draft, editingId }: { draft: OvertimeDraft; editingId?: string }) =>
      overtimeService.save(session, draft, editingId),
    onSuccess: (_row, { editingId }) => {
      toast(
        editingId
          ? 'Request updated; the approver now sees the recalculated numbers, not the original ones.'
          : "Request recorded as Pending approval; its hours can't be paid until a decision is made.",
        'ok',
      );
      invalidate(queryClient);
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export function useDecideOvertime(session: OvertimeSession) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kind, approvedHours }: { id: string; kind: 'APPROVED' | 'REJECTED'; approvedHours?: number }) =>
      overtimeService.decide(session, id, kind, approvedHours).then(() => {
        toast('Decision received and passed on to the approval process; the status follows.', 'info');
        return overtimeService.completeOvertimeWorkflow(session, id, kind, approvedHours);
      }),
    onSuccess: (result: DecisionResult, { kind }) => {
      if (kind === 'REJECTED') {
        toast('Request rejected; those hours can never be paid.', 'warn');
      } else {
        toast(
          result.recomputed
            ? 'Daily summary recalculated; paid hours are the smaller of actual and the approved cap.'
            : 'Approved. No daily fact exists on that date yet: the projection row only appears after punch data lands, never from the approval alone.',
          'ok',
        );
      }
      invalidate(queryClient);
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export function useWithdrawOvertime(session: OvertimeSession) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => overtimeService.withdraw(session, id),
    onSuccess: () => {
      toast(
        "Request withdrawn (soft delete: the row still reads as Cancelled); hours already worked won't become paid overtime.",
        'ok',
      );
      invalidate(queryClient);
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
