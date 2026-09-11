import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { TmFlag } from '@/features/attendance/components/AttendanceBits';
import {
  ShiftHours,
  ShiftTypeBadge,
  SourceBadge,
  SwapStatusBadge,
} from '@/features/scheduler/components/SchedulerBits';
import { rosterLabel } from '@/features/scheduler/rules';
import {
  AssignmentFormModal,
  BulkAssignModal,
  SchedulerDeleteModal,
  ShiftFormModal,
  SwapDecisionModal,
  SwapFormModal,
  SwapWithdrawModal,
} from '@/features/scheduler/components/SchedulerModals';
import { useAssignments, useShifts, useSwaps, useToggleShift } from '@/features/scheduler/hooks/useScheduler';
import { ME, employeeName } from '@/features/scheduler/mock-data';
import type { Shift, ShiftAssignment, ShiftSwap } from '@/features/scheduler/types';
import { formatDate, formatDateTime } from '@/lib/format';

type Tab = 'shifts' | 'roster' | 'swap';

/**
 * Time › Scheduler Schedule — port `_prototype/time-scheduler-schedule.html`
 * (FSD-001-TIME §9 · UIC-001-TIME §10).
 *
 * Semua tulisan ke roster hidup di layar ini: katalog pola shift, baris roster
 * (satu per karyawan × tanggal), dan tukar shift. Bulk melangkahi baris yang
 * sudah dikunci tangan manusia atau tukar; tukar yang disetujui menukar pola
 * kedua baris sebagai satu paket.
 */
export function SchedulerSchedulePage() {
  const [tab, setTab] = useState<Tab>('shifts');

  const [shiftForm, setShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [assignForm, setAssignForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ShiftAssignment | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [swapForm, setSwapForm] = useState(false);
  const [decidingSwap, setDecidingSwap] = useState<ShiftSwap | null>(null);
  const [withdrawingSwap, setWithdrawingSwap] = useState<ShiftSwap | null>(null);
  const [deleting, setDeleting] = useState<
    { kind: 'shift'; row: Shift } | { kind: 'assignment'; row: ShiftAssignment } | null
  >(null);

  const { data: shifts = [], isLoading: shiftsLoading } = useShifts();
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments({});
  const { data: swaps = [], isLoading: swapsLoading } = useSwaps();

  const pagedShifts = usePagedRows(shifts);
  const pagedAssignments = usePagedRows(assignments);
  const pagedSwaps = usePagedRows(swaps);

  const toggleShift = useToggleShift();

  const openShiftForm = (row: Shift | null) => {
    setEditingShift(row);
    setShiftForm(true);
  };

  const openAssignForm = (row: ShiftAssignment | null) => {
    setEditingAssignment(row);
    setAssignForm(true);
  };

  const swapActions = (row: ShiftSwap) => {
    if (row.swapStatus !== 'PENDING_APPROVAL') {
      return <RowButton onClick={() => setDecidingSwap(row)}>View Detail</RowButton>;
    }
    const requester = assignments.find((item) => item.id === row.requesterAssignmentId);
    const mine = requester?.employeeId === ME;
    return (
      <RowActions
        actions={[
          mine
            ? { label: 'Withdraw', danger: true, onSelect: () => setWithdrawingSwap(row) }
            : { label: 'Review', onSelect: () => setDecidingSwap(row) },
          { label: 'View Detail', onSelect: () => setDecidingSwap(row) },
        ]}
      />
    );
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Time Management' }, { label: 'Scheduler' }, { label: 'Schedule' }]}
        title="Scheduler Schedule"
        description="Semua tulisan ke roster hidup di layar ini. Katalog pola shift menentukan apa yang bisa dipasang; baris roster memegang satu keputusan per karyawan × tanggal; tukar shift tidak menggerakkan roster sebelum keputusan turun."
        actions={
          tab === 'shifts' ? (
            <Button onClick={() => openShiftForm(null)}>New shift pattern</Button>
          ) : tab === 'roster' ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setBulkOpen(true)}>
                Bulk assign
              </Button>
              <Button onClick={() => openAssignForm(null)}>Assign roster</Button>
            </div>
          ) : (
            <Button onClick={() => setSwapForm(true)}>Request swap</Button>
          )
        }
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'shifts', label: 'Shift patterns', count: shifts.length },
              { value: 'roster', label: 'Roster', count: assignments.length },
              { value: 'swap', label: 'Swap requests', count: swaps.length },
            ]}
          />

          {tab === 'shifts' && (
            <Card>
              <CardHead title="Shift catalogue" sub="cnf_shift — pola siklus tidak pernah bisa dipasang ke roster" />

              <div className="flex flex-col">
                <TableToolbar summary={`${shifts.filter((row) => row.isActive).length} pola aktif`} />

                <DataTable<Shift>
                  rows={pagedShifts.rows}
                  rowKey={(row) => row.id}
                  loading={shiftsLoading}
                  empty="Katalog pola shift masih kosong."
                  columns={[
                    {
                      key: 'code',
                      header: 'Code',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.shiftCode}</span>,
                    },
                    { key: 'name', header: 'Shift Name', render: (row) => row.shiftName },
                    { key: 'type', header: 'Type', render: (row) => <ShiftTypeBadge type={row.shiftType} /> },
                    { key: 'hours', header: 'Hours', nowrap: true, render: (row) => <ShiftHours shift={row} /> },
                    {
                      key: 'break',
                      header: 'Break',
                      align: 'right',
                      render: (row) => (
                        <span className="font-body text-[13px] font-semibold tabular-nums text-fg-1">
                          {row.breakMinutes}
                        </span>
                      ),
                    },
                    {
                      key: 'active',
                      header: 'Active',
                      render: (row) => (
                        <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>
                          {row.isActive ? 'Active' : 'Inactive'}
                        </StatusBadge>
                      ),
                    },
                  ]}
                  actions={(row) => (
                    <RowActions
                      actions={[
                        { label: 'Edit', onSelect: () => openShiftForm(row) },
                        {
                          label: row.isActive ? 'Deactivate' : 'Reactivate',
                          onSelect: () => toggleShift.mutate({ id: row.id }),
                        },
                        { label: 'Delete', danger: true, onSelect: () => setDeleting({ kind: 'shift', row }) },
                      ]}
                    />
                  )}
                />

                <Pagination
                  page={pagedShifts.page}
                  pageSize={pagedShifts.pageSize}
                  total={pagedShifts.total}
                  noun="patterns"
                  onPageChange={pagedShifts.setPage}
                  onPageSizeChange={pagedShifts.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'roster' && (
            <Card>
              <CardHead title="Roster" sub="emp_shift_assignment — satu baris per karyawan × tanggal" />

              <div className="flex flex-col">
                <TableToolbar summary="Sentuhan tangan dicap individual; bulk berikutnya melangkahinya" />

                <DataTable<ShiftAssignment>
                  rows={pagedAssignments.rows}
                  rowKey={(row) => row.id}
                  loading={assignmentsLoading}
                  empty="Belum ada baris roster."
                  columns={[
                    {
                      key: 'date',
                      header: 'Work Date',
                      strong: true,
                      nowrap: true,
                      render: (row) => formatDate(row.workDate),
                    },
                    { key: 'employee', header: 'Employee', render: (row) => employeeName(row.employeeId) },
                    {
                      key: 'shift',
                      header: 'Shift',
                      render: (row) => {
                        const shift = shifts.find((item) => item.id === row.shiftId);
                        return shift ? (
                          <>
                            {shift.shiftName}{' '}
                            <span className="text-fg-4">
                              · {shift.startTime ? `${shift.startTime}–${shift.endTime}` : 'no fixed hours'}
                            </span>
                          </>
                        ) : (
                          '—'
                        );
                      },
                    },
                    {
                      key: 'off',
                      header: 'Off Day',
                      render: (row) => (row.isOffDay ? <TmFlag>Off day</TmFlag> : <span className="text-fg-4">No</span>),
                    },
                    { key: 'source', header: 'Source', render: (row) => <SourceBadge source={row.assignmentSource} /> },
                  ]}
                  actions={(row) => (
                    <RowActions
                      actions={[
                        { label: 'Override', onSelect: () => openAssignForm(row) },
                        { label: 'Delete', danger: true, onSelect: () => setDeleting({ kind: 'assignment', row }) },
                      ]}
                    />
                  )}
                />

                <Pagination
                  page={pagedAssignments.page}
                  pageSize={pagedAssignments.pageSize}
                  total={pagedAssignments.total}
                  noun="roster rows"
                  onPageChange={pagedAssignments.setPage}
                  onPageSizeChange={pagedAssignments.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'swap' && (
            <Card>
              <CardHead title="Swap requests" sub="emp_shift_swap_request — roster baru bergerak setelah disetujui" />

              <div className="flex flex-col">
                <TableToolbar summary={`${swaps.filter((row) => row.swapStatus === 'PENDING_APPROVAL').length} menunggu keputusan`} />

                <DataTable<ShiftSwap>
                  rows={pagedSwaps.rows}
                  rowKey={(row) => row.id}
                  loading={swapsLoading}
                  empty="Belum ada permintaan tukar."
                  columns={[
                    {
                      key: 'id',
                      header: 'Swap',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.id}</span>,
                    },
                    {
                      key: 'requester',
                      header: 'Requester Row',
                      render: (row) =>
                        rosterLabel(
                          assignments.find((item) => item.id === row.requesterAssignmentId),
                          shifts,
                        ),
                    },
                    {
                      key: 'counterpart',
                      header: 'Counterpart Row',
                      render: (row) =>
                        rosterLabel(
                          assignments.find((item) => item.id === row.counterpartAssignmentId),
                          shifts,
                        ),
                    },
                    { key: 'status', header: 'Status', render: (row) => <SwapStatusBadge status={row.swapStatus} /> },
                    {
                      key: 'submitted',
                      header: 'Submitted',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDateTime(row.submittedAt),
                    },
                    {
                      key: 'decided',
                      header: 'Decided By',
                      muted: true,
                      render: (row) => (row.approvedBy ? employeeName(row.approvedBy) : '—'),
                    },
                  ]}
                  actions={swapActions}
                />

                <Pagination
                  page={pagedSwaps.page}
                  pageSize={pagedSwaps.pageSize}
                  total={pagedSwaps.total}
                  noun="swap requests"
                  onPageChange={pagedSwaps.setPage}
                  onPageSizeChange={pagedSwaps.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      <ShiftFormModal open={shiftForm} editing={editingShift} onClose={() => setShiftForm(false)} />
      <AssignmentFormModal
        open={assignForm}
        editing={editingAssignment}
        shifts={shifts}
        onClose={() => setAssignForm(false)}
      />
      <BulkAssignModal open={bulkOpen} shifts={shifts} onClose={() => setBulkOpen(false)} />
      <SwapFormModal
        open={swapForm}
        assignments={assignments}
        shifts={shifts}
        onClose={() => setSwapForm(false)}
      />
      <SwapDecisionModal
        row={decidingSwap}
        assignments={assignments}
        shifts={shifts}
        onClose={() => setDecidingSwap(null)}
      />
      <SwapWithdrawModal row={withdrawingSwap} onClose={() => setWithdrawingSwap(null)} />
      <SchedulerDeleteModal target={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
