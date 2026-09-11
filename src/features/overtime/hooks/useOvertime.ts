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
          ? '200 — pengajuan diperbarui; approver kini melihat angka hasil hitung ulang, bukan yang semula.'
          : '201 — pengajuan tercatat sebagai Pending approval; jamnya belum bisa dibayar sampai keputusan turun.',
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
      overtimeService.decide(session, id, kind, approvedHours),
    onSuccess: (result: DecisionResult, { kind }) => {
      if (kind === 'REJECTED') {
        toast('200 — pengajuan ditolak dan jam itu tidak pernah bisa dibayar.', 'warn');
      } else {
        toast(
          result.recomputed
            ? '200 — ringkasan harian dihitung ulang; jam terbayar adalah yang lebih kecil antara aktual dan pagu yang disetujui.'
            : '200 — disetujui. Belum ada fakta harian pada tanggal itu: baris proyeksi baru lahir setelah data punch mendarat, tidak pernah dari persetujuan saja.',
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
        '200 — pengajuan ditarik (soft-delete: barisnya tetap terbaca sebagai Cancelled); jam yang sudah terlanjur dikerjakan tidak jadi lembur terbayar.',
        'ok',
      );
      invalidate(queryClient);
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}
