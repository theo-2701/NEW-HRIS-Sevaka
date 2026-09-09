import type { ReactNode } from 'react';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import { STATUS_LABEL, type BatchStatus } from '@/features/mass-resignation/types';
import { cn } from '@/lib/utils';

const TONE: Record<BatchStatus, BadgeTone> = {
  DRAFT: 'mute',
  IN_APPROVAL: 'info',
  APPROVED: 'info',
  PROCESSING: 'warn',
  HALTED: 'warn',
  PROCESSED: 'ok',
  PARTIAL: 'warn',
  FAILED: 'err',
  CANCELLED: 'mute',
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <StatusBadge tone={TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>;
}

/** Bilah progres spawn — merah bila melewati ambang blast-radius. */
export function ImpactBar({ value, over, className }: { value: number; over?: boolean; className?: string }) {
  return (
    <span className={cn('inline-block h-1.5 overflow-hidden rounded-pill bg-fog', className)}>
      <span
        className={cn(
          'block h-full rounded-pill transition-[width] duration-300 ease-standard',
          over ? 'bg-error-500' : 'bg-secondary-500',
        )}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </span>
  );
}

export function KeyValueList({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(140px,180px)_1fr] gap-x-4 gap-y-2.5 rounded-md border border-border-1 bg-cloud px-4 py-3.5">
      {children}
    </div>
  );
}

export function KeyValueRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className="font-body text-[13px] font-medium text-fg-3">{label}</span>
      <span className="font-body text-[13px] font-semibold text-fg-1">{children}</span>
    </>
  );
}

export function Note({
  tone = 'info',
  icon,
  children,
}: {
  tone?: 'info' | 'warn' | 'danger';
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3.5 py-3 font-body text-[13px] font-medium leading-[1.5]',
        tone === 'info' && 'border-primary-200 bg-primary-50 text-secondary-800',
        tone === 'warn' && 'border-warning-200 bg-warning-100 text-warning-800',
        tone === 'danger' && 'border-error-200 bg-error-50 text-error-800',
      )}
    >
      <span className="mt-px [&_svg]:size-4">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
