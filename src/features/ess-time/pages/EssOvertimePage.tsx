import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { AddButton, RowActions } from '@/components/RowActions';
import { TableToolbar } from '@/components/TableToolbar';
import { EssActorPicker } from '@/features/ess-time/components/EssActorPicker';
import { OvertimeFormModal, OvertimeWithdrawModal } from '@/features/overtime/components/OvertimeModals';
import { useMyOvertime } from '@/features/ess-time/hooks/useEssTime';
import { ESS_VIEWERS } from '@/features/ess-time/mock-data';
import type { OvertimeRequest, OvertimeStatus } from '@/features/overtime/types';
import { formatDate } from '@/lib/format';

const STATUS_LABEL: Record<OvertimeStatus, string> = {
  PENDING_APPROVAL: 'Pending approval',
  AUTO_APPROVED: 'Auto-approved',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

const TONE: Record<OvertimeStatus, 'ok' | 'warn' | 'err' | 'mute'> = {
  PENDING_APPROVAL: 'warn',
  AUTO_APPROVED: 'ok',
  APPROVED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

const CATEGORY_LABEL = {
  WORKDAY: 'Working day',
  WEEKLY_REST: 'Weekly rest',
  PUBLIC_HOLIDAY: 'Public holiday',
} as const;

/**
 * ESS › Time Management › Overtime — lembur milik sendiri.
 *
 * `submissionMode` dan `overtimeCategory` diturunkan server dari tanggal dan kalender, jadi
 * ditampilkan apa adanya sebagai keterangan — bukan pilihan pengaju. Jam yang disetujui bisa
 * berbeda dari yang diajukan; keduanya ditampilkan berdampingan supaya selisihnya terbaca.
 */
export function EssOvertimePage() {
  // Dibuka dari "Request overtime" di kartu tap hari libur: form langsung terbuka dengan tanggalnya.
  const ask = (useLocation().state as { requestOvertime?: { employeeId: string; date: string } } | null)?.requestOvertime;
  const [actor, setActor] = useState(() => ESS_VIEWERS.find((row) => row.employeeId === ask?.employeeId) ?? ESS_VIEWERS[0]);
  /* Lembur adalah scope EMPLOYEE — tidak pernah diajukan atas nama orang lain. */
  const session = { employeeId: actor.employeeId, role: 'EMPLOYEE' as const };
  const overtime = useMyOvertime(actor);
  const [form, setForm] = useState(Boolean(ask));
  const [prefillDate, setPrefillDate] = useState(ask?.date ?? '');
  const [editing, setEditing] = useState<OvertimeRequest | null>(null);
  const [withdrawing, setWithdrawing] = useState<OvertimeRequest | null>(null);

  const rows = useMemo(() => overtime.data ?? [], [overtime.data]);
  const paged = usePagedRows(rows);
  const approvedHours = rows.reduce((sum, row) => sum + (row.approvedHours ?? 0), 0);

  return (
    <PageShell
      crumbs={[{ label: 'Employee Self-Service' }, { label: 'Time Management' }, { label: 'Overtime' }]}
      title="Overtime"
      description="Your overtime requests and the hours approved by your approver."
      actions={<EssActorPicker actor={actor} onChange={setActor} />}
    >
      <Card>
        <CardHead title="My overtime" sub={`Total approved hours: ${approvedHours.toFixed(1)} h`} />
        <div>
          <TableToolbar actions={<AddButton onClick={() => setForm(true)}>Request overtime</AddButton>} />
          <DataTable<OvertimeRequest>
            rows={paged.rows}
            rowKey={(row) => row.id}
            loading={overtime.isLoading}
            empty="No overtime request yet."
            columns={[
              { key: 'date', header: 'Date', strong: true, nowrap: true, render: (row) => formatDate(row.overtimeDate) },
              {
                key: 'category',
                header: 'Category',
                render: (row) => CATEGORY_LABEL[row.overtimeCategory],
              },
              {
                key: 'mode',
                header: 'Submission',
                muted: true,
                render: (row) => (row.submissionMode === 'PRE' ? 'Before overtime' : 'After overtime'),
              },
              {
                key: 'requested',
                header: 'Submitted',
                align: 'right',
                render: (row) =>
                  row.requestedHours === null ? (
                    <span className="text-fg-4">— (from on-call detection)</span>
                  ) : (
                    <span className="tabular-nums">{row.requestedHours} h</span>
                  ),
              },
              {
                key: 'approved',
                header: 'Approved',
                align: 'right',
                render: (row) =>
                  row.approvedHours === null ? (
                    <span className="text-fg-4">—</span>
                  ) : (
                    <span className="tabular-nums">{row.approvedHours} h</span>
                  ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <StatusBadge tone={TONE[row.overtimeStatus]}>{STATUS_LABEL[row.overtimeStatus]}</StatusBadge>
                ),
              },
              { key: 'reason', header: 'Reason', muted: true, render: (row) => row.requestReason || '—' },
            ]}
            actions={(row) =>
              row.overtimeStatus === 'PENDING_APPROVAL' ? (
                <RowActions
                  actions={[
                    {
                      label: 'Edit',
                      onSelect: () => {
                        setEditing(row);
                        setForm(true);
                      },
                    },
                    { label: 'Withdraw request', danger: true, onSelect: () => setWithdrawing(row) },
                  ]}
                />
              ) : null
            }
          />
          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="requests"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>

      <OvertimeFormModal
        open={form}
        session={session}
        rows={rows}
        editing={editing}
        defaultDate={prefillDate}
        onClose={() => {
          setForm(false);
          setEditing(null);
          setPrefillDate('');
        }}
      />
      <OvertimeWithdrawModal row={withdrawing} session={session} onClose={() => setWithdrawing(null)} />
    </PageShell>
  );
}
