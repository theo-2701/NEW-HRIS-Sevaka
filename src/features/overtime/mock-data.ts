import { EMPLOYEES } from '@/features/time-off/mock-data';
import type { OvertimeDaily, OvertimeRequest, OvertimeSession } from '@/features/overtime/types';

/**
 * Dataset Skenario Positif Overtime (UIC-001-TIME §8.1.1/§8.1.2/§8.1.4) —
 * `ot-1..ot-4` apa adanya. Jangan mengarang baris baru di sini.
 */

/** Jam demo kontrak; `submitted_at` §8.1.1 memakai tanggal ini. */
export const OVERTIME_TODAY = '2026-07-27';

/** `overtime.retroactive_window_days` — nilainya belum berangka di dokumen (GAP §7 #9). */
export const RETRO_WINDOW_DAYS = 7;

/** Plafon jam harian company — belum berangka di dokumen (GAP "perlu dikonfirmasi" #1). */
export const DAILY_HOUR_CAP = 4;

/** Empat sesi sesuai tiga kewenangan berbeda §8.1. */
export const VIEWERS: OvertimeSession[] = [
  { employeeId: 'emp-rina', role: 'EMPLOYEE' },
  { employeeId: 'emp-budi', role: 'DEPT_MANAGER' },
  { employeeId: 'emp-sari', role: 'HR_STAFF' },
  { employeeId: 'emp-hendra', role: 'HR_MANAGER' },
];

export const OT_REQUESTS: OvertimeRequest[] = [
  {
    id: 'ot-1',
    employeeId: 'emp-rina',
    overtimeDate: '2026-07-29',
    submissionMode: 'PRE',
    overtimeCategory: 'WORKDAY',
    requestedHours: 2.0,
    approvedHours: 2.0,
    overtimeStatus: 'APPROVED',
    requiresExtraApprovalReason: null,
    requestReason: 'Menyelesaikan laporan bulanan.',
    submittedAt: '2026-07-27T09:00:00+07:00',
    approvedAt: '2026-07-27T11:00:00+07:00',
    approvedBy: 'emp-hendra',
    workflowInstanceId: 'wf-ot-1',
    isAuto: false,
    oncallAssignmentId: null,
  },
  {
    // Lahir dari deteksi kehadiran on-call: nol permukaan tulis, tanpa workflow.
    // `approvedHours` adalah salinan beku `max_callout_hours` jendela siaga.
    id: 'ot-2',
    employeeId: 'emp-hendra',
    overtimeDate: '2026-07-27',
    submissionMode: 'PRE',
    overtimeCategory: 'WEEKLY_REST',
    requestedHours: null,
    approvedHours: 4.0,
    overtimeStatus: 'AUTO_APPROVED',
    requiresExtraApprovalReason: null,
    requestReason: null,
    submittedAt: '2026-07-27T22:00:00+07:00',
    approvedAt: null,
    approvedBy: null,
    workflowInstanceId: null,
    isAuto: true,
    oncallAssignmentId: 'oncall-1',
  },
  {
    id: 'ot-3',
    employeeId: 'emp-rina',
    overtimeDate: '2026-07-30',
    submissionMode: 'PRE',
    overtimeCategory: 'WORKDAY',
    requestedHours: 3.0,
    approvedHours: null,
    overtimeStatus: 'PENDING_APPROVAL',
    requiresExtraApprovalReason: null,
    requestReason: 'Persiapan tutup buku bulanan.',
    submittedAt: '2026-07-27T14:00:00+07:00',
    approvedAt: null,
    approvedBy: null,
    workflowInstanceId: 'wf-ot-3',
    isAuto: false,
    oncallAssignmentId: null,
  },
  {
    id: 'ot-4',
    employeeId: 'emp-rina',
    overtimeDate: '2026-07-25',
    submissionMode: 'RETROACTIVE',
    overtimeCategory: 'WORKDAY',
    requestedHours: 6.0,
    approvedHours: null,
    overtimeStatus: 'PENDING_APPROVAL',
    requiresExtraApprovalReason: 'DAILY_CAP_EXCEEDED',
    requestReason: 'Perbaikan mendadak sistem line produksi 2 — padam sejak sore.',
    submittedAt: '2026-07-27T13:00:00+07:00',
    approvedAt: null,
    approvedBy: null,
    workflowInstanceId: 'wf-ot-4',
    isAuto: false,
    oncallAssignmentId: null,
  },
];

/**
 * Fakta harian hanya lahir dari recompute atas data punch — tidak pernah dari
 * sebuah persetujuan saja.
 */
export const OT_DAILY: OvertimeDaily[] = [
  {
    id: 'otd-hendra-0727',
    employeeId: 'emp-hendra',
    overtimeDate: '2026-07-27',
    actualHours: 3.5,
    approvedHoursTotal: 4.0,
    payableHours: 3.5,
    overtimeCategory: 'WEEKLY_REST',
    overtimeRequestId: 'ot-2',
  },
];

export function employeeName(id: string): string {
  return EMPLOYEES.find((row) => row.id === id)?.name ?? '—';
}
