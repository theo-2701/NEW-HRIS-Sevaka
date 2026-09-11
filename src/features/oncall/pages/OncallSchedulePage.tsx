import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { FilterModal } from '@/components/FilterModal';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RowActions, RowButton } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import { TmFlag } from '@/features/attendance/components/AttendanceBits';
import { EXTRA_REASON_LABEL } from '@/features/overtime/types';
import {
  OncallCancelModal,
  OncallDecisionModal,
  OncallFormModal,
  OncallStatusBadge,
} from '@/features/oncall/components/OncallModals';
import { ScheduleFilterFields } from '@/features/oncall/components/OncallFilters';
import {
  EMPTY_SCHEDULE_FILTER,
  countActive,
  summarizeScheduleFilter,
  type ScheduleFilterState,
} from '@/features/oncall/oncallFilters';
import { useOncallAssignments } from '@/features/oncall/hooks/useOncall';
import { VIEWERS, employeeName } from '@/features/oncall/mock-data';
import { windowLabel } from '@/features/oncall/rules';
import type { OncallSession } from '@/features/oncall/mock-data';
import type { OncallAssignment } from '@/features/oncall/types';
import { formatNumber } from '@/lib/format';

/**
 * Time › On Call Schedule — port `_prototype/time-oncall.html`
 * (FSD-001-TIME §10 · UIC-001-TIME §11).
 *
 * Jendela siaga memberi otorisasi **di muka**: sekali disetujui, kehadiran yang
 * jatuh di dalamnya melahirkan call-out otomatis sampai setinggi pagunya —
 * tanpa pengajuan lembur tertulis. Pagu yang melewati plafon jam harian
 * menaikkan jendela ke lapis approval HR; ia tidak pernah jadi penolakan.
 */
export function OncallSchedulePage() {
  const [session, setSession] = useState<OncallSession>(VIEWERS[0]);
  const [filter, setFilter] = useState<ScheduleFilterState>(EMPTY_SCHEDULE_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OncallAssignment | null>(null);
  const [deciding, setDeciding] = useState<OncallAssignment | null>(null);
  const [cancelling, setCancelling] = useState<OncallAssignment | null>(null);

  const query = useMemo(
    () => ({
      oncallStatus: filter.oncallStatus === 'ALL' ? undefined : filter.oncallStatus,
      from: filter.from || undefined,
      to: filter.to || undefined,
      employeeName: search.trim() || undefined,
    }),
    [filter, search],
  );

  const { data: rows = [], isLoading } = useOncallAssignments(query);
  const paged = usePagedRows(rows);

  const openForm = (row: OncallAssignment | null) => {
    setEditing(row);
    setFormOpen(true);
  };

  const rowActions = (row: OncallAssignment) => {
    const actions = [];
    if (row.oncallStatus === 'PENDING_APPROVAL') {
      actions.push({ label: 'Edit', onSelect: () => openForm(row) });
      // Pembuat tidak pernah memutuskan jendelanya sendiri.
      if (row.createdBy !== session.employeeId) actions.push({ label: 'Review', onSelect: () => setDeciding(row) });
    }
    if (row.oncallStatus === 'PENDING_APPROVAL' || row.oncallStatus === 'SCHEDULED') {
      actions.push({ label: 'Cancel window', danger: true, onSelect: () => setCancelling(row) });
    }
    if (!actions.length) return <RowButton onClick={() => setDeciding(row)}>View Detail</RowButton>;
    return <RowActions actions={[...actions, { label: 'View Detail', onSelect: () => setDeciding(row) }]} />;
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Time Management' }, { label: 'On Call' }, { label: 'On Call Schedule' }]}
        title="On Call Schedule"
        description="Jendela siaga memberi otorisasi di muka: sekali terjadwal, kehadiran yang jatuh di dalamnya melahirkan call-out otomatis sampai setinggi pagunya — tanpa pengajuan lembur tertulis. Pagu yang melewati plafon jam harian menaikkan jendela ke lapis approval HR, bukan menolaknya."
        actions={<Button onClick={() => openForm(null)}>Schedule standby</Button>}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
            <Select
              value={session.employeeId}
              onValueChange={(value) => {
                const next = VIEWERS.find((row) => row.employeeId === value);
                if (next) setSession(next);
              }}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEWERS.map((viewer) => (
                  <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                    {employeeName(viewer.employeeId)} — {viewer.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        <Card>
          <CardHead title="Standby windows" sub="emp_oncall_assignment" />

          <div className="flex flex-col">
            <TableToolbar
              filters={
                <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                  {countActive(filter) > 0 ? `Filter (${countActive(filter)})` : 'Filter'}
                </Button>
              }
              summary={summarizeScheduleFilter(filter)}
              search={{
                value: search,
                onChange: (value) => {
                  setSearch(value);
                  paged.resetPage();
                },
                placeholder: 'Search employee name',
              }}
            />

            <DataTable<OncallAssignment>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={isLoading}
              empty="Belum ada jendela siaga yang cocok dengan filter ini."
              columns={[
                {
                  key: 'employee',
                  header: 'Employee',
                  render: (row) => (
                    <CellIdentity
                      name={employeeName(row.employeeId)}
                      leading={<Avatar name={employeeName(row.employeeId)} size="sm" />}
                    />
                  ),
                },
                { key: 'window', header: 'Standby Window', nowrap: true, render: (row) => windowLabel(row) },
                {
                  key: 'ceiling',
                  header: 'Ceiling / Call-out',
                  align: 'right',
                  render: (row) => (
                    <span className="font-body text-[13px] font-semibold tabular-nums text-fg-1">
                      {formatNumber(row.maxCalloutHours)}
                    </span>
                  ),
                },
                {
                  key: 'extra',
                  header: 'Extra Approval',
                  render: (row) =>
                    row.requiresExtraApprovalReason ? (
                      <TmFlag>{EXTRA_REASON_LABEL[row.requiresExtraApprovalReason]}</TmFlag>
                    ) : (
                      <span className="text-fg-4">—</span>
                    ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <OncallStatusBadge status={row.oncallStatus} />,
                },
                { key: 'creator', header: 'Drafted By', muted: true, render: (row) => employeeName(row.createdBy) },
                {
                  key: 'approver',
                  header: 'Decided By',
                  muted: true,
                  render: (row) => (row.approvedBy ? employeeName(row.approvedBy) : '—'),
                },
              ]}
              actions={rowActions}
            />

            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="standby windows"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
        </div>
      </PageShell>

      <FilterModal
        open={filterOpen}
        title="Filter standby windows"
        description="Hanya field yang diterima kontrak pencarian."
        onOpenChange={setFilterOpen}
        onReset={() => {
          setFilter(EMPTY_SCHEDULE_FILTER);
          paged.resetPage();
        }}
      >
        <ScheduleFilterFields
          value={filter}
          onChange={(next) => {
            setFilter(next);
            paged.resetPage();
          }}
        />
      </FilterModal>

      <OncallFormModal open={formOpen} session={session} editing={editing} onClose={() => setFormOpen(false)} />
      <OncallDecisionModal row={deciding} session={session} onClose={() => setDeciding(null)} />
      <OncallCancelModal row={cancelling} onClose={() => setCancelling(null)} />
    </>
  );
}
