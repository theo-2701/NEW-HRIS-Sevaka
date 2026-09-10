import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, toIsoDate } from '@/lib/format';
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

/**
 * Kalender rumah — port `.dp` (`_prototype/css/add-employee.css`):
 * lebar 228px, tiga tampilan (hari → bulan → tahun) yang berganti lewat judul,
 * dan footer berisi nilai terpilih + tombol "Set Date".
 *
 * Komponen ini murni tampilan; penyimpanan nilainya urusan `<DateField>`.
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
  const [view, setView] = useState<View>('days');
  const [cursor, setCursor] = useState<Date>(selected ?? new Date());
  const [draft, setDraft] = useState<Date | null>(selected);

  // Membuka ulang picker selalu mulai dari nilai yang tersimpan.
  useEffect(() => {
    setDraft(selected);
    setCursor(selected ?? new Date());
    setView('days');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const todayIso = toIsoDate(new Date());

  const outOfRange = (iso: string) => Boolean((min && iso < min) || (max && iso > max));

  const step = (direction: number) => {
    const next = new Date(cursor);
    if (view === 'days') next.setMonth(next.getMonth() + direction);
    else if (view === 'months') next.setFullYear(next.getFullYear() + direction);
    else next.setFullYear(next.getFullYear() + direction * 12);
    setCursor(next);
  };

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

  const yearsStart = Math.floor(year / 12) * 12;

  return (
    <div className="w-[228px] p-2">
      <header className="mb-1.5 flex items-center justify-between gap-1.5">
        <button
          type="button"
          aria-label="Sebelumnya"
          onClick={() => step(-1)}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border-1 bg-white text-secondary-600 transition-colors duration-200 ease-standard hover:border-primary-200 hover:bg-mist [&_svg]:size-3.5"
        >
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
        <button
          type="button"
          aria-label="Berikutnya"
          onClick={() => step(1)}
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border-1 bg-white text-secondary-600 transition-colors duration-200 ease-standard hover:border-primary-200 hover:bg-mist [&_svg]:size-3.5"
        >
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
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const disabled = outOfRange(day.iso);
              const isSelected = draft ? toIsoDate(draft) === day.iso : false;
              return (
                <button
                  key={day.iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => setDraft(parseIso(day.iso))}
                  className={cn(
                    'inline-flex aspect-square items-center justify-center rounded-full font-body text-[11px] font-medium text-fg-1 transition-colors duration-150 ease-standard',
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
            })}
          </div>
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
              className={cn(
                'rounded-md py-2.5 font-body text-xs font-semibold text-fg-1 transition-colors duration-150 ease-standard hover:bg-primary-100',
                index === month && 'font-bold text-secondary-600',
              )}
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
              className={cn(
                'rounded-md py-2.5 font-body text-xs font-semibold text-fg-1 transition-colors duration-150 ease-standard hover:bg-primary-100',
                item === year && 'font-bold text-secondary-600',
              )}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      <footer className="mt-1.5 flex items-center gap-1.5 border-t border-border-1 pt-1.5">
        <span
          className={cn(
            'inline-flex h-7 min-w-0 flex-1 items-center rounded-md border border-border-1 px-2 font-body text-[11px] font-bold text-secondary-600',
            !draft && 'font-medium text-fg-4',
          )}
        >
          {draft ? formatDate(toIsoDate(draft)) : 'Belum dipilih'}
        </span>
        <button
          type="button"
          disabled={!draft}
          onClick={() => draft && onSelect(toIsoDate(draft))}
          className="h-7 min-w-[76px] shrink-0 rounded-md px-2.5 font-body text-xs font-bold tracking-[0.01em] text-cloud [background:var(--bg-primary-btn)] [box-shadow:var(--shadow-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Set Date
        </button>
      </footer>
    </div>
  );
}
