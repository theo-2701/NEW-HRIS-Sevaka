import { ADVANCE_STATUS_LABEL } from '@/features/cash-advance/types';
import type { CashAdvanceStatus } from '@/features/cash-advance/types';

/**
 * Filter grid All Request. Status adalah daftar IN (UIC §5.3) dan jenis
 * keperluan satu nilai — dua filter, tetap inline di toolbar; status jamak
 * dipilih lewat modal kecil karena tidak muat di satu `<Select>`.
 */
export interface AdvanceFilterState {
  statuses: CashAdvanceStatus[];
}

export const EMPTY_ADVANCE_FILTER: AdvanceFilterState = { statuses: [] };

export function summarizeStatuses(value: AdvanceFilterState): string {
  if (!value.statuses.length) return 'All status';
  if (value.statuses.length === 1) return ADVANCE_STATUS_LABEL[value.statuses[0]];
  return `${value.statuses.length} status`;
}

export function toggleStatus(value: AdvanceFilterState, status: CashAdvanceStatus): AdvanceFilterState {
  return {
    statuses: value.statuses.includes(status)
      ? value.statuses.filter((item) => item !== status)
      : [...value.statuses, status],
  };
}
