import type { ReactNode } from 'react';
import { Info, Lock, LockOpen } from 'lucide-react';
import { EmptyState } from '@/components/Card';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePeriod } from '@/features/performance/hooks/usePeriods';
import { PERF_ACTORS } from '@/features/performance/mock-data';
import { canViewPeriod } from '@/features/performance/rules';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import {
  ORIGIN_LABEL,
  PHASE_LABEL,
  ROLE_LABEL,
  SHEET_STATUS_LABEL,
  type ItemOrigin,
  type PeriodPhase,
  type SheetStatus,
} from '@/features/performance/types';
import { cn } from '@/lib/utils';

/** Peran dari token disimulasikan lewat pemilih — dibagi ke seluruh layar Performance. */
export function PerfActorPicker({ onChange }: { onChange?: () => void }) {
  const { actor, setActor } = usePerfActor();
  return (
    <Select
      value={actor.employeeId}
      onValueChange={(value) => {
        const next = PERF_ACTORS.find((row) => row.employeeId === value);
        if (next) {
          setActor(next);
          onChange?.();
        }
      }}
    >
      <SelectTrigger className="h-10 w-[280px]" aria-label="Viewing as">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PERF_ACTORS.map((row) => (
          <SelectItem key={row.employeeId} value={row.employeeId}>
            {row.name} — {ROLE_LABEL[row.role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const PHASE_TONE: Record<PeriodPhase, 'ok' | 'warn' | 'mute'> = {
  FILLING: 'ok',
  SIGNING: 'warn',
  CLOSED: 'mute',
};

/** Tiga fase, tiga warna — tidak ada dua fase yang berbagi warna (FSD §1.1). */
export function PhaseBadge({ phase }: { phase: PeriodPhase }) {
  return <StatusBadge tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</StatusBadge>;
}

/** Peran tanpa hak atas layar ini — menu tetap dirender kosong, bukan error. */
export function NoAccess({ description }: { description: string }) {
  return <EmptyState title="Tidak tersedia untuk peran Anda" description={description} />;
}

/** Baris label–nilai untuk kartu ringkasan (`<dl>` dua kolom). */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-body text-[13px] font-medium text-fg-3">{label}</dt>
      <dd className="m-0 font-body text-[13px] font-semibold text-fg-1">{children}</dd>
    </>
  );
}

const SHEET_TONE: Record<SheetStatus, BadgeTone> = {
  IN_PROGRESS: 'info',
  PENDING_APPROVAL: 'brand',
  RETURNED_TO_ASSESSOR: 'warn',
  APPROVED: 'ok',
  REJECTED_FINAL: 'err',
};

/** Lima status, lima warna — merah khusus Ditolak final (FSD §4.6). */
export function SheetStatusBadge({ status }: { status: SheetStatus }) {
  return <StatusBadge tone={SHEET_TONE[status]}>{SHEET_STATUS_LABEL[status]}</StatusBadge>;
}

/** Palet dipinjam dari jenis target Daftar Induk: MASTER biru, tambahan warna kedua. */
export function OriginBadge({ origin }: { origin: ItemOrigin }) {
  return <StatusBadge tone={origin === 'MASTER' ? 'info' : 'brand'}>{ORIGIN_LABEL[origin]}</StatusBadge>;
}

const BANNER_TONE = {
  ok: 'border-success-200 bg-success-50 text-success-900 [&>svg]:text-success-700',
  warn: 'border-warning-200 bg-warning-50 text-warning-900 [&>svg]:text-warning-700',
  info: 'border-primary-200 bg-primary-50 text-secondary-900 [&>svg]:text-secondary-700',
} as const;

const BANNER_ICON = { ok: LockOpen, warn: Lock, info: Info } as const;

export function Banner({ tone, children }: { tone: keyof typeof BANNER_TONE; children: ReactNode }) {
  const Icon = BANNER_ICON[tone];
  return (
    <p
      className={cn(
        'm-0 flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 font-body text-[12.5px] font-medium leading-normal',
        BANNER_TONE[tone],
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Nama periode lewat `P1.02` (DM berhak detail periode, tidak berhak grid). */
export function PeriodLabel({ id }: { id: string }) {
  const { actor } = usePerfActor();
  const { data } = usePeriod(actor, id, canViewPeriod(actor.role));
  return <>{data?.periodName ?? '—'}</>;
}
