import type { ReactNode } from 'react';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import {
  DELEGATION_STATUS_LABEL,
  EXTRA_REASON_LABEL,
  REQUEST_STATUS_LABEL,
  type DelegationStatus,
  type ExtraApprovalReason,
  type RequestStatus,
} from '@/features/time-off/types';
import { cn } from '@/lib/utils';

const REQUEST_TONE: Record<RequestStatus, BadgeTone> = {
  PENDING_APPROVAL: 'info',
  AUTO_APPROVED: 'warn',
  APPROVED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

const DELEGATION_TONE: Record<DelegationStatus, BadgeTone> = {
  PENDING_APPROVAL: 'info',
  APPROVED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <StatusBadge tone={REQUEST_TONE[status]}>{REQUEST_STATUS_LABEL[status]}</StatusBadge>;
}

export function DelegationStatusBadge({ status }: { status: DelegationStatus }) {
  return <StatusBadge tone={DELEGATION_TONE[status]}>{DELEGATION_STATUS_LABEL[status]}</StatusBadge>;
}

/** Penanda lapis persetujuan tambahan — mengangkat, bukan memblokir. */
export function ExtraLayerTag({ reason }: { reason: ExtraApprovalReason | null }) {
  if (!reason) return <span className="font-body text-xs font-medium text-fg-4">Tidak terangkat</span>;

  return (
    <span className="inline-flex h-6 items-center rounded-pill bg-warning-100 px-2.5 font-body text-[10.5px] font-bold uppercase tracking-[0.04em] text-warning-800">
      {EXTRA_REASON_LABEL[reason]}
    </span>
  );
}

/** Kartu ringkas di atas tabel — port `.tm-strip`. */
export function StatStrip({ items }: { items: { label: string; value: number | string; foot: string }[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1.5 rounded-lg border border-border-1 bg-bg-surface px-4 py-3.5 shadow-card-sm"
        >
          <span className="font-body text-[10.5px] font-bold uppercase tracking-[0.05em] text-fg-3">{item.label}</span>
          <span className="font-display text-2xl font-bold leading-none text-fg-1">{item.value}</span>
          <span className="font-body text-[11.5px] font-medium leading-[1.45] text-fg-3">{item.foot}</span>
        </div>
      ))}
    </div>
  );
}

export function KeyValueList({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(150px,190px)_1fr] gap-x-4 gap-y-2.5 rounded-md border border-border-1 bg-cloud px-4 py-3.5">
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

/** Kotak hasil hitung gerbang submit di dalam form. */
export function GatePreview({
  totalDays,
  errors,
  extra,
}: {
  totalDays: number;
  errors: string[];
  extra: ExtraApprovalReason[];
}) {
  return (
    <section className="flex flex-col gap-2 rounded-md border border-border-1 bg-mist p-4">
      <h4 className="m-0 font-body text-xs font-bold uppercase tracking-[0.05em] text-fg-3">
        Hasil hitung gerbang submit
      </h4>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-xl font-bold text-fg-1">{totalDays}</span>
        <span className="font-body text-xs font-medium text-fg-3">hari kerja bersih</span>
      </div>

      {errors.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {errors.map((error) => (
            <li key={error} className="font-body text-xs font-medium leading-[1.45] text-error-700">
              {error}
            </li>
          ))}
        </ul>
      )}

      {errors.length === 0 && extra.length > 0 && (
        <p className="m-0 font-body text-xs font-medium leading-[1.45] text-warning-800">
          Lolos gerbang, tapi terangkat ke lapis persetujuan tambahan:{' '}
          {extra.map((reason) => EXTRA_REASON_LABEL[reason]).join(', ')}.
        </p>
      )}

      {errors.length === 0 && extra.length === 0 && totalDays > 0 && (
        <p className="m-0 font-body text-xs font-medium text-fg-3">
          Keempat gerbang lolos — pengajuan bisa dikirim.
        </p>
      )}
    </section>
  );
}
