import { PERIODS } from '@/features/benefit/mock-data';
import type {
  BenefitBalance,
  BenefitType,
  ClaimDraft,
  DisputeHold,
  LedgerEntry,
} from '@/features/benefit/types';

/** Aturan murni Benefit Reimbursement — tidak menyentuh jaringan. */

/** Sisa hak = hak tahunan − yang sudah terpakai − yang sedang ditahan. */
export function remainingOf(balance: BenefitBalance): number {
  return balance.entitledAmount - balance.usedAmount - balance.reservedAmount;
}

export function balanceOf(periodId: string, benefitTypeId: string): BenefitBalance | undefined {
  return PERIODS.find((row) => row.periodId === periodId)?.balances.find(
    (row) => row.benefitTypeId === benefitTypeId,
  );
}

/**
 * Saldo berjalan ledger dihitung di sisi baca: reservasi mengurangi, pelepasan
 * mengembalikan, pemakaian tidak menggeser apa pun karena saldonya sudah
 * ditahan sejak reservasi.
 */
export function ledgerDelta(entry: LedgerEntry): number {
  if (entry.entryType === 'RESERVATION') return -entry.amount;
  if (entry.entryType === 'RELEASE') return entry.amount;
  return 0;
}

export interface LedgerRow {
  entry: LedgerEntry;
  delta: number;
  /** Sisa hak jenis manfaat itu setelah entri ini. */
  runningBalance: number;
}

export function withRunningBalance(entries: LedgerEntry[], periodId = 'bp-2026'): LedgerRow[] {
  const remaining = new Map<string, number>();
  PERIODS.find((row) => row.periodId === periodId)?.balances.forEach((row) => {
    remaining.set(row.benefitTypeName, row.entitledAmount);
  });

  return entries.map((entry) => {
    const delta = ledgerDelta(entry);
    const next = (remaining.get(entry.benefitTypeName) ?? 0) + delta;
    remaining.set(entry.benefitTypeName, next);
    return { entry, delta, runningBalance: next };
  });
}

/** Penahanan sengketa yang masih aktif atas satu klaim. */
export function activeHoldOn(holds: DisputeHold[], claimId: string): DisputeHold | undefined {
  return holds.find((row) => row.isActive && row.targetType === 'BENEFIT_CLAIM' && row.targetId === claimId);
}

/** Total satu draft klaim, dari nominal yang sudah diketik. */
export function draftTotal(draft: ClaimDraft): number {
  return draft.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

/**
 * Kelengkapan satu baris nota. Bukti nota hanya diwajibkan bila jenis
 * manfaatnya memang meminta — beberapa jenis memang tanpa bukti.
 */
export function itemComplete(item: ClaimDraft['items'][number], type: BenefitType | undefined): boolean {
  if (!item.expenseDate || !Number(item.amount)) return false;
  if (item.beneficiaryKind === 'FAMILY_MEMBER' && !item.beneficiaryId) return false;
  if (type?.requiresReceipt && (!item.receiptNo.trim() || !item.documentName)) return false;
  return true;
}

export function draftComplete(draft: ClaimDraft, type: BenefitType | undefined): boolean {
  if (!type || !draft.items.length) return false;
  return draft.items.every((item) => itemComplete(item, type));
}
