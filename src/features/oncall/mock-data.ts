import { EMPLOYEES } from '@/features/time-off/mock-data';
import type { OncallAssignment } from '@/features/oncall/types';

/** Dataset Skenario Positif On Call (UIC-001-TIME §11.1) — disalin apa adanya. */

/**
 * Identitas percobaan — pengganti login sungguhan, pola sama dengan layar Time
 * lain. Seluruh jendela di dataset kontrak dibuat `emp-hendra`, jadi tanpa
 * pemilih ini jalur Review tidak pernah bisa didemokan (pembuat tidak boleh
 * memutuskan barisnya sendiri).
 */
export const VIEWERS = [
  { employeeId: 'emp-hendra', role: 'HR_MANAGER' as const },
  { employeeId: 'emp-sari', role: 'HR_STAFF' as const },
];

export type OncallSession = (typeof VIEWERS)[number];

export const ONCALL: OncallAssignment[] = [
  { id: 'oncall-1', employeeId: 'emp-hendra', standbyStartAt: '2026-07-27T21:00:00+07:00', standbyEndAt: '2026-07-28T06:00:00+07:00', maxCalloutHours: 4.0, oncallStatus: 'ACTIVE', requiresExtraApprovalReason: null, assignmentNote: 'Month-end payroll system standby.', createdBy: 'emp-hendra', approvedBy: 'emp-sari' },
  { id: 'oncall-2', employeeId: 'emp-sari', standbyStartAt: '2026-08-03T21:00:00+07:00', standbyEndAt: '2026-08-04T06:00:00+07:00', maxCalloutHours: 3.5, oncallStatus: 'PENDING_APPROVAL', requiresExtraApprovalReason: null, assignmentNote: 'Weekly network standby — next rotation.', createdBy: 'emp-hendra', approvedBy: null },
  // Pagu 5 jam menembus plafon harian 4 jam → lapis approval tambahan menyala.
  { id: 'oncall-3', employeeId: 'emp-rina', standbyStartAt: '2026-08-10T21:00:00+07:00', standbyEndAt: '2026-08-11T06:00:00+07:00', maxCalloutHours: 5.0, oncallStatus: 'PENDING_APPROVAL', requiresExtraApprovalReason: 'MAX_CALLOUT_EXCEEDS_DAILY_CAP', assignmentNote: 'Database migration standby — weekend window.', createdBy: 'emp-hendra', approvedBy: null },
  { id: 'oncall-4', employeeId: 'emp-budi', standbyStartAt: '2026-08-15T20:00:00+07:00', standbyEndAt: '2026-08-16T06:00:00+07:00', maxCalloutHours: 3.0, oncallStatus: 'SCHEDULED', requiresExtraApprovalReason: null, assignmentNote: 'Weekend infrastructure standby.', createdBy: 'emp-hendra', approvedBy: 'emp-sari' },
];

export function employeeName(id: string): string {
  return EMPLOYEES.find((row) => row.id === id)?.name ?? '—';
}

export { EMPLOYEES };
