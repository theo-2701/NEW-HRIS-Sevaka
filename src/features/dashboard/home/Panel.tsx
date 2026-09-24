import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Bingkai section Home: judul kecil + garis tipis, isi tanpa ikon dekoratif. */
export function Panel({
  title,
  meta,
  action,
  children,
  className,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col rounded-xl border border-border-1 bg-bg-surface', className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border-1 px-5 py-3.5">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h2 className="m-0 font-display text-[15px] font-bold leading-tight text-fg-1">{title}</h2>
          {meta && <span className="truncate font-body text-xs font-medium text-fg-3">{meta}</span>}
        </div>
        {action}
      </header>
      <div className="flex flex-col px-5 py-4">{children}</div>
    </section>
  );
}

/** Tautan teks di pojok panel — tanpa ikon, sesuai aturan tombol rumah. */
export function PanelLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 font-body text-[13px] font-semibold text-fg-link hover:text-fg-link-hover hover:underline"
    >
      {children}
    </button>
  );
}
