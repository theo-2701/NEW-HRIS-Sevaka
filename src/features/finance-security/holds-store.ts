import { HOLD_SEED } from '@/features/finance-security/mock-data';
import type { DisputeHoldRow, HoldTargetType } from '@/features/finance-security/types';

/**
 * Penyimpan `map_finance_dispute_hold` mode dummy — satu sumber bagi Benefit
 * (penanda di grid & modal), Loan (modal keputusan), dan Pencairan & Piutang
 * (gerbang 422 FIN_DISPUTE_HOLD_ACTIVE). Dipisah dari service supaya modul lain
 * membacanya tanpa impor melingkar.
 */
let holds: DisputeHoldRow[] = HOLD_SEED.map((row) => ({ ...row }));

export function resetHoldsStore() {
  holds = HOLD_SEED.map((row) => ({ ...row }));
}

/** Referensi hidup untuk service FT8 (mutasi di tempat). */
export function holdRows(): DisputeHoldRow[] {
  return holds;
}

export function appendHold(row: DisputeHoldRow) {
  holds = [...holds, { ...row }];
}

export function listHolds(): DisputeHoldRow[] {
  return holds.map((row) => ({ ...row }));
}

export function activeHoldFor(targetType: HoldTargetType, targetId: string): DisputeHoldRow | null {
  const row = holds.find((item) => item.isActive && item.targetType === targetType && item.targetId === targetId);
  return row ? { ...row } : null;
}
