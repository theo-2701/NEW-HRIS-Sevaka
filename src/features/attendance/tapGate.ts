import { shiftOn } from '@/features/scheduler/services/scheduler.service';
import { approvedLeaveOn } from '@/features/time-off/services/time-off.service';
import { approvedOvertimeOn } from '@/features/overtime/services/overtime.service';
import { oncallOn } from '@/features/oncall/services/oncall.service';

/**
 * Gerbang tap in (keputusan Theo, 26 Okt 2026): karyawan yang cuti seharian atau sedang hari libur roster
 * tidak dapat tap in.
 *
 * Kontrak TIME menyebut punch append-only dan tap di hari libur tetap dipakai untuk lembur hari libur serta
 * deteksi panggilan On Call (K40). Supaya alur itu tidak putus, hari libur tetap terbuka bila hari itu ada
 * lembur yang sudah disetujui atau roster siaga yang sudah disetujui. Cuti setengah hari tidak menutup tap.
 * Tap out tidak pernah ditutup — karyawan yang sudah tap in harus tetap bisa pulang.
 */
export type TapBlock = { reason: 'TIME_OFF'; leaveTypeName: string } | { reason: 'DAY_OFF' };

export interface TapGate {
  block: TapBlock | null;
  /** Hari libur roster, tapi lembur/siaga yang disetujui membuka tap. */
  restDayException: boolean;
}

export async function tapGate(employeeId: string, workDate: string): Promise<TapGate> {
  const leave = approvedLeaveOn(employeeId, workDate);
  if (leave && leave.daySession === 'FULL') {
    return { block: { reason: 'TIME_OFF', leaveTypeName: leave.leaveTypeName }, restDayException: false };
  }
  const roster = await shiftOn(employeeId, workDate);
  if (roster?.assignment.isOffDay) {
    const exception = approvedOvertimeOn(employeeId, workDate) || oncallOn(employeeId, workDate);
    return { block: exception ? null : { reason: 'DAY_OFF' }, restDayException: exception };
  }
  return { block: null, restDayException: false };
}

/** Kalimat untuk karyawan — dipakai kartu Today dan pesan 422 server. */
export function tapBlockText(block: TapBlock): { title: string; detail: string } {
  if (block.reason === 'TIME_OFF') {
    return {
      title: "You're on time off today",
      detail: `Your ${block.leaveTypeName} for today is approved, so tap in is closed. If you are working after all, withdraw the time off first or ask HR.`,
    };
  }
  return {
    title: 'Today is your rest day',
    detail: 'Tap in opens on a rest day only when you have approved overtime or an approved on-call roster for today.',
  };
}
