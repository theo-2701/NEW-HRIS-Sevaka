import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { DatePicker } from '@/components/DatePicker';
import { FilterModal } from '@/components/FilterModal';
import { Pagination } from '@/components/Pagination';
import { RowActions, RowButton } from '@/components/RowActions';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Field, SelectRow } from '@/features/company/components/CompanyBits';
import {
  CorrectionBadge,
  ErrorBanner,
  OriginBadge,
  PersonCell,
  ProdActorPicker,
} from '@/features/productivity/components/ProdBits';
import {
  AcceptWorklogModal,
  EditWorklogModal,
  GrantWindowModal,
} from '@/features/productivity/components/WorklogModals';
import { useDeleteWorklog, useWorklogs } from '@/features/productivity/hooks/useTimesheet';
import { PROD_EMPLOYEES } from '@/features/productivity/mock-data';
import { formatMinutes, isHr, isSupervisorOf, ORIGIN_META, subordinatesOf } from '@/features/productivity/rules';
import { projectService } from '@/features/productivity/services/project.service';
import { useProdActor } from '@/features/productivity/store/prodActor.store';
import type { Worklog, WorklogOrigin } from '@/features/productivity/types';
import { formatDate } from '@/lib/format';
import { ApiError } from '@/services/api';

const clockOf = (iso: string | null) => (iso ? new Date(iso).toTimeString().slice(0, 5) : '—');

/**
 * Productivity › Timesheet › Activities — FSD-001-PRODUCTIVITY-0.2 §5.
 *
 * Dua rezim aktor: pemilik mengoreksi barisnya sendiri (Flow A), atasan berjenjang menerima baris "Dihentikan
 * Sistem" bawahan apa adanya (Flow B, SoD). Satu-satunya tempat nilai `DIHENTIKAN_SISTEM` tampil & diselesaikan.
 */
export function ActivitiesPage() {
  const { actor } = useProdActor();
  const hr = isHr(actor.role);
  const people = hr
    ? PROD_EMPLOYEES
    : [PROD_EMPLOYEES.find((row) => row.employeeId === actor.employeeId)!, ...subordinatesOf(actor.employeeId)].filter(
        Boolean,
      );
  const [employeeId, setEmployeeId] = useState(actor.employeeId);
  const target = people.some((row) => row.employeeId === employeeId) ? employeeId : actor.employeeId;
  const [origin, setOrigin] = useState<'' | WorklogOrigin>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<Worklog | null>(null);
  const [accepting, setAccepting] = useState<Worklog | null>(null);
  const [deleting, setDeleting] = useState<Worklog | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const remove = useDeleteWorklog();

  const worklogs = useWorklogs(actor, {
    employeeId: target,
    origin: origin || undefined,
    workDateStart: from || undefined,
    workDateEnd: to || undefined,
  });
  const rows = worklogs.data ?? [];
  const paged = usePagedRows(rows);
  const forbidden = worklogs.error instanceof ApiError && worklogs.error.status === 403;
  const canGrant = hr || subordinatesOf(actor.employeeId).length > 0;
  const active = [origin, from || to].filter(Boolean).length;
  const summary = [
    origin && ORIGIN_META[origin].label,
    (from || to) && `${from ? formatDate(from) : '…'} – ${to ? formatDate(to) : '…'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <PageShell
      crumbs={[{ label: 'Productivity' }, { label: 'Project & Task' }, { label: 'Timesheet' }, { label: 'Activities' }]}
      title="Activities"
      description="Every time entry, newest work date first. Owners correct their own entries; supervisors accept system-stopped entries of their team as is."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ProdActorPicker onChange={() => setEmployeeId('')} />
          {canGrant && (
            <Button variant="secondary" onClick={() => setGrantOpen(true)}>
              Open entry window
            </Button>
          )}
        </div>
      }
    >
      <Card>
        <CardHead
          title={
            target === actor.employeeId
              ? 'My time entries'
              : `Time entries — ${people.find((row) => row.employeeId === target)?.name}`
          }
          sub={
            target === actor.employeeId
              ? 'Entries stopped by the system must be corrected or accepted before the timesheet can be submitted.'
              : 'Reading another person’s entries is recorded in the data access trail.'
          }
        />
        <div>
          <TableToolbar
            filters={
              <div className="flex flex-wrap items-center gap-2">
                {people.length > 1 && (
                  <Select
                    value={target}
                    onValueChange={(value) => {
                      setEmployeeId(value);
                      paged.resetPage();
                    }}
                  >
                    <SelectTrigger className="h-10 w-[220px]" aria-label="Employee">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {people.map((row) => (
                        <SelectItem key={row.employeeId} value={row.employeeId}>
                          {row.employeeId === actor.employeeId ? `${row.name} (me)` : row.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                  {active ? `Filter (${active})` : 'Filter'}
                </Button>
              </div>
            }
            summary={summary || undefined}
          />
          {forbidden ? (
            <EmptyState title="403 — outside your supervision chain" description={worklogs.error?.message} />
          ) : (
            <DataTable<Worklog>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={worklogs.isLoading}
              empty="No time entry matches this filter."
              columns={[
                {
                  key: 'code',
                  header: 'Code',
                  nowrap: true,
                  render: (row) => <span className="font-mono text-xs">{row.code}</span>,
                },
                ...(target === actor.employeeId
                  ? []
                  : [
                      {
                        key: 'emp',
                        header: 'Employee',
                        render: (row: Worklog) => <PersonCell employeeId={row.employeeId} />,
                      },
                    ]),
                { key: 'date', header: 'Date', nowrap: true, render: (row) => formatDate(row.workDate) },
                {
                  key: 'task',
                  header: 'Task',
                  render: (row) => projectService.taskRef(row.taskId)?.taskTitle ?? row.taskId,
                },
                {
                  key: 'time',
                  header: 'Time',
                  nowrap: true,
                  render: (row) =>
                    row.startedAt
                      ? `${clockOf(row.startedAt)}–${row.stoppedAt ? clockOf(row.stoppedAt) : 'running'}`
                      : '—',
                },
                {
                  key: 'duration',
                  header: 'Duration',
                  align: 'right',
                  nowrap: true,
                  render: (row) => formatMinutes(row.durationMinutes),
                },
                {
                  key: 'origin',
                  header: 'Origin',
                  render: (row) => (
                    <span className="flex flex-wrap gap-1.5">
                      <OriginBadge value={row.origin} />
                      <CorrectionBadge value={row.correctionMode} />
                    </span>
                  ),
                },
              ]}
              actions={(row) => {
                const owner = row.employeeId === actor.employeeId;
                const acceptable =
                  !owner &&
                  row.origin === 'DIHENTIKAN_SISTEM' &&
                  !row.correctionMode &&
                  isSupervisorOf(actor.employeeId, row.employeeId);
                if (owner)
                  return (
                    <RowActions
                      actions={[
                        { label: 'Edit', onSelect: () => setEditing(row) },
                        { label: 'Delete', danger: true, onSelect: () => setDeleting(row) },
                      ]}
                    />
                  );
                if (acceptable)
                  return (
                    <RowActions
                      actions={[
                        { label: 'View Detail', onSelect: () => setEditing(row) },
                        { label: 'Accept as is', onSelect: () => setAccepting(row) },
                      ]}
                    />
                  );
                return <RowButton onClick={() => setEditing(row)}>View Detail</RowButton>;
              }}
            />
          )}
          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="entries"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>

      <FilterModal
        open={filterOpen}
        title="Filter time entries"
        onOpenChange={setFilterOpen}
        onReset={() => {
          setOrigin('');
          setFrom('');
          setTo('');
          paged.resetPage();
        }}
      >
        <SelectRow
          label="Origin"
          allowEmpty
          emptyLabel="All origins"
          value={origin}
          onChange={(value) => {
            setOrigin(value as '' | WorklogOrigin);
            paged.resetPage();
          }}
          options={(Object.keys(ORIGIN_META) as WorklogOrigin[]).map((value) => ({
            value,
            label: ORIGIN_META[value].label,
          }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Work date from">
            <DatePicker value={from} max={to || undefined} onChange={setFrom} />
          </Field>
          <Field label="Work date to">
            <DatePicker value={to} min={from || undefined} onChange={setTo} />
          </Field>
        </div>
      </FilterModal>

      <EditWorklogModal actor={actor} row={editing} onClose={() => setEditing(null)} />
      <AcceptWorklogModal actor={actor} row={accepting} onClose={() => setAccepting(null)} />
      <GrantWindowModal actor={actor} open={grantOpen} onClose={() => setGrantOpen(false)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next) {
            setDeleting(null);
            remove.reset();
          }
        }}
        title="Delete time entry?"
        description={`${deleting?.code} on ${deleting ? formatDate(deleting.workDate) : ''} will be removed. The deletion is kept in the entry history.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate({ actor, id: deleting.id, code: deleting.code }, { onSuccess: () => setDeleting(null) })
        }
      >
        <ErrorBanner error={remove.error} />
      </ConfirmDialog>
    </PageShell>
  );
}
