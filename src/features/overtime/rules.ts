import { HOLIDAYS } from '@/features/time-off/mock-data';
import { DAILY_HOUR_CAP, OVERTIME_TODAY, RETRO_WINDOW_DAYS } from '@/features/overtime/mock-data';
import { toIsoDate } from '@/lib/format';
import type { DerivedFields, OvertimeCategory, OvertimeRequest } from '@/features/overtime/types';

/**
 * Aturan murni Overtime. Tiga field ini **diturunkan server**; apa pun yang
 * dikirim klien untuk `submission_mode`, `overtime_category`, dan
 * `requires_extra_approval_reason` diabaikan seluruhnya. Layar hanya
 * mempratinjaunya supaya pengaju tahu apa yang akan dibaca approver.
 */

export function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Batas paling awal yang masih diterima jendela susulan. */
export function retroWindowStart(today = OVERTIME_TODAY): string {
  return shiftDate(today, -RETRO_WINDOW_DAYS);
}

/**
 * Kategori dari kalender: hari libur yang **sudah disetujui** dan bukan
 * REGIONAL menang, lalu akhir pekan, sisanya hari kerja.
 */
export function categoryOf(iso: string): OvertimeCategory {
  const holiday = HOLIDAYS.find(
    (row) => row.date === iso && row.approvalStatus === 'APPROVED' && row.type !== 'REGIONAL',
  );
  if (holiday) return 'PUBLIC_HOLIDAY';
  const weekday = new Date(`${iso}T00:00:00`).getDay();
  return weekday === 0 || weekday === 6 ? 'WEEKLY_REST' : 'WORKDAY';
}

/** Jam yang sudah disetujui pada satu karyawan × tanggal — pagu harian. */
export function approvedHoursOn(
  rows: OvertimeRequest[],
  employeeId: string,
  iso: string,
  skipId?: string | null,
): number {
  return rows
    .filter(
      (row) =>
        row.employeeId === employeeId &&
        row.overtimeDate === iso &&
        row.id !== skipId &&
        (row.overtimeStatus === 'APPROVED' || row.overtimeStatus === 'AUTO_APPROVED'),
    )
    .reduce((sum, row) => sum + (row.approvedHours ?? 0), 0);
}

/**
 * Pratinjau tiga field turunan. Pemicu lapis approval **menaikkan** pengajuan
 * ke lapis berikutnya — ia tidak pernah jadi alasan menolak, dan kelebihannya
 * tetap dicatat apa adanya.
 */
export function derive(
  rows: OvertimeRequest[],
  employeeId: string,
  iso: string,
  hours: number | null,
  skipId?: string | null,
  today = OVERTIME_TODAY,
): DerivedFields {
  if (!iso) {
    return { submissionMode: null, overtimeCategory: null, extraApprovalReason: null, alreadyApproved: 0 };
  }
  const alreadyApproved = approvedHoursOn(rows, employeeId, iso, skipId);
  return {
    submissionMode: iso < today ? 'RETROACTIVE' : 'PRE',
    overtimeCategory: categoryOf(iso),
    extraApprovalReason: hours && alreadyApproved + hours > DAILY_HOUR_CAP ? 'DAILY_CAP_EXCEEDED' : null,
    alreadyApproved,
  };
}

/** `payable_hours = MIN(actual, approved ceiling)` — belum ada pembulatan berangka (GAP §7 #10). */
export function payableHours(actualHours: number, approvedCeiling: number): number {
  return Math.min(actualHours, approvedCeiling);
}
