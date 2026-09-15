import type {
  CashAdvance,
  CashAdvanceStatus,
  Difference,
  DifferenceType,
  PurposeType,
  Settlement,
  SettlementItem,
  SimilarityWarning,
} from '@/features/cash-advance/types';

/**
 * Aturan murni Cash Advance — dipakai layar maupun service.
 */

/** ERD `idx_emp_cash_advance_open` — status yang dihitung `open_advance_count` (FD-50 k2). */
export const OPEN_STATUSES: CashAdvanceStatus[] = ['SUBMITTED', 'APPROVED', 'REPUDIATED'];

export function openAdvanceCount(rows: CashAdvance[], recipientId: string): number {
  return rows.filter((row) => row.recipientEmployeeId === recipientId && OPEN_STATUSES.includes(row.status)).length;
}

/**
 * Jenis tanpa batas nominal hanya sah bila `is_unlimited_ack=true`; tanpa
 * keduanya tidak bisa dibandingkan, jadi tidak bisa dipilih (deny-by-default).
 */
export function purposeSelectable(purpose: PurposeType): boolean {
  return purpose.isActive && !(purpose.maxAmount === null && !purpose.isUnlimitedAck);
}

/** Pemanggil adalah pihak pengaju — penerima atau pembuat atas nama. */
export function isParty(advance: CashAdvance, employeeId: string): boolean {
  return advance.recipientEmployeeId === employeeId || advance.createdOnBehalfEmployeeId === employeeId;
}

export function itemsTotal(items: Pick<SettlementItem, 'amount'>[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

/** Nota yang tidak ditandai petugas — yang akan dihitung bila tahap diterima. */
export function unflaggedTotal(settlement: Settlement): number {
  return itemsTotal(settlement.items.filter((item) => !item.flaggedReasonId));
}

/** Kunci nota ternormalisasi (`receipt_no_normalized`, ERD §6.7 / P-02). */
export function normalizeReceipt(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Selisih tahap penutup: nota sah lebih kecil ⇒ `SURPLUS` (karyawan
 * kembalikan sisa), lebih besar ⇒ `SHORTFALL` (perusahaan bayar kekurangan).
 */
export function differenceOf(advanceAmount: number, acceptedTotal: number): { type: DifferenceType; amount: number } | null {
  const diff = acceptedTotal - advanceAmount;
  if (diff === 0) return null;
  return diff < 0 ? { type: 'SURPLUS', amount: -diff } : { type: 'SHORTFALL', amount: diff };
}

/** FD-93 — total uang keluar (uang muka + kekurangan) melewati batas jenis. */
export function needsExtraApproval(advance: Pick<CashAdvance, 'amount' | 'maxAmountSnapshot'>, shortfall: number): boolean {
  return advance.maxAmountSnapshot !== null && advance.amount + shortfall > advance.maxAmountSnapshot;
}

/**
 * Peringatan kemiripan (FD-83): tanggal dan nominal sama dengan nota lain,
 * tetapi nomornya berbeda atau kosong. Nomor yang sama persis ditangani
 * sebagai duplikat (409), bukan sebagai peringatan.
 */
export function similarityWarnings(
  candidates: Pick<SettlementItem, 'id' | 'expenseDate' | 'amount' | 'receiptNo'>[],
  existing: Pick<SettlementItem, 'id' | 'expenseDate' | 'amount' | 'receiptNo'>[],
): SimilarityWarning[] {
  const out: SimilarityWarning[] = [];
  candidates.forEach((item, index) => {
    const pool = [...existing, ...candidates.slice(0, index)];
    const match = pool.find(
      (other) =>
        other.id !== item.id &&
        other.expenseDate === item.expenseDate &&
        other.amount === item.amount &&
        normalizeReceipt(other.receiptNo) !== normalizeReceipt(item.receiptNo),
    );
    if (match) {
      out.push({ itemId: item.id, matchedDate: match.expenseDate, matchedAmount: match.amount, matchedModule: 'CASH_ADVANCE' });
    }
  });
  return out;
}

/** Tahap yang masih berjalan menutup jalan tahap baru pada uang muka yang sama. */
export function openSettlementOf(settlements: Settlement[], advanceId: string): Settlement | undefined {
  return settlements.find(
    (row) => row.cashAdvanceId === advanceId && (row.status === 'SUBMITTED' || row.status === 'UNDER_REVIEW'),
  );
}

export function differenceOfAdvance(differences: Difference[], advanceId: string): Difference | undefined {
  return differences.find((row) => row.cashAdvanceId === advanceId);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function thousands(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits).toLocaleString('id-ID') : '';
}

export function parseAmount(value: string): number {
  return Number(value.replace(/\D/g, '')) || 0;
}
