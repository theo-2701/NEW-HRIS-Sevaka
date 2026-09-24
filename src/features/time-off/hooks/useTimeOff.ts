import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timeOffService } from '@/features/time-off/services/time-off.service';
import { toast } from '@/store/ui.store';
import { DEMO_NOW } from '@/features/time-off/types';
import type {
  AccessPurpose,
  DecisionInput,
  MedicalAccessLog,
  RejectInput,
  RequestDraft,
  Session,
} from '@/features/time-off/types';
import type { ToastTone } from '@/store/ui.store';

export const timeOffKeys = {
  all: ['time-off'] as const,
  requests: (employeeId: string) => ['time-off', 'requests', employeeId] as const,
  delegations: ['time-off', 'delegations'] as const,
  access: ['time-off', 'medical-access'] as const,
  types: ['time-off', 'leave-types'] as const,
};

export function useLeaveTypes() {
  return useQuery({ queryKey: timeOffKeys.types, queryFn: () => timeOffService.leaveTypes() });
}

export function useLeaveRequests(session: Session) {
  return useQuery({
    queryKey: timeOffKeys.requests(session.employeeId),
    queryFn: () => timeOffService.requests(session),
  });
}

export function useDelegations() {
  return useQuery({ queryKey: timeOffKeys.delegations, queryFn: () => timeOffService.delegations() });
}

export function useMedicalAccess() {
  return useQuery({ queryKey: timeOffKeys.access, queryFn: () => timeOffService.medicalAccess() });
}

function useTimeOffMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: timeOffKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useSubmitRequest = (session: Session) =>
  useTimeOffMutation<{ draft: RequestDraft; editingId?: string }>(
    async ({ draft, editingId }) => {
      if (editingId) {
        await timeOffService.update(session, editingId, draft, DEMO_NOW);
        return;
      }
      await timeOffService.create(session, draft, DEMO_NOW);
    },
    (_result, { editingId }) => ({
      text: editingId
        ? 'Pengajuan diperbarui — gerbang submit dijalankan ulang.'
        : 'Pengajuan tersimpan. Cuti sakit langsung berlaku; jenis lain menunggu keputusan.',
    }),
  );

/**
 * Keputusan approver (K9): pintu keputusan menjawab 200 "diterima", lalu status
 * final + mutasi ledger saldo ditulis saat workflow selesai. Seluruh query
 * di-invalidate karena saldo (modul Balance) ikut berubah.
 */
export function useDecideRequest(session: Session) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      input,
    }: {
      id: string;
      decision: 'APPROVED' | 'REJECTED';
      input: DecisionInput;
    }) => {
      await timeOffService.decide(session, id, decision, input, DEMO_NOW);
      return decision;
    },
    onSuccess: async (decision, { id, input }) => {
      toast('200 diterima — keputusan diteruskan ke proses persetujuan.', 'info');
      await timeOffService.completeDecision(session, id, decision, input, DEMO_NOW);
      toast(
        decision === 'APPROVED'
          ? 'workflow.process.completed — cuti disetujui; saldo dipotong lewat entri ledger LEAVE_TAKEN.'
          : 'workflow.process.completed — pengajuan ditolak, hari itu tetap terhitung absen.',
        decision === 'APPROVED' ? 'ok' : 'warn',
      );
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useRejectSick = (session: Session) =>
  useTimeOffMutation<{ id: string; reject: RejectInput }>(
    ({ id, reject }) => timeOffService.rejectSick(session, id, reject, DEMO_NOW),
    () => ({
      text: 'Penolakan diterima — saldo yang sudah terpotong dikembalikan dan harinya jatuh jadi absen.',
      tone: 'warn',
    }),
  );

export const useWithdrawRequest = (session: Session) =>
  useTimeOffMutation<{ id: string }>(
    ({ id }) => timeOffService.withdraw(session, id, DEMO_NOW),
    () => ({ text: 'Status menjadi CANCELLED; saldo dipulihkan dan delegasi yang menempel ikut dibatalkan.' }),
  );

export const useOpenDoctorNote = (session: Session) =>
  useTimeOffMutation<{ id: string; purpose: AccessPurpose }, MedicalAccessLog>(
    ({ id, purpose }) => timeOffService.openDoctorNote(session, id, purpose, DEMO_NOW),
    () => ({ text: 'Jejak akses tercatat lebih dulu, baru isi suratnya ditampilkan.', tone: 'info' }),
  );

export const useSaveDelegation = (session: Session) =>
  useTimeOffMutation<{ id?: string; leaveRequestId: string; substituteId: string }>(
    (payload) => timeOffService.saveDelegation(session, payload, DEMO_NOW),
    (_result, { id }) => ({ text: id ? 'Pengganti diperbarui.' : 'Delegasi tersimpan, menunggu persetujuan.' }),
  );

export const useCancelDelegation = () =>
  useTimeOffMutation<{ id: string }>(
    ({ id }) => timeOffService.cancelDelegation(id),
    () => ({ text: 'Delegasi dibatalkan.', tone: 'warn' }),
  );
