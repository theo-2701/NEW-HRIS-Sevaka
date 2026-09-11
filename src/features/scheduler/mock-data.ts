import { EMPLOYEES } from '@/features/time-off/mock-data';
import type { Shift, ShiftAssignment, ShiftSwap } from '@/features/scheduler/types';

/** Dataset Skenario Positif Scheduler (UIC-001-TIME §9) — disalin apa adanya. */

export const SHIFTS: Shift[] = [
  { id: 'sh-1', shiftCode: 'PAGI', shiftName: 'Shift Pagi', shiftType: 'FIXED', startTime: '08:00', endTime: '17:00', crossesMidnight: false, breakMinutes: 60, isActive: true, usedByRoster: true },
  { id: 'sh-2', shiftCode: 'MALAM', shiftName: 'Shift Malam', shiftType: 'FIXED', startTime: '22:00', endTime: '06:00', crossesMidnight: true, breakMinutes: 45, isActive: true, usedByRoster: true },
  { id: 'sh-3', shiftCode: 'FLEX', shiftName: 'Jam Fleksibel', shiftType: 'FLEX', startTime: null, endTime: null, crossesMidnight: false, breakMinutes: 60, isActive: true, usedByRoster: false },
  { id: 'sh-4', shiftCode: 'ROT-3', shiftName: 'Rotasi 3 Hari', shiftType: 'CYCLE', startTime: null, endTime: null, crossesMidnight: false, breakMinutes: 0, isActive: false, usedByRoster: false },
];

export const ASSIGNMENTS: ShiftAssignment[] = [
  { id: 'as-1', employeeId: 'emp-rina', workDate: '2026-07-27', shiftId: 'sh-1', isOffDay: false, assignmentSource: 'INDIVIDUAL' },
  { id: 'as-2', employeeId: 'emp-rina', workDate: '2026-07-28', shiftId: 'sh-1', isOffDay: false, assignmentSource: 'BULK' },
  { id: 'as-3', employeeId: 'emp-rina', workDate: '2026-07-29', shiftId: null, isOffDay: true, assignmentSource: 'BULK' },
  { id: 'as-4', employeeId: 'emp-sari', workDate: '2026-07-27', shiftId: 'sh-2', isOffDay: false, assignmentSource: 'BULK' },
  { id: 'as-5', employeeId: 'emp-sari', workDate: '2026-07-28', shiftId: 'sh-2', isOffDay: false, assignmentSource: 'BULK' },
  { id: 'as-6', employeeId: 'emp-sari', workDate: '2026-07-29', shiftId: 'sh-1', isOffDay: false, assignmentSource: 'SWAP' },
  { id: 'as-7', employeeId: 'emp-budi', workDate: '2026-07-27', shiftId: 'sh-1', isOffDay: false, assignmentSource: 'BULK' },
  { id: 'as-8', employeeId: 'emp-budi', workDate: '2026-07-28', shiftId: null, isOffDay: true, assignmentSource: 'INDIVIDUAL' },
  { id: 'as-9', employeeId: 'emp-hendra', workDate: '2026-07-27', shiftId: 'sh-1', isOffDay: false, assignmentSource: 'BULK' },
];

export const SWAPS: ShiftSwap[] = [
  { id: 'sw-1', requesterAssignmentId: 'as-1', counterpartAssignmentId: 'as-4', swapStatus: 'PENDING_APPROVAL', submittedAt: '2026-07-24T10:00:00+07:00', approvedBy: null },
  { id: 'sw-2', requesterAssignmentId: 'as-2', counterpartAssignmentId: 'as-5', swapStatus: 'APPROVED', submittedAt: '2026-07-22T09:00:00+07:00', approvedBy: 'emp-hendra' },
  { id: 'sw-3', requesterAssignmentId: 'as-7', counterpartAssignmentId: 'as-9', swapStatus: 'REJECTED', submittedAt: '2026-07-21T14:00:00+07:00', approvedBy: 'emp-hendra' },
];

/** Identitas yang sedang login di layar ini (pengganti token). */
export const ME = 'emp-hendra';

/** Minggu yang bisa dilihat proyeksi roster. */
export const WEEK_OPTIONS = [
  { value: '2026-07-27', label: '27 Jul – 02 Aug 2026' },
  { value: '2026-08-03', label: '03 – 09 Aug 2026' },
];

export function employeeName(id: string): string {
  return EMPLOYEES.find((row) => row.id === id)?.name ?? '—';
}

export { EMPLOYEES };
