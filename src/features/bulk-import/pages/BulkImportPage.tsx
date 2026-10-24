import { useMemo, useState } from 'react';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { DateRangePicker } from '@/components/DatePicker';
import { MultiSelect } from '@/components/MultiSelect';
import { PageShell } from '@/components/PageShell';
import { Pagination } from '@/components/Pagination';
import { RowButton } from '@/components/RowActions';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { usePagedRows } from '@/hooks/usePagedRows';
import {
  DetailModal,
  ImportStatusBadge,
  ImportStatusReference,
  ReviewModal,
  UploadModal,
} from '@/features/bulk-import/components/ImportModals';
import { useImportBatches } from '@/features/bulk-import/hooks/useBulkImport';
import { bulkImportService } from '@/features/bulk-import/services/bulk-import.service';
import { IMPORT_STATUS_LABEL, type ImportBatch, type ImportStatus } from '@/features/bulk-import/types';
import { formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';

const STATUS_OPTIONS = (Object.keys(IMPORT_STATUS_LABEL) as ImportStatus[]).map((value) => ({
  value,
  label: IMPORT_STATUS_LABEL[value],
}));

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([bulkImportService.templateCsv()], { type: 'text/csv' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: 'employee-import-template.csv' });
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Employee Bulk Import — BI-HISTORY (FSD-001-EMPLOYEE 0.46 §8.1, bentuk email-saja) dengan BI-UPLOAD, BI-DETAIL, dan
 * BI-REVIEW sebagai overlay (§8.4–§8.5). Gerbang peran: unggah = HR Staff · HR Manager · Super Admin;
 * tinjau & putuskan = HR Manager · Super Admin (L1, tombol disembunyikan).
 */
export function BulkImportPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canApprove = role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
  const canSubmit = canApprove || role === 'ROLE_HR_STAFF';

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ImportStatus[]>([]);
  const [range, setRange] = useState({ from: '', to: '' });
  const filter = useMemo(
    () => ({ keyword, importStatus: status, startDate: range.from || undefined, endDate: range.to || undefined }),
    [keyword, status, range],
  );
  const { data, isLoading } = useImportBatches(filter);
  const rows = useMemo(() => data ?? [], [data]);
  const paged = usePagedRows(rows);

  const [uploading, setUploading] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Employee Bulk Import' }]}
        title="Employee Bulk Import"
        description="Invite many candidates at once from a CSV file of email addresses. The uploader submits the file, someone else approves it, and each candidate then fills in their own data."
        actions={
          canSubmit && (
            <>
              <Button variant="secondary" onClick={downloadTemplate}>
                Download CSV Template
              </Button>
              <Button onClick={() => setUploading(true)}>Upload New File</Button>
            </>
          )
        }
      >
        <Card>
          <CardHead title="Import history" sub={`${rows.length} batches · newest first`} />
          <div className="flex flex-col">
            <TableToolbar
              filters={
                <>
                  <MultiSelect<ImportStatus>
                    className="w-[220px]"
                    value={status}
                    onChange={setStatus}
                    options={STATUS_OPTIONS}
                    placeholder="All statuses"
                  />
                  <DateRangePicker className="w-[260px]" value={range} onChange={setRange} placeholder="Date submitted" />
                </>
              }
              search={{ value: keyword, onChange: setKeyword, placeholder: 'Search file name' }}
            />
            <DataTable<ImportBatch>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={isLoading}
              empty="No import batch yet."
              columns={[
                {
                  key: 'file',
                  header: 'File Name',
                  strong: true,
                  render: (row) => (
                    <span className="flex flex-col gap-0.5">
                      <span>{row.fileName}</span>
                      <span className="font-body text-[11px] font-medium text-fg-3">{row.id}</span>
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  info: { label: 'Status reference', onClick: () => setLegendOpen(true) },
                  render: (row) => <ImportStatusBadge status={row.importStatus} />,
                },
                { key: 'total', header: 'Total', align: 'center', render: (row) => row.totalRows },
                { key: 'ok', header: 'Invited', align: 'center', render: (row) => row.successCount },
                { key: 'fail', header: 'Failed', align: 'center', render: (row) => row.failedCount },
                {
                  key: 'by',
                  header: 'Submitted By',
                  muted: true,
                  render: (row) => (
                    <span className="flex flex-col gap-0.5">
                      <span>{row.submittedBy}</span>
                      <span className="text-[11px]">{formatDateTime(row.submittedAt)}</span>
                    </span>
                  ),
                },
              ]}
              actions={(row) => (
                <span className="flex items-center justify-end gap-2">
                  <RowButton onClick={() => setDetailId(row.id)}>View Detail</RowButton>
                  {canApprove && row.importStatus === 'VALIDATED' && (
                    <RowButton onClick={() => setReviewId(row.id)}>Review & Decide</RowButton>
                  )}
                </span>
              )}
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="batch"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      </PageShell>

      <UploadModal open={uploading} onClose={() => setUploading(false)} />
      <DetailModal id={detailId} onClose={() => setDetailId(null)} />
      <ReviewModal id={reviewId} onClose={() => setReviewId(null)} />
      <ImportStatusReference open={legendOpen} onClose={() => setLegendOpen(false)} />
    </>
  );
}
