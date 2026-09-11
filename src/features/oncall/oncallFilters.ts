import { formatDate } from '@/lib/format';
import { ONCALL_STATUS_LABEL } from '@/features/oncall/types';
import { OVERTIME_CATEGORY_LABEL, OVERTIME_STATUS_LABEL } from '@/features/overtime/types';
import type { OncallStatus } from '@/features/oncall/types';
import type { OvertimeCategory, OvertimeStatus } from '@/features/overtime/types';

/**
 * Keadaan filter kedua layar On Call. Dipisah dari komponennya supaya file
 * komponen hanya mengekspor komponen (syarat fast-refresh).
 *
 * Keduanya punya 3 filter atau lebih (rentang tanggal dihitung satu), jadi
 * dua-duanya masuk modal filter. Pencarian nama bukan filter.
 */
export interface ScheduleFilterState {
  oncallStatus: string;
  from: string;
  to: string;
}

export interface ActivityFilterState {
  oncallAssignmentId: string;
  overtimeStatus: string;
  overtimeCategory: string;
  from: string;
  to: string;
}

export const EMPTY_SCHEDULE_FILTER: ScheduleFilterState = { oncallStatus: 'ALL', from: '', to: '' };

export const EMPTY_ACTIVITY_FILTER: ActivityFilterState = {
  oncallAssignmentId: 'ALL',
  overtimeStatus: 'ALL',
  overtimeCategory: 'ALL',
  from: '',
  to: '',
};

/** Rentang tanggal dihitung sebagai satu filter, bukan dua. */
export function countActive(value: ScheduleFilterState | ActivityFilterState): number {
  const selects = Object.entries(value)
    .filter(([key]) => key !== 'from' && key !== 'to')
    .filter(([, item]) => item !== 'ALL').length;
  return selects + (value.from || value.to ? 1 : 0);
}

function rangeLabel(from: string, to: string) {
  return `${from ? formatDate(from) : '…'} → ${to ? formatDate(to) : '…'}`;
}

export function summarizeScheduleFilter(value: ScheduleFilterState): string {
  const parts: string[] = [];
  if (value.oncallStatus !== 'ALL') parts.push(ONCALL_STATUS_LABEL[value.oncallStatus as OncallStatus]);
  if (value.from || value.to) parts.push(rangeLabel(value.from, value.to));
  return parts.length ? parts.join(' · ') : 'Tanpa filter';
}

export function summarizeActivityFilter(value: ActivityFilterState, windowLabel: (id: string) => string): string {
  const parts: string[] = [];
  if (value.oncallAssignmentId !== 'ALL') parts.push(windowLabel(value.oncallAssignmentId));
  if (value.overtimeStatus !== 'ALL') parts.push(OVERTIME_STATUS_LABEL[value.overtimeStatus as OvertimeStatus]);
  if (value.overtimeCategory !== 'ALL') {
    parts.push(OVERTIME_CATEGORY_LABEL[value.overtimeCategory as OvertimeCategory]);
  }
  if (value.from || value.to) parts.push(rangeLabel(value.from, value.to));
  return parts.length ? parts.join(' · ') : 'Tanpa filter';
}
