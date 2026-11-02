import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { RowButton } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { employeeName } from '@/features/time-off/mock-data';
import { ImportStatusBadge, ReviewModal, UploadModal } from '@/features/bulk-import/components/ImportModals';
import { useImportBatches } from '@/features/bulk-import/hooks/useBulkImport';
import { TEMPLATE_CSV } from '@/features/bulk-import/types';
import type { ImportBatch, ImportSession } from '@/features/bulk-import/types';
import { formatDateTime } from '@/lib/format';

const VIEWERS: (ImportSession & { label: string })[] = [
  { employeeId: 'emp-sari', role: 'HR_STAFF', label: 'Sari Kartika — HR Staff (uploader)' },
  { employeeId: 'emp-hendra', role: 'HR_MANAGER', label: 'Hendra Kusuma — HR Manager (approver)' },
];

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: 'bulk-import-template.csv' });
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Employee Directory › Bulk Import (TSD-001-EMPLOYEE 0.212 §7.16; CATATAN-PERUBAHAN
 * 15 & 19 Okt 2026). Tiga langkah: unggah → periksa → persetujuan orang kedua
 * yang sekaligus mengirim undangan. Kandidat lalu muncul di ATS Bridge.
 */
export function BulkImportPage() {
  const [session, setSession] = useState<ImportSession>(VIEWERS[0]);
  const [uploading, setUploading] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const batches = useImportBatches();
  const rows = batches.data ?? [];
  const paged = usePagedRows(rows);
  const reviewing = rows.find((row) => row.id === reviewingId) ?? null;

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Bulk Import' }]}
      title="Bulk Import"
      description="Invite many candidates at once from a list of emails. Nothing is sent until a second HR Manager approves the checked file; candidates then appear in ATS Bridge."
      actions={
        <>
          <Button variant="secondary" onClick={downloadTemplate}>
            Download template
          </Button>
          <Button onClick={() => setUploading(true)}>Upload file</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
          <Select
            value={session.employeeId}
            onValueChange={(value) => setSession(VIEWERS.find((row) => row.employeeId === value) ?? VIEWERS[0])}
          >
            <SelectTrigger className="w-[320px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEWERS.map((viewer) => (
                <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                  {viewer.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHead title="Import history" sub="Awaiting approval → open Review to decide" />
          <div className="flex flex-col">
            <DataTable<ImportBatch>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={batches.isLoading}
              empty="No import yet. Download the template, fill in candidate emails, then upload."
              columns={[
                { key: 'file', header: 'File', strong: true, render: (row) => row.fileName },
                { key: 'status', header: 'Status', render: (row) => <ImportStatusBadge status={row.importStatus} /> },
                { key: 'total', header: 'Rows', align: 'right', render: (row) => <span className="tabular-nums">{row.totalRows}</span> },
                { key: 'ok', header: 'Invited', align: 'right', render: (row) => <span className="tabular-nums">{row.successCount}</span> },
                { key: 'fail', header: 'Failed', align: 'right', render: (row) => <span className="tabular-nums">{row.failedCount}</span> },
                { key: 'by', header: 'Uploaded By', render: (row) => employeeName(row.submittedBy) },
                { key: 'at', header: 'Uploaded At', nowrap: true, muted: true, render: (row) => formatDateTime(row.submittedAt) },
              ]}
              actions={(row) => (
                <RowButton onClick={() => setReviewingId(row.id)}>
                  {row.importStatus === 'VALIDATED' ? 'Review & decide' : 'View detail'}
                </RowButton>
              )}
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="imports"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      </div>

      <UploadModal open={uploading} session={session} onClose={() => setUploading(false)} />
      <ReviewModal batch={reviewing} session={session} onClose={() => setReviewingId(null)} />
    </PageShell>
  );
}
