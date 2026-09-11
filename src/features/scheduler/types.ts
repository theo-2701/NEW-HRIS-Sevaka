/**
 * Time › Scheduler — kontrak FSD-001-TIME §8 · UIC-001-TIME §9.
 *
 * Untuk sekarang berkas ini hanya memuat bentuk roster dan pola shift, karena
 * Calendar membacanya sebagai lapis paling atas saat menyelesaikan pertanyaan
 * "hari ini hari kerja bukan?". Layar Scheduler-nya menyusul.
 */

export type ShiftType = 'FIXED' | 'CYCLE' | 'FLEX';
export type AssignmentSource = 'INDIVIDUAL' | 'BULK' | 'SWAP';

export interface Shift {
  id: string;
  shiftCode: string;
  shiftName: string;
  shiftType: ShiftType;
  startTime: string | null;
  endTime: string | null;
  crossesMidnight: boolean;
  breakMinutes: number;
  isActive: boolean;
  usedByRoster: boolean;
}

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  workDate: string;
  /** Kosong saat hari libur roster. */
  shiftId: string | null;
  isOffDay: boolean;
  assignmentSource: AssignmentSource;
}

export const SHIFT_TYPE_LABEL: Record<ShiftType, string> = {
  FIXED: 'Fixed',
  CYCLE: 'Cycle',
  FLEX: 'Flexible',
};
