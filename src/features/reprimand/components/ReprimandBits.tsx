import type { ReactNode } from 'react';
import { EyeOff, Lock, OctagonAlert } from 'lucide-react';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import {
  STANDING_LABEL,
  STATUS_LABEL,
  type ReprimandStatus,
  type StandingLevel,
} from '@/features/reprimand/types';
import { cn } from '@/lib/utils';

const STATUS_TONE: Record<ReprimandStatus, BadgeTone> = {
  IN_APPROVAL: 'info',
  ACTIVE: 'ok',
  EXPIRED: 'mute',
  REVOKED: 'err',
  CANCELLED: 'mute',
};

export function ReprimandStatusBadge({ status }: { status: ReprimandStatus }) {
  return <StatusBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>;
}

/** Pil standing — port `.standing-pill`. Final warning membawa ikon peringatan. */
export function StandingPill({ level }: { level: StandingLevel }) {
  return (
    <span
      className={cn(
        'inline-flex h-[26px] items-center gap-1.5 rounded-pill px-3 font-body text-[11px] font-bold tracking-[0.04em]',
        level === 'CLEAN' && 'bg-success-100 text-success-900',
        level === 'SP1' && 'bg-warning-100 text-warning-800',
        level === 'SP2' && 'bg-warning-200 text-warning-900',
        level === 'FINAL' && 'bg-error-100 text-error-800',
        '[&_svg]:size-3.5',
      )}
    >
      {level === 'FINAL' && <OctagonAlert />}
      {STANDING_LABEL[level]}
    </span>
  );
}

/**
 * Penanda kolom PII — alasan reprimand tidak pernah dirender di grid
 * lintas-subjek (UIC §1.9); isinya hanya terbuka di layar detail.
 */
export function ReasonHidden() {
  return (
    <span className="inline-flex items-center gap-1.5 font-body text-xs font-medium text-fg-4 [&_svg]:size-3.5">
      <EyeOff />
      Disembunyikan
    </span>
  );
}

/** Panel snapshot yang dibekukan server — selalu read-only. */
export function SnapshotPanel({
  title = 'Snapshot server (beku saat diterbitkan — read-only)',
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-md border border-border-1 bg-mist p-4">
      <h4 className="m-0 inline-flex items-center gap-2 font-body text-xs font-bold uppercase tracking-[0.05em] text-fg-3 [&_svg]:size-3.5">
        <Lock />
        {title}
      </h4>
      <div className="grid gap-x-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function SnapshotRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-vapor py-2.5 last:border-b-0">
      <span className="font-body text-xs font-medium text-fg-3">{label}</span>
      <span className="font-body text-[13px] font-bold text-fg-1">{children}</span>
    </div>
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
  tone?: 'info' | 'warn';
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3.5 py-3 font-body text-[13px] font-medium leading-[1.5]',
        tone === 'info' && 'border-primary-200 bg-primary-50 text-secondary-800',
        tone === 'warn' && 'border-warning-200 bg-warning-100 text-warning-800',
      )}
    >
      <span className="mt-px [&_svg]:size-4">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
