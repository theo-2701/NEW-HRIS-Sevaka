import { cn } from '@/lib/utils';

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
}

interface SegmentedProps<V extends string> {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}

/**
 * Kontrol segmented — port `.seg` / `.seg__btn`.
 * Dipakai untuk sub-tab tabel (mis. Directory ↔ Organization) supaya
 * hanya SATU tabel yang tampil; jangan menumpuk dua tabel dalam satu panel,
 * dan jangan membuat gaya pill kedua.
 */
export function Segmented<V extends string>({ options, value, onChange, className }: SegmentedProps<V>) {
  return (
    /* `w-fit self-start` menjaga lebar mengikuti isi — tanpa ini kontrol
       ikut melar saat dipasang di dalam kolom flex/grid. */
    <div
      className={cn('inline-flex w-fit shrink-0 self-start items-center gap-1 rounded-md bg-vapor p-1', className)}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'h-8 rounded-md px-3.5 font-body text-[13px] font-bold transition-[background,color,box-shadow] duration-200 ease-standard',
              active ? 'bg-white text-secondary-700 shadow-card-sm' : 'text-fg-3 hover:text-secondary-700',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
