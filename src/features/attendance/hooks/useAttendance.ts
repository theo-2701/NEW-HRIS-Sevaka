import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/features/attendance/services/attendance.service';
import { canSearchPunch } from '@/features/attendance/types';
import { toast } from '@/store/ui.store';
import type {
  CorrectionFilter,
  DayFilter,
  PunchResult,
  TapFilter,
} from '@/features/attendance/services/attendance.service';
import type { AttendanceSession, CorrectionDraft } from '@/features/attendance/types';
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

export const useRecordPunch = (session: AttendanceSession) =>
  useAttendanceMutation<{ selfieCaptured: boolean; idempotencyKey: string }, PunchResult>(
    (vars) => attendanceService.recordPunch(session, vars),
    (result) => ({
      text: result.replayed
        ? '200 — kunci idempotensi yang sama; tap yang sudah ada dikembalikan, bukan baris kedua.'
        : '201 — tap tersimpan. Perhitungan ulang ringkasan harian berjalan di luar transaksi ini.',
    }),
  );

export const useCreateCorrection = (session: AttendanceSession) =>
  useAttendanceMutation<CorrectionDraft>(
    (draft) => attendanceService.createCorrection(session, draft).then(() => undefined),
    () => ({ text: '201 — koreksi diajukan. Hari itu tetap membawa putusannya sampai keputusan turun.' }),
  );

export const useDecideCorrection = (session: AttendanceSession) =>
  useAttendanceMutation<{ id: string; kind: 'APPROVED' | 'REJECTED' }>(
    ({ id, kind }) => attendanceService.decideCorrection(session, id, kind).then(() => undefined),
    (_result, { kind }) => ({
      text:
        kind === 'APPROVED'
          ? '200 — hari itu kini excused; menit terukurnya tidak berubah sedikit pun.'
          : '200 — koreksi ditolak dan hari itu tetap membawa putusan aslinya.',
      tone: kind === 'APPROVED' ? ('ok' as const) : ('warn' as const),
    }),
  );

export const useWithdrawCorrection = (session: AttendanceSession) =>
  useAttendanceMutation<{ id: string }>(
    ({ id }) => attendanceService.withdrawCorrection(session, id).then(() => undefined),
    () => ({
      text: '200 — koreksi ditarik; barisnya tinggal sebagai Cancelled dan harinya bebas dikoreksi lagi.',
      tone: 'warn' as const,
    }),
  );
