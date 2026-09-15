/**
 * Finance › Cash Advance — kontrak FSD/UIC/TSD/ERD-001-FINANCE (FT4 ·
 * CA-A2/A3/A4 · CA-B0/B2/B3/B4 · CA-S1).
 *
 * Tiga lapis data (ERD §6.6–§6.7): uang muka → tahap pertanggungjawaban →
 * baris nota. Selisih dihitung **hanya** di tahap penutup yang diterima, dan
 * setiap keputusan manusia kembali 202 — status finalnya ditulis saat
 * `workflow.process.completed` dikonsumsi (pola K9).
 */

export type Role = 'ROLE_EMPLOYEE' | 'ROLE_DEPT_MANAGER' | 'ROLE_FINANCE_OFFICER' | 'ROLE_HR_MANAGER';

/** Identitas pemanggil — pengganti token pada mock. */
export interface Actor {
  employeeId: string;
  role: Role;
}

/** ERD `cash_advance_status` (6 nilai). */
export type CashAdvanceStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REPUDIATED' | 'SETTLED';

/** ERD `settlement_stage_status`. */
export type SettlementStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';

/** ERD `settlement_item_status` — bawaan `ACCEPTED`, final saat tahap diterima. */
export type SettlementItemStatus = 'ACCEPTED' | 'REJECTED' | 'REVERSED';

export type DifferenceType = 'SURPLUS' | 'SHORTFALL';

/** ERD `cash_advance_difference_status` (enum lokal). */
export type DifferenceStatus = 'OPEN' | 'AWAITING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SETTLED';

export type SettlementMethod = 'RETURNED_OUTSIDE_HRIS' | 'PAYROLL_DEDUCTION';

export type Decision = 'APPROVE' | 'REJECT';

export interface PurposeType {
  id: string;
  name: string;
  isOfficialTravel: boolean;
  requiresReceipt: boolean;
  /** `null` hanya sah bila `isUnlimitedAck=true`; selain itu deny-by-default. */
  maxAmount: number | null;
  isUnlimitedAck: boolean;
  isActive: boolean;
}

export interface BankSnapshot {
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
}

export interface CashAdvance {
  id: string;
  requestNo: string;
  /** Identitas yang menentukan rantai persetujuan, tenggat, dan tanggungan. */
  recipientEmployeeId: string;
  /** Pembuat atas nama (pintu b). `null` = pintu karyawan sendiri. */
  createdOnBehalfEmployeeId: string | null;
  purposeTypeId: string;
  purposeTypeName: string;
  isOfficialTravelSnapshot: boolean;
  maxAmountSnapshot: number | null;
  amount: number;
  travelStartDate: string | null;
  travelEndDate: string | null;
  status: CashAdvanceStatus;
  createdAt: string;
  workflowInstanceId: string;
  bankAccountSnapshot: BankSnapshot;
  costCenterIdSnapshot: string | null;
  travelCancelledAt: string | null;
  travelCancelReason: string | null;
  /** Sudah ditandai cair di FT5 — batas waktu bantahan (FD-86). */
  disbursementMarked: boolean;
}

export interface SettlementItem {
  id: string;
  expenseDate: string;
  amount: number;
  receiptNo: string;
  documentId: string | null;
  itemStatus: SettlementItemStatus;
  /** Penandaan petugas keuangan — bukan keputusan. */
  flaggedReasonId: string | null;
}

export interface SimilarityWarning {
  itemId: string;
  matchedDate: string;
  matchedAmount: number;
  matchedModule: 'CASH_ADVANCE' | 'BENEFIT_CLAIM';
}

export interface Settlement {
  id: string;
  cashAdvanceId: string;
  /** `[request_no]#[stage_no]`, beku sejak dikirim. */
  settlementNo: string;
  stageNo: number;
  isFinalStage: boolean;
  isCorrection: boolean;
  status: SettlementStatus;
  submittedAt: string;
  reviewedBy: string | null;
  decidedBy: string | null;
  items: SettlementItem[];
  similarityWarnings: SimilarityWarning[];
}

/** Tahap + ringkasan induknya — cermin detail 5.10 yang menyematkan konteks uang muka. */
export interface SettlementView extends Settlement {
  requestNo: string;
  recipientEmployeeId: string;
  createdOnBehalfEmployeeId: string | null;
  advanceAmount: number;
  purposeTypeName: string;
}

export interface Difference {
  id: string;
  cashAdvanceId: string;
  closingSettlementId: string;
  requestNo: string;
  employeeId: string;
  differenceType: DifferenceType;
  amount: number;
  /** Hanya `SURPLUS`. */
  settlementMethod: SettlementMethod | null;
  /** Hanya `SHORTFALL` — total keluar melewati batas jenis (FD-93). */
  requiresExtraApproval: boolean;
  /** Hanya `SURPLUS`. */
  dueDate: string | null;
  status: DifferenceStatus;
  /** Pemutus tahap penutup — lapis tambahan wajib orang lain. */
  settlementDecidedBy: string | null;
}

export interface CashAdvanceConfig {
  /** `finance.cash_advance.enabled` — bawaan TSD `false`. */
  enabled: boolean;
  /** `finance.cash_advance.max_outstanding_count` — bawaan TSD `1`. */
  maxOutstandingCount: number;
  /** `finance.cash_advance.second_stage_deadline_days` — tenggat pengembalian sisa. */
  secondStageDeadlineDays: number;
}

export interface RejectionReason {
  id: string;
  name: string;
  requiresFreeText: boolean;
  isActive: boolean;
}

export interface AdvanceDraft {
  recipientEmployeeId: string;
  purposeTypeId: string;
  amount: string;
  travelStartDate: string;
  travelEndDate: string;
}

export interface SettlementItemDraft {
  expenseDate: string;
  amount: string;
  receiptNo: string;
  documentName: string;
}

export interface SettlementDraft {
  isFinalStage: boolean;
  items: SettlementItemDraft[];
}

export interface ReviewInput {
  flags: { itemId: string; reasonId: string }[];
  similarityAcknowledged: boolean;
}

export const ADVANCE_STATUS_LABEL: Record<CashAdvanceStatus, string> = {
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  REPUDIATED: 'Repudiated',
  SETTLED: 'Settled',
};

export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

export const ITEM_STATUS_LABEL: Record<SettlementItemStatus, string> = {
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  REVERSED: 'Reversed',
};

export const DIFFERENCE_TYPE_LABEL: Record<DifferenceType, string> = {
  SURPLUS: 'Surplus',
  SHORTFALL: 'Shortfall',
};

export const DIFFERENCE_STATUS_LABEL: Record<DifferenceStatus, string> = {
  OPEN: 'Open',
  AWAITING_APPROVAL: 'Awaiting approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SETTLED: 'Settled',
};

export const SETTLEMENT_METHOD_LABEL: Record<SettlementMethod, string> = {
  RETURNED_OUTSIDE_HRIS: 'Returned outside HRIS',
  PAYROLL_DEDUCTION: 'Payroll deduction',
};

export const ROLE_LABEL: Record<Role, string> = {
  ROLE_EMPLOYEE: 'Employee',
  ROLE_DEPT_MANAGER: 'Dept Manager',
  ROLE_FINANCE_OFFICER: 'Finance Officer',
  ROLE_HR_MANAGER: 'HR Manager',
};
