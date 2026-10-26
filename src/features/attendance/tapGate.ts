import { shiftOn } from '@/features/scheduler/services/scheduler.service';
import { approvedLeaveOn } from '@/features/time-off/services/time-off.service';
import { approvedOvertimeOn } from '@/features/overtime/services/overtime.service';
import { oncallOn } from '@/features/oncall/services/oncall.service';
import type { DaySession } from '@/features/time-off/types';

/**
 * Gerbang tap in (keputusan Theo, 26 Okt 2026): karyawan yang cuti seharian atau sedang hari libur jadwal
 * tidak dapat tap in.
 *
 * Kontrak TIME menyebut punch append-only dan tap di hari libur tetap dipakai untuk lembur hari libur serta
 * deteksi panggilan On Call (K40). Supaya alur itu tidak putus, hari libur tetap terbuka bila hari itu ada
 * lembur yang sudah disetujui atau roster siaga yang sudah disetujui. Cuti setengah hari tidak menutup tap.
 * Tap out tidak pernah ditutup — karyawan yang sudah tap in harus tetap bisa pulang.
 */
export type TapBlock =
  | { reason: 'TIME_OFF'; leaveTypeName: string; startDate: string; endDate: string; totalDays: number }
  | { reason: 'DAY_OFF' };

export interface TapGate {
  block: TapBlock | null;
  /** Hari libur jadwal yang tetap terbuka karena lembur atau siaga yang disetujui. */
  restDayOpenedBy: 'OVERTIME' | 'ONCALL' | null;
  /** Cuti setengah hari yang disetujui — tap tetap terbuka, kartu menyebutnya. */
  halfDayLeave: { leaveTypeName: string; daySession: Exclude<DaySession, 'FULL'> } | null;
}

export async function tapGate(employeeId: string, workDate: string): Promise<TapGate> {
  const leave = approvedLeaveOn(employeeId, workDate);
  if (leave && leave.daySession === 'FULL') {
    const { leaveTypeName, startDate, endDate, totalDays } = leave;
    return { block: { reason: 'TIME_OFF', leaveTypeName, startDate, endDate, totalDays }, restDayOpenedBy: null, halfDayLeave: null };
  }
  const halfDayLeave = leave && leave.daySession !== 'FULL' ? { leaveTypeName: leave.leaveTypeName, daySession: leave.daySession } : null;
  const roster = await shiftOn(employeeId, workDate);
  if (roster?.assignment.isOffDay) {
    const openedBy = approvedOvertimeOn(employeeId, workDate) ? 'OVERTIME' : oncallOn(employeeId, workDate) ? 'ONCALL' : null;
    return { block: openedBy ? null : { reason: 'DAY_OFF' }, restDayOpenedBy: openedBy, halfDayLeave };
  }
  return { block: null, restDayOpenedBy: null, halfDayLeave };
}

/** Kalimat pesan 422 server — kartu Today memakai panel sendiri yang lebih lengkap. */
export function tapBlockText(block: TapBlock): string {
  return block.reason === 'TIME_OFF'
    ? `You're on approved ${block.leaveTypeName} today, so tap in is closed. Withdraw the time off first if you are working after all.`
    : 'Today is a day off in your work schedule. Tap in opens only when overtime or on-call for today is approved.';
}
