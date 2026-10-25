import { useMemo, useState } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { Info, Lock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHead } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CellIdentity, DataTable, type Column } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { MultiSelect } from '@/components/MultiSelect';
import { PageShell } from '@/components/PageShell';
import { Pagination } from '@/components/Pagination';
import { RowButton } from '@/components/RowActions';
import { Segmented } from '@/components/Segmented';
import { TabMenu } from '@/components/TabMenu';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { DateField } from '@/components/form/DateField';
import { EmployeeSelectField } from '@/components/form/EmployeeSelectField';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { createLocalEmployeeSource } from '@/lib/employeeSource';
import { formatDate, formatDateTime } from '@/lib/format';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { employeeService } from '@/features/employees/services/employee.service';
import { CURRENT_USER_ID, UNIT_OPTIONS } from '@/features/manpower/types';
import { temporaryAssignmentService, vacantSeats } from '@/features/temporary-assignment/services/temporary-assignment.service';
import {
  RETURN_TRIGGER_LABEL,
  STATUS_LABEL,
  STATUS_MEANING,
  STATUS_TONE,
  TYPE_HINT,
  TYPE_LABEL,
  canOpenAssignments,
  isAssignmentChecker,
  seatLabel,
} from '@/features/temporary-assignment/types';
import type {
  AssignmentDraft,
  AssignmentStatus,
  AssignmentType,
  TemporaryAssignment,
} from '@/features/temporary-assignment/types';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';

const STATUSES = Object.keys(STATUS_LABEL) as AssignmentStatus[];
const TYPES = Object.keys(TYPE_LABEL) as AssignmentType[];
const KEYS = ['temporary-assignment'] as const;

/** Hanya karyawan aktif yang dapat ditugaskan (server tetap 422). */
const ACTIVE_EMPLOYEES = createLocalEmployeeSource('ta-employee', async () => {
  const { rows } = await employeeService.search({
    keyword: '',
    branchId: '',
    createdFrom: '',
    createdTo: '',
    employmentStatus: ['ACTIVE'],
    page: 1,
    size: 500,
    sortBy: 'name',
    sortDir: 'ASC',
  });
  return rows.map((row) => ({ id: row.id, name: row.name, nik: row.nik, unit: row.position }));
});

function AssignmentBadge({ status }: { status: AssignmentStatus }) {
  return <StatusBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</StatusBadge>;
}

function useAssignmentMutation<V>(fn: (vars: V) => Promise<unknown>, message: (vars: V) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_result, vars) => {
      toast(message(vars), 'ok');
      void queryClient.invalidateQueries({ queryKey: KEYS });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

const EMPTY: AssignmentDraft = {
  employeeId: '',
  assignmentType: '',
  unitId: '',
  assignedSeatId: '',
  startDate: '',
  returnDate: '',
  reason: '',
};

const createSchema = Yup.object({
  employeeId: Yup.string().required('Choose the employee.'),
  assignmentType: Yup.string().required('Choose the type.'),
  unitId: Yup.string().required('Choose the organization unit.'),
  assignedSeatId: Yup.string().required('Choose the assignment seat.'),
  startDate: Yup.string().required('Choose the start date.'),
  returnDate: Yup.string()
    .required('Choose the return date.')
    .test('after', 'The return date must be after the start date.', function (value) {
      const start = (this.parent as AssignmentDraft).startDate;
      return !value || !start || value > start;
    }),
  reason: Yup.string().max(500, 'At most 500 characters.'),
});

/** Organization Unit → Assignment Seat (kursi kosong unit itu); ganti unit mengosongkan kursi. */
function SeatFields() {
  const { values, setFieldValue } = useFormikContext<AssignmentDraft>();
  const seats = values.unitId ? vacantSeats(values.unitId) : [];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SelectField
        name="unitId"
        label="Organization Unit"
        required
        placeholder="Select a unit"
        options={UNIT_OPTIONS}
        onValueChange={() => void setFieldValue('assignedSeatId', '')}
      />
      <SelectField
        name="assignedSeatId"
        label="Assignment Seat"
        required
        disabled={!values.unitId || seats.length === 0}
        placeholder={values.unitId ? 'Select a vacant seat' : 'Select a unit first'}
        options={seats.map((seat) => ({ value: seat.id, label: `${seat.code} - ${seat.name}` }))}
        hint={values.unitId && seats.length === 0 ? 'This unit has no vacant seat. Select another unit.' : 'Only vacant seats are listed.'}
      />
    </div>
  );
}

/** TA-CREATE — New Temporary Assignment. */
function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [key] = useState(() => crypto.randomUUID());
  const create = useAssignmentMutation(
    (draft: AssignmentDraft) => temporaryAssignmentService.create(draft, key),
    () => 'The request was submitted and now waits for approval.',
  );
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Formik<AssignmentDraft>
      initialValues={EMPTY}
      validationSchema={createSchema}
      onSubmit={(draft, helpers) =>
        create.mutate(draft, {
          onSuccess: () => {
            helpers.resetForm();
            onClose();
          },
        })
      }
    >
      {({ submitForm, resetForm, values }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title="New Temporary Assignment"
            description="The employee keeps their own seat. Unit, branch, cost center and grade stay with the home seat, so payroll and attendance do not change."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={() => void submitForm()} disabled={create.isPending}>
                  {create.isPending ? 'Submitting…' : 'Submit Request'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <EmployeeSelectField name="employeeId" lang="en" label="Employee" required source={ACTIVE_EMPLOYEES} hint="Active employees only." />
              <SelectField
                name="assignmentType"
                label="Type"
                required
                placeholder="Select a type"
                options={TYPES.map((value) => ({ value, label: TYPE_LABEL[value] }))}
                hint={values.assignmentType ? TYPE_HINT[values.assignmentType] : undefined}
              />
              <SeatFields />
              <div className="grid gap-4 md:grid-cols-2">
                <DateField name="startDate" label="Start Date" required min={today} hint="Today or later." />
                <DateField name="returnDate" label="Return Date" required min={values.startDate || today} hint="The employee returns automatically on this date." />
              </div>
              <TextAreaField name="reason" label="Reason" maxLength={500} rows={3} placeholder="Optional" />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

/** TA-EXTEND — New Return Date. */
function ExtendModal({ row, onClose }: { row: TemporaryAssignment | null; onClose: () => void }) {
  const extend = useAssignmentMutation(
    ({ id, returnDate }: { id: string; returnDate: string }) => temporaryAssignmentService.extend(id, returnDate),
    ({ returnDate }) => `The return date is now ${formatDate(returnDate)}.`,
  );
  return (
    <Formik
      initialValues={{ returnDate: '' }}
      enableReinitialize
      validationSchema={Yup.object({ returnDate: Yup.string().required('Choose the new return date.') })}
      onSubmit={({ returnDate }) => {
        if (row) extend.mutate({ id: row.id, returnDate }, { onSuccess: onClose });
      }}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(row)}
          onOpenChange={(next) => !next && onClose()}
          title="Extend Assignment"
          description={row ? `${row.employeeName} · returns on ${formatDate(row.returnDate)}` : undefined}
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={extend.isPending}>
                {extend.isPending ? 'Saving…' : 'Extend'}
              </Button>
            </>
          }
        >
          <Form>
            <DateField
              name="returnDate"
              label="New Return Date"
              required
              min={row?.returnDate}
              hint="Must be after the current return date and after today."
            />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

type Decision = 'approve' | 'reject' | 'cancel' | 'return';

const DECISION_COPY: Record<Decision, { title: string; body: string; label: string; tone: 'primary' | 'danger' }> = {
  approve: { title: 'Approve this assignment?', body: 'If the start date has arrived, the assignment becomes Active right away.', label: 'Approve', tone: 'primary' },
  reject: { title: 'Reject this assignment?', body: 'No seat is touched. The requester sees the rejection.', label: 'Reject', tone: 'danger' },
  cancel: { title: 'Cancel this assignment?', body: 'It is withdrawn before it starts. No seat is touched.', label: 'Cancel Assignment', tone: 'danger' },
  return: { title: 'Return the employee early?', body: 'The assignment seat becomes vacant. The employee stays in their own seat.', label: 'Return Early', tone: 'danger' },
};

/** TA-DETAIL — Assignment Details + aksi sesuai status dan peran. */
function DetailModal({
  row,
  checker,
  onClose,
  onExtend,
}: {
  row: TemporaryAssignment | null;
  checker: boolean;
  onClose: () => void;
  onExtend: (row: TemporaryAssignment) => void;
}) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const run = useAssignmentMutation(
    ({ id, action }: { id: string; action: Decision }) =>
      action === 'approve'
        ? temporaryAssignmentService.approve(id)
        : action === 'reject'
          ? temporaryAssignmentService.reject(id)
          : action === 'cancel'
            ? temporaryAssignmentService.cancel(id)
            : temporaryAssignmentService.returnEarly(id),
    ({ action }) =>
      ({ approve: 'The assignment was approved.', reject: 'The assignment was rejected.', cancel: 'The assignment was cancelled.', return: 'The employee was returned early.' })[action],
  );

  if (!row) return null;
  const own = row.createdById === CURRENT_USER_ID;
  const canDecide = row.status === 'IN_APPROVAL' && checker && !own;
  const canCancel = (row.status === 'IN_APPROVAL' || row.status === 'APPROVED') && (own || checker);
  const canReturn = row.status === 'ACTIVE' && checker;
  const canExtend = (row.status === 'APPROVED' || row.status === 'ACTIVE') && checker;
  const copy = decision ? DECISION_COPY[decision] : null;

  return (
    <>
      <Modal
        open
        onOpenChange={(next) => !next && onClose()}
        size="wide"
        title="Assignment Details"
        footer={
          canDecide || canCancel || canReturn || canExtend ? (
            <>
              {canCancel && (
                <Button variant="secondary" onClick={() => setDecision('cancel')}>
                  Cancel Assignment
                </Button>
              )}
              {canReturn && (
                <Button variant="secondary" onClick={() => setDecision('return')}>
                  Return Early
                </Button>
              )}
              {canExtend && (
                <Button variant="secondary" onClick={() => onExtend(row)}>
                  Extend
                </Button>
              )}
              {canDecide && (
                <>
                  <Button variant="danger" onClick={() => setDecision('reject')}>
                    Reject
                  </Button>
                  <Button onClick={() => setDecision('approve')}>Approve</Button>
                </>
              )}
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <AssignmentBadge status={row.status} />
            <span className="font-body text-[13px] text-fg-2">{STATUS_MEANING[row.status]}</span>
          </div>
          {row.status === 'IN_APPROVAL' && own && checker && (
            <Note icon={<Info />}>You submitted this request, so another HR Manager or Super Admin must decide it.</Note>
          )}
          <KeyValueList>
            <KeyValueRow label="Employee">{`${row.employeeName} · ${row.employeeNik}`}</KeyValueRow>
            <KeyValueRow label="Type">{TYPE_LABEL[row.assignmentType]}</KeyValueRow>
            <KeyValueRow label="Home Seat">{row.homeSeat || '—'}</KeyValueRow>
            <KeyValueRow label="Assignment Seat">{seatLabel(row.assignedSeatId)}</KeyValueRow>
            <KeyValueRow label="Start Date">{formatDate(row.startDate)}</KeyValueRow>
            <KeyValueRow label="Return Date">{formatDate(row.returnDate)}</KeyValueRow>
            <KeyValueRow label="Reason">{row.reason || '—'}</KeyValueRow>
            {row.returnTrigger && <KeyValueRow label="How It Ended">{RETURN_TRIGGER_LABEL[row.returnTrigger]}</KeyValueRow>}
            {row.approvedBy && (
              <KeyValueRow label={row.status === 'REJECTED' ? 'Rejected by' : 'Approved by'}>
                {`${row.approvedBy} · ${formatDateTime(row.approvedAt)}`}
              </KeyValueRow>
            )}
            {row.returnedOn && <KeyValueRow label="Returned on">{formatDate(row.returnedOn)}</KeyValueRow>}
            <KeyValueRow label="Requested on">{`${row.createdBy} · ${formatDateTime(row.createdAt)}`}</KeyValueRow>
          </KeyValueList>
        </div>
      </Modal>
      <ConfirmDialog
        open={Boolean(decision)}
        title={copy?.title ?? ''}
        description={copy?.body}
        confirmLabel={copy?.label}
        cancelLabel="Back"
        tone={copy?.tone ?? 'primary'}
        loading={run.isPending}
        onOpenChange={(open) => !open && setDecision(null)}
        onConfirm={() =>
          decision &&
          run.mutate(
            { id: row.id, action: decision },
            {
              onSuccess: () => {
                setDecision(null);
                onClose();
              },
              onError: () => setDecision(null),
            },
          )
        }
      />
    </>
  );
}

function StatusReference({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Assignment statuses"
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <DataTable<{ status: AssignmentStatus }>
        rows={STATUSES.map((status) => ({ status }))}
        rowKey={(item) => item.status}
        columns={[
          { key: 'status', header: 'Status', nowrap: true, render: (item) => <AssignmentBadge status={item.status} /> },
          { key: 'meaning', header: 'Meaning', render: (item) => STATUS_MEANING[item.status] },
        ]}
      />
    </Modal>
  );
}

type View = 'activity' | 'information';
type Bucket = 'approve' | 'mine';
const OPEN: AssignmentStatus[] = ['IN_APPROVAL', 'APPROVED', 'ACTIVE'];

/**
 * Employee Directory › Temporary Assignment — FSD-001-EMPLOYEE 0.83 §10. Pola maker/checker sama dengan New
 * Joiner: tab Activity memisahkan "Needs approval" (diajukan orang lain, terlama dulu) dari "My requests"
 * (ajuan sendiri yang masih berjalan); tab Information = seluruh penugasan dengan filter.
 */
export function TemporaryAssignmentPage() {
  const role = useAuthStore((s) => s.user?.role);
  const allowed = canOpenAssignments(role);
  const checker = isAssignmentChecker(role);

  const [keyword, setKeyword] = useState('');
  const [statuses, setStatuses] = useState<AssignmentStatus[]>([]);
  const [type, setType] = useState<AssignmentType | 'ALL'>('ALL');
  const filter = useMemo(
    () => ({ keyword, statuses, assignmentType: type === 'ALL' ? undefined : type }),
    [keyword, statuses, type],
  );
  const { data, isLoading, isError } = useQuery({
    queryKey: [...KEYS, filter],
    queryFn: () => temporaryAssignmentService.search(filter),
    enabled: allowed,
  });
  const { data: everything = [] } = useQuery({
    queryKey: [...KEYS, 'all'],
    queryFn: () => temporaryAssignmentService.search({}),
    enabled: allowed,
  });
  const rows = useMemo(() => data ?? [], [data]);
  const paged = usePagedRows(rows);
  const filtered = keyword || statuses.length > 0 || type !== 'ALL';

  const toApprove = useMemo(
    () =>
      checker
        ? everything
            .filter((row) => row.status === 'IN_APPROVAL' && row.createdById !== CURRENT_USER_ID)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        : [],
    [everything, checker],
  );
  const mine = useMemo(
    () => everything.filter((row) => row.createdById === CURRENT_USER_ID && OPEN.includes(row.status)),
    [everything],
  );

  const [view, setView] = useState<View>('activity');
  const [bucket, setBucket] = useState<Bucket>('approve');
  // Peran yang bukan checker tidak punya antrean persetujuan — langsung ke ajuannya sendiri.
  const activeBucket: Bucket = checker ? bucket : 'mine';

  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<TemporaryAssignment | null>(null);
  const [extending, setExtending] = useState<TemporaryAssignment | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const columns: Column<TemporaryAssignment>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (row) => <CellIdentity name={row.employeeName} sub={`${row.employeeNik} · ${row.homeSeat}`} />,
    },
    { key: 'type', header: 'Type', render: (row) => TYPE_LABEL[row.assignmentType] },
    { key: 'seat', header: 'Assignment Seat', muted: true, render: (row) => seatLabel(row.assignedSeatId) },
    {
      key: 'period',
      header: 'Period',
      nowrap: true,
      render: (row) => `${formatDate(row.startDate)} – ${formatDate(row.returnDate)}`,
    },
    {
      key: 'status',
      header: 'Status',
      info: { label: 'Status reference', onClick: () => setLegendOpen(true) },
      render: (row) => (
        <div className="flex flex-col gap-1">
          <AssignmentBadge status={row.status} />
          {row.returnTrigger && (
            <span className="font-body text-[11.5px] font-medium text-fg-3">{RETURN_TRIGGER_LABEL[row.returnTrigger]}</span>
          )}
        </div>
      ),
    },
    { key: 'requester', header: 'Requested By', muted: true, render: (row) => row.createdBy },
  ];

  /** Baris yang menunggu keputusan pengguna diberi label "Review" supaya tugasnya terbaca. */
  const action = (row: TemporaryAssignment) => (
    <RowButton onClick={() => setDetail(row)}>
      {row.status === 'IN_APPROVAL' && checker && row.createdById !== CURRENT_USER_ID ? 'Review' : 'View Detail'}
    </RowButton>
  );

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Temporary Assignment' }]}
        title="Temporary Assignment"
        description="Place an employee in a vacant seat for a while (Rotation or Secondment). They keep their own seat and come back automatically on the return date."
        actions={allowed && <Button onClick={() => setCreating(true)}>New Assignment</Button>}
      >
        {!allowed ? (
          <Note tone="warn" icon={<Lock />}>
            This menu is available to HR Staff, HR Manager and Super Admin.
          </Note>
        ) : (
          <div className="flex flex-col gap-5">
            <TabMenu<View>
              value={view}
              onChange={setView}
              items={[
                { value: 'activity', label: 'Activity', count: toApprove.length + mine.length },
                { value: 'information', label: 'Information', count: everything.length },
              ]}
            />

            {view === 'activity' && (
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Segmented<Bucket>
                    value={activeBucket}
                    onChange={setBucket}
                    options={[
                      ...(checker ? [{ value: 'approve' as const, label: `Needs approval (${toApprove.length})` }] : []),
                      { value: 'mine', label: `My requests (${mine.length})` },
                    ]}
                  />
                  <span className="font-body text-xs font-medium text-fg-3">
                    {activeBucket === 'approve'
                      ? 'Submitted by others, oldest first. Your own requests never appear here.'
                      : 'Your requests that are waiting, approved, or running.'}
                  </span>
                </div>
                <DataTable<TemporaryAssignment>
                  rows={activeBucket === 'approve' ? toApprove : mine}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty={activeBucket === 'approve' ? 'Nothing is waiting for your approval.' : 'You have no request in progress.'}
                  columns={columns}
                  actions={action}
                />
              </Card>
            )}

            {view === 'information' && (
              <Card>
                <CardHead title="All assignments" sub={`${rows.length} records · newest first`} />
                <div className="flex flex-col">
                  <TableToolbar
                    filters={
                      <>
                        <MultiSelect<AssignmentStatus>
                          className="w-[220px]"
                          value={statuses}
                          onChange={(next) => {
                            setStatuses(next);
                            paged.resetPage();
                          }}
                          options={STATUSES.map((value) => ({ value, label: STATUS_LABEL[value] }))}
                          placeholder="All statuses"
                        />
                        <Select
                          value={type}
                          onValueChange={(value) => {
                            setType(value as AssignmentType | 'ALL');
                            paged.resetPage();
                          }}
                        >
                          <SelectTrigger className="h-10 w-[160px]" aria-label="Type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All types</SelectItem>
                            {TYPES.map((value) => (
                              <SelectItem key={value} value={value}>
                                {TYPE_LABEL[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    }
                    search={{
                      value: keyword,
                      onChange: (value) => {
                        setKeyword(value);
                        paged.resetPage();
                      },
                      placeholder: 'Search employee name or NIK',
                    }}
                  />
                  <DataTable<TemporaryAssignment>
                    rows={paged.rows}
                    rowKey={(row) => row.id}
                    loading={isLoading}
                    empty={
                      isError
                        ? 'The assignment list could not be loaded.'
                        : filtered
                          ? 'No assignments match the current filter.'
                          : 'No temporary assignments yet. Use New Assignment to place an employee in a vacant seat.'
                    }
                    columns={columns}
                    actions={action}
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
            )}
          </div>
        )}
      </PageShell>

      <CreateModal open={creating} onClose={() => setCreating(false)} />
      <DetailModal
        row={detail}
        checker={checker}
        onClose={() => setDetail(null)}
        onExtend={(row) => {
          setDetail(null);
          setExtending(row);
        }}
      />
      <ExtendModal row={extending} onClose={() => setExtending(null)} />
      <StatusReference open={legendOpen} onClose={() => setLegendOpen(false)} />
    </>
  );
}
