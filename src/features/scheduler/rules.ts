import { formatDate, toIsoDate } from '@/lib/format';
import { employeeName } from '@/features/scheduler/mock-data';
import type { Shift, ShiftAssignment } from '@/features/scheduler/types';

/** Aturan murni Scheduler — tidak menyentuh jaringan. */

/** Deret tanggal inklusif dari `from` sampai `to`. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    out.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Tujuh tanggal satu minggu, dimulai dari `weekStart`. */
export function weekDates(weekStart: string): string[] {
  return datesBetween(weekStart, toIsoDate(new Date(new Date(`${weekStart}T00:00:00`).getTime() + 6 * 86400000)));
}

/**
 * Pola yang boleh dipilih di roster: aktif, dan bukan siklus — sebuah siklus
 * tidak punya jam miliknya sendiri.
 */
export function pickableShifts(shifts: Shift[]): Shift[] {
  return shifts.filter((row) => row.isActive && row.shiftType !== 'CYCLE');
}

/** Baris roster satu karyawan pada satu tanggal, bila ada. */
export function assignmentOn(
  rows: ShiftAssignment[],
  employeeId: string,
  iso: string,
): ShiftAssignment | undefined {
  return rows.find((row) => row.employeeId === employeeId && row.workDate === iso);
}

/** Label ringkas satu baris roster — dipakai daftar tukar dan modalnya. */
export function rosterLabel(assignment: ShiftAssignment | undefined, shifts: Shift[]): string {
  if (!assignment) return '—';
  const shift = shifts.find((row) => row.id === assignment.shiftId);
  const what = assignment.isOffDay ? 'Off day' : (shift?.shiftCode ?? '—');
  return `${formatDate(assignment.workDate)} · ${employeeName(assignment.employeeId)} · ${what}`;
}
