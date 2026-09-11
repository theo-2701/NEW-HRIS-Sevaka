/**
 * Finance › Loan — kontrak FSD/UIC-001-FINANCE (FT3 · LN-A2/A3/A4 · LN-B2/B3/B4
 * · LN-C2/C3 · LN-S1).
 *
 * Empat layar untuk empat peran: karyawan mengirim pokok + tenor, atasan
 * langsung meneruskan keputusan, karyawan mengakui jadwal yang dikirim pihak
 * pemberi dana, dan back office memantau seluruh permintaan — termasuk yang
 * tertahan menunggu pihak luar itu.
 *
 * Dua hal yang tidak pernah dihitung HRIS pada company berbunga: **bunga** dan
 * **jadwal angsuran**. Keduanya datang dari pihak pemberi dana dan baru masuk
 * ke baris pinjaman setelah karyawan mengakuinya (ACK).
 */

export type LoanStatus =
  | 'SUBMITTED'
  | 'AWAITING_CALCULATION'
  | 'AWAITING_ACKNOWLEDGEMENT'
  | 'APPROVED'
  /* Dua status lanjutan milik FT5 (pencairan). Tidak digambar di tabel
     referensi status, tapi tetap memakai plafon seperti `APPROVED`. */
  | 'DISBURSED'
  | 'SETTLED'
  | 'REJECTED'
  | 'REJECTED_BY_EXTERNAL'
  | 'CANCELLED'
  | 'WITHDRAWN'
  | 'DECLINED_BY_EMPLOYEE'
  | 'CLOSED';

/** Pokok yang ditahan terhadap plafon: ditahan → terpakai → dilepas. */
export type ReservationState = 'HELD' | 'CONSUMED' | 'RELEASED';

export type InstallmentStatus = 'PENDING' | 'CONFIRMED';

/** Satu endpoint, dua hasil (`F3.07` `POST .../schedule-acknowledgements`). */
export type AcknowledgementOutcome = 'ACK' | 'DECLINE';

export type TenorMode = 'EMPLOYEE_CHOICE' | 'FIXED_BY_COMPANY';
export type TenorChoicePattern = 'MULTIPLE_OF_THREE' | 'ANY';
export type ScheduleSource = 'RECEIVED_FROM_EXTERNAL' | 'CALCULATED_BY_HRIS';

export interface BankSnapshot {
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
}

/** Jadwal yang diterima dari pihak pemberi dana — belum menjadi pinjaman. */
export interface AcknowledgementOffer {
  acknowledgedPrincipal: number;
  acknowledgedInterest: number;
  acknowledgedTenor: number;
}

export interface Loan {
  id: string;
  requestNo: string;
  employeeId: string;
  principalAmount: number;
  tenorMonths: number;
  /** Skema company dibekukan saat pengajuan, bukan dibaca ulang nanti. */
  interestBearingSnapshot: boolean;
  scheduleSource: ScheduleSource | null;
  /** Null selama jadwalnya belum masuk — HRIS tidak pernah menghitungnya. */
  interestAmount: number | null;
  totalObligation: number | null;
  status: LoanStatus;
  submittedAt: string;
  workflowInstanceId: string;
  acknowledgementOffer?: AcknowledgementOffer;
  bankAccountSnapshot: BankSnapshot;
  costCenterIdSnapshot: string | null;
}

export interface Installment {
  sequenceNo: number;
  payrollPeriodRef: string;
  dueAmount: number;
  status: InstallmentStatus;
}

/** Plafon karyawan: limit grade dikurangi yang terpakai dan yang ditahan. */
export interface LoanExposure {
  employeeId: string;
  jobGradeId: string;
  limitAmount: number;
  outstandingAmount: number;
  reservedAmount: number;
}

export interface LoanConfig {
  interestBearing: boolean;
  tenorMode: TenorMode;
  tenorChoicePattern: TenorChoicePattern;
  tenorMax: number;
  /** Modul dimatikan per company — setiap tulisan ditolak 403. */
  enabled: boolean;
  earlySettlement: boolean;
}

/** Baris tabel referensi status (legend LN-S1). */
export interface LoanStateRef {
  status: LoanStatus;
  meaning: string;
  appearsIn: string;
}

export interface DisputeHold {
  id: string;
  targetType: 'LOAN' | 'BENEFIT_CLAIM' | 'CASH_ADVANCE';
  targetId: string;
  targetRequestNo: string;
  isActive: boolean;
}

export interface RejectionReason {
  id: string;
  name: string;
  requiresFreeText: boolean;
  isActive: boolean;
}

export interface LoanDraft {
  /** Diketik sebagai teks berpemisah ribuan, dikonversi saat submit. */
  amount: string;
  tenorMonths: number | null;
}

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  SUBMITTED: 'Submitted',
  AWAITING_CALCULATION: 'Awaiting calculation',
  AWAITING_ACKNOWLEDGEMENT: 'Awaiting acknowledgement',
  APPROVED: 'Approved',
  DISBURSED: 'Disbursed',
  SETTLED: 'Settled',
  REJECTED: 'Rejected',
  REJECTED_BY_EXTERNAL: 'Rejected by external',
  CANCELLED: 'Cancelled',
  WITHDRAWN: 'Withdrawn',
  DECLINED_BY_EMPLOYEE: 'Declined by employee',
  CLOSED: 'Closed',
};

export const RESERVATION_LABEL: Record<ReservationState, string> = {
  HELD: 'Held',
  CONSUMED: 'Consumed',
  RELEASED: 'Released',
};

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
};

export const SCHEDULE_SOURCE_LABEL: Record<ScheduleSource, string> = {
  RECEIVED_FROM_EXTERNAL: 'Received from external',
  CALCULATED_BY_HRIS: 'Calculated by HRIS',
};
