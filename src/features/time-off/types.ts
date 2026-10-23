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

/**
 * `reject_reason` — enum 16 nilai (TSD-001-TIME 0.70 §4.5, D1): 15 pilihan approver
 * (UIC-001-TIME §3.1.6/§3.1.7) + `SUBJECT_DATA_ERASED` yang hanya ditulis sapuan penghapusan
 * data subjek — tampil di detail, tidak pernah ditawarkan sebagai pilihan.
 */
export type RejectReasonCode =
  | 'INCOMPLETE_PROOF'
  | 'LATE_SUBMISSION'
  | 'POLICY_MISMATCH'
  | 'DATA_MISMATCH'
  | 'DUPLICATE_CLAIM'
  | 'EXCEEDS_QUOTA'
  | 'UNAUTHORIZED_CLINIC'
  | 'INCONSISTENT_HISTORY'
  | 'WRONG_LEAVE_TYPE'
  | 'RETROACTIVE_LIMIT'
  | 'MISSING_APPROVAL_STEP'
  | 'SUSPECTED_FRAUD'
  | 'ALREADY_ON_UNPAID'
  | 'EMPLOYMENT_STATUS_INELIGIBLE'
  | 'SYSTEM_ERROR_RESUBMIT'
  | 'SUBJECT_DATA_ERASED';

export const REJECT_REASON_LABEL: Record<RejectReasonCode, string> = {
  INCOMPLETE_PROOF: 'Incomplete supporting evidence',
  LATE_SUBMISSION: 'Late submission',
  POLICY_MISMATCH: 'Does not match policy',
  DATA_MISMATCH: 'Data mismatch',
  DUPLICATE_CLAIM: 'Duplicate request',
  EXCEEDS_QUOTA: 'Exceeds quota',
  UNAUTHORIZED_CLINIC: 'Issuing clinic not recognised',
  INCONSISTENT_HISTORY: 'Inconsistent history',
  WRONG_LEAVE_TYPE: 'Wrong leave type',
  RETROACTIVE_LIMIT: 'Beyond the retroactive limit',
  MISSING_APPROVAL_STEP: 'Approval step incomplete',
  SUSPECTED_FRAUD: 'Dugaan kecurangan',
  ALREADY_ON_UNPAID: 'Already on unpaid leave',
  EMPLOYMENT_STATUS_INELIGIBLE: 'Employment status not eligible',
  SYSTEM_ERROR_RESUBMIT: 'System error — resubmit',
  SUBJECT_DATA_ERASED: 'Original reason erased (data subject erasure)',
};

/** Pilihan alasan di form penolakan — 15 nilai; `SUBJECT_DATA_ERASED` bukan pilihan approver. */
export const REJECT_REASON_OPTIONS: RejectReasonCode[] = (Object.keys(REJECT_REASON_LABEL) as RejectReasonCode[]).filter(
  (code) => code !== 'SUBJECT_DATA_ERASED',
);

/** Badan penolakan: enum wajib + catatan opsional (≤500). */
export interface RejectInput {
  reason: RejectReasonCode | '';
  note: string;
}

export const REJECT_NOTE_MAX = 500;

/** Keputusan approver: `note` hanya untuk menyetujui, `reject` hanya untuk menolak. */
export interface DecisionInput {
  note?: string;
  reject?: RejectInput;
}

/** UIC §3.1.8 — `DSR` lama diganti `DATA_SUBJECT_REQUEST`. */
export type AccessPurpose = 'VERIFICATION' | 'AUDIT' | 'DISPUTE' | 'DATA_SUBJECT_REQUEST';

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
  rejectReason: RejectReasonCode | null;
  rejectNote: string | null;
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
  DISPUTE: 'Dispute',
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
  FORFEIT: 'Forfeit — the remainder expires at year end',
  CARRY_CAPPED: 'Carry capped — some days carry over',
  CARRY_FULL: 'Carry full — all remaining days carry over',
};

export const BLACKOUT_MODE_LABEL: Record<'HARD' | 'SOFT', string> = {
  HARD: 'Machine-rejected — refused at the submit gate, the row is never created',
  SOFT: 'Extra approval — the request passes but must go through an extra layer',
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
