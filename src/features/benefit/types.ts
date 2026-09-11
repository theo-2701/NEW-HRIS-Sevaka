/**
 * Finance › Benefit Reimbursement — kontrak FSD/UIC-001-FINANCE (FT1 · FT2).
 *
 * Klaim menahan saldo lebih dulu (`HELD`), lalu memakainya saat disetujui
 * (`CONSUMED`) atau melepasnya saat ditolak/dibatalkan (`RELEASED`). Keputusan
 * approver dikirim ke proses approval dan kembali **202 Accepted** — statusnya
 * ditulis belakangan, bukan seketika di layar.
 */

export type ClaimStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'AWAITING_RESUBMIT';
export type ReservationState = 'HELD' | 'CONSUMED' | 'RELEASED';
export type PeriodStatus = 'OPEN' | 'GRACE' | 'CLOSED';
export type LedgerEntryType = 'RESERVATION' | 'USAGE' | 'RELEASE' | 'ADJUSTMENT';
export type BeneficiaryKind = 'SELF' | 'FAMILY_MEMBER';
export type RelationshipType = 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER';
export type MarkSource = 'MANUAL' | 'CLIENT_SYSTEM';
export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'WITH_PAYROLL';

export interface BenefitType {
  id: string;
  name: string;
  requiresReceipt: boolean;
  allowsFamilyClaim: boolean;
  /** Lampirannya data kesehatan: hanya peran tertentu yang boleh membukanya. */
  containsHealthData: boolean;
  isActive: boolean;
}

export interface Entitlement {
  id: string;
  benefitTypeId: string;
  jobGradeId: string;
  annualAmount: number;
}

export interface FamilyRelationshipRule {
  id: string;
  relationshipType: RelationshipType;
  isEligible: boolean;
}

export interface BenefitBalance {
  benefitTypeId: string;
  benefitTypeName: string;
  entitledAmount: number;
  usedAmount: number;
  reservedAmount: number;
}

export interface BenefitPeriod {
  periodId: string;
  label: string;
  periodStart: string;
  periodEnd: string;
  graceEnd: string;
  status: PeriodStatus;
  balances: BenefitBalance[];
}

export interface Beneficiary {
  id: string;
  relativeId: string;
  name: string;
  relationshipType: RelationshipType;
  isActive: boolean;
  /** Sudah pernah dipakai klaim di periode ini. */
  slotConsumed: boolean;
}

export interface Relative {
  id: string;
  name: string;
  relationshipType: RelationshipType;
}

export interface BankSnapshot {
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
}

export interface ClaimItem {
  id: string;
  expenseDate: string;
  amount: number;
  beneficiaryKind: BeneficiaryKind;
  beneficiaryId: string | null;
  beneficiaryRelationshipSnapshot: RelationshipType | null;
  receiptNo: string;
  documentId: string | null;
}

/** Kemiripan dengan entri modul lain — hanya approver yang melihatnya. */
export interface SimilarityWarning {
  itemId: string;
  matchedModule: string;
  matchedDate: string;
  matchedAmount: number;
}

export interface BenefitClaim {
  id: string;
  requestNo: string;
  employeeId: string;
  benefitTypeId: string;
  benefitTypeName: string;
  periodId: string;
  totalAmount: number;
  status: ClaimStatus;
  reservationState: ReservationState;
  /** Dibekukan saat submit — bukan dibaca ulang dari katalog saat menampilkan. */
  containsHealthDataSnapshot: boolean;
  submittedAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  reasonId?: string | null;
  reasonNote?: string | null;
  bankAccountSnapshot: BankSnapshot;
  costCenterIdSnapshot: string | null;
  items: ClaimItem[];
  similarityWarnings: SimilarityWarning[];
}

export interface LedgerEntry {
  id: string;
  createdAt: string;
  entryType: LedgerEntryType;
  amount: number;
  benefitTypeName: string;
  sourceClaimId: string;
  requestNo: string;
}

export interface DisbursementMark {
  disbursementMarkId: string;
  markedAt: string;
  markSource: MarkSource;
  paymentMethod: PaymentMethod;
  actionId: string;
  reasonNote: string | null;
}

export interface Payable {
  payableType: 'BENEFIT_CLAIM' | 'LOAN' | 'CASH_ADVANCE';
  payableId: string;
  requestNo: string;
  employeeId: string;
  amount: number;
  submittedAt: string;
  markStatus: 'MARKED' | 'UNMARKED';
  mark: DisbursementMark | null;
}

/** Penahanan sengketa — memblokir persetujuan selama masih aktif. */
export interface DisputeHold {
  id: string;
  targetType: 'BENEFIT_CLAIM' | 'LOAN' | 'CASH_ADVANCE';
  targetId: string;
  targetRequestNo: string;
  isActive: boolean;
}

export interface RejectionReason {
  id: string;
  name: string;
  requiresFreeText: boolean;
  isSystemDefault: boolean;
  isActive: boolean;
}

/** Satu baris nota di form pengajuan. */
export interface ClaimItemDraft {
  expenseDate: string;
  amount: string;
  beneficiaryKind: BeneficiaryKind;
  beneficiaryId: string;
  receiptNo: string;
  documentName: string;
}

export interface ClaimDraft {
  benefitTypeId: string;
  items: ClaimItemDraft[];
}

export interface BenefitTypeDraft {
  name: string;
  requiresReceipt: boolean;
  allowsFamilyClaim: boolean;
  containsHealthData: boolean;
  isActive: boolean;
  /** Wajib saat flag data kesehatan berubah. */
  changeReason: string;
}

export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  AWAITING_RESUBMIT: 'Awaiting resubmit',
};

export const RESERVATION_LABEL: Record<ReservationState, string> = {
  HELD: 'Held',
  CONSUMED: 'Consumed',
  RELEASED: 'Released',
};

export const LEDGER_TYPE_LABEL: Record<LedgerEntryType, string> = {
  RESERVATION: 'Reservation',
  USAGE: 'Usage',
  RELEASE: 'Release',
  ADJUSTMENT: 'Adjustment',
};

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  OPEN: 'Open',
  GRACE: 'Grace',
  CLOSED: 'Closed',
};

export const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  SPOUSE: 'Spouse',
  CHILD: 'Child',
  PARENT: 'Parent',
  SIBLING: 'Sibling',
  OTHER: 'Other',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'Bank transfer',
  CASH: 'Cash',
  WITH_PAYROLL: 'With payroll',
};

export const MARK_SOURCE_LABEL: Record<MarkSource, string> = {
  MANUAL: 'Manual',
  CLIENT_SYSTEM: 'Client system',
};
