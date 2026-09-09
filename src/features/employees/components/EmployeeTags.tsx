import { Building2, Car, House, Shuffle } from 'lucide-react';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import { EMPLOYMENT_STATUS_LABEL } from '@/features/employees/types';
import type { EmploymentStatus, WorkArrangement } from '@/features/employees/types';
import { cn } from '@/lib/utils';

/** Enam `employment_status` → tone chip rumah. */
const STATUS_TONE: Record<EmploymentStatus, BadgeTone> = {
  WAITING: 'warn',
  ACTIVE: 'ok',
  OFFBOARDING: 'info',
  SUSPENDED: 'warn',
  RESIGNED: 'mute',
  TERMINATED: 'err',
};

export function EmploymentStatusBadge({ status }: { status: EmploymentStatus }) {
  return <StatusBadge tone={STATUS_TONE[status]}>{EMPLOYMENT_STATUS_LABEL[status]}</StatusBadge>;
}

const WORK_ARRANGEMENT_ICON = {
  WFO: Building2,
  WFH: House,
  HYBRID: Shuffle,
  MOBILE: Car,
} as const;

/** `work_arrangement` — label netral dengan ikon, bukan chip status. */
export function WorkArrangementTag({
  arrangement,
  className,
}: {
  arrangement: WorkArrangement;
  className?: string;
}) {
  const Icon = WORK_ARRANGEMENT_ICON[arrangement];
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-md bg-vapor px-2.5 font-body text-[10.5px] font-bold uppercase leading-none tracking-[0.03em] text-fg-2',
        className,
      )}
    >
      <Icon className="size-3.5 text-fg-3" />
      {arrangement}
    </span>
  );
}
