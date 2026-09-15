import { LOAN_LIMITS, PURPOSE_TYPE_SEED, REJECTION_REASONS } from '@/features/finance-settings/mock-data';
import type {
  LoanLimit,
  PurposeType,
  PurposeTypeHistory,
  PurposeTypeRow,
  RejectionReason,
} from '@/features/finance-settings/types';

/**
 * Penyimpan data induk FT1 mode dummy. Dipisah dari service supaya Loan (plafon)
 * dan Cash Advance (jenis keperluan) bisa membacanya tanpa impor melingkar.
 */
interface SettingsState {
  limits: LoanLimit[];
  purposes: PurposeTypeRow[];
  reasons: RejectionReason[];
  purposeHistory: PurposeTypeHistory[];
}

const seed = (): SettingsState => ({
  limits: LOAN_LIMITS.map((row) => ({ ...row })),
  purposes: PURPOSE_TYPE_SEED.map((row) => ({ ...row, deletedAt: null })),
  reasons: REJECTION_REASONS.map((row) => ({ ...row })),
  purposeHistory: [],
});

let state: SettingsState = seed();

export function settingsState(): SettingsState {
  return state;
}

export function resetSettingsStore() {
  state = seed();
}

/** FT3 membaca plafon saat pengajuan — baris aktif dan belum dihapus. */
export function activeLoanLimitFor(jobGradeId: string): LoanLimit | null {
  const row = state.limits.find((item) => item.jobGradeId === jobGradeId && item.isActive && !item.deletedAt);
  return row ? { ...row } : null;
}

/** FT4 membaca jenis keperluan hidup (belum dihapus); gerbang aktif ada di FT4. */
export function listPurposeTypes(): PurposeType[] {
  return state.purposes
    .filter((row) => !row.deletedAt)
    .map((row) => ({
      id: row.id,
      name: row.name,
      isOfficialTravel: row.isOfficialTravel,
      requiresReceipt: row.requiresReceipt,
      maxAmount: row.maxAmount,
      isUnlimitedAck: row.isUnlimitedAck,
      isActive: row.isActive,
    }));
}
