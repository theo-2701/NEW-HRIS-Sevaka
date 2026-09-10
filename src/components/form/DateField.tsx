import { useState } from 'react';
import type { ReactNode } from 'react';
import { useField } from 'formik';
import { CalendarDays, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FormField } from '@/components/form/FormField';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DateFieldProps {
  name: string;
  label?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  placeholder?: string;
  /** Batas ISO `YYYY-MM-DD` — tanggal di luar rentang tidak bisa dipilih. */
  min?: string;
  max?: string;
  disabled?: boolean;
  /** Sembunyikan tombol hapus untuk field yang wajib terisi terus. */
  clearable?: boolean;
  containerClassName?: string;
}

/**
 * Field tanggal terikat Formik — **satu-satunya cara** memilih tanggal di
 * layar SEVAKA. Jangan memakai `<input type="date">` bawaan browser: bentuk dan
 * bahasanya ikut sistem operasi, jadi tidak pernah sama antar mesin.
 *
 * Nilainya tetap ISO `YYYY-MM-DD` (siap dikirim ke API); yang ditampilkan
 * format rumah `12 Agu 2026`.
 */
export function DateField({
  name,
  label,
  hint,
  required,
  placeholder = 'Pilih tanggal',
  min,
  max,
  disabled,
  clearable = true,
  containerClassName,
}: DateFieldProps) {
  const [field, meta, helpers] = useField<string>(name);
  const [open, setOpen] = useState(false);
  const error = meta.touched && meta.error ? meta.error : undefined;
  const hasValue = Boolean(field.value);

  return (
    <FormField name={name} label={label} required={required} hint={hint} error={error} className={containerClassName}>
      {/* `modal` penting: date picker sering dipakai DI DALAM modal, dan tanpa ini
          jebakan fokus dialog langsung menutup popover-nya. */}
      <Popover
        modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Menutup picker dihitung sebagai "sudah disentuh" supaya galat wajib muncul.
          if (!next) void helpers.setTouched(true);
        }}
      >
        <PopoverTrigger asChild>
          <button
            id={name}
            type="button"
            disabled={disabled}
            aria-invalid={Boolean(error)}
            className={cn(
              'flex h-9 w-full items-center gap-2 rounded-md border border-silver bg-cloud px-3 text-left font-body text-xs font-medium leading-[1.4] outline-none transition-[border-color,box-shadow] duration-200 ease-standard',
              'focus-visible:border-secondary-500 focus-visible:shadow-[0_0_0_4px_rgba(2,132,199,.16)]',
              'disabled:cursor-not-allowed disabled:bg-vapor disabled:text-fg-4',
              error && 'border-error-500',
              hasValue ? 'text-fg-2' : 'text-fg-4',
            )}
          >
            <span className="min-w-0 flex-1 truncate">{hasValue ? formatDate(field.value) : placeholder}</span>

            {clearable && hasValue && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Hapus tanggal"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void helpers.setValue('');
                }}
                className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-fg-4 transition-colors duration-200 ease-standard hover:text-error-600 [&_svg]:size-3.5"
              >
                <X />
              </span>
            )}

            <CalendarDays className="size-4 shrink-0 text-fg-3" />
          </button>
        </PopoverTrigger>

        <PopoverContent>
          <Calendar
            value={field.value}
            min={min}
            max={max}
            onSelect={(iso) => {
              void helpers.setValue(iso);
              void helpers.setTouched(true, false);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </FormField>
  );
}
