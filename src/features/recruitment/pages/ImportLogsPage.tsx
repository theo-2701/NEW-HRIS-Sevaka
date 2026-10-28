import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { PageShell } from '@/components/PageShell';
import { Pagination } from '@/components/Pagination';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { useImportLog, useImportLogs } from '@/features/recruitment/hooks/useRecruitment';
import { IMPORT_STATUS_LABEL, IMPORT_STATUS_TONE, type ImportLog, type ImportRow, type ImportStatus } from '@/features/recruitment/types';

const stamp = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const STATUSES = Object.keys(IMPORT_STATUS_LABEL) as ImportStatus[];
const CRUMBS = [
  { label: 'Recruitment' },
  { label: 'Job Listings', to: '/recruitment/job-listings' },
];

function Uploader({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar name={name} size="sm" />
      {name}
    </span>
  );
}

const Status = ({ status }: { status: ImportStatus }) => <StatusBadge tone={IMPORT_STATUS_TONE[status]}>{IMPORT_STATUS_LABEL[status]}</StatusBadge>;

/** Recruitment › Job Listings › Import Logs — port `_prototype/recruitment-import-logs.html`. */
export function ImportLogsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ImportStatus | 'ALL'>('ALL');
  const { data = [], isLoading, isFetching, refetch } = useImportLogs(status === 'ALL' ? undefined : status);
  const paged = usePagedRows(data);

  return (
    <PageShell crumbs={[...CRUMBS, { label: 'Import Logs' }]} title="Import logs" description="Every Import Job Listing upload, newest first.">
      <Card>
        <div className="flex flex-col">
          <TableToolbar
            filters={
              <Select
                value={status}
                onValueChange={(next) => {
                  setStatus(next as ImportStatus | 'ALL');
                  paged.resetPage();
                }}
              >
                <SelectTrigger className="w-[200px]" aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All status</SelectItem>
                  {STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {IMPORT_STATUS_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            actions={
              <Button variant="secondary" disabled={isFetching} onClick={() => void refetch()}>
                {isFetching ? 'Refreshing…' : 'Refresh Logs'}
              </Button>
            }
          />
          <DataTable<ImportLog>
            rows={paged.rows}
            rowKey={(row) => row.id}
            loading={isLoading}
            empty="No import matches this status."
            columns={[
              { key: 'id', header: 'Import ID', strong: true, nowrap: true, render: (row) => row.id },
              { key: 'date', header: 'Date', muted: true, nowrap: true, render: (row) => stamp.format(new Date(row.uploadedAt)) },
              { key: 'by', header: 'Uploaded By', render: (row) => <Uploader name={row.uploadedBy} /> },
              { key: 'file', header: 'File Name', muted: true, render: (row) => row.fileName },
              { key: 'status', header: 'Job Status', render: (row) => <Status status={row.status} /> },
            ]}
            actions={(row) => <RowButton onClick={() => navigate(`/recruitment/job-listings/import-logs/detail?id=${row.id}`)}>View Detail</RowButton>}
          />
          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="rows"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>
    </PageShell>
  );
}

/** Import log detail — baris yang berhasil, atau Error Log bila gagal (`recruitment-import-log-detail.html`). */
export function ImportLogDetailPage() {
  const [params] = useSearchParams();
  const { data: log, isLoading } = useImportLog(params.get('id'));
  const paged = usePagedRows(log?.rows ?? []);
  const crumbs = [...CRUMBS, { label: 'Import Logs', to: '/recruitment/job-listings/import-logs' }, { label: 'Detail' }];

  if (!log) {
    return (
      <PageShell crumbs={crumbs} title="Import log detail">
        {isLoading ? <p className="m-0 font-body text-[13px] text-fg-3">Loading import log…</p> : <EmptyState title="Import log not found" />}
      </PageShell>
    );
  }

  return (
    <PageShell crumbs={crumbs} title="Import log detail">
      <div className="flex flex-col gap-5">
        <Card>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-5">
            {(
              [
                ['Import ID', log.id],
                ['Date', stamp.format(new Date(log.uploadedAt))],
                ['Uploaded By', <Uploader key="by" name={log.uploadedBy} />],
                [
                  'File name',
                  <span key="file">
                    {log.fileName} <span className="font-medium text-fg-3">· {log.sizeKb} KB</span>
                  </span>,
                ],
                ['Status', <Status key="status" status={log.status} />],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="font-body text-xs font-medium text-fg-3">{label}</span>
                <span className="font-body text-sm font-semibold text-fg-1">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {log.status === 'FAILED' ? (
          <Card>
            <CardHead title="Error log" sub="Nothing from this file was saved. Fix these rows and upload the file again." />
            <ul className="m-0 flex flex-col gap-1.5 rounded-md border border-error-100 bg-error-50 py-3 pl-8 pr-4 font-body text-[13px] leading-[1.5] text-error-800">
              {log.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <CardHead
              title="Successful job listings import"
              sub={log.status === 'PROCESSING' ? 'Still processing. Refresh the logs in a moment.' : `${log.rows.length} of ${log.rows.length} rows · saved as draft`}
            />
            <div className="flex flex-col">
              <DataTable<ImportRow>
                rows={paged.rows}
                rowKey={(row, i) => `${row.title}-${i}`}
                empty="No row imported yet."
                columns={[
                  { key: 'title', header: 'Job Listing Title', strong: true, render: (row) => row.title },
                  { key: 'position', header: 'Job Position', render: (row) => row.position },
                  { key: 'branch', header: 'Work Location', render: (row) => row.branch },
                  { key: 'org', header: 'Organization', render: (row) => row.organization },
                  { key: 'emp', header: 'Employment Type', render: (row) => row.employmentStatus },
                  { key: 'work', header: 'Workplace', render: (row) => row.workplaceType },
                  { key: 'hc', header: 'Headcount Needed', align: 'center', render: (row) => row.headcount },
                ]}
              />
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="rows"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
