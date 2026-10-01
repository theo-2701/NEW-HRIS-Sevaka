import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface MultiSelectOption<T extends string = string> {
  value: T;
  label: string;
}

/** Pemicu — bentuknya sama dengan `<SelectTrigger>` supaya sejajar dropdown biasa. */
const TRIGGER = cn(
  'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-silver bg-cloud px-3 text-left font-body text-xs font-medium leading-[1.4] outline-none transition-[border-color,box-shadow] duration-200 ease-standard',
  'focus-visible:border-secondary-500 focus-visible:shadow-[0_0_0_4px_rgba(2,132,199,.16)]',
  'disabled:cursor-not-allowed disabled:bg-vapor disabled:text-fg-4',
);

/** "Active" · "Active +2" — label pilihan pertama (urut opsi, bukan urut klik) + sisa. */
function summarizeSelection<T extends string>(options: MultiSelectOption<T>[], value: T[]): string {
  const picked = options.filter((option) => value.includes(option.value));
  if (!picked.length) return '';
  return picked.length === 1 ? picked[0].label : `${picked[0].label} +${picked.length - 1}`;
}

/**
 * Dropdown multi-pilih berisi checkbox — pengganti deret chip untuk filter operator IN.
 * Kosong = tanpa batasan (semua), jadi tidak ada "pilih semua"; cukup "Clear" untuk mengosongkan.
 * Menu tetap terbuka selama memilih supaya beberapa centang tidak perlu membuka ulang.
 *
 * Di toolbar tabel beri `className="h-10 w-[200px]"` supaya sejajar kontrol toolbar 40px.
 */
export function MultiSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Semua',
  id,
  disabled,
  className,
}: {
  value: T[];
  onChange: (next: T[]) => void;
  options: MultiSelectOption<T>[];
  /** Teks saat tidak ada yang dipilih, mis. "All statuses". */
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const summary = summarizeSelection(options, value);
  const toggle = (option: T, checked: boolean) =>
    onChange(checked ? [...value, option] : value.filter((item) => item !== option));

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(TRIGGER, summary ? 'text-fg-2' : 'text-fg-4', className)}
        >
          <span className="min-w-0 flex-1 truncate">{summary || placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-fg-3" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-1.5">
        <div role="group" aria-label={placeholder} className="flex max-h-72 flex-col overflow-y-auto">
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 font-body text-[13px] font-medium text-fg-1 transition-colors duration-200 ease-standard hover:bg-mist hover:text-secondary-700"
              >
                <Checkbox checked={checked} onCheckedChange={(next) => toggle(option.value, next === true)} />
                {option.label}
              </label>
            );
          })}
        </div>
        {value.length > 0 && (
          <div className="mt-1 flex justify-end border-t border-border-1 px-1 pt-1.5">
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-md px-2 py-1 font-body text-xs font-bold text-secondary-700 transition-colors duration-200 ease-standard hover:bg-mist"
            >
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
