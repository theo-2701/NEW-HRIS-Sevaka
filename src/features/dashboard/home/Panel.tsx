import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bingkai section Home. Chip ikon memakai gradasi yang sama dengan hero (`secondary-700 → 500`)
 * supaya panel di bawah hero terasa satu keluarga dengannya.
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
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-135 from-secondary-700 to-secondary-500 text-white shadow-card-sm">
              <Icon className="size-[18px]" strokeWidth={1.75} />
            </span>
          )}
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
