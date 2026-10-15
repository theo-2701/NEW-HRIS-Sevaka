import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bingkai section Home. Hero sudah memikul satu-satunya gradien di halaman; panel di bawahnya
 * sengaja tenang — ikon garis polos di samping judul, tanpa ubin bergradien.
 */
export function Panel({
  title,
  meta,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col rounded-xl border border-border-1 bg-bg-surface shadow-card-sm', className)}>
      <header className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && <Icon className="mt-0.5 size-[18px] shrink-0 text-secondary-600" strokeWidth={1.75} />}
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="m-0 font-display text-[15px] font-bold leading-tight text-fg-1">{title}</h2>
            {meta && <span className="truncate font-body text-xs font-medium text-fg-3">{meta}</span>}
          </div>
        </div>
        {action}
      </header>
      <div className="flex flex-col px-5 pb-4 pt-1">{children}</div>
    </section>
  );
}

/** Tautan teks di pojok panel. */
export function PanelLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex shrink-0 items-center gap-1 font-body text-[13px] font-semibold text-fg-link hover:text-fg-link-hover"
    >
      {children}
      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
    </button>
  );
}


/**
 * Kelompok di dalam modal "View all": judul kecil + jumlah di kanan, garis tipis di bawahnya.
 * Judul menempel di atas saat body modal di-scroll (body modal ber-padding atas 20px → `-top-5`),
 * jadi pengguna selalu tahu sedang membaca kelompok mana.
 */
export function ListSection({ label, count, children }: { label: string; count: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <header className="sticky -top-5 z-10 flex items-baseline justify-between gap-3 border-b border-border-1 bg-bg-surface pb-1.5 pt-1">
        <h3 className="m-0 font-body text-xs font-bold uppercase tracking-[0.06em] text-fg-3">{label}</h3>
        <span className="font-body text-xs font-medium text-fg-3 tabular-nums">{count}</span>
      </header>
      {children}
    </section>
  );
}
