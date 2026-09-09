import { cn } from '@/lib/utils';

export interface TabMenuItem<V extends string> {
  value: V;
  label: string;
  /** Angka pendamping — dirender sebagai pil kecil di bawah/di samping label. */
  count?: number;
}

/**
 * Tab-menu bergaris bawah — port `.tabs` / `.tabs__tab`.
 *
 * Dipakai untuk berpindah antar **muka halaman** (mis. Adjust ↔ History):
 * label UPPERCASE, tab aktif Ocean dengan garis bawah 3px, dan garis rambut
 * membentang di seluruh baris. Untuk memilih isi satu panel (mis. Directory ↔
 * Organization) tetap pakai `<Segmented>`.
 */
export function TabMenu<V extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabMenuItem<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end gap-1 border-b border-border-1', className)} role="tablist">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-[3px] px-4 pb-2.5 pt-2 font-body text-[13px] font-bold uppercase tracking-[0.04em] transition-[color,border-color] duration-200 ease-standard',
              active
                ? 'border-secondary-500 text-secondary-500'
                : 'border-transparent text-fg-3 hover:text-secondary-700',
            )}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 font-body text-[11px] font-bold tracking-normal',
                  active ? 'bg-primary-200 text-secondary-700' : 'bg-vapor text-fg-3',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
