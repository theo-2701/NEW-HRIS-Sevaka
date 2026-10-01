import { useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Calendar, RangeCalendar, type DateRange } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDate, formatDateRange } from '@/lib/format';
import { cn } from '@/lib/utils';

export type { DateRange };

/** Pemicu field tanggal — 36px, isi Cloud, border Silver (standar field rumah). */
const TRIGGER = cn(
  'flex h-9 w-full items-center gap-2 rounded-md border border-silver bg-cloud px-3 text-left font-body text-xs font-medium leading-[1.4] outline-none transition-[border-color,box-shadow] duration-200 ease-standard',
  'focus-visible:border-secondary-500 focus-visible:shadow-[0_0_0_4px_rgba(2,132,199,.16)]',
  'disabled:cursor-not-allowed disabled:bg-vapor disabled:text-fg-4',
);

function ClearMark({ onClear }: { onClear: () => void }) {
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label="Hapus tanggal"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClear();
      }}
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-fg-4 transition-colors duration-200 ease-standard hover:text-error-600 [&_svg]:size-3.5"
    >
      <X />
    </span>
  );
}

interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  placeholder?: string;
  /** Batas ISO `YYYY-MM-DD` — tanggal di luar rentang tidak bisa dipilih. */
  min?: string;
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Sembunyikan tombol hapus untuk field yang wajib terisi terus. */
  clearable?: boolean;
  /** Dipanggil saat picker ditutup — dipakai `DateField` untuk menandai touched. */
  onClose?: () => void;
  className?: string;
}

/**
 * Pemilih tanggal tanpa Formik — **satu-satunya** tampilan tanggal di SEVAKA.
 * Jangan memakai `<input type="date">` bawaan browser: bentuk dan bahasanya
 * ikut sistem operasi, jadi tidak pernah sama antar mesin.
 *
 * Di dalam form pakai `<DateField>` (pembungkus Formik dari komponen ini);
 * di luar form — toolbar, modal filter — pakai komponen ini langsung.
 *
 * Nilainya tetap ISO `YYYY-MM-DD`; yang ditampilkan format rumah `12 Agu 2026`.
 */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder = 'Pilih tanggal',
  min,
  max,
  disabled,
  invalid,
  clearable = true,
  onClose,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const hasValue = Boolean(value);

  return (
    /* `modal` penting: date picker sering dipakai DI DALAM modal, dan tanpa ini
       jebakan fokus dialog langsung menutup popover-nya. */
    <Popover
      modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onClose?.();
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={invalid}
          className={cn(TRIGGER, invalid && 'border-error-500', hasValue ? 'text-fg-2' : 'text-fg-4', className)}
        >
          <span className="min-w-0 flex-1 truncate">{hasValue ? formatDate(value) : placeholder}</span>
          {clearable && hasValue && !disabled && <ClearMark onClear={() => onChange('')} />}
          <CalendarDays className="size-4 shrink-0 text-fg-3" />
        </button>
      </PopoverTrigger>

      <PopoverContent>
        <Calendar
          value={value}
          min={min}
          max={max}
          onSelect={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

const EMPTY_RANGE: DateRange = { from: '', to: '' };

/**
 * Rentang tanggal dalam SATU field — standar rumah untuk setiap pasangan "dari – sampai" (filter
 * periode, rentang dibuat, tanggal efektif). Menggantikan dua `<DatePicker>` berdampingan: satu
 * pemicu, satu kalender, klik pertama = awal, klik kedua = akhir.
 *
 * Di toolbar tabel beri `className="h-10 w-[260px]"` supaya sejajar kontrol toolbar 40px.
 */
export function DateRangePicker({
  value,
  onChange,
  id,
  placeholder = 'Pilih rentang tanggal',
  min,
  max,
  disabled,
  invalid,
  clearable = true,
  openEnd = false,
  lockFrom = false,
  onClose,
  className,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  id?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
  clearable?: boolean;
  /** Tanggal akhir boleh kosong — tampil "12 Agu 2026 – seterusnya". */
  openEnd?: boolean;
  /** Tanggal awal tidak boleh berubah lagi (mis. pola yang sudah berlaku) — hanya akhir yang dipilih. */
  lockFrom?: boolean;
  onClose?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasValue = Boolean(value.from || value.to);
  const shown =
    openEnd && value.from && !value.to
      ? `${formatDate(value.from)} – seterusnya`
      : formatDateRange(value.from, value.to);

  return (
    <Popover
      modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onClose?.();
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={invalid}
          className={cn(TRIGGER, invalid && 'border-error-500', hasValue ? 'text-fg-2' : 'text-fg-4', className)}
        >
          <span className="min-w-0 flex-1 truncate">{hasValue ? shown : placeholder}</span>
          {clearable && hasValue && !disabled && (
            <ClearMark onClear={() => onChange(lockFrom ? { from: value.from, to: '' } : EMPTY_RANGE)} />
          )}
          <CalendarDays className="size-4 shrink-0 text-fg-3" />
        </button>
      </PopoverTrigger>

      <PopoverContent>
        <RangeCalendar
          value={value}
          min={min}
          max={max}
          openEnd={openEnd}
          lockFrom={lockFrom}
          onSelect={(range) => {
            onChange(range);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
