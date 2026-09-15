import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import {
  ADVANCE_STATUS_LABEL,
  DIFFERENCE_STATUS_LABEL,
  DIFFERENCE_TYPE_LABEL,
  ITEM_STATUS_LABEL,
  SETTLEMENT_STATUS_LABEL,
} from '@/features/cash-advance/types';
import type {
  CashAdvanceStatus,
  DifferenceStatus,
  DifferenceType,
  SettlementItem,
  SettlementStatus,
} from '@/features/cash-advance/types';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const ADVANCE_TONE: Record<CashAdvanceStatus, BadgeTone> = {
  SUBMITTED: 'info',
  APPROVED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
  REPUDIATED: 'warn',
  SETTLED: 'mute',
};

const SETTLEMENT_TONE: Record<SettlementStatus, BadgeTone> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warn',
  ACCEPTED: 'ok',
  REJECTED: 'err',
};

const DIFFERENCE_TONE: Record<DifferenceStatus, BadgeTone> = {
  OPEN: 'info',
  AWAITING_APPROVAL: 'warn',
  APPROVED: 'ok',
  REJECTED: 'err',
  SETTLED: 'mute',
};

export function AdvanceStatusBadge({ status }: { status: CashAdvanceStatus }) {
  return <StatusBadge tone={ADVANCE_TONE[status]}>{ADVANCE_STATUS_LABEL[status]}</StatusBadge>;
}

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  return <StatusBadge tone={SETTLEMENT_TONE[status]}>{SETTLEMENT_STATUS_LABEL[status]}</StatusBadge>;
}

export function DifferenceStatusBadge({ status }: { status: DifferenceStatus }) {
  return <StatusBadge tone={DIFFERENCE_TONE[status]}>{DIFFERENCE_STATUS_LABEL[status]}</StatusBadge>;
}

export function DifferenceTypeBadge({ type }: { type: DifferenceType }) {
  return (
    <StatusBadge tone={type === 'SHORTFALL' ? 'warn' : 'info'}>{DIFFERENCE_TYPE_LABEL[type]}</StatusBadge>
  );
}

/**
 * Status satu nota. Sebelum tahap diputus, penandaan petugas tampil sebagai
 * "Flagged" — `item_status` baru final saat tahapnya diterima.
 */
export function ItemStatusBadge({ item, decided }: { item: SettlementItem; decided: boolean }) {
  if (!decided) {
    return item.flaggedReasonId ? (
      <StatusBadge tone="warn">Flagged</StatusBadge>
    ) : (
      <StatusBadge tone="mute">Unflagged</StatusBadge>
    );
  }
  return (
    <StatusBadge tone={item.itemStatus === 'ACCEPTED' ? 'ok' : item.itemStatus === 'REJECTED' ? 'err' : 'mute'}>
      {ITEM_STATUS_LABEL[item.itemStatus]}
    </StatusBadge>
  );
}

export function StageBadge({ isFinalStage, isCorrection }: { isFinalStage: boolean; isCorrection: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <StatusBadge tone={isFinalStage ? 'brand' : 'mute'} dot={false}>
        {isFinalStage ? 'Closing' : 'Partial'}
      </StatusBadge>
      {isCorrection && (
        <StatusBadge tone="warn" dot={false}>
          Correction
        </StatusBadge>
      )}
    </span>
  );
}

export function Money({ value, tone }: { value: number | null; tone?: 'muted' | 'plus' | 'minus' }) {
  if (value === null) return <span className="font-body text-[13px] font-medium text-fg-4">—</span>;
  return (
    <span
      className={cn(
        'font-body text-[13px] font-semibold tabular-nums',
        tone === 'muted' ? 'text-fg-3' : tone === 'minus' ? 'text-error-600' : tone === 'plus' ? 'text-success-700' : 'text-fg-1',
      )}
    >
      {formatCurrency(value)}
    </span>
  );
}
