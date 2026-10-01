import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, formatDateRange, toIsoDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];
const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

type View = 'days' | 'months' | 'years';

function parseIso(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Senin sebagai awal pekan — kalender kerja Indonesia. */
function startOffset(year: number, month: number): number {
  const weekday = new Date(year, month, 1).getDay();
  return (weekday + 6) % 7;
}

/** Sel hari satu bulan penuh (dengan ekor bulan sebelum/sesudah) — kelipatan 7. */
function monthDays(year: number, month: number) {
  const days: { iso: string; label: number; outside: boolean }[] = [];
  const offset = startOffset(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  for (let i = offset - 1; i >= 0; i -= 1) {
    const date = new Date(year, month - 1, daysInPrev - i);
    days.push({ iso: toIsoDate(date), label: date.getDate(), outside: true });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ iso: toIsoDate(new Date(year, month, day)), label: day, outside: false });
  }
  while (days.length % 7 !== 0) {
    const date = new Date(year, month + 1, days.length - offset - daysInMonth + 1);
    days.push({ iso: toIsoDate(date), label: date.getDate(), outside: true });
  }
  return days;
}

const NAV_BTN =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border-1 bg-white text-secondary-600 transition-colors duration-200 ease-standard hover:border-primary-200 hover:bg-mist [&_svg]:size-3.5';
const PICK_BTN =
  'rounded-md py-2.5 font-body text-xs font-semibold text-fg-1 transition-colors duration-150 ease-standard hover:bg-primary-100';
const SET_BTN =
  'h-7 min-w-[76px] shrink-0 rounded-md px-2.5 font-body text-xs font-bold tracking-[0.01em] text-cloud [background:var(--bg-primary-btn)] [box-shadow:var(--shadow-primary)] disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Kerangka kalender rumah — port `.dp` (`_prototype/css/add-employee.css`): lebar 228px, tiga
 * tampilan (hari → bulan → tahun) yang berganti lewat judul, dan footer. Isi grid hari & footer
 * milik pemakai (`Calendar` tunggal / `RangeCalendar`).
 */
function CalendarFrame({
  anchor,
  renderDay,
  footer,
}: {
  /** Bulan yang dibuka pertama kali. */
  anchor: Date;
  renderDay: (day: { iso: string; label: number; outside: boolean }) => ReactNode;
  footer: ReactNode;
}) {
  const [view, setView] = useState<View>('days');
  const [cursor, setCursor] = useState<Date>(anchor);
  // Membuka ulang picker selalu mulai dari nilai yang tersimpan.
  const anchorKey = toIsoDate(anchor);
  useEffect(() => {
    setCursor(anchor);
    setView('days');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorKey]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const yearsStart = Math.floor(year / 12) * 12;

  const step = (direction: number) => {
    const next = new Date(cursor);
    if (view === 'days') next.setMonth(next.getMonth() + direction);
    else if (view === 'months') next.setFullYear(next.getFullYear() + direction);
    else next.setFullYear(next.getFullYear() + direction * 12);
    setCursor(next);
  };

  return (
    <div className="w-[228px] p-2">
      <header className="mb-1.5 flex items-center justify-between gap-1.5">
        <button type="button" aria-label="Sebelumnya" onClick={() => step(-1)} className={NAV_BTN}>
          <ChevronLeft />
        </button>
        <button
          type="button"
          onClick={() => setView(view === 'days' ? 'months' : 'years')}
          className="flex-1 rounded-sm py-0.5 font-body text-[13px] font-bold text-fg-1 transition-colors duration-200 ease-standard hover:text-secondary-600"
        >
          {view === 'days' && `${MONTHS[month]} ${year}`}
          {view === 'months' && year}
          {view === 'years' && `${yearsStart} – ${yearsStart + 11}`}
        </button>
        <button type="button" aria-label="Berikutnya" onClick={() => step(1)} className={NAV_BTN}>
          <ChevronRight />
        </button>
      </header>

      {view === 'days' && (
        <>
          <div className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((weekday, index) => (
              <span
                key={`${weekday}-${index}`}
                className="py-1 text-center font-body text-[9px] font-bold leading-none text-fg-3"
              >
                {weekday}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">{monthDays(year, month).map(renderDay)}</div>
        </>
      )}

      {view === 'months' && (
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setCursor(new Date(year, index, 1));
                setView('days');
              }}
              className={cn(PICK_BTN, index === month && 'font-bold text-secondary-600')}
            >
              {name.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {view === 'years' && (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 12 }, (_, index) => yearsStart + index).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setCursor(new Date(item, month, 1));
                setView('months');
              }}
              className={cn(PICK_BTN, item === year && 'font-bold text-secondary-600')}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <footer className="mt-1.5 flex items-center gap-1.5 border-t border-border-1 pt-1.5">{footer}</footer>
    </div>
  );
}

function FooterValue({ children, empty }: { children: ReactNode; empty: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-0 flex-1 items-center truncate rounded-md border border-border-1 px-2 font-body text-[11px] font-bold text-secondary-600',
        empty && 'font-medium text-fg-4',
      )}
    >
      {children}
    </span>
  );
}

const DAY_BASE =
  'inline-flex aspect-square items-center justify-center font-body text-[11px] font-medium text-fg-1 transition-colors duration-150 ease-standard';

/**
 * Kalender rumah satu tanggal. Komponen ini murni tampilan; penyimpanan nilainya urusan
 * `<DateField>` / `<DatePicker>`.
 */
export function Calendar({
  value,
  min,
  max,
  onSelect,
}: {
  /** ISO `YYYY-MM-DD`. */
  value?: string;
  min?: string;
  max?: string;
  onSelect: (iso: string) => void;
}) {
  const selected = parseIso(value);
  const [draft, setDraft] = useState<string>(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);

  const todayIso = toIsoDate(new Date());
  const outOfRange = (iso: string) => Boolean((min && iso < min) || (max && iso > max));

  return (
    <CalendarFrame
      anchor={selected ?? new Date()}
      renderDay={(day) => {
        const disabled = outOfRange(day.iso);
        const isSelected = draft === day.iso;
        return (
          <button
            key={day.iso}
            type="button"
            disabled={disabled}
            onClick={() => setDraft(day.iso)}
            className={cn(
              DAY_BASE,
              'rounded-full',
              day.outside && 'text-fg-4',
              day.iso === todayIso && 'shadow-[inset_0_0_0_1.5px_var(--color-secondary-500)] text-secondary-600',
              isSelected && 'bg-secondary-500 text-white hover:bg-secondary-600',
              !isSelected && !disabled && 'hover:bg-primary-100',
              disabled && 'cursor-not-allowed text-fog hover:bg-transparent',
            )}
          >
            {day.label}
          </button>
        );
      }}
      footer={
        <>
          <FooterValue empty={!draft}>{draft ? formatDate(draft) : 'Belum dipilih'}</FooterValue>
          <button type="button" disabled={!draft} onClick={() => draft && onSelect(draft)} className={SET_BTN}>
            Set Date
          </button>
        </>
      }
    />
  );
}

export interface DateRange {
  /** ISO `YYYY-MM-DD`, kosong = belum dipilih. */
  from: string;
  to: string;
}

/**
 * Kalender rentang — satu kalender untuk tanggal awal DAN akhir: klik pertama = awal, klik kedua =
 * akhir (bila lebih awal dari tanggal awal, keduanya ditukar). Hover memperlihatkan pratinjau rentang.
 * "Set Date" aktif begitu tanggal awal terisi; tanpa tanggal akhir, rentangnya satu hari — kecuali
 * `openEnd`, yang membiarkan tanggal akhir kosong.
 */
export function RangeCalendar({
  value,
  min,
  max,
  openEnd = false,
  lockFrom = false,
  onSelect,
}: {
  value: DateRange;
  min?: string;
  max?: string;
  /** Tanggal akhir boleh kosong (pola "berlaku sampai ada penggantinya"). */
  openEnd?: boolean;
  /** Tanggal awal terkunci (sudah berlaku) — klik hanya mengubah tanggal akhir. */
  lockFrom?: boolean;
  onSelect: (range: DateRange) => void;
}) {
  const [draft, setDraft] = useState<DateRange>(value);
  const [hover, setHover] = useState('');
  useEffect(() => setDraft(value), [value]);

  const todayIso = toIsoDate(new Date());
  const floor = lockFrom && value.from && (!min || value.from > min) ? value.from : min;
  const outOfRange = (iso: string) => Boolean((floor && iso < floor) || (max && iso > max));
  /** Ujung kedua yang sedang dipertimbangkan — tanggal akhir, atau hover saat baru memilih awal. */
  const end = draft.to || (draft.from && hover ? hover : '');
  const [lo, hi] = draft.from && end && end < draft.from ? [end, draft.from] : [draft.from, end];

  const pick = (iso: string) => {
    if (lockFrom && draft.from) setDraft({ from: draft.from, to: iso });
    else if (!draft.from || draft.to) setDraft({ from: iso, to: '' });
    else if (iso < draft.from) setDraft({ from: iso, to: draft.from });
    else setDraft({ from: draft.from, to: iso });
  };

  const label = !draft.from
    ? 'Pilih tanggal awal'
    : draft.to
      ? formatDateRange(draft.from, draft.to)
      : `${formatDate(draft.from)} – …`;

  return (
    <CalendarFrame
      anchor={parseIso(value.from) ?? new Date()}
      renderDay={(day) => {
        const disabled = outOfRange(day.iso);
        const isEdge = day.iso === lo || day.iso === hi;
        const inside = Boolean(lo && hi && day.iso > lo && day.iso < hi);
        return (
          <button
            key={day.iso}
            type="button"
            disabled={disabled}
            onClick={() => pick(day.iso)}
            onMouseEnter={() => setHover(day.iso)}
            onMouseLeave={() => setHover('')}
            className={cn(
              DAY_BASE,
              day.outside && 'text-fg-4',
              inside && 'bg-primary-100 text-secondary-700',
              isEdge && 'bg-secondary-500 text-white',
              isEdge && day.iso === lo && hi && lo !== hi && 'rounded-l-full',
              isEdge && day.iso === hi && lo && lo !== hi && 'rounded-r-full',
              isEdge && (!hi || lo === hi) && 'rounded-full',
              !isEdge && !inside && 'rounded-full',
              !isEdge && !inside && !disabled && 'hover:bg-primary-100',
              !isEdge &&
                day.iso === todayIso &&
                'shadow-[inset_0_0_0_1.5px_var(--color-secondary-500)] text-secondary-600',
              disabled && 'cursor-not-allowed text-fog hover:bg-transparent',
            )}
          >
            {day.label}
          </button>
        );
      }}
      footer={
        <>
          <FooterValue empty={!draft.from}>{label}</FooterValue>
          <button
            type="button"
            disabled={!draft.from}
            onClick={() => onSelect({ from: draft.from, to: draft.to || (openEnd ? '' : draft.from) })}
            className={SET_BTN}
          >
            Set Date
          </button>
        </>
      }
    />
  );
}
