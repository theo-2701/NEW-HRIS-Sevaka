import type { ReactNode } from 'react';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import {
  PLAN_STATUS_LABEL,
  REQUISITION_STATUS_LABEL,
  type PlanStatus,
  type RequisitionStatus,
} from '@/features/manpower/types';
import { cn } from '@/lib/utils';

const REQUISITION_TONE: Record<RequisitionStatus, BadgeTone> = {
  DRAFT: 'mute',
  IN_APPROVAL: 'info',
  APPROVED: 'ok',
  REJECTED: 'err',
  FULFILLED: 'ok',
  CANCELLED: 'mute',
};

const PLAN_TONE: Record<PlanStatus, BadgeTone> = {
  DRAFT: 'mute',
  ACTIVE: 'ok',
  CLOSED: 'info',
  ARCHIVED: 'mute',
};

export function RequisitionStatusBadge({ status }: { status: RequisitionStatus }) {
  return <StatusBadge tone={REQUISITION_TONE[status]}>{REQUISITION_STATUS_LABEL[status]}</StatusBadge>;
}

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <StatusBadge tone={PLAN_TONE[status]}>{PLAN_STATUS_LABEL[status]}</StatusBadge>;
}

/**
 * Nilai gap (target − aktual) — port `.gapv`. Gap positif berarti masih ada
 * kursi yang belum terisi, jadi ditandai Amber; nol/negatif netral.
 */
export function GapValue({ gap }: { gap: number | null }) {
  if (gap === null) return <span className="font-body text-[13px] font-medium text-fg-3">—</span>;

  return (
    <span
      className={cn(
        'inline-flex min-w-[26px] justify-center rounded-pill px-2 py-0.5 font-body text-xs font-bold',
        gap > 0 ? 'bg-warning-100 text-warning-800' : 'bg-vapor text-fg-3',
      )}
    >
      {gap}
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

export function Note({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-primary-200 bg-primary-50 px-3.5 py-3 font-body text-[13px] font-medium leading-[1.5] text-secondary-800">
      <span className="mt-px [&_svg]:size-4">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
