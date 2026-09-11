import { EMPLOYEES } from '@/features/time-off/mock-data';
import { ASSIGNMENTS, SHIFTS } from '@/features/scheduler/mock-data';
import { UNITS } from '@/features/calendar/mock-data';
import { WEEKDAYS } from '@/features/calendar/types';
import { toIsoDate } from '@/lib/format';
import type { CalendarHoliday, ResolvedDay, WorkCalendar } from '@/features/calendar/types';

/**
 * Penyelesaian FC-01 (UIC §2.2.6): **roster → unit/location → company**, lalu
 * libur yang sudah disetujui ditimpakan paling akhir — libur selalu menang atas
 * pola hari itu. Cuti yang disetujui **bukan** bagian dari penyelesaian ini.
 */

const unitIdOf = (employeeId: string) => {
  const employee = EMPLOYEES.find((row) => row.id === employeeId);
  return UNITS.find((unit) => unit.name === employee?.unit)?.id ?? null;
};

const branchOf = (employeeId: string) => EMPLOYEES.find((row) => row.id === employeeId)?.branch ?? null;

/** Pola paling spesifik yang masih berlaku pada tanggal itu. */
export function patternFor(
  calendars: WorkCalendar[],
  employeeId: string,
  iso: string,
): WorkCalendar | null {
  const unitId = unitIdOf(employeeId);
  const branch = branchOf(employeeId);
  const rank: Record<string, number> = { LOCATION: 0, UNIT: 1, COMPANY: 2 };

  return (
    calendars
      .filter((row) => {
        if (row.effectiveFrom > iso) return false;
        if (row.effectiveUntil && row.effectiveUntil < iso) return false;
        if (row.scopeLevel === 'UNIT') return Boolean(unitId) && row.scopeRef === unitId;
        if (row.scopeLevel === 'LOCATION') return row.scopeRef === branch;
        return true;
      })
      .sort((a, b) => rank[a.scopeLevel] - rank[b.scopeLevel])[0] ?? null
  );
}

/** Libur yang berlaku bagi karyawan itu — hanya baris APPROVED yang dihitung. */
export function holidayOn(
  holidays: CalendarHoliday[],
  employeeId: string,
  iso: string,
): CalendarHoliday | null {
  const unitId = unitIdOf(employeeId);
  const branch = branchOf(employeeId);

  return (
    holidays.find((row) => {
      if (row.holidayDate !== iso || row.approvalStatus !== 'APPROVED') return false;
      if (row.holidayType !== 'REGIONAL') return true;
      if (row.scopeLevel === 'LOCATION') return row.scopeRef === branch;
      if (row.scopeLevel === 'UNIT') return Boolean(unitId) && row.scopeRef === unitId;
      return false;
    }) ?? null
  );
}

export function resolveDay(
  holidays: CalendarHoliday[],
  calendars: WorkCalendar[],
  employeeId: string,
  iso: string,
): ResolvedDay {
  let resolved: ResolvedDay = { working: false, source: 'NONE', label: 'No calendar resolved' };

  const assignment = ASSIGNMENTS.find((row) => row.employeeId === employeeId && row.workDate === iso);
  const pattern = patternFor(calendars, employeeId, iso);

  if (assignment) {
    const shift = assignment.shiftId ? SHIFTS.find((row) => row.id === assignment.shiftId) : null;
    resolved = {
      working: !assignment.isOffDay,
      source: 'ROSTER',
      label: assignment.isOffDay ? 'Roster off day' : (shift?.shiftName ?? 'Rostered'),
    };
  } else if (pattern) {
    // getDay(): Minggu = 0, jadi digeser supaya Senin jadi indeks 0.
    const key = WEEKDAYS[(new Date(`${iso}T00:00:00`).getDay() + 6) % 7];
    const working = pattern.workingDays[key];
    resolved = { working, source: pattern.scopeLevel, label: working ? 'Working day' : 'Weekly rest' };
  }

  const holiday = holidayOn(holidays, employeeId, iso);
  if (holiday) resolved = { working: false, source: 'HOLIDAY', label: holiday.holidayName };

  return resolved;
}

/** 42 sel kalender bulanan, dimulai dari Senin. */
export function monthGrid(year: number, month: number): { date: Date; iso: string; outside: boolean }[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { date, iso: toIsoDate(date), outside: date.getMonth() !== month };
  });
}
