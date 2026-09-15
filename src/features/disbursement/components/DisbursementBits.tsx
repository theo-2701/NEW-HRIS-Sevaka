import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import {
  CLEARANCE_STATUS_LABEL,
  MARK_SOURCE_LABEL,
  MARK_STATUS_LABEL,
  PAYABLE_TYPE_LABEL,
  PAYMENT_METHOD_LABEL,
} from '@/features/disbursement/types';
import type {
  ClearanceStatus,
  MarkSource,
  MarkStatus,
  PayableType,
  PaymentMethod,
} from '@/features/disbursement/types';

const TYPE_TONE: Record<PayableType, BadgeTone> = {
  BENEFIT_CLAIM: 'info',
  LOAN: 'brand',
  CASH_ADVANCE: 'ok',
  CASH_ADVANCE_SHORTFALL: 'warn',
};

const CLEARANCE_TONE: Record<ClearanceStatus, BadgeTone> = {
  OUTSTANDING: 'warn',
  CLEARED_BY_REPAYMENT: 'ok',
  DECLARED_SETTLED: 'info',
};

/** Satu kolom badge di grid gabungan — bukan empat tab (FSD §5.3.1). */
export function PayableTypeBadge({ type }: { type: PayableType }) {
  return (
    <StatusBadge tone={TYPE_TONE[type]} dot={false}>
      {PAYABLE_TYPE_LABEL[type]}
    </StatusBadge>
  );
}

export function MarkStatusBadge({ status }: { status: MarkStatus }) {
  return <StatusBadge tone={status === 'MARKED' ? 'ok' : 'warn'}>{MARK_STATUS_LABEL[status]}</StatusBadge>;
}

/** `CLIENT_SYSTEM` = hasil pintu mesin, baca saja di layar ini. */
export function MarkSourceBadge({ source }: { source: MarkSource }) {
  return (
    <StatusBadge tone={source === 'CLIENT_SYSTEM' ? 'brand' : 'mute'} dot={false}>
      {MARK_SOURCE_LABEL[source]}
    </StatusBadge>
  );
}

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return (
    <StatusBadge tone="info" dot={false}>
      {PAYMENT_METHOD_LABEL[method]}
    </StatusBadge>
  );
}

export function ClearanceStatusBadge({ status }: { status: ClearanceStatus }) {
  return <StatusBadge tone={CLEARANCE_TONE[status]}>{CLEARANCE_STATUS_LABEL[status]}</StatusBadge>;
}
