import type { ReactNode } from 'react';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { AttendanceStatusBadge, CorrectionStatusBadge } from '@/features/attendance/components/AttendanceBits';
import type { AttendanceStatus, CorrectionStatus } from '@/features/attendance/types';

const DAY_STATUSES: { status: AttendanceStatus; meaning: string }[] = [
  { status: 'PRESENT', meaning: 'The employee was present on a working day and clocked in within the late tolerance.' },
  { status: 'LATE', meaning: 'The employee was present, but clocked in after the late tolerance.' },
  {
    status: 'INCOMPLETE',
    meaning:
      'Only a clock-in or a clock-out exists, so the day cannot be concluded yet. This is not an absence verdict; fix it through a correction.',
  },
  { status: 'ABSENT', meaning: 'No valid punch on a working day and no approved leave or sick leave.' },
  { status: 'ON_LEAVE', meaning: 'Approved leave or permission covers the whole day.' },
  { status: 'SICK', meaning: 'Approved sick leave covers the whole day.' },
  {
    status: 'NOT_SCHEDULED',
    meaning: 'That day is not a working day (weekly rest or calendar holiday), so nothing is assessed.',
  },
];

const CORRECTION_STATUSES: { status: CorrectionStatus; meaning: string }[] = [
  {
    status: 'PENDING_APPROVAL',
    meaning: "The correction was submitted and is waiting for a manager's decision; the day's assessment has not changed.",
  },
  { status: 'APPROVED', meaning: 'The correction was approved, and the day is assessed again using the proposed correction.' },
  {
    status: 'REJECTED',
    meaning: "The correction was rejected; the day's assessment does not change and the request stays as a record of the decision.",
  },
  {
    status: 'CANCELLED',
    meaning: 'The requester withdrew the correction before a decision, so the same day can be requested again.',
  },
];

function ReferenceModal<T extends { status: string; meaning: string }>({
  open,
  title,
  rows,
  badge,
  onClose,
}: {
  open: boolean;
  title: string;
  rows: T[];
  badge: (row: T) => ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={title}
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <DataTable<T>
        rows={rows}
        rowKey={(row) => row.status}
        columns={[
          { key: 'status', header: 'Status', nowrap: true, render: badge },
          { key: 'meaning', header: 'Meaning', render: (row) => row.meaning },
        ]}
      />
    </Modal>
  );
}

/** Legend status harian — dibuka dari ikon info di header kolom Status. */
export function AttendanceStatusReference({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ReferenceModal
      open={open}
      onClose={onClose}
      title="Daily attendance statuses"
      rows={DAY_STATUSES}
      badge={(row) => <AttendanceStatusBadge status={row.status} />}
    />
  );
}

/** Legend status koreksi — dibuka dari ikon info di header kolom Status. */
export function CorrectionStatusReference({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ReferenceModal
      open={open}
      onClose={onClose}
      title="Attendance correction statuses"
      rows={CORRECTION_STATUSES}
      badge={(row) => <CorrectionStatusBadge status={row.status} />}
    />
  );
}
