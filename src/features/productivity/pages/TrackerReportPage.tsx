import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { DateRangePicker } from '@/components/DatePicker';
import { FilterModal } from '@/components/FilterModal';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { usePagedRows } from '@/hooks/usePagedRows';
import { EmployeeRow, Field, SelectRow } from '@/features/company/components/CompanyBits';
import { OriginBadge, PersonCell, ProdActorPicker } from '@/features/productivity/components/ProdBits';
import { useActivityTypes, useTrackerReport } from '@/features/productivity/hooks/useTimesheet';
import { PROD_EMPLOYEES, prodEmployeeSource } from '@/features/productivity/mock-data';
import { formatMinutes, isHr, nameOf, ORIGIN_META, subordinatesOf } from '@/features/productivity/rules';
import { projectService } from '@/features/productivity/services/project.service';
import { useProdActor } from '@/features/productivity/store/prodActor.store';
import type { Worklog, WorklogOrigin } from '@/features/productivity/types';
import { formatDate } from '@/lib/format';
import { ApiError } from '@/services/api';

interface Filters {
  employeeId: string;
  activityTypeId: string;
  origin: '' | WorklogOrigin;
  from: string;
  to: string;
}
const NONE: Filters = { employeeId: '', activityTypeId: '', origin: '', from: '', to: '' };

/** CSV sisi klien — mekanisme unduh adalah lapis presentasi di luar kontrak data (TSD §5.11). */
function downloadCsv(rows: Worklog[]) {
  const header = ['Code', 'Employee', 'Work date', 'Task', 'Duration (minutes)', 'Origin'];
  const lines = rows.map((row) =>
    [
      row.code,
      nameOf(row.employeeId),
      row.workDate,
      projectService.taskRef(row.taskId)?.taskTitle ?? row.taskId,
      row.durationMinutes ?? '',
      row.origin,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tracker-report.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Productivity › Timesheet › Tracker Report — FSD-001-PRODUCTIVITY-0.2 §7. Grid baca-saja untuk atasan berjenjang
 * dan HR (bukan self-service); baris detail, bukan agregat. Di luar rantai = 403.
 */
export function TrackerReportPage() {
  const { actor } = useProdActor();
  const [filters, setFilters] = useState<Filters>(NONE);
  const [filterOpen, setFilterOpen] = useState(false);
  const activities = useActivityTypes();
  const report = useTrackerReport(actor, {
    employeeId: filters.employeeId || undefined,
    activityTypeId: filters.activityTypeId || undefined,
    origin: filters.origin || undefined,
    workDateStart: filters.from || undefined,
    workDateEnd: filters.to || undefined,
  });
  const rows = report.data ?? [];
  const paged = usePagedRows(rows);
  const forbidden = report.error instanceof ApiError && report.error.status === 403;
  const people = isHr(actor.role) ? PROD_EMPLOYEES : subordinatesOf(actor.employeeId);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    paged.resetPage();
  };
  const active = [filters.employeeId, filters.activityTypeId, filters.origin, filters.from || filters.to].filter(
    Boolean,
  ).length;
  const summary = [
    filters.employeeId && nameOf(filters.employeeId),
    filters.activityTypeId && activities.data?.find((row) => row.id === filters.activityTypeId)?.activityName,
    filters.origin && ORIGIN_META[filters.origin].label,
    (filters.from || filters.to) &&
      `${filters.from ? formatDate(filters.from) : '…'} – ${filters.to ? formatDate(filters.to) : '…'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <PageShell
      crumbs={[
        { label: 'Productivity' },
        { label: 'Project & Task' },
        { label: 'Timesheet' },
        { label: 'Tracker Report' },
      ]}
      title="Tracker Report"
      description="Detailed time entries of the people you supervise. For supervisors and HR only."
      actions={<ProdActorPicker onChange={() => setFilters(NONE)} />}
    >
      <Card>
        <CardHead title="Time entries" sub="One row per entry — not totals" />
        <div>
          {forbidden ? (
            <EmptyState title="403 — for supervisors and HR" description={report.error?.message} />
          ) : (
            <>
              <TableToolbar
                filters={
                  <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                    {active ? `Filter (${active})` : 'Filter'}
                  </Button>
                }
                summary={summary || undefined}
                actions={
                  <Button variant="secondary" disabled={!rows.length} onClick={() => downloadCsv(rows)}>
                    Download CSV
                  </Button>
                }
              />
              <DataTable<Worklog>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={report.isLoading}
                empty="No time entry matches this filter."
                columns={[
                  {
                    key: 'code',
                    header: 'Code',
                    nowrap: true,
                    render: (row) => <span className="font-mono text-xs">{row.code}</span>,
                  },
                  { key: 'emp', header: 'Employee', render: (row) => <PersonCell employeeId={row.employeeId} /> },
                  { key: 'date', header: 'Date', nowrap: true, render: (row) => formatDate(row.workDate) },
                  {
                    key: 'task',
                    header: 'Task',
                    render: (row) => projectService.taskRef(row.taskId)?.taskTitle ?? row.taskId,
                  },
                  {
                    key: 'duration',
                    header: 'Duration',
                    align: 'right',
                    nowrap: true,
                    render: (row) => formatMinutes(row.durationMinutes),
                  },
                  { key: 'origin', header: 'Origin', render: (row) => <OriginBadge value={row.origin} /> },
                ]}
              />
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="entries"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </>
          )}
        </div>
      </Card>

      <FilterModal
        open={filterOpen}
        title="Filter report"
        onOpenChange={setFilterOpen}
        onReset={() => setFilters(NONE)}
      >
        <EmployeeRow
          label="Employee"
          lang="en"
          emptyLabel="Everyone I supervise"
          value={filters.employeeId}
          onChange={(value) => set('employeeId', value)}
          source={prodEmployeeSource(people)}
        />
        <SelectRow
          label="Activity type"
          allowEmpty
          emptyLabel="All activity types"
          value={filters.activityTypeId}
          onChange={(value) => set('activityTypeId', value)}
          options={(activities.data ?? []).map((row) => ({ value: row.id, label: row.activityName }))}
        />
        <SelectRow
          label="Origin"
          allowEmpty
          emptyLabel="All origins"
          value={filters.origin}
          onChange={(value) => set('origin', value as Filters['origin'])}
          options={(Object.keys(ORIGIN_META) as WorklogOrigin[]).map((value) => ({
            value,
            label: ORIGIN_META[value].label,
          }))}
        />
        <Field label="Work date">
          <DateRangePicker
            value={{ from: filters.from, to: filters.to }}
            onChange={(range) => {
              setFilters((prev) => ({ ...prev, ...range }));
              paged.resetPage();
            }}
          />
        </Field>
      </FilterModal>
    </PageShell>
  );
}
