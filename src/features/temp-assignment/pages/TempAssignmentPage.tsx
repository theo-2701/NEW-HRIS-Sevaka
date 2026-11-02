import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton, RowActions, RowButton } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import {
  TaCreateModal,
  TaDetailModal,
  TaExtendModal,
  TaStatusBadge,
} from '@/features/temp-assignment/components/TaModals';
import { seatName } from '@/features/temp-assignment/services/temp-assignment.service';
import { useTaAction, useTempAssignments } from '@/features/temp-assignment/hooks/useTempAssignment';
import { TA_VIEWERS, taEmployeeName } from '@/features/temp-assignment/mock-data';
import { TA_STATUS_LABEL, TA_TYPE_LABEL, allowedActions } from '@/features/temp-assignment/types';
import type { TaAction, TaSession, TaStatus, TempAssignment } from '@/features/temp-assignment/types';
import { formatDate } from '@/lib/format';

type ConfirmAction = Exclude<TaAction, 'extend'>;

const CONFIRM: Record<ConfirmAction, { title: string; body: string; label: string; danger: boolean }> = {
  approve: { title: 'Approve this assignment?', body: 'It activates on the start date, or right away if that date has arrived.', label: 'Approve', danger: false },
  reject: { title: 'Reject this assignment?', body: 'The request closes without touching any seat.', label: 'Reject', danger: true },
  cancel: { title: 'Cancel this assignment?', body: 'The request closes without touching any seat.', label: 'Cancel assignment', danger: true },
  return: { title: 'Return the employee early?', body: 'The assignment seat is released today; the home seat was never vacated.', label: 'Return early', danger: true },
};

const ACTION_LABEL: Record<TaAction, string> = {
  approve: 'Approve',
  reject: 'Reject',
  cancel: 'Cancel',
  return: 'Return early',
  extend: 'Extend',
};

/**
 * Employee Directory › Temporary Assignment (TSD-001-EMPLOYEE 0.212 §7.18,
 * CATATAN-PERUBAHAN 21 Oktober 2026 T46).
 */
export function TempAssignmentPage() {
  const [session, setSession] = useState<TaSession>(TA_VIEWERS[0]);
  const [status, setStatus] = useState<TaStatus | 'ALL'>('ALL');
  const [keyword, setKeyword] = useState('');
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<TempAssignment | null>(null);
  const [extending, setExtending] = useState<TempAssignment | null>(null);
  const [confirm, setConfirm] = useState<{ row: TempAssignment; action: ConfirmAction } | null>(null);

  const query = useTempAssignments({ status: status === 'ALL' ? undefined : status, keyword });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const paged = usePagedRows(rows);
  const act = useTaAction(session);

  const rowActions = (row: TempAssignment) => {
    const actions = allowedActions(row, session).map((action) => ({
      label: ACTION_LABEL[action],
      danger: CONFIRM[action as ConfirmAction]?.danger,
      onSelect: () => (action === 'extend' ? setExtending(row) : setConfirm({ row, action })),
    }));
    if (!actions.length) return <RowButton onClick={() => setDetail(row)}>View Detail</RowButton>;
    return <RowActions actions={[...actions, { label: 'View Detail', onSelect: () => setDetail(row) }]} />;
  };

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Temporary Assignment' }]}
      title="Temporary Assignment"
      description="Rotations and secondments to a vacant seat for a fixed period. The employee keeps their home seat and unit, and returns automatically on the return date."
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
          <Select
            value={session.employeeId}
            onValueChange={(value) => setSession(TA_VIEWERS.find((row) => row.employeeId === value) ?? TA_VIEWERS[0])}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TA_VIEWERS.map((viewer) => (
                <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                  {taEmployeeName(viewer.employeeId)} — {viewer.role === 'HR_MANAGER' ? 'HR Manager' : 'HR Staff'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHead title="Assignments" sub="One open assignment per employee" />
          <div className="flex flex-col">
            <TableToolbar
              filters={
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value as TaStatus | 'ALL');
                    paged.resetPage();
                  }}
                >
                  <SelectTrigger className="w-[200px]" aria-label="Status filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {(Object.keys(TA_STATUS_LABEL) as TaStatus[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {TA_STATUS_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
              search={{
                value: keyword,
                onChange: (next) => {
                  setKeyword(next);
                  paged.resetPage();
                },
                placeholder: 'Search employee',
              }}
              actions={<AddButton onClick={() => setCreating(true)}>New Assignment</AddButton>}
            />
            <DataTable<TempAssignment>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={query.isLoading}
              empty={keyword || status !== 'ALL' ? 'No assignment matches these criteria.' : 'No temporary assignment yet.'}
              columns={[
                { key: 'employee', header: 'Employee', strong: true, render: (row) => taEmployeeName(row.employeeId) },
                { key: 'type', header: 'Type', render: (row) => TA_TYPE_LABEL[row.assignmentType] },
                { key: 'seat', header: 'Assignment Seat', render: (row) => seatName(row.assignedPosId) },
                { key: 'start', header: 'Start', nowrap: true, render: (row) => formatDate(row.startDate) },
                { key: 'return', header: 'Return', nowrap: true, render: (row) => formatDate(row.returnDate) },
                { key: 'status', header: 'Status', render: (row) => <TaStatusBadge status={row.status} /> },
              ]}
              actions={rowActions}
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="assignments"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      </div>

      <TaCreateModal open={creating} session={session} onClose={() => setCreating(false)} />
      <TaDetailModal row={detail} onClose={() => setDetail(null)} />
      <TaExtendModal row={extending} session={session} onClose={() => setExtending(null)} />
      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm ? CONFIRM[confirm.action].title : ''}
        description={confirm ? `${taEmployeeName(confirm.row.employeeId)} — ${CONFIRM[confirm.action].body}` : undefined}
        confirmLabel={confirm ? CONFIRM[confirm.action].label : ''}
        cancelLabel="Back"
        tone={confirm && !CONFIRM[confirm.action].danger ? 'primary' : 'danger'}
        loading={act.isPending}
        onOpenChange={(next) => !next && setConfirm(null)}
        onConfirm={() =>
          confirm && act.mutate({ id: confirm.row.id, action: confirm.action }, { onSettled: () => setConfirm(null) })
        }
      />
    </PageShell>
  );
}
