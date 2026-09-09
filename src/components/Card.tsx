import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Kartu standar — port `.card`. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3.5 rounded-xl border border-border-1 bg-bg-surface px-5 py-[18px] shadow-card-sm',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHead({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="m-0 font-display text-base font-bold leading-tight text-fg-1">{title}</h3>
        {sub && <p className="mt-1 font-body text-xs font-medium text-fg-3">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

/** Kartu statistik dashboard — port `.stat__*`. */
export function StatCard({
  label,
  value,
  delta,
  deltaTone = 'flat',
  footer,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  deltaTone?: 'up' | 'down' | 'flat';
  footer?: ReactNode;
}) {
  return (
    <Card className="gap-2">
      <span className="font-body text-xs font-medium uppercase leading-none tracking-[0.04em] text-fg-3">{label}</span>
      <span className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-fg-1">{value}</span>
      {delta && (
        <span
          className={cn(
            'inline-flex w-fit items-center gap-1 rounded-pill px-2 py-[3px] font-body text-[11px] font-bold leading-none',
            deltaTone === 'up' && 'bg-success-100 text-success-900',
            deltaTone === 'down' && 'bg-error-100 text-error-800',
            deltaTone === 'flat' && 'bg-vapor text-fg-2',
          )}
        >
          {delta}
        </span>
      )}
      {footer}
    </Card>
  );
}

/** Empty state — jangan menampilkan `[...]` placeholder saat data kosong. */
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-2 bg-mist px-6 py-10 text-center">
      <p className="m-0 font-body text-sm font-bold text-fg-1">{title}</p>
      {description && <p className="m-0 max-w-[420px] font-body text-[13px] font-medium text-fg-3">{description}</p>}
      {action}
    </div>
  );
}
