/**
 * Time › Scheduler — kontrak FSD-001-TIME §8–§9 · UIC-001-TIME §10.
 *
 * Tiga sumber daya:
 *  • `cnf_shift`               — katalog pola shift.
 *  • `emp_shift_assignment`    — roster, satu baris per karyawan × tanggal.
 *  • `emp_shift_swap_request`  — tukar shift; roster tidak bergerak sebelum
 *    keputusan turun, lalu kedua baris bertukar sebagai satu paket.
 *
 * Calendar membaca dua yang pertama sebagai lapis teratas saat menyelesaikan
 * pertanyaan "hari ini hari kerja bukan?".
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

export type SwapStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ShiftSwap {
  id: string;
  requesterAssignmentId: string;
  counterpartAssignmentId: string;
  swapStatus: SwapStatus;
  submittedAt: string;
  approvedBy: string | null;
}

export interface ShiftDraft {
  shiftCode: string;
  shiftName: string;
  shiftType: ShiftType | '';
  startTime: string;
  endTime: string;
  breakMinutes: string;
  cycleDef: string;
  flexBand: string;
}

export interface AssignmentDraft {
  employeeId: string;
  workDate: string;
  shiftId: string;
  isOffDay: boolean;
}

export interface BulkDraft {
  employeeIds: string[];
  from: string;
  to: string;
  shiftId: string;
}

/** Hitungan kering sebelum bulk dijalankan — barisnya belum bergerak. */
export interface BulkPreview {
  created: number;
  overwritten: number;
  skippedIndividual: number;
  skippedSwap: number;
  employees: number;
  dates: string[];
}

export const ASSIGNMENT_SOURCE_LABEL: Record<AssignmentSource, string> = {
  INDIVIDUAL: 'Individual adjustment',
  BULK: 'Bulk assignment',
  SWAP: 'Approved swap',
};

export const SWAP_STATUS_LABEL: Record<SwapStatus, string> = {
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};
