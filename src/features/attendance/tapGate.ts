import { shiftOn } from '@/features/scheduler/services/scheduler.service';
import { approvedLeaveOn } from '@/features/time-off/services/time-off.service';
import { overtimeStatusOn } from '@/features/overtime/services/overtime.service';
import { oncallOn } from '@/features/oncall/services/oncall.service';
import type { DaySession } from '@/features/time-off/types';

/**
 * Gerbang tap in (keputusan Theo, 26 Okt 2026): karyawan yang cuti seharian tidak dapat tap in.
 *
 * Hari libur jadwal TIDAK ditutup. TSD-TIME O-4: jam lembur dibayar = MIN(jam aktual dari punch, jam
 * disetujui) — tanpa punch, lembur tidak dibayar berapa pun yang disetujui; di hari libur seluruh menit
 * kerja dihitung. Pengajuan lembur juga boleh susulan (`overtime.retroactive_window_days`), dan tap di
 * jendela siaga memicu panggilan On Call (K40). Menutup tap di hari libur memutus ketiga alur itu.
 * Cuti setengah hari tidak menutup tap. Tap out tidak pernah ditutup.
 */
export interface TapBlock {
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
}

export interface TapGate {
  /** Cuti seharian yang disetujui — satu-satunya alasan tap in ditutup. */
  block: TapBlock | null;
  /** Hari libur jadwal dan apa yang menaunginya; `null` = bukan hari libur. */
  restDay: 'OVERTIME_APPROVED' | 'OVERTIME_PENDING' | 'ONCALL' | 'NONE' | null;
  /** Cuti setengah hari yang disetujui — tap tetap terbuka, kartu menyebutnya. */
  halfDayLeave: { leaveTypeName: string; daySession: Exclude<DaySession, 'FULL'> } | null;
}

export async function tapGate(employeeId: string, workDate: string): Promise<TapGate> {
  const leave = approvedLeaveOn(employeeId, workDate);
  if (leave && leave.daySession === 'FULL') {
    const { leaveTypeName, startDate, endDate, totalDays } = leave;
    return { block: { leaveTypeName, startDate, endDate, totalDays }, restDay: null, halfDayLeave: null };
  }
  const halfDayLeave = leave && leave.daySession !== 'FULL' ? { leaveTypeName: leave.leaveTypeName, daySession: leave.daySession } : null;
  const roster = await shiftOn(employeeId, workDate);
  if (!roster?.assignment.isOffDay) return { block: null, restDay: null, halfDayLeave };
  const overtime = overtimeStatusOn(employeeId, workDate);
  const restDay =
    overtime === 'APPROVED' ? 'OVERTIME_APPROVED' : overtime === 'PENDING' ? 'OVERTIME_PENDING' : oncallOn(employeeId, workDate) ? 'ONCALL' : 'NONE';
  return { block: null, restDay, halfDayLeave };
}

/** Kalimat pesan 422 server — kartu Today memakai panel sendiri yang lebih lengkap. */
export function tapBlockText(block: TapBlock): string {
  return `You're on approved ${block.leaveTypeName} today, so tap in is closed. Withdraw the time off first if you are working after all.`;
}
