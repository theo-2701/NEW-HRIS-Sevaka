import { Check, X } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import type { BadgeTone } from '@/components/StatusBadge';
import { FINAL_STATE_LABEL, PARAM_CATEGORY_LABEL, PERIOD_STATUS_LABEL } from '@/features/salary-processing/types';
import type { FinalState, ParamCategory, PayrollPeriod, PeriodStatus } from '@/features/salary-processing/types';
import { gateStates } from '@/features/salary-processing/rules';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const PERIOD_TONE: Record<PeriodStatus, BadgeTone> = {
  CALCULATED: 'mute',
  REVIEWED: 'info',
  LOCKED: 'brand',
  HANDED_OVER: 'ok',
};

export function PeriodStatusBadge({ status }: { status: PeriodStatus }) {
  return <StatusBadge tone={PERIOD_TONE[status]}>{PERIOD_STATUS_LABEL[status]}</StatusBadge>;
}

export function FinalStateBadge({ state }: { state: FinalState | null }) {
  const tone: BadgeTone = state === 'DIPERBAIKI' ? 'ok' : state === 'DITERIMA' ? 'info' : 'warn';
  return <StatusBadge tone={tone}>{FINAL_STATE_LABEL[state ?? 'OPEN']}</StatusBadge>;
}

const CATEGORY_TONE: Record<ParamCategory, BadgeTone> = {
  REGULATION: 'info',
  COMPANY_SETTING: 'brand',
  COMPUTED_COMPOSITION: 'mute',
};

export function ParamCategoryBadge({ category }: { category: ParamCategory }) {
  return <StatusBadge tone={CATEGORY_TONE[category]}>{PARAM_CATEGORY_LABEL[category]}</StatusBadge>;
}

export function FindingTypeTag({ type }: { type: string }) {
  return (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-md bg-vapor px-2.5 font-mono text-[11px] font-semibold text-fg-2">
      {type}
    </span>
  );
}

/** Tiga gerbang ringkas untuk grid periode — centang lolos, silang belum. */
export function GateDots({ period }: { period: PayrollPeriod }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {gateStates(period).map((gate, index) => (
        <span
          key={gate.key}
          title={`${gate.label}: ${gate.passed ? 'passed' : 'not yet'}`}
          className={cn(
            'inline-flex size-6 items-center justify-center rounded-full font-body text-[10px] font-bold [&_svg]:size-3.5',
            gate.passed ? 'bg-success-100 text-success-800' : 'bg-vapor text-fg-4',
          )}
        >
          {gate.passed ? <Check /> : <X />}
          <span className="sr-only">{index + 1}</span>
        </span>
      ))}
    </span>
  );
}

export function Money({ value }: { value: number }) {
  return <span className="tabular-nums">{formatCurrency(value)}</span>;
}
