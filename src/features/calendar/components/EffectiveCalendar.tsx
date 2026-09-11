import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EMPLOYEES } from '@/features/time-off/mock-data';
import { monthGrid, patternFor, resolveDay } from '@/features/calendar/rules';
import type { CalendarHoliday, ResolvedDay, WorkCalendar } from '@/features/calendar/types';
import { cn } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_HEAD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function cellTone(resolved: ResolvedDay) {
  if (resolved.source === 'HOLIDAY') return 'border-error-200 bg-error-50';
  if (resolved.source === 'ROSTER') {
    return resolved.working ? 'border-secondary-200 bg-secondary-50' : 'border-border-1 bg-vapor';
  }
  return resolved.working ? 'border-success-200 bg-success-50' : 'border-border-1 bg-vapor';
}

function LegendDot({ className, children }: { className: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-body text-[11.5px] font-medium text-fg-3">
      <span className={cn('inline-block size-2.5 rounded-sm border', className)} />
      {children}
    </span>
  );
}

/**
 * Kalender efektif — FC-01 (UIC §2.2.6). Tiap sel menyebut lapis yang menang:
 * ROSTER · UNIT · LOCATION · COMPANY · HOLIDAY. Cuti yang disetujui bukan
 * bagian dari penyelesaian ini.
 */
export function EffectiveCalendar({
  holidays,
  calendars,
}: {
  holidays: CalendarHoliday[];
  calendars: WorkCalendar[];
}) {
  const [employeeId, setEmployeeId] = useState('emp-rina');
  const [view, setView] = useState(() => new Date(2026, 6, 1));

  const year = view.getFullYear();
  const month = view.getMonth();
  const pattern = patternFor(calendars, employeeId, `${year}-${String(month + 1).padStart(2, '0')}-15`);
  const cells = monthGrid(year, month);

  const step = (delta: number) => setView((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger className="h-10 w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYEES.map((row) => (
              <SelectItem key={row.id} value={row.id}>
                {row.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="font-body text-xs font-medium text-fg-3">
          Urutan penyelesaian: roster pribadi → pola unit / lokasi → pola company, dikurangi libur yang berlaku.
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border-1 bg-bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-label="Bulan sebelumnya"
            onClick={() => step(-1)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-silver bg-cloud text-fg-2 transition-colors duration-200 ease-standard hover:bg-vapor [&_svg]:size-4"
          >
            <ChevronLeft />
          </button>
          <span className="font-display text-base font-bold text-fg-1">
            {MONTHS[month]} {year}
          </span>
          <button
            type="button"
            aria-label="Bulan berikutnya"
            onClick={() => step(1)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-silver bg-cloud text-fg-2 transition-colors duration-200 ease-standard hover:bg-vapor [&_svg]:size-4"
          >
            <ChevronRight />
          </button>
          <span className="ml-auto font-body text-xs font-medium text-fg-3">
            Pola yang berlaku: <strong className="text-fg-1">{pattern?.calendarName ?? 'tidak ada yang terselesaikan'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_HEAD.map((day) => (
            <span
              key={day}
              className="py-1 text-center font-body text-[10.5px] font-bold uppercase tracking-[0.06em] text-fg-3"
            >
              {day}
            </span>
          ))}

          {cells.map(({ date, iso, outside }) => {
            const resolved = resolveDay(holidays, calendars, employeeId, iso);
            return (
              <div
                key={iso}
                className={cn(
                  'flex min-h-[74px] flex-col gap-0.5 rounded-md border px-2 py-1.5',
                  cellTone(resolved),
                  outside && 'opacity-45',
                )}
              >
                <span className="font-body text-[13px] font-bold text-fg-1">{date.getDate()}</span>
                <span className="font-body text-[11px] font-medium leading-[1.3] text-fg-2">{resolved.label}</span>
                <span className="mt-auto font-body text-[9.5px] font-bold uppercase tracking-[0.05em] text-fg-4">
                  {resolved.source}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <LegendDot className="border-success-200 bg-success-50">Working day (calendar pattern)</LegendDot>
          <LegendDot className="border-secondary-200 bg-secondary-50">Rostered shift</LegendDot>
          <LegendDot className="border-border-1 bg-vapor">Non-working day</LegendDot>
          <LegendDot className="border-error-200 bg-error-50">Holiday in force</LegendDot>
          <span className="font-body text-[11.5px] font-medium text-fg-3">
            Tiap sel menyebut lapis yang menang. Cuti yang disetujui bukan bagian dari penyelesaian ini.
          </span>
        </div>
      </div>
    </div>
  );
}
