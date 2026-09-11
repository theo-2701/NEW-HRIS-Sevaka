import { LOAN_STATUS_LABEL } from '@/features/loan/types';
import type {
  DisputeHold,
  Installment,
  Loan,
  LoanConfig,
  LoanExposure,
  LoanStatus,
  ReservationState,
} from '@/features/loan/types';

/**
 * Aturan murni Loan — dipakai layar maupun service, tanpa efek samping.
 */

/** Masih menunggu hasil: pokoknya ditahan terhadap plafon. */
export const HELD_STATUSES: LoanStatus[] = ['SUBMITTED', 'AWAITING_CALCULATION', 'AWAITING_ACKNOWLEDGEMENT'];

/** Sudah jadi pinjaman: pokoknya terpakai. */
export const CONSUMED_STATUSES: LoanStatus[] = ['APPROVED', 'DISBURSED', 'SETTLED'];

/**
 * Sisanya — ditolak, dibatalkan, ditarik, ditolak karyawan, lunas — melepas
 * pokok yang tadinya ditahan.
 */
export function reservationStateOf(status: LoanStatus): ReservationState {
  if (HELD_STATUSES.includes(status)) return 'HELD';
  if (CONSUMED_STATUSES.includes(status)) return 'CONSUMED';
  return 'RELEASED';
}

/** Ruang pinjam = limit grade − berjalan − yang sedang ditahan. */
export function roomOf(exposure: LoanExposure): number {
  return exposure.limitAmount - exposure.outstandingAmount - exposure.reservedAmount;
}

/**
 * Pilihan tenor mengikuti setting company. Pada pola `MULTIPLE_OF_THREE`
 * hanya kelipatan tiga sampai `tenorMax` yang boleh dikirim klien.
 */
export function tenorOptions(config: LoanConfig): number[] {
  const step = config.tenorChoicePattern === 'MULTIPLE_OF_THREE' ? 3 : 1;
  const out: number[] = [];
  for (let tenor = step; tenor <= config.tenorMax; tenor += step) out.push(tenor);
  return out;
}

/** Pinjaman yang dihitung terhadap batas dua pinjaman aktif. */
export function activeLoans(loans: Loan[], employeeId: string): Loan[] {
  return loans.filter(
    (row) => row.employeeId === employeeId && reservationStateOf(row.status) !== 'RELEASED',
  );
}

/**
 * Antrean keputusan atasan: hanya permintaan yang menunggu keputusan, dan
 * tidak pernah barisnya sendiri — pemisahan tugas yang di service ditegakkan
 * sebagai 403.
 */
export function approvalQueue(loans: Loan[], approverId: string): Loan[] {
  return loans.filter((row) => row.status === 'SUBMITTED' && row.employeeId !== approverId);
}

export function activeHoldOn(holds: DisputeHold[], loanId: string) {
  return holds.find((row) => row.targetType === 'LOAN' && row.targetId === loanId && row.isActive);
}

/** Total kewajiban jadwal yang ditawarkan pihak pemberi dana. */
export function offerTotal(loan: Loan): number | null {
  const offer = loan.acknowledgementOffer;
  return offer ? offer.acknowledgedPrincipal + offer.acknowledgedInterest : null;
}

/**
 * Jadwal angsuran yang terbit saat jadwal diakui: kewajiban dibagi rata ke
 * setiap periode payroll, mulai bulan berikutnya.
 */
export function buildInstallments(totalObligation: number, tenorMonths: number, startMonth = 8): Installment[] {
  const dueAmount = totalObligation / tenorMonths;
  return Array.from({ length: tenorMonths }, (_, index) => {
    const sequenceNo = index + 1;
    const month = startMonth + sequenceNo;
    const year = 2026 + (month > 12 ? 1 : 0);
    const mm = month > 12 ? month - 12 : month;
    return {
      sequenceNo,
      payrollPeriodRef: `${year}-${String(mm).padStart(2, '0')}-25`,
      dueAmount,
      status: 'PENDING' as const,
    };
  });
}

/** Teks angka berpemisah ribuan untuk kolom nominal yang diketik. */
export function thousands(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('id-ID') : '';
}

export function parseAmount(value: string): number {
  return Number(value.replace(/\D/g, '')) || 0;
}

export function statusLabel(status: LoanStatus): string {
  return LOAN_STATUS_LABEL[status] ?? status;
}
