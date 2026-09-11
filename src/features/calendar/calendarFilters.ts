import { formatDate } from '@/lib/format';
import { APPROVAL_STATUS_LABEL, HOLIDAY_TYPE_LABEL } from '@/features/calendar/types';
import type { ApprovalStatus, HolidayType } from '@/features/calendar/types';

/**
 * Keadaan filter grid libur. Dipisah dari komponennya supaya file komponen
 * hanya mengekspor komponen (syarat fast-refresh).
 *
 * Grid libur punya 3 filter (status, tipe, rentang tanggal) → masuk modal.
 * Grid pola kerja hanya punya 1 filter → tetap inline di toolbar.
 */
export interface HolidayFilterState {
  approvalStatus: string;
  holidayType: string;
  from: string;
  to: string;
}

export const EMPTY_HOLIDAY_FILTER: HolidayFilterState = {
  approvalStatus: 'ALL',
  holidayType: 'ALL',
  from: '',
  to: '',
};

/** Rentang tanggal dihitung sebagai satu filter, bukan dua. */
export function countActive(value: HolidayFilterState): number {
  const selects = [value.approvalStatus, value.holidayType].filter((item) => item !== 'ALL').length;
  return selects + (value.from || value.to ? 1 : 0);
}

export function summarizeHolidayFilter(value: HolidayFilterState): string {
  const parts: string[] = [];
  if (value.approvalStatus !== 'ALL') parts.push(APPROVAL_STATUS_LABEL[value.approvalStatus as ApprovalStatus]);
  if (value.holidayType !== 'ALL') parts.push(HOLIDAY_TYPE_LABEL[value.holidayType as HolidayType]);
  if (value.from || value.to) {
    parts.push(`${value.from ? formatDate(value.from) : '…'} → ${value.to ? formatDate(value.to) : '…'}`);
  }
  return parts.length ? parts.join(' · ') : 'Tanpa filter';
}
