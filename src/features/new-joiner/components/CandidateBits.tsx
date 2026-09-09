import type { ReactNode } from 'react';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import { STATUS_LABEL, type CandidateStatus } from '@/features/new-joiner/types';
import { cn } from '@/lib/utils';

const TONE: Record<CandidateStatus, BadgeTone> = {
  DRAFT: 'mute',
  SUBMITTED: 'info',
  IN_APPROVAL: 'info',
  APPROVED: 'ok',
  REJECTED: 'err',
  MATERIALIZED: 'ok',
  CANCELLED: 'mute',
  EXPIRED: 'warn',
};

export function CandidateStatusBadge({ status }: { status: CandidateStatus }) {
  return <StatusBadge tone={TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>;
}

export interface StatusTab {
  value: CandidateStatus | 'ALL';
  label: string;
  count: number;
}

/**
 * Filter status berbentuk pil — port `.nj-tab`: tinggi 30px, radius pill,
 * isi Mist, aktif Secondary-700 putih, dengan jumlah baris di belakang label.
 * Tab yang jumlahnya nol tidak ditampilkan (kecuali "All").
 */
export function StatusTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: StatusTab[];
  value: CandidateStatus | 'ALL';
  onChange: (value: CandidateStatus | 'ALL') => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'inline-flex h-[30px] items-center gap-[7px] rounded-pill px-[13px] font-body text-xs font-bold leading-none transition-colors duration-200 ease-standard',
              active ? 'bg-secondary-700 text-white' : 'bg-mist text-fg-3 hover:text-fg-1',
            )}
          >
            {tab.label}
            <span className={cn('font-bold', active ? 'opacity-100' : 'opacity-70')}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Ringkasan pasangan label–nilai di dalam modal review / materialise. */
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

/** Catatan berwarna di dalam modal — port `.note`. */
export function Note({ tone = 'info', icon, children }: { tone?: 'info' | 'warn'; icon: ReactNode; children: ReactNode }) {
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
