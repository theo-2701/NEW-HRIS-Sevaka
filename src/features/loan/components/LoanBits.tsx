import type { ReactNode } from 'react';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import { reservationStateOf } from '@/features/loan/rules';
import {
  INSTALLMENT_STATUS_LABEL,
  LOAN_STATUS_LABEL,
  RESERVATION_LABEL,
} from '@/features/loan/types';
import type { InstallmentStatus, LoanStatus, ReservationState } from '@/features/loan/types';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const LOAN_TONE: Record<LoanStatus, BadgeTone> = {
  SUBMITTED: 'info',
  AWAITING_CALCULATION: 'warn',
  AWAITING_ACKNOWLEDGEMENT: 'warn',
  APPROVED: 'ok',
  DISBURSED: 'ok',
  SETTLED: 'ok',
  REJECTED: 'err',
  REJECTED_BY_EXTERNAL: 'err',
  CANCELLED: 'mute',
  WITHDRAWN: 'mute',
  DECLINED_BY_EMPLOYEE: 'mute',
  CLOSED: 'mute',
};

const RESERVATION_TONE: Record<ReservationState, BadgeTone> = {
  HELD: 'warn',
  CONSUMED: 'ok',
  RELEASED: 'mute',
};

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  return <StatusBadge tone={LOAN_TONE[status]}>{LOAN_STATUS_LABEL[status]}</StatusBadge>;
}

export function ReservationBadge({ state }: { state: ReservationState }) {
  return <StatusBadge tone={RESERVATION_TONE[state]}>{RESERVATION_LABEL[state]}</StatusBadge>;
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  return (
    <StatusBadge tone={status === 'CONFIRMED' ? 'ok' : 'warn'}>{INSTALLMENT_STATUS_LABEL[status]}</StatusBadge>
  );
}

/** Nominal rupiah; `muted` untuk angka yang belum pasti (bunga, total). */
export function Money({ value, muted }: { value: number | null; muted?: boolean }) {
  if (value === null) return <span className="font-body text-[13px] font-medium text-fg-4">—</span>;
  return (
    <span className={cn('font-body text-[13px] font-semibold tabular-nums', muted ? 'text-fg-3' : 'text-fg-1')}>
      {formatCurrency(value)}
    </span>
  );
}

/**
 * Sel reservasi: nominal yang ditahan plus keadaannya. Keadaan dihitung dari
 * status, bukan disimpan — satu sumber kebenaran.
 */
export function ReservationCell({ amount, status }: { amount: number; status: LoanStatus }) {
  const state = reservationStateOf(status);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Money value={amount} muted={state !== 'HELD'} />
      <ReservationBadge state={state} />
    </span>
  );
}

/** Kartu ringkas ruang pinjam — port `.fin-cards`. */
export function RoomCards({
  items,
}: {
  items: { label: string; value: ReactNode; foot: string; hero?: boolean }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'flex flex-col gap-1.5 rounded-lg border px-4 py-3.5 shadow-card-sm',
            item.hero ? 'border-primary-200 bg-primary-50' : 'border-border-1 bg-bg-surface',
          )}
        >
          <span className="font-body text-[10.5px] font-bold uppercase tracking-[0.05em] text-fg-3">{item.label}</span>
          <span className="font-display text-2xl font-bold leading-none text-fg-1">{item.value}</span>
          <span className="font-body text-[11.5px] font-medium leading-[1.45] text-fg-3">{item.foot}</span>
        </div>
      ))}
    </div>
  );
}
