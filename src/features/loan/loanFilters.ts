import { LOAN_STATUS_LABEL } from '@/features/loan/types';
import type { LoanStatus } from '@/features/loan/types';

/**
 * Keadaan filter grid Loan Administration. Dipisah dari file komponen supaya
 * komponen hanya mengekspor komponen (syarat fast-refresh).
 *
 * Kontraknya menerima status sebagai **daftar IN**, jadi filternya jamak —
 * bentuk yang tidak muat di satu `<Select>` toolbar dan karenanya masuk modal
 * filter. Pencarian nomor permintaan tetap di kanan toolbar; ia bukan filter.
 */
export interface LoanFilterState {
  statuses: LoanStatus[];
}

export const EMPTY_LOAN_FILTER: LoanFilterState = { statuses: [] };

export function countActive(value: LoanFilterState): number {
  return value.statuses.length;
}

export function summarizeLoanFilter(value: LoanFilterState): string {
  if (!value.statuses.length) return 'Tanpa filter';
  if (value.statuses.length === 1) return LOAN_STATUS_LABEL[value.statuses[0]];
  return `${value.statuses.length} status dipilih`;
}

export function toggleStatus(value: LoanFilterState, status: LoanStatus): LoanFilterState {
  return {
    statuses: value.statuses.includes(status)
      ? value.statuses.filter((item) => item !== status)
      : [...value.statuses, status],
  };
}
