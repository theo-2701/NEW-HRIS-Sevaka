/**
 * Time › Calendar — kontrak FSD-001-TIME §1 · UIC-001-TIME §2.
 *
 * Dua sumber daya menjawab satu pertanyaan: **apakah tanggal ini hari kerja?**
 *  • `mst_holiday`       — dua lapis: layer nasional yang disemai sistem, dan
 *    layer regional/company yang baru berlaku setelah maker–checker.
 *  • `cnf_work_calendar` — pola minggu kerja; selalu berlaku ke depan.
 */

export type HolidayType = 'NATIONAL' | 'REGIONAL' | 'COMPANY';
export type ScopeLevel = 'COMPANY' | 'UNIT' | 'LOCATION';
export type ApprovalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface CalendarHoliday {
  id: string;
  holidayDate: string;
  holidayName: string;
  holidayType: HolidayType;
  /** Hanya terisi untuk libur REGIONAL. */
  scopeLevel: ScopeLevel | null;
  scopeRef: string | null;
  isJointLeave: boolean;
  /** Baris sistem: disemai dari keputusan pemerintah, terkunci di layar ini. */
  isSystem: boolean;
  source: string;
  approvalStatus: ApprovalStatus;
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type WorkingDays = Record<WeekdayKey, boolean>;

export interface WorkCalendar {
  id: string;
  calendarName: string;
  scopeLevel: ScopeLevel;
  scopeRef: string | null;
  workingDays: WorkingDays;
  effectiveFrom: string;
  effectiveUntil: string | null;
  createdBy: string;
}

export interface HolidayDraft {
  holidayDate: string;
  holidayName: string;
  holidayType: HolidayType | '';
  scopeLevel: ScopeLevel | '';
  scopeRef: string;
  isJointLeave: boolean;
  source: string;
}

export interface WorkCalendarDraft {
  calendarName: string;
  scopeLevel: ScopeLevel | '';
  scopeRef: string;
  workingDays: WorkingDays;
  effectiveFrom: string;
  effectiveUntil: string;
}

/** Lapis yang memenangkan satu hari pada kalender efektif. */
export type DaySource = 'ROSTER' | 'HOLIDAY' | ScopeLevel | 'NONE';

export interface ResolvedDay {
  working: boolean;
  source: DaySource;
  label: string;
}

export const WEEKDAYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_LABEL: Record<WeekdayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export const HOLIDAY_TYPE_LABEL: Record<HolidayType, string> = {
  NATIONAL: 'National',
  REGIONAL: 'Regional',
  COMPANY: 'Company',
};

export const SCOPE_LEVEL_LABEL: Record<ScopeLevel, string> = {
  COMPANY: 'Company',
  UNIT: 'Unit',
  LOCATION: 'Location',
};

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};
