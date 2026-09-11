import { formatDate } from '@/lib/format';
import {
  OVERTIME_CATEGORY_LABEL,
  OVERTIME_STATUS_LABEL,
  SUBMISSION_MODE_LABEL,
} from '@/features/overtime/types';
import type { OvertimeCategory, OvertimeStatus, SubmissionMode } from '@/features/overtime/types';

/**
 * Keadaan filter kedua grid. Dipisah dari komponennya supaya file komponen
 * hanya mengekspor komponen (syarat fast-refresh).
 *
 * Keduanya punya 3 filter atau lebih (rentang tanggal dihitung satu filter),
 * jadi dua-duanya masuk modal filter. Pencarian nama bukan filter — tempatnya
 * tetap di kanan toolbar.
 */
export interface RequestFilterState {
  overtimeStatus: string;
  submissionMode: string;
  overtimeCategory: string;
  from: string;
  to: string;
}

export interface DailyFilterState {
  overtimeCategory: string;
  from: string;
  to: string;
}

export const EMPTY_REQUEST_FILTER: RequestFilterState = {
  overtimeStatus: 'ALL',
  submissionMode: 'ALL',
  overtimeCategory: 'ALL',
  from: '',
  to: '',
};

export const EMPTY_DAILY_FILTER: DailyFilterState = { overtimeCategory: 'ALL', from: '', to: '' };

/** Rentang tanggal dihitung sebagai satu filter, bukan dua. */
export function countActive(value: RequestFilterState | DailyFilterState): number {
  const entries = Object.entries(value).filter(([key]) => key !== 'from' && key !== 'to');
  const selects = entries.filter(([, item]) => item !== 'ALL').length;
  return selects + (value.from || value.to ? 1 : 0);
}

function rangeLabel(from: string, to: string): string {
  return `${from ? formatDate(from) : '…'} → ${to ? formatDate(to) : '…'}`;
}

export function summarizeRequestFilter(value: RequestFilterState): string {
  const parts: string[] = [];
  if (value.overtimeStatus !== 'ALL') parts.push(OVERTIME_STATUS_LABEL[value.overtimeStatus as OvertimeStatus]);
  if (value.submissionMode !== 'ALL') parts.push(SUBMISSION_MODE_LABEL[value.submissionMode as SubmissionMode]);
  if (value.overtimeCategory !== 'ALL') {
    parts.push(OVERTIME_CATEGORY_LABEL[value.overtimeCategory as OvertimeCategory]);
  }
  if (value.from || value.to) parts.push(rangeLabel(value.from, value.to));
  return parts.length ? parts.join(' · ') : 'Tanpa filter';
}

export function summarizeDailyFilter(value: DailyFilterState): string {
  const parts: string[] = [];
  if (value.overtimeCategory !== 'ALL') {
    parts.push(OVERTIME_CATEGORY_LABEL[value.overtimeCategory as OvertimeCategory]);
  }
  if (value.from || value.to) parts.push(rangeLabel(value.from, value.to));
  return parts.length ? parts.join(' · ') : 'Tanpa filter';
}
