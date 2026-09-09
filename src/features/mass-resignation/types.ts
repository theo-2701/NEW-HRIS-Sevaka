import type { SelectOption } from '@/components/form/SelectField';

/**
 * Mass Resignation — offboarding massal dengan kendali blast-radius
 * (FSD §7.1–7.3 · UIC §6.1–6.5).
 *
 * Alur: DRAFT → IN_APPROVAL → APPROVED (selection hash dibekukan) →
 * PROCESSING → PROCESSED. Circuit-breaker bisa HALT di tengah jalan, lalu
 * dilanjutkan (PROCESSING) atau disudahi sebagian (PARTIAL).
 */
export type BatchStatus =
  | 'DRAFT'
  | 'IN_APPROVAL'
  | 'APPROVED'
  | 'PROCESSING'
  | 'HALTED'
  | 'PROCESSED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export interface MassBatch {
  id: string;
  reason: string;
  leaveDate: string;
  /** Jumlah karyawan yang dipilih saat batch dibuat. */
  total: number;
  /** Sudah diproses (spawn offboarding) sejauh ini. */
  progress: number;
  status: BatchStatus;
  maker: string;
  notes?: string;
  /** Hash seleksi yang dibekukan saat approve — kunci anti-TOCTOU. */
  selectionHash?: string;
  /** Correlation id batch; menempel di tiap offboarding yang dilahirkan. */
  correlationId?: string;
  approverNote?: string;
  haltReason?: string;
}

export interface PoolEmployee {
  id: string;
  name: string;
  unit: string;
  position: string;
  /** Baris diri sendiri — dikunci, larangan self-resign (UIC §6.3). */
  self?: boolean;
}

export interface BatchDraft {
  reason: string;
  leaveDate: string;
  employeeIds: string[];
  notes: string;
}

export const STATUS_LABEL: Record<BatchStatus, string> = {
  DRAFT: 'Draft',
  IN_APPROVAL: 'In approval',
  APPROVED: 'Approved',
  PROCESSING: 'Processing',
  HALTED: 'Halted',
  PROCESSED: 'Processed',
  PARTIAL: 'Partial',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

/** Status yang sudah tidak bergerak lagi. */
export const TERMINAL_STATUS: BatchStatus[] = ['PROCESSED', 'PARTIAL', 'FAILED', 'CANCELLED'];

export function isTerminal(status: BatchStatus): boolean {
  return TERMINAL_STATUS.includes(status);
}

/** Ambang blast-radius: di atas ini batch butuh sign-off elevated. */
export const BLAST_THRESHOLD = 15;

export const REASON_OPTIONS: SelectOption[] = [
  { value: 'RESIGN', label: 'Resignation (voluntary)' },
  { value: 'CONTRACT_END', label: 'Contract end' },
  { value: 'TERMINATION', label: 'Termination (with cause)' },
  { value: 'LAYOFF', label: 'Layoff' },
  { value: 'RETIREMENT', label: 'Retirement' },
];

export function labelOf(options: SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/** Aktor yang sedang login — dipakai untuk SoD dan larangan self-resign. */
export const CURRENT_USER = 'Tony Stark';
