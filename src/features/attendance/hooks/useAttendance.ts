import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tapGate } from '@/features/attendance/tapGate';
import { attendanceService } from '@/features/attendance/services/attendance.service';
import { canSearchPunch } from '@/features/attendance/types';
import { ATTENDANCE_TODAY } from '@/features/attendance/mock-data';
import { shiftOn } from '@/features/scheduler/services/scheduler.service';
import { toast } from '@/store/ui.store';
import type {
  CorrectionFilter,
  DayFilter,
  TapInput,
  TapFilter,
} from '@/features/attendance/services/attendance.service';
import type { AttendanceSession, CorrectionDraft, PunchPolicy } from '@/features/attendance/types';
import { LEGACY_PUNCH_POLICY } from '@/features/attendance/rules';
import type { ToastTone } from '@/store/ui.store';

export const attendanceKeys = {
  all: ['attendance'] as const,
  today: (employeeId: string) => ['attendance', 'today', employeeId] as const,
  days: (employeeId: string, filter: DayFilter) => ['attendance', 'days', employeeId, filter] as const,
  taps: (employeeId: string, filter: TapFilter) => ['attendance', 'taps', employeeId, filter] as const,
  corrections: (employeeId: string, filter: CorrectionFilter) =>
    ['attendance', 'corrections', employeeId, filter] as const,
};

export function useTodayPunches(session: AttendanceSession) {
  return useQuery({
    queryKey: attendanceKeys.today(session.employeeId),
    queryFn: () => attendanceService.todayPunches(session),
  });
}

export function useAttendanceDays(session: AttendanceSession, filter: DayFilter) {
  return useQuery({
    queryKey: attendanceKeys.days(session.employeeId, filter),
    queryFn: () => attendanceService.days(session, filter),
  });
}

/** Audit tap mentah — tidak pernah dimuat untuk peran tanpa kewenangannya. */
export function useTapHistory(session: AttendanceSession, filter: TapFilter) {
  return useQuery({
    queryKey: attendanceKeys.taps(session.employeeId, filter),
    queryFn: () => attendanceService.punches(session, filter),
    enabled: canSearchPunch(session),
  });
}

/**
 * Gerbang tap in hari ini (lihat `tapGate`). `staleTime: 0`: cuti yang ditarik atau lembur yang baru
 * diajukan di halaman lain harus langsung terbaca saat karyawan kembali ke kartu tap.
 */
export function useTapGate(employeeId: string) {
  return useQuery({
    queryKey: ['attendance', 'gate', employeeId, ATTENDANCE_TODAY],
    queryFn: () => tapGate(employeeId, ATTENDANCE_TODAY),
    staleTime: 0,
  });
}

/**
 * Kebijakan tap (UIC-TIME 0.26 §6.1.4) — `undefined` selama memuat. Gagal dibaca ⇒ perilaku lama
 * (`LEGACY_PUNCH_POLICY`): layar tidak meminta swafoto, server yang memutus lewat `422`.
 */
export function usePunchPolicy(session: AttendanceSession): PunchPolicy | undefined {
  const query = useQuery({
    queryKey: ['attendance', 'policy', session.employeeId],
    queryFn: () => attendanceService.punchPolicy(session),
    retry: false,
  });
  return query.data ?? (query.isError ? LEGACY_PUNCH_POLICY : undefined);
}

/** Shift hari ini dari roster Scheduler — kolom Shift di kartu tap. */
export function useShiftToday(employeeId: string) {
  return useQuery({
    queryKey: ['attendance', 'shift', employeeId, ATTENDANCE_TODAY],
    queryFn: () => shiftOn(employeeId, ATTENDANCE_TODAY),
  });
}

export function useCorrections(session: AttendanceSession, filter: CorrectionFilter) {
  return useQuery({
    queryKey: attendanceKeys.corrections(session.employeeId, filter),
    queryFn: () => attendanceService.corrections(session, filter),
  });
}

function useAttendanceMutation<TVars, TResult = void>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult, vars: TVars) => { text: string; tone?: ToastTone },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result, vars) => {
      const { text, tone = 'ok' } = message(result, vars);
      toast(text, tone);
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

/** Tap: tanda terimanya modal di layar, jadi sukses tidak memunculkan toast/dialog kedua. */
export function useRecordPunch(session: AttendanceSession) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: TapInput) => attendanceService.recordPunch(session, vars),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      // ESS Attendance membaca tap hari ini lewat kunci `ess-time` — tanpa ini kartunya basi dan
      // tombol masih "Tap in", sehingga tap berikutnya tercatat sebagai Tap out.
      void queryClient.invalidateQueries({ queryKey: ['ess-time'] });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateCorrection = (session: AttendanceSession) =>
  useAttendanceMutation<CorrectionDraft>(
    (draft) => attendanceService.createCorrection(session, draft).then(() => undefined),
    () => ({ text: 'Correction submitted. The day keeps its current verdict until a decision is made.' }),
  );

/** Keputusan checker (K9): 200 diterima, lalu status + baris harian ditulis saat workflow selesai. */
export function useDecideCorrection(session: AttendanceSession) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: 'APPROVED' | 'REJECTED' }) => {
      await attendanceService.decideCorrection(session, id, kind);
      return kind;
    },
    onSuccess: async (kind, { id }) => {
      toast('Decision received and passed on to the approval process.', 'info');
      await attendanceService.completeCorrectionWorkflow(session, id, kind);
      toast(
        kind === 'APPROVED'
          ? 'Correction approved. The day is now excused; its measured minutes stay unchanged.'
          : 'Correction rejected. The day keeps its original verdict.',
        kind === 'APPROVED' ? 'ok' : 'warn',
      );
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useWithdrawCorrection = (session: AttendanceSession) =>
  useAttendanceMutation<{ id: string }>(
    ({ id }) => attendanceService.withdrawCorrection(session, id).then(() => undefined),
    () => ({
      text: 'Correction withdrawn. It stays on record as Cancelled and the day can be corrected again.',
      tone: 'warn' as const,
    }),
  );
