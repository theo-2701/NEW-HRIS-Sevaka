import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import {
  ATTENDANCE_STATUS_LABEL,
  EXCUSED_REASON_LABEL,
  CORRECTION_STATUS_LABEL,
} from '@/features/attendance/types';
import type {
  AttendanceDay,
  AttendanceStatus,
  CorrectionStatus,
  Punch,
} from '@/features/attendance/types';
import { cn } from '@/lib/utils';

/** Chip datar untuk bendera tap & alasan excused — port `.tm-flag`. */
export function TmFlag({ children, off }: { children: ReactNode; off?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center whitespace-nowrap rounded-full border px-2.5 font-body text-[10px] font-bold uppercase leading-none tracking-[0.04em]',
        off
          ? 'border-border-1 bg-vapor text-fg-4'
          : 'border-secondary-200 bg-secondary-50 text-secondary-700',
      )}
    >
      {children}
    </span>
  );
}

const ATTENDANCE_TONE: Record<AttendanceStatus, 'ok' | 'warn' | 'err' | 'info' | 'mute'> = {
  PRESENT: 'ok',
  LATE: 'warn',
  INCOMPLETE: 'warn',
  ABSENT: 'err',
  ON_LEAVE: 'info',
  SICK: 'info',
  NOT_SCHEDULED: 'mute',
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return <StatusBadge tone={ATTENDANCE_TONE[status]}>{ATTENDANCE_STATUS_LABEL[status]}</StatusBadge>;
}

const CORRECTION_TONE: Record<CorrectionStatus, 'ok' | 'warn' | 'err' | 'mute'> = {
  PENDING_APPROVAL: 'warn',
  APPROVED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

export function CorrectionStatusBadge({ status }: { status: CorrectionStatus }) {
  return <StatusBadge tone={CORRECTION_TONE[status]}>{CORRECTION_STATUS_LABEL[status]}</StatusBadge>;
}

/**
 * Verdict radius. Kosong berarti **tidak bisa dievaluasi** — bukan pelanggaran:
 * izin lokasi ditolak, tapnya tetap tersimpan.
 */
export function RadiusCell({ punch }: { punch: Punch }) {
  if (punch.isWithinGeofence === true) return <StatusBadge tone="ok">Inside radius</StatusBadge>;
  if (punch.isWithinGeofence === false) return <StatusBadge tone="err">Outside radius</StatusBadge>;
  return <StatusBadge tone="mute">Could not be evaluated</StatusBadge>;
}

export function FlagsCell({ punch }: { punch: Punch }) {
  const flags: string[] = [];
  if (punch.isMockLocationSuspected) flags.push('Mock location suspected');
  if (punch.isWorkArrangementUnknown) flags.push('Arrangement unreadable');
  if (!flags.length) return <span className="font-body text-[13px] font-medium text-fg-4">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((flag) => (
        <TmFlag key={flag}>{flag}</TmFlag>
      ))}
    </div>
  );
}

/** Angka menit — nol dibuat redup, angka merugikan diberi warna. */
export function Minutes({ value, negative }: { value: number; negative?: boolean }) {
  if (!value) return <span className="font-body text-[13px] font-medium text-fg-4">0</span>;
  return (
    <span
      className={cn(
        'font-body text-[13px] font-semibold tabular-nums',
        negative ? 'text-error-600' : 'text-fg-1',
      )}
    >
      {value}
    </span>
  );
}

export function ExcusedCell({ day }: { day: AttendanceDay }) {
  if (!day.isExcused || !day.excusedReason) {
    return <span className="font-body text-[13px] font-medium text-fg-4">—</span>;
  }
  return <TmFlag>{EXCUSED_REASON_LABEL[day.excusedReason]}</TmFlag>;
}

/** Kotak snapshot baca-saja di dalam form — port `.tm-derived`. */
export function DerivedBox({ heading, rows }: { heading: string; rows: [string, ReactNode][] }) {
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-dashed border-silver bg-mist px-3.5 py-3">
      <span className="font-body text-[11px] font-bold uppercase leading-none tracking-[0.06em] text-fg-3">
        {heading}
      </span>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center gap-2.5 font-body text-xs font-medium leading-[1.4] text-fg-2">
          <span>{label}</span>
          <span className="ml-auto font-bold text-fg-1">{value}</span>
        </div>
      ))}
    </div>
  );
}
