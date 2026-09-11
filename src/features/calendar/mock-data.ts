import { EMPLOYEES } from '@/features/time-off/mock-data';
import type { CalendarHoliday, ScopeLevel, WorkCalendar } from '@/features/calendar/types';

/** Dataset Skenario Positif Calendar (UIC-001-TIME §2) — disalin apa adanya. */

/** Identitas yang sedang login di layar ini (pengganti token). */
export const ME = 'emp-hendra';

export const UNITS = [
  { id: 'unit-fin', name: 'Finance' },
  { id: 'unit-ops', name: 'Operations' },
];

export const BRANCHES = [
  { id: 'br-1', name: 'Kantor Pusat Jakarta' },
  { id: 'br-4', name: 'Kantor Cabang Makassar' },
];

export const HOLIDAYS: CalendarHoliday[] = [
  { id: 'hol-1', holidayDate: '2026-08-17', holidayName: 'Hari Kemerdekaan RI ke-81', holidayType: 'NATIONAL', scopeLevel: null, scopeRef: null, isJointLeave: false, isSystem: true, source: 'Keppres RI No. 12/2026', approvalStatus: 'APPROVED', createdBy: 'emp-sys' },
  { id: 'hol-2', holidayDate: '2026-12-24', holidayName: 'Cuti Bersama Natal', holidayType: 'NATIONAL', scopeLevel: null, scopeRef: null, isJointLeave: true, isSystem: true, source: 'SKB 3 Menteri 2026', approvalStatus: 'APPROVED', createdBy: 'emp-sys' },
  { id: 'hol-3', holidayDate: '2026-12-26', holidayName: 'Cuti Bersama Natal (Internal)', holidayType: 'COMPANY', scopeLevel: null, scopeRef: null, isJointLeave: false, isSystem: false, source: 'SE Direksi No. 08/2026', approvalStatus: 'APPROVED', createdBy: 'emp-hendra', approvedBy: 'emp-hendra', approvedAt: '2026-11-01T10:00:00+07:00' },
  // Diajukan Rina — jalur Review untuk sesi Hendra (pengaju ≠ pemutus).
  { id: 'hol-4', holidayDate: '2026-08-18', holidayName: 'Anniversary Cabang Jakarta', holidayType: 'REGIONAL', scopeLevel: 'LOCATION', scopeRef: 'br-1', isJointLeave: false, isSystem: false, source: 'SE HR Cabang Jakarta', approvalStatus: 'PENDING_APPROVAL', createdBy: 'emp-rina' },
  // Diajukan Hendra sendiri — barisnya nol aksi keputusan di sesi Hendra.
  { id: 'hol-7', holidayDate: '2026-10-05', holidayName: 'HUT Perusahaan', holidayType: 'COMPANY', scopeLevel: null, scopeRef: null, isJointLeave: false, isSystem: false, source: 'SE Direksi No. 11/2026', approvalStatus: 'PENDING_APPROVAL', createdBy: 'emp-hendra' },
  { id: 'hol-5', holidayDate: '2026-09-01', holidayName: 'HUT Unit Operations', holidayType: 'REGIONAL', scopeLevel: 'UNIT', scopeRef: 'unit-ops', isJointLeave: false, isSystem: false, source: '', approvalStatus: 'DRAFT', createdBy: 'emp-hendra' },
  { id: 'hol-6', holidayDate: '2026-06-01', holidayName: 'Family Gathering Makassar', holidayType: 'REGIONAL', scopeLevel: 'LOCATION', scopeRef: 'br-4', isJointLeave: false, isSystem: false, source: 'Nota Dinas 14/VI/2026', approvalStatus: 'REJECTED', createdBy: 'emp-hendra', approvedBy: 'emp-hendra' },
];

export const WORK_CALENDARS: WorkCalendar[] = [
  { id: 'wc-1', calendarName: 'Kantor Pusat Senin-Jumat', scopeLevel: 'COMPANY', scopeRef: null, workingDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }, effectiveFrom: '2026-01-01', effectiveUntil: null, createdBy: 'emp-sys' },
  { id: 'wc-2', calendarName: 'Operations 6 Hari Kerja', scopeLevel: 'UNIT', scopeRef: 'unit-ops', workingDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false }, effectiveFrom: '2026-03-01', effectiveUntil: null, createdBy: 'emp-hendra' },
  { id: 'wc-3', calendarName: 'Cabang Makassar 2025', scopeLevel: 'LOCATION', scopeRef: 'br-4', workingDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }, effectiveFrom: '2025-01-01', effectiveUntil: '2025-12-31', createdBy: 'emp-hendra' },
];

export function employeeName(id: string): string {
  return EMPLOYEES.find((row) => row.id === id)?.name ?? (id === 'emp-sys' ? 'SYSTEM' : '—');
}

export function scopeName(level: ScopeLevel | null, ref: string | null): string {
  if (!level || level === 'COMPANY') return 'Company-wide';
  const source = level === 'UNIT' ? UNITS : BRANCHES;
  return source.find((row) => row.id === ref)?.name ?? ref ?? '—';
}
