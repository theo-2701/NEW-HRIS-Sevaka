import { formatDate } from '@/lib/format';
import { CLEARANCE_STATUS_LABEL, MARK_STATUS_LABEL, PAYABLE_TYPE_LABEL } from '@/features/disbursement/types';
import type { ClearanceStatus, MarkStatusFilter, PayableType } from '@/features/disbursement/types';

/** Filter grid Pencairan (> 2 filter ⇒ satu tombol "Filter" + modal). */
export interface PayableFilterState {
  markStatus: MarkStatusFilter;
  payableTypes: PayableType[];
  startDate: string;
  endDate: string;
}

/** Bawaan `mark_status=UNMARKED` — daftar kerja (UIC §6.2 op 1). */
export const EMPTY_PAYABLE_FILTER: PayableFilterState = {
  markStatus: 'UNMARKED',
  payableTypes: [],
  startDate: '',
  endDate: '',
};

export function togglePayableType(state: PayableFilterState, type: PayableType): PayableFilterState {
  return {
    ...state,
    payableTypes: state.payableTypes.includes(type)
      ? state.payableTypes.filter((item) => item !== type)
      : [...state.payableTypes, type],
  };
}

function rangeLabel(startDate: string, endDate: string) {
  if (!startDate && !endDate) return null;
  return `${startDate ? formatDate(startDate) : '…'} – ${endDate ? formatDate(endDate) : '…'}`;
}

export function summarizePayableFilter(state: PayableFilterState): string {
  const parts = [MARK_STATUS_LABEL[state.markStatus]];
  if (state.payableTypes.length === 1) parts.push(PAYABLE_TYPE_LABEL[state.payableTypes[0]]);
  if (state.payableTypes.length > 1) parts.push(`${state.payableTypes.length} types`);
  const range = rangeLabel(state.startDate, state.endDate);
  if (range) parts.push(range);
  return `Filter · ${parts.join(' · ')}`;
}

export interface ClearanceFilterState {
  status: ClearanceStatus | 'ALL';
  employeeId: string;
  startDate: string;
  endDate: string;
}

export const EMPTY_CLEARANCE_FILTER: ClearanceFilterState = {
  status: 'ALL',
  employeeId: 'ALL',
  startDate: '',
  endDate: '',
};

export function summarizeClearanceFilter(state: ClearanceFilterState, employeeName: (id: string) => string): string {
  const parts = [state.status === 'ALL' ? 'All status' : CLEARANCE_STATUS_LABEL[state.status]];
  if (state.employeeId !== 'ALL') parts.push(employeeName(state.employeeId));
  const range = rangeLabel(state.startDate, state.endDate);
  if (range) parts.push(range);
  return `Filter · ${parts.join(' · ')}`;
}
