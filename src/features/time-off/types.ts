/**
 * Time Off Request — pengajuan cuti (FSD-001-TIME §2 · UIC-001-TIME §3).
 *
 * Aturan kontrak yang mengikat:
 *  • Cuti selalu diajukan **untuk diri sendiri**; `employee_id` diambil dari
 *    token, tidak pernah dari form.
 *  • Cuti biasa menunggu keputusan; **cuti sakit berlaku seketika**
 *    (`AUTO_APPROVED`) dan hanya bisa ditolak di dalam jendela tolak yang
 *    dibekukan saat pengajuan.
 *  • Ada **empat gerbang submit** sebelum baris pernah dibuat (lihat `gates.ts`).
 *  • Penarikan adalah transisi status → `CANCELLED`, bukan soft-delete.
 *  • SoD: pemohon tidak pernah memutuskan pengajuannya sendiri.
 */
export type RequestStatus =
  | 'PENDING_APPROVAL'
  | 'AUTO_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type DaySession = 'FULL' | 'HALF_AM' | 'HALF_PM';

/** Pemicu lapis persetujuan tambahan — mengangkat pengajuan, bukan memblokir. */
export type ExtraApprovalReason = 'NEGATIVE_BALANCE' | 'SOFT_BLACKOUT' | 'UNPAID_TYPE' | 'LONG_DURATION';

export type DelegationStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/** UIC §3.1.8 — `DSR` lama diganti `DATA_SUBJECT_REQUEST`. */
export type AccessPurpose = 'VERIFICATION' | 'AUDIT' | 'DATA_SUBJECT_REQUEST';

export type Role = 'ROLE_EMPLOYEE' | 'ROLE_DEPT_MANAGER' | 'ROLE_HR_MANAGER';

export interface Employee {
  id: string;
  name: string;
  unit: string;
  branch: string;
  role: string;
}

export interface LeaveType {
  /** Bisa menaikkan lapis persetujuan tambahan (`requires_extra_approval`). */
  allowsExtraApproval?: boolean;
  id: string;
  code: string;
  name: string;
  isStatutory: boolean;
  isPaid: boolean;
  affectsBalance: boolean;
  requiresDocument: boolean;
  requiresApproval: boolean;
  minAdvanceDays: number;
  isActive: boolean;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'NATIONAL' | 'COMPANY' | 'REGIONAL';
  scopeRef: string | null;
  approvalStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
}

export interface Blackout {
  id: string;
  name: string;
  reason: string;
  startDate: string;
  endDate: string;
  /** HARD → 422 (baris tak pernah dibuat); SOFT → lapis persetujuan tambahan. */
  mode: 'HARD' | 'SOFT';
}

export interface LeaveBalance {
  employeeId: string;
  leaveTypeId: string;
  periodYear: number;
  balanceDays: number;
  projectedDays: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  daySession: DaySession;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  hasDoctorNote: boolean;
  /** Surat dokter yang sudah dimusnahkan → membukanya dijawab 410. */
  doctorNotePurged?: boolean;
  status: RequestStatus;
  extraApprovalReason: ExtraApprovalReason | null;
  /** Dibekukan saat submit untuk cuti sakit. */
  rejectDeadlineAt: string | null;
  rejectReason: string | null;
  submittedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface Delegation {
  id: string;
  leaveRequestId: string;
  delegatorId: string;
  substituteId: string;
  /** Kontrak hanya mengenal satu cakupan; jangan mengarang enum lain (§3.2.1). */
  scope: 'ALL_APPROVALS';
  status: DelegationStatus;
  createdAt: string;
}

export interface MedicalAccessLog {
  id: string;
  leaveRequestId: string;
  accessedBy: string;
  purpose: AccessPurpose;
  createdAt: string;
}

export interface Session {
  employeeId: string;
  roles: Role[];
}

export interface RequestDraft {
  leaveTypeId: string;
  daySession: DaySession;
  startDate: string;
  endDate: string;
  reason: string;
  hasDoctorNote: boolean;
}

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING_APPROVAL: 'Pending approval',
  AUTO_APPROVED: 'Auto-approved',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled — withdrawn',
};

export const DELEGATION_STATUS_LABEL: Record<DelegationStatus, string> = {
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export const SESSION_LABEL: Record<DaySession, string> = {
  FULL: 'Full day',
  HALF_AM: 'Half day — morning',
  HALF_PM: 'Half day — afternoon',
};

export const EXTRA_REASON_LABEL: Record<ExtraApprovalReason, string> = {
  NEGATIVE_BALANCE: 'Negative balance',
  SOFT_BLACKOUT: 'Soft blackout',
  UNPAID_TYPE: 'Unpaid leave type',
  LONG_DURATION: 'Long duration',
};

export const ACCESS_PURPOSE_LABEL: Record<AccessPurpose, string> = {
  VERIFICATION: 'Verification',
  AUDIT: 'Audit',
  DATA_SUBJECT_REQUEST: 'Data subject request',
};

/** Status yang masih "hidup" — dipakai gerbang tumpang tindih dan delegasi. */
export const LIVE_STATUS: RequestStatus[] = ['PENDING_APPROVAL', 'APPROVED', 'AUTO_APPROVED'];

export function isApprover(session: Session): boolean {
  return session.roles.includes('ROLE_HR_MANAGER') || session.roles.includes('ROLE_DEPT_MANAGER');
}

/** Membuka surat dokter butuh HR Manager (calon ROLE_HEALTH_DATA_OFFICER). */
export function canOpenMedical(session: Session): boolean {
  return session.roles.includes('ROLE_HR_MANAGER');
}

/**
 * Waktu "sekarang" untuk demo — dipatok ke dataset skenario positif kontrak
 * supaya jendela tolak `leave-2` benar-benar terbuka saat layar dibuka.
 */
export const DEMO_NOW = new Date('2026-07-24T09:00:00+07:00');

/**
 * Ledger saldo cuti (FSD-001-TIME §3 · UIC-001-TIME §4).
 *
 * Saldo **tidak pernah** disimpan sebagai angka yang diketik seseorang — ia
 * jumlah seluruh mutasi di ledger. Satu-satunya jalur bertangan manusia adalah
 * HR adjustment, dan itu pun **create-only**: menulis baris baru, tidak pernah
 * mengubah baris lama.
 */
export type MutationSource =
  | 'ACCRUAL_MONTHLY'
  | 'LEAVE_TAKEN'
  | 'LEAVE_REVERSED'
  | 'JOINT_LEAVE'
  | 'YEAR_END_CARRY_OVER'
  | 'YEAR_END_FORFEIT'
  | 'CARRY_OVER_EXPIRY'
  | 'HR_ADJUSTMENT';

export const MUTATION_SOURCE_LABEL: Record<MutationSource, string> = {
  ACCRUAL_MONTHLY: 'Monthly accrual',
  LEAVE_TAKEN: 'Leave taken',
  LEAVE_REVERSED: 'Leave reversed',
  JOINT_LEAVE: 'Joint leave',
  YEAR_END_CARRY_OVER: 'Year-end carry-over',
  YEAR_END_FORFEIT: 'Year-end forfeit',
  CARRY_OVER_EXPIRY: 'Carry-over expiry',
  HR_ADJUSTMENT: 'HR adjustment',
};

export interface LedgerEntry {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  periodYear: number;
  /** Tanggal kalender yang dimutasi — bukan tanggal baris ini ditulis. */
  mutationDate: string;
  /** Bertanda: positif menambah hak, negatif menguranginya. Nol ditolak. */
  deltaDays: number;
  source: MutationSource;
  /** Referensi peristiwa; selalu kosong untuk HR adjustment. */
  refId: string | null;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export interface AdjustmentDraft {
  employeeId: string;
  leaveTypeId: string;
  periodYear: number;
  mutationDate: string;
  deltaDays: number;
  reason: string;
}

export interface BalanceFilter {
  employeeId?: string;
  leaveTypeId?: string;
  periodYear?: number;
}

export interface LedgerFilter extends BalanceFilter {
  source?: MutationSource;
}

/**
 * Time Off Settings (FSD-001-TIME §4 · UIC-001-TIME §5) — tiga aturan yang
 * dipakai menakar setiap pengajuan cuti: katalog jenis cuti, kebijakan akrual,
 * dan periode blackout.
 *
 * Jenis cuti **statutory** disemai sistem: kode dan status statutory-nya tidak
 * bisa diubah, barisnya tidak bisa dihapus — pensiunkan lewat flag Active.
 */
export type CarryOverPolicy = 'FORFEIT' | 'CARRY_CAPPED' | 'CARRY_FULL';

export const CARRY_OVER_LABEL: Record<CarryOverPolicy, string> = {
  FORFEIT: 'Forfeit — sisanya hangus di akhir tahun',
  CARRY_CAPPED: 'Carry capped — sebagian hari digulirkan',
  CARRY_FULL: 'Carry full — seluruh sisa digulirkan',
};

export const BLACKOUT_MODE_LABEL: Record<'HARD' | 'SOFT', string> = {
  HARD: 'Machine-rejected — ditolak di gerbang submit, baris tidak pernah dibuat',
  SOFT: 'Extra approval — pengajuan lewat, tapi harus melewati lapis tambahan',
};

export interface AccrualPolicy {
  id: string;
  leaveTypeId: string;
  /** Katalognya milik personnel service; tenant ini baru memakai satu nilai. */
  employmentType: string;
  isEligible: boolean;
  /** Wajib saat entitled, wajib kosong saat tidak. */
  ratePerMonth: number | null;
  maxBalanceDays: number | null;
  carryOverPolicy: CarryOverPolicy;
  carryOverMaxDays: number | null;
  /** Format `MM-DD` — hanya untuk CARRY_CAPPED. */
  carryOverExpiry: string | null;
  effectiveFrom: string;
  /** Mengisi ini satu-satunya cara sah menghentikan kebijakan berjalan. */
  effectiveUntil: string | null;
}

export interface LeaveTypeDraft {
  code: string;
  name: string;
  isPaid: boolean;
  affectsBalance: boolean;
  requiresDocument: boolean;
  requiresApproval: boolean;
  allowsExtraApproval: boolean;
  isActive: boolean;
  minAdvanceDays: number;
}

export interface AccrualPolicyDraft {
  leaveTypeId: string;
  employmentType: string;
  isEligible: boolean;
  ratePerMonth: number | null;
  maxBalanceDays: number | null;
  carryOverPolicy: CarryOverPolicy;
  carryOverMaxDays: number | null;
  carryOverExpiry: string | null;
  effectiveFrom: string;
}

export interface BlackoutDraft {
  name: string;
  reason: string;
  startDate: string;
  endDate: string;
  mode: 'HARD' | 'SOFT';
  scopeRef: string | null;
}

export interface OrgUnit {
  id: string;
  name: string;
}
