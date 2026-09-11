import { StatusBadge } from '@/components/StatusBadge';
import { TmFlag } from '@/features/attendance/components/AttendanceBits';
import {
  ASSIGNMENT_SOURCE_LABEL,
  SHIFT_TYPE_LABEL,
  SWAP_STATUS_LABEL,
} from '@/features/scheduler/types';
import type {
  AssignmentSource,
  Shift,
  ShiftAssignment,
  ShiftType,
  SwapStatus,
} from '@/features/scheduler/types';
import { cn } from '@/lib/utils';

const SWAP_TONE: Record<SwapStatus, 'ok' | 'warn' | 'err' | 'mute'> = {
  PENDING_APPROVAL: 'warn',
  APPROVED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

const SOURCE_TONE: Record<AssignmentSource, 'info' | 'mute' | 'ok'> = {
  INDIVIDUAL: 'info',
  BULK: 'mute',
  SWAP: 'ok',
};

export function SwapStatusBadge({ status }: { status: SwapStatus }) {
  return <StatusBadge tone={SWAP_TONE[status]}>{SWAP_STATUS_LABEL[status]}</StatusBadge>;
}

export function SourceBadge({ source }: { source: AssignmentSource }) {
  return <StatusBadge tone={SOURCE_TONE[source]}>{ASSIGNMENT_SOURCE_LABEL[source]}</StatusBadge>;
}

export function ShiftTypeBadge({ type }: { type: ShiftType }) {
  return <StatusBadge tone={type === 'FIXED' ? 'info' : 'mute'}>{SHIFT_TYPE_LABEL[type]}</StatusBadge>;
}

/** Jam pola — pola non-tetap memang tidak punya jam miliknya sendiri. */
export function ShiftHours({ shift }: { shift: Shift }) {
  if (!shift.startTime) return <span className="font-body text-[13px] font-medium text-fg-4">No fixed hours</span>;
  return (
    <span className="inline-flex items-center gap-2">
      {shift.startTime} – {shift.endTime}
      {shift.crossesMidnight && <TmFlag>Crosses midnight</TmFlag>}
    </span>
  );
}

/**
 * Satu sel grid roster. Tiga keadaan yang sengaja dibedakan: ada shift, hari
 * libur terjadwal, dan **tidak ada baris sama sekali** — yang terakhir bukan
 * hari libur, melainkan ketiadaan keputusan.
 */
export function RosterCell({ assignment, shifts }: { assignment?: ShiftAssignment; shifts: Shift[] }) {
  if (!assignment) {
    return <span className="font-body text-[11px] font-medium text-fg-4">— not assigned</span>;
  }
  if (assignment.isOffDay) {
    return (
      <span
        title={`Scheduled off day · ${ASSIGNMENT_SOURCE_LABEL[assignment.assignmentSource]}`}
        className="inline-flex h-6 items-center rounded-md border border-border-1 bg-vapor px-2 font-body text-[11px] font-bold text-fg-3"
      >
        OFF
      </span>
    );
  }
  const shift = shifts.find((row) => row.id === assignment.shiftId);
  if (!shift) return <span className="font-body text-[11px] font-medium text-fg-4">—</span>;
  return (
    <span
      title={`${shift.shiftName} · ${ASSIGNMENT_SOURCE_LABEL[assignment.assignmentSource]}`}
      className={cn(
        'inline-flex h-6 items-center rounded-md border px-2 font-body text-[11px] font-bold',
        shift.crossesMidnight
          ? 'border-primary-200 bg-primary-100 text-secondary-800'
          : 'border-secondary-200 bg-secondary-50 text-secondary-700',
      )}
    >
      {shift.shiftCode}
    </span>
  );
}

