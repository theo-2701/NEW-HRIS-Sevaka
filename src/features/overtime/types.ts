/**
 * Time › Overtime — kontrak FSD-001-TIME §7 · UIC-001-TIME §8.
 *
 * Dua sumber daya dengan sifat berbeda:
 *  • `emp_overtime_request` — pengajuan manusia; `CANCELLED` adalah soft-delete,
 *    bukan hard-delete.
 *  • `emp_overtime_daily`   — fakta harian hasil recompute mesin. NOL tombol
 *    tulis: `payable_hours = MIN(actual, approved_hours_total)`.
 */

/** Peran yang membedakan tiga kewenangan berbeda di layar ini (§8.1). */
export type OvertimeRole = 'EMPLOYEE' | 'HR_STAFF' | 'DEPT_MANAGER' | 'HR_MANAGER';

export interface OvertimeSession {
  employeeId: string;
  role: OvertimeRole;
}

export type SubmissionMode = 'PRE' | 'RETROACTIVE';
export type OvertimeCategory = 'WORKDAY' | 'WEEKLY_REST' | 'PUBLIC_HOLIDAY';
export type OvertimeStatus = 'PENDING_APPROVAL' | 'AUTO_APPROVED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/** Pemicu lapis approval tambahan — menaikkan, tidak pernah menolak. */
export type ExtraApprovalReason = 'DAILY_CAP_EXCEEDED' | 'MAX_CALLOUT_EXCEEDS_DAILY_CAP';

export interface OvertimeRequest {
  id: string;
  employeeId: string;
  overtimeDate: string;
  /** Diturunkan server dari tanggal; kiriman klien diabaikan. */
  submissionMode: SubmissionMode;
  /** Diturunkan server dari kalender; indikasi untuk approver, bukan fakta final. */
  overtimeCategory: OvertimeCategory;
  /** `null` pada baris yang lahir dari deteksi kehadiran on-call. */
  requestedHours: number | null;
  approvedHours: number | null;
  overtimeStatus: OvertimeStatus;
  requiresExtraApprovalReason: ExtraApprovalReason | null;
  requestReason: string | null;
  submittedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  /** Kosong pada baris call-out — ia tidak menjalankan workflow approval. */
  workflowInstanceId: string | null;
  /** Baris otomatis: nol permukaan tulis di mana pun (K40). */
  isAuto: boolean;
  oncallAssignmentId: string | null;
}

export interface OvertimeDaily {
  id: string;
  employeeId: string;
  overtimeDate: string;
  /** Diukur dari data punch — tidak pernah dari pengajuan. */
  actualHours: number;
  /** Pagu: jumlah jam yang disetujui pada tanggal itu. */
  approvedHoursTotal: number;
  payableHours: number;
  overtimeCategory: OvertimeCategory;
  /** Provenance, bukan sumber pagu. */
  overtimeRequestId: string | null;
}

export interface OvertimeDraft {
  overtimeDate: string;
  requestedHours: string;
  requestReason: string;
}

/** Hasil hitung server yang dipratinjau form — klien tidak pernah mengirimnya. */
export interface DerivedFields {
  submissionMode: SubmissionMode | null;
  overtimeCategory: OvertimeCategory | null;
  extraApprovalReason: ExtraApprovalReason | null;
  /** Jam yang sudah disetujui pada tanggal itu. */
  alreadyApproved: number;
}

export const SUBMISSION_MODE_LABEL: Record<SubmissionMode, string> = {
  PRE: 'Filed in advance (PRE)',
  RETROACTIVE: 'Retroactive',
};

export const OVERTIME_CATEGORY_LABEL: Record<OvertimeCategory, string> = {
  WORKDAY: 'Workday',
  WEEKLY_REST: 'Weekly rest',
  PUBLIC_HOLIDAY: 'Public holiday',
};

export const OVERTIME_STATUS_LABEL: Record<OvertimeStatus, string> = {
  PENDING_APPROVAL: 'Pending approval',
  AUTO_APPROVED: 'Auto-approved',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled — withdrawn',
};

export const EXTRA_REASON_LABEL: Record<ExtraApprovalReason, string> = {
  DAILY_CAP_EXCEEDED: 'Daily hour cap exceeded',
  MAX_CALLOUT_EXCEEDS_DAILY_CAP: 'Call-out ceiling exceeds daily cap',
};

/** `overtime-request:create` — EMPLOYEE saja; lembur tak pernah diajukan atas nama orang lain. */
export function canFileOvertime(session: OvertimeSession): boolean {
  return session.role === 'EMPLOYEE';
}

/** `overtime-request:approve` — HR_MANAGER · DEPT_MANAGER. */
export function isOvertimeApprover(session: OvertimeSession): boolean {
  return session.role === 'HR_MANAGER' || session.role === 'DEPT_MANAGER';
}

/** `overtime-request:search` lintas-karyawan untuk setiap peran non-ESS. */
export function canSearchAllOvertime(session: OvertimeSession): boolean {
  return session.role !== 'EMPLOYEE';
}
