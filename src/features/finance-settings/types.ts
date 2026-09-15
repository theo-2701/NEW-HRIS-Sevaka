/**
 * Finance › Finance Settings — kontrak FSD §1 · UIC §2 · TSD §6.1/§14.1 · ERD §6.4/§6.6/§6.9
 * (FT1 · SF-A2/A3/A4 · SF-B2/B3/B4 · SF-S1 · SF-S2).
 *
 * Data induk lintas Benefit, Loan, dan Cash Advance. Satu page, tiga tab: Loan Limit
 * (CRUD penuh di layar), Advance Purpose Type dan Rejection Reasons (layar baca —
 * kontrak CRUD-nya tetap penuh di service).
 */
import type { PurposeType } from '@/features/cash-advance/types';

export type { PurposeType };

export type Role =
  | 'ROLE_FINANCE_OFFICER'
  | 'ROLE_SUPER_ADMIN'
  | 'ROLE_HR_MANAGER'
  | 'ROLE_EMPLOYEE'
  | 'ROLE_DEPT_MANAGER';

export interface Actor {
  employeeId: string;
  role: Role;
}

/** `mst_loan_limit` — plafon per golongan, tanpa riwayat (GAP-7). */
export interface LoanLimit {
  id: string;
  /** Anchor `company.mst_job_grade.id`, nol FK. Identitas baris — tidak diubah saat edit. */
  jobGradeId: string;
  limitAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

/** `mst_advance_purpose_type` (+ soft-delete). */
export interface PurposeTypeRow extends PurposeType {
  deletedAt: string | null;
}

/** `log_advance_purpose_type_history`. */
export interface PurposeTypeHistory {
  id: string;
  purposeTypeId: string;
  changedField: string;
  valueBefore: string | null;
  valueAfter: string | null;
  reasonNote: string | null;
  activity: 'I' | 'U' | 'D';
  createdAt: string;
  createdBy: string;
}

/** `mst_rejection_reason`. */
export interface RejectionReason {
  id: string;
  name: string;
  requiresFreeText: boolean;
  /** Server-derived, immutable — tepat satu baris "Other" per company. */
  isSystemDefault: boolean;
  isActive: boolean;
  deletedAt: string | null;
}

export interface LoanLimitDraft {
  jobGradeId: string;
  /** Diketik berpemisah ribuan. */
  limitAmount: string;
}

export interface LoanLimitPatch {
  limitAmount: string;
  isActive: boolean;
}

export interface LoanLimitFilter {
  jobGradeId?: string;
  isActive?: boolean;
}

export interface PurposeTypeInput {
  name: string;
  isOfficialTravel: boolean;
  requiresReceipt: boolean;
  maxAmount: number | null;
  isUnlimitedAck: boolean;
}

export interface PurposeTypePatch extends Partial<PurposeTypeInput> {
  isActive?: boolean;
  /** Wajib hanya bila `isOfficialTravel` berubah (F1.38). */
  reason?: string;
}

export interface RejectionReasonInput {
  name: string;
  requiresFreeText: boolean;
}

export interface RejectionReasonPatch {
  name?: string;
  requiresFreeText?: boolean;
  isActive?: boolean;
  /** Diabaikan server — immutable pasca-insert. */
  isSystemDefault?: boolean;
}
