import { employeeName } from '@/features/attendance/mock-data';
import {
  ATTENDANCE_STATUS_LABEL,
  CORRECTION_REASON_LABEL,
  CORRECTION_STATUS_LABEL,
  DAY_TYPE_LABEL,
} from '@/features/attendance/types';
import type { AttendanceStatus, CorrectionReasonType, CorrectionStatus, DayType } from '@/features/attendance/types';

/**
 * Keadaan filter ketiga grid Attendance. Dipisah dari komponennya supaya file
 * komponen hanya mengekspor komponen (syarat fast-refresh).
 *
 * `'ALL'` berarti filter tidak aktif — bukan string kosong, supaya nilainya
 * bisa dipakai langsung sebagai value `<Select>`.
 *
 * Ketiganya punya **3 filter atau lebih**, jadi semuanya masuk modal filter
 * (standar toolbar rumah). Pencarian tidak dihitung sebagai filter.
 */
export interface DayFilterState {
  attendanceStatus: string;
  dayType: string;
  excused: string;
  employeeId: string;
}

export interface TapFilterState {
  punchType: string;
  geofence: string;
  mockLocation: string;
  employeeId: string;
}

export interface CorrectionFilterState {
  correctionStatus: string;
  correctionReasonType: string;
  employeeId: string;
}

export const EMPTY_DAY_FILTER: DayFilterState = {
  attendanceStatus: 'ALL',
  dayType: 'ALL',
  excused: 'ALL',
  employeeId: 'ALL',
};

export const EMPTY_TAP_FILTER: TapFilterState = {
  punchType: 'ALL',
  geofence: 'ALL',
  mockLocation: 'ALL',
  employeeId: 'ALL',
};

export const EMPTY_CORRECTION_FILTER: CorrectionFilterState = {
  correctionStatus: 'ALL',
  correctionReasonType: 'ALL',
  employeeId: 'ALL',
};

const EXCUSED_LABEL: Record<string, string> = { YES: 'Excused', NO: 'Belum excused' };
const GEOFENCE_LABEL: Record<string, string> = {
  IN: 'Inside radius',
  OUT: 'Outside radius',
  UNKNOWN: 'Could not be evaluated',
};
const MOCK_LABEL: Record<string, string> = { YES: 'Mock location suspected', NO: 'Tanpa dugaan mock' };

export function countActive(value: DayFilterState | TapFilterState | CorrectionFilterState): number {
  return Object.values(value).filter((item) => item !== 'ALL').length;
}

export function summarizeDayFilter(value: DayFilterState): string {
  const parts: string[] = [];
  if (value.attendanceStatus !== 'ALL') parts.push(ATTENDANCE_STATUS_LABEL[value.attendanceStatus as AttendanceStatus]);
  if (value.dayType !== 'ALL') parts.push(DAY_TYPE_LABEL[value.dayType as DayType]);
  if (value.excused !== 'ALL') parts.push(EXCUSED_LABEL[value.excused]);
  if (value.employeeId !== 'ALL') parts.push(employeeName(value.employeeId));
  return parts.length ? parts.join(' · ') : 'Tanpa filter';
}

export function summarizeTapFilter(value: TapFilterState): string {
  const parts: string[] = [];
  if (value.punchType !== 'ALL') parts.push(value.punchType === 'IN' ? 'Tap in' : 'Tap out');
  if (value.geofence !== 'ALL') parts.push(GEOFENCE_LABEL[value.geofence]);
  if (value.mockLocation !== 'ALL') parts.push(MOCK_LABEL[value.mockLocation]);
  if (value.employeeId !== 'ALL') parts.push(employeeName(value.employeeId));
  return parts.length ? parts.join(' · ') : 'Tanpa filter';
}

export function summarizeCorrectionFilter(value: CorrectionFilterState): string {
  const parts: string[] = [];
  if (value.correctionStatus !== 'ALL') parts.push(CORRECTION_STATUS_LABEL[value.correctionStatus as CorrectionStatus]);
  if (value.correctionReasonType !== 'ALL') {
    parts.push(CORRECTION_REASON_LABEL[value.correctionReasonType as CorrectionReasonType]);
  }
  if (value.employeeId !== 'ALL') parts.push(employeeName(value.employeeId));
  return parts.length ? parts.join(' · ') : 'Tanpa filter';
}
