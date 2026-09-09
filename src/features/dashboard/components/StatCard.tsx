import type { ReactNode } from 'react';
import { ChevronDown, Info, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  /** Teks tooltip ikon info di samping judul. */
  info?: string;
  children: ReactNode;
  /** Footer "Filter ▾" — dipakai keempat kartu statistik dashboard. */
  onFilter?: () => void;
  className?: string;
}

/**
 * Kartu statistik dashboard — port `.stat-card` (`_prototype/css/dashboard.css`):
 * head (judul + ikon info + kebab) · body · footer Cloud dengan tombol "Filter ▾".
 */
export function StatCard({ title, info, children, onFilter, className }: StatCardProps) {
  return (
    <section
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border-1 bg-bg-surface shadow-card-sm',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 px-[18px] pb-1 pt-[18px]">
        <h3 className="m-0 inline-flex items-center gap-1.5 font-body text-sm font-bold leading-tight text-fg-1">
          {title}
          {info && (
            <span title={info} className="inline-flex size-3.5 cursor-help items-center justify-center text-fg-4">
              <Info className="size-3.5" />
            </span>
          )}
        </h3>
        <button
          type="button"
          aria-label="Opsi kartu"
          className="inline-flex size-7 items-center justify-center rounded-md bg-transparent text-fg-3 transition-colors duration-200 ease-standard hover:bg-mist hover:text-fg-1"
        >
          <MoreVertical className="size-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-[18px] pb-[18px] pt-2">{children}</div>

      <footer className="flex items-center justify-between border-t border-border-1 bg-cloud px-[18px] py-2.5">
        <button
          type="button"
          onClick={onFilter}
          className="inline-flex items-center gap-1.5 rounded-md bg-transparent px-1 py-1.5 font-body text-xs font-semibold leading-none text-secondary-600 transition-colors duration-200 ease-standard hover:bg-primary-100 hover:text-secondary-700"
        >
          Filter
          <ChevronDown className="size-3.5" />
        </button>
      </footer>
    </section>
  );
}
