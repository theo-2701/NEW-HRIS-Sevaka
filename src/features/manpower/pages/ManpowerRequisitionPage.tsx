import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, StatCard } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { Pagination } from '@/components/Pagination';
import { Segmented } from '@/components/Segmented';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RowActions, RowButton } from '@/components/RowActions';
import type { RowAction } from '@/components/RowActions';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDate, formatDateRange } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { usePagedRows } from '@/hooks/usePagedRows';
import { RequisitionStatusBadge } from '@/features/manpower/components/ManpowerBits';
import {
  CloseRequisitionDialog,
  CreateRequisitionModal,
  ReviewRequisitionModal,
} from '@/features/manpower/components/RequisitionModals';
import { useCancelRequisition, useManpowerPlans, useRequisitions } from '@/features/manpower/hooks/useManpower';
import {
  PARENT_POSITION_OPTIONS,
  REQUISITION_STATUS_LABEL,
  REQUISITION_STATUS_MEANING,
  TERMINAL_REQUISITION,
  UNIT_OPTIONS,
  isOwnRequisition,
  isRequisitionChecker,
  isRequisitionMaker,
  labelOf,
} from '@/features/manpower/types';
import type { Requisition, RequisitionStatus } from '@/features/manpower/types';

type View = 'activity' | 'information';
const ALL = 'ALL';

/**
 * Requisition — dipisah dari Manpower Planning (Notulen 12 Okt 2026 §2 & §4).
 *
 * Pengguna langsung tahu pekerjaannya: dashboard ringkas di atas, lalu dua tab —
 * **Activity** = yang menunggu keputusan Anda (pengajuan sendiri tidak ikut, urut terlama dulu) dan
 * pengajuan Anda yang masih berjalan; **Information** = seluruh requisition perusahaan.
 * Tombol keputusan disembunyikan bagi pembuat (dicocokkan lewat ID, bukan nama).
 */
export function ManpowerRequisitionPage() {
  const { data: plans = [] } = useManpowerPlans();
  const { data: requisitions = [], isLoading } = useRequisitions();
  const cancel = useCancelRequisition();
  const role = useAuthStore((s) => s.user?.role);
  const maker = isRequisitionMaker(role);
  const checker = isRequisitionChecker(role);

  const [view, setView] = useState<View>('activity');
  const [status, setStatus] = useState<RequisitionStatus | typeof ALL>(ALL);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Requisition | null>(null);
  const [reviewing, setReviewing] = useState<Requisition | null>(null);
  const [cancelling, setCancelling] = useState<Requisition | null>(null);
  const [closing, setClosing] = useState<Requisition | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const byOldest = (a: Requisition, b: Requisition) => a.submittedAt.localeCompare(b.submittedAt);
  const toApprove = useMemo(
    () =>
      checker
        ? requisitions.filter((row) => row.status === 'IN_APPROVAL' && !isOwnRequisition(row)).sort(byOldest)
        : [],
    [requisitions, checker],
  );
  const mine = useMemo(
    () =>
      requisitions.filter((row) => isOwnRequisition(row) && !TERMINAL_REQUISITION.includes(row.status)).sort(byOldest),
    [requisitions],
  );
  const information = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return requisitions
      .filter((row) => status === ALL || row.status === status)
      .filter((row) => !keyword || `${row.id} ${row.title}`.toLowerCase().includes(keyword))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [requisitions, status, search]);
  const paged = usePagedRows(information);

  const inApproval = requisitions.filter((row) => row.status === 'IN_APPROVAL').length;
  const openSeats = requisitions
    .filter((row) => row.status === 'APPROVED')
    .reduce((sum, row) => sum + row.headcount - row.filledCount, 0);
  const fulfilled = requisitions.filter((row) => row.status === 'FULFILLED').length;

  /** Aksi baris per status × peran (FSD 0.24 §3.1); yang tak berhak disembunyikan (L1). */
  const rowActions = (row: Requisition): RowAction[] => {
    const open = row.status === 'IN_APPROVAL';
    const own = isOwnRequisition(row);
    return [
      { label: open && checker && !own ? 'Review' : 'View Detail', onSelect: () => setReviewing(row) },
      ...(open && maker && own
        ? [
            { label: 'Edit', onSelect: () => setEditing(row) },
            { label: 'Cancel', danger: true, onSelect: () => setCancelling(row) },
          ]
        : []),
      ...(row.status === 'APPROVED' && maker
        ? [{ label: 'Close', danger: true, onSelect: () => setClosing(row) }]
        : []),
    ];
  };
  const renderActions = (row: Requisition) => {
    const actions = rowActions(row);
    return actions.length === 1 ? (
      <RowButton onClick={actions[0].onSelect}>{actions[0].label}</RowButton>
    ) : (
      <RowActions actions={actions} />
    );
  };

  const columns: Column<Requisition>[] = [
    { key: 'id', header: 'Requisition', strong: true, nowrap: true, render: (row) => row.id },
    {
      key: 'title',
      header: 'Position',
      render: (row) => (
        <span className="flex flex-col gap-0.5">
          <span>{row.title}</span>
          <span className="font-body text-[11px] font-medium text-fg-3">
            {row.positionMode === 'EXISTING' ? 'Existing position · add seats' : 'New position'}
          </span>
        </span>
      ),
    },
    { key: 'unit', header: 'Unit', render: (row) => labelOf(UNIT_OPTIONS, row.unitId) },
    {
      key: 'parent',
      header: 'Reports to',
      muted: true,
      render: (row) => labelOf(PARENT_POSITION_OPTIONS, row.parentPositionId),
    },
    { key: 'headcount', header: 'Seats', align: 'center', strong: true, render: (row) => row.headcount },
    {
      key: 'filled',
      header: 'Filled',
      align: 'center',
      nowrap: true,
      render: (row) => `${row.filledCount} / ${row.headcount}`,
    },
    {
      key: 'active',
      header: 'Active period',
      nowrap: true,
      render: (row) => formatDateRange(row.activeFrom, row.activeUntil),
    },
    {
      key: 'status',
      header: 'Status',
      info: { label: 'Status reference', onClick: () => setLegendOpen(true) },
      render: (row) => <RequisitionStatusBadge status={row.status} />,
    },
    {
      key: 'maker',
      header: 'Requestor',
      muted: true,
      nowrap: true,
      render: (row) => `${row.maker} · ${formatDate(row.submittedAt)}`,
    },
  ];

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Manpower Planning' }, { label: 'Requisition' }]}
        title="Requisition"
        description="Request new positions or more seats on an existing one. A maker submits, a different checker decides; approved seats open for New Joiner."
        actions={maker && <Button onClick={() => setCreating(true)}>New requisition</Button>}
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Waiting for you"
              value={checker ? toApprove.length : '—'}
              footer={checker ? 'To approve as checker, oldest first' : 'Only HR Manager and Super Admin decide'}
            />
            <StatCard label="In approval" value={inApproval} footer={`${mine.length} of them are your requests`} />
            <StatCard label="Open seats" value={openSeats} footer="Approved and not filled yet" />
            <StatCard label="Fulfilled" value={fulfilled} footer="Every requested seat filled" />
          </div>

          <Segmented<View>
            value={view}
            onChange={setView}
            options={[
              { value: 'activity', label: `Activity (${toApprove.length})` },
              { value: 'information', label: 'Information' },
            ]}
          />

          {view === 'activity' && (
            <>
              <Card>
                <CardHead
                  title="Waiting for your approval"
                  sub="Requisitions made by others, oldest first. Your own requests never appear here."
                />
                <DataTable<Requisition>
                  rows={toApprove}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty={checker ? 'Nothing is waiting for your approval.' : 'Your role does not approve requisitions.'}
                  columns={columns}
                  actions={renderActions}
                />
              </Card>

              <Card>
                <CardHead title="Your requests in progress" sub="Waiting for a checker or approved and still open." />
                <DataTable<Requisition>
                  rows={mine}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty="You have no requisition in progress."
                  columns={columns}
                  actions={renderActions}
                />
              </Card>
            </>
          )}

          {view === 'information' && (
            <Card>
              <CardHead title="All requisitions" sub="Every requisition in this company, newest first." />
              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <Select
                      value={status}
                      onValueChange={(value) => {
                        setStatus(value as RequisitionStatus | typeof ALL);
                        paged.resetPage();
                      }}
                    >
                      <SelectTrigger className="h-10 w-[200px]" aria-label="Status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>All statuses</SelectItem>
                        {(Object.keys(REQUISITION_STATUS_LABEL) as RequisitionStatus[])
                          .filter((value) => value !== 'DRAFT')
                          .map((value) => (
                            <SelectItem key={value} value={value}>
                              {REQUISITION_STATUS_LABEL[value]}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  }
                  search={{
                    value: search,
                    onChange: (value) => {
                      setSearch(value);
                      paged.resetPage();
                    },
                    placeholder: 'Search ID or position',
                  }}
                />
                <DataTable<Requisition>
                  rows={paged.rows}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty="No requisition matches the filter."
                  columns={columns}
                  actions={renderActions}
                />
                <Pagination
                  page={paged.page}
                  pageSize={paged.pageSize}
                  total={paged.total}
                  noun="requisitions"
                  onPageChange={paged.setPage}
                  onPageSizeChange={paged.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      <CreateRequisitionModal
        open={creating || Boolean(editing)}
        plans={plans}
        editing={editing}
        onClose={() => (setCreating(false), setEditing(null))}
      />
      <ReviewRequisitionModal requisition={reviewing} canCheck={checker} onClose={() => setReviewing(null)} />
      <CloseRequisitionDialog key={closing?.id} requisition={closing} onClose={() => setClosing(null)} />
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={`Cancel ${cancelling?.id ?? ''}?`}
        description="The requisition stops waiting for a checker decision and becomes Cancelled."
        confirmLabel="Cancel requisition"
        cancelLabel="Back"
        loading={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate({ id: cancelling.id }, { onSuccess: () => setCancelling(null) })}
      />

      <Modal
        open={legendOpen}
        onOpenChange={setLegendOpen}
        size="wide"
        title="Status reference"
        description="What each requisition status means."
        footer={
          <Button variant="secondary" onClick={() => setLegendOpen(false)}>
            Close
          </Button>
        }
      >
        <DataTable<{ status: RequisitionStatus }>
          rows={(Object.keys(REQUISITION_STATUS_MEANING) as RequisitionStatus[])
            .filter((value) => value !== 'DRAFT')
            .map((value) => ({ status: value }))}
          rowKey={(row) => row.status}
          columns={[
            { key: 'status', header: 'Status', render: (row) => <RequisitionStatusBadge status={row.status} /> },
            {
              key: 'meaning',
              header: 'Meaning',
              render: (row) => (
                <span className="block whitespace-normal">{REQUISITION_STATUS_MEANING[row.status]}</span>
              ),
            },
          ]}
        />
      </Modal>
    </>
  );
}
