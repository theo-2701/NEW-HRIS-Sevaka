/**
 * Finance › Disbursement & Receivables — kontrak FSD §5 · UIC §6 · TSD §6.5/§14.5 ·
 * ERD §6.8 (FT5 · DP-A2/A3/A4 · DP-B2/B3/B4).
 *
 * Potongan mendatar atas tiga modul pengajuan (Benefit, Loan, Cash Advance) —
 * bukan jenis pengajuan keempat. Finance tidak pernah mengeksekusi pembayaran:
 * yang ditulis hanya **penanda** bahwa sesuatu sudah dibayar
 * (`log_disbursement_mark`, append-only) dan status tanggungan karyawan keluar
 * (`emp_outstanding_clearance`).
 */

export type Role =
  | 'ROLE_FINANCE_OFFICER'
  | 'ROLE_HR_MANAGER'
  | 'ROLE_SUPER_ADMIN'
  | 'ROLE_EMPLOYEE'
  | 'ROLE_DEPT_MANAGER';

/** Identitas pemanggil — pengganti token pada mock. */
export interface Actor {
  employeeId: string;
  role: Role;
}

/** ERD `ck_log_disbursement_mark_payable_type` — penentu tabel tujuan `payable_id`. */
export type PayableType = 'BENEFIT_CLAIM' | 'LOAN' | 'CASH_ADVANCE' | 'CASH_ADVANCE_SHORTFALL';
export type PaymentMethod = 'BANK_TRANSFER' | 'CASH' | 'WITH_PAYROLL';
export type MarkSource = 'MANUAL' | 'CLIENT_SYSTEM';
/** Turunan anti-join TSD §3.2 — bukan kolom fisik. */
export type MarkStatus = 'UNMARKED' | 'MARKED';
export type MarkStatusFilter = MarkStatus | 'ALL';
/** ERD `outstanding_clearance_status` — kedua status akhir terminal. */
export type ClearanceStatus = 'OUTSTANDING' | 'CLEARED_BY_REPAYMENT' | 'DECLARED_SETTLED';

/** Whitelist `sort_by` TSD §8.4. */
export type PayableSortBy = 'created_at' | 'marked_at' | 'amount' | 'request_no';
export type ClearanceSortBy = 'created_at' | 'resolved_at' | 'outstanding_amount';
export type SortDirection = 'ASC' | 'DESC';

export interface PayableKey {
  payableType: PayableType;
  payableId: string;
}

/** Baris kandidat dari tabel sumber FT2/FT3/FT4 — dibaca, tidak ditulis (TSD §3.1). */
export interface PayableSource extends PayableKey {
  requestNo: string;
  /** Kolom identitas TSD §3.1 — penerima untuk uang muka & kekurangan, bukan pembuat. */
  employeeId: string;
  amount: number;
  submittedAt: string;
  /** Status sumber layak ditandai: `APPROVED` (kekurangan: `SHORTFALL` + `APPROVED`). */
  eligible: boolean;
}

/** `log_disbursement_mark` (ERD §6.8). */
export interface DisbursementMark extends PayableKey {
  id: string;
  /** Penanda korelasi satu tindakan — bukan foreign key. */
  actionId: string;
  requestNoSnapshot: string;
  amount: number;
  paymentMethod: PaymentMethod;
  markSource: MarkSource;
  /** Waktu perbuatan sebenarnya — ditulis server, tidak dapat diketik klien (FD-101). */
  markedAt: string;
  markedAtTimezone: string;
  /** Keterangan saja — tidak diterima endpoint mana pun, tidak pernah dipakai menghitung. */
  actualPaidAt: string | null;
  /** Wajib bila `MANUAL`. */
  reasonNote: string | null;
  /** Terisi = baris ini membalikkan baris lain (Pola D). */
  reversalOfMarkId: string | null;
  createdBy: string;
}

export interface MarkSummary {
  disbursementMarkId: string;
  markedAt: string;
  markSource: MarkSource;
  paymentMethod: PaymentMethod;
  actionId: string;
}

/** Baris grid `POST /disbursements/search`. */
export interface PayableRow extends PayableKey {
  requestNo: string;
  employeeId: string;
  amount: number;
  submittedAt: string;
  markStatus: MarkStatus;
  mark: MarkSummary | null;
}

export interface MarkHistoryEntry extends DisbursementMark {
  /** Baris pembalik yang menunjuk baris ini — dicari, bukan kolom fisik. */
  reversedBy: string | null;
}

export interface PayableDetail extends PayableRow {
  history: MarkHistoryEntry[];
}

export interface PayableFilter {
  markStatus?: MarkStatusFilter;
  payableTypes?: PayableType[];
  requestNo?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: PayableSortBy;
  sortDirection?: SortDirection;
}

export interface UnresolvedItem extends PayableKey {
  rejectReason: string;
}

/** `POST /disbursements/mark-paid/preview` — gagal gerbang ditampilkan, bukan disembunyikan. */
export interface MarkPreview {
  resolvedItems: PayableRow[];
  unresolvedItems: UnresolvedItem[];
  totalCount: number;
  totalAmount: number;
}

export interface MarkPaidInput {
  items: PayableKey[];
  /** Satu nilai untuk seluruh `items` (TSD §3.3 poin 3). */
  paymentMethod: PaymentMethod | '';
  reasonNote: string;
}

export interface MarkPaidResult {
  actionId: string;
  markedCount: number;
  totalAmount: number;
  marks: (PayableKey & { disbursementMarkId: string })[];
}

/** `emp_outstanding_clearance` (ERD §6.8). */
export interface OutstandingClearance {
  id: string;
  employeeId: string;
  /** Satu angka gabungan pinjaman + uang muka, snapshot saat peristiwa keluar diterima. */
  outstandingAmount: number;
  status: ClearanceStatus;
  settledReasonNote: string | null;
  resolvedAt: string | null;
  resolvedAtTimezone: string | null;
  createdAt: string;
  updatedBy: string | null;
}

export interface ClearanceFilter {
  status?: ClearanceStatus;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: ClearanceSortBy;
  sortDirection?: SortDirection;
}

export const PAYABLE_TYPE_LABEL: Record<PayableType, string> = {
  BENEFIT_CLAIM: 'Benefit claim',
  LOAN: 'Loan',
  CASH_ADVANCE: 'Cash advance',
  CASH_ADVANCE_SHORTFALL: 'Cash advance shortfall',
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

export const MARK_STATUS_LABEL: Record<MarkStatusFilter, string> = {
  UNMARKED: 'Unmarked',
  MARKED: 'Marked',
  ALL: 'All',
};

export const CLEARANCE_STATUS_LABEL: Record<ClearanceStatus, string> = {
  OUTSTANDING: 'Outstanding',
  CLEARED_BY_REPAYMENT: 'Cleared by repayment',
  DECLARED_SETTLED: 'Declared settled',
};
