import { StatusBadge } from '@/components/StatusBadge';
import {
  CLAIM_STATUS_LABEL,
  LEDGER_TYPE_LABEL,
  PERIOD_STATUS_LABEL,
  RESERVATION_LABEL,
} from '@/features/benefit/types';
import type {
  BenefitBalance,
  ClaimStatus,
  LedgerEntryType,
  PeriodStatus,
  ReservationState,
} from '@/features/benefit/types';
import { remainingOf } from '@/features/benefit/rules';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const CLAIM_TONE: Record<ClaimStatus, 'ok' | 'warn' | 'err' | 'mute' | 'info'> = {
  SUBMITTED: 'info',
  APPROVED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
  AWAITING_RESUBMIT: 'warn',
};

const RESERVATION_TONE: Record<ReservationState, 'ok' | 'warn' | 'mute'> = {
  HELD: 'warn',
  CONSUMED: 'ok',
  RELEASED: 'mute',
};

const LEDGER_TONE: Record<LedgerEntryType, 'warn' | 'info' | 'mute'> = {
  RESERVATION: 'warn',
  USAGE: 'info',
  RELEASE: 'mute',
  ADJUSTMENT: 'warn',
};

const PERIOD_TONE: Record<PeriodStatus, 'ok' | 'warn' | 'mute'> = {
  OPEN: 'ok',
  GRACE: 'warn',
  CLOSED: 'mute',
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return <StatusBadge tone={CLAIM_TONE[status]}>{CLAIM_STATUS_LABEL[status]}</StatusBadge>;
}

export function ReservationBadge({ state }: { state: ReservationState }) {
  return <StatusBadge tone={RESERVATION_TONE[state]}>{RESERVATION_LABEL[state]}</StatusBadge>;
}

export function LedgerTypeBadge({ type }: { type: LedgerEntryType }) {
  return <StatusBadge tone={LEDGER_TONE[type]}>{LEDGER_TYPE_LABEL[type]}</StatusBadge>;
}

export function PeriodStatusBadge({ status }: { status: PeriodStatus }) {
  return <StatusBadge tone={PERIOD_TONE[status]}>{PERIOD_STATUS_LABEL[status]}</StatusBadge>;
}

/** Nominal rupiah — tanda dipakai untuk delta ledger. */
export function Money({ value, signed, muted }: { value: number; signed?: 'plus' | 'minus'; muted?: boolean }) {
  return (
    <span
      className={cn(
        'font-body text-[13px] font-semibold tabular-nums',
        signed === 'minus' ? 'text-error-600' : signed === 'plus' ? 'text-success-700' : muted ? 'text-fg-3' : 'text-fg-1',
      )}
    >
      {signed === 'minus' ? '− ' : signed === 'plus' ? '+ ' : ''}
      {formatCurrency(value)}
    </span>
  );
}

/**
 * Kartu saldo satu jenis manfaat: bar menunjukkan bagian yang sudah terpakai
 * dan bagian yang sedang ditahan — sisanya yang benar-benar bisa diklaim.
 */
export function BalanceCard({ balance }: { balance: BenefitBalance }) {
  const remaining = remainingOf(balance);
  const usedPct = Math.round((balance.usedAmount / balance.entitledAmount) * 100);
  const reservedPct = Math.round((balance.reservedAmount / balance.entitledAmount) * 100);

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border-1 bg-bg-surface px-4 py-3.5 shadow-card-sm">
      <span className="font-body text-[11px] font-bold uppercase tracking-[0.05em] text-fg-3">
        {balance.benefitTypeName}
      </span>
      <span className="font-display text-xl font-bold leading-none text-fg-1">
        {formatCurrency(remaining)}
        <span className="ml-1.5 font-body text-[11px] font-medium text-fg-3">remaining</span>
      </span>

      <div className="flex h-2 overflow-hidden rounded-full bg-vapor">
        <span className="bg-secondary-500" style={{ width: `${usedPct}%` }} />
        <span className="bg-warning-400" style={{ width: `${reservedPct}%` }} />
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 font-body text-[11px] font-medium text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2 rounded-sm bg-secondary-500" />
          Used {formatCurrency(balance.usedAmount)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2 rounded-sm bg-warning-400" />
          Reserved {formatCurrency(balance.reservedAmount)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2 rounded-sm bg-vapor" />
          Entitled {formatCurrency(balance.entitledAmount)}
        </span>
      </div>
    </div>
  );
}

export function YesNo({ value }: { value: boolean }) {
  return value ? (
    <span className="font-body text-[13px] font-medium text-fg-1">Yes</span>
  ) : (
    <span className="font-body text-[13px] font-medium text-fg-4">No</span>
  );
}
