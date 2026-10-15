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
import { DetailModal, ImportStatusBadge, ReviewModal, UploadModal } from '@/features/bulk-import/components/ImportModals';
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
  const link = Object.assign(document.createElement('a'), { href: url, download: 'templat-impor-karyawan.csv' });
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Bulk Import Karyawan — BI-HISTORY (FSD-001-EMPLOYEE 0.24 §8.1) dengan BI-UPLOAD, BI-DETAIL, dan
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

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Bulk Import Karyawan' }]}
        title="Bulk Import Karyawan"
        description="Tambah karyawan sekaligus lewat berkas CSV. Pengunggah mengajukan, checker lain meninjau lalu menyetujui atau membatalkan."
        actions={
          canSubmit && (
            <>
              <Button variant="secondary" onClick={downloadTemplate}>
                Unduh templat CSV
              </Button>
              <Button onClick={() => setUploading(true)}>Unggah berkas baru</Button>
            </>
          )
        }
      >
        <Card>
          <CardHead title="Riwayat impor" sub={`${rows.length} batch`} />
          <div className="flex flex-col">
            <TableToolbar
              filters={
                <>
                  <MultiSelect<ImportStatus>
                    className="w-[220px]"
                    value={status}
                    onChange={setStatus}
                    options={STATUS_OPTIONS}
                    placeholder="Semua status"
                  />
                  <DateRangePicker className="w-[260px]" value={range} onChange={setRange} placeholder="Tanggal diajukan" />
                </>
              }
              search={{ value: keyword, onChange: setKeyword, placeholder: 'Cari nama berkas' }}
            />
            <DataTable<ImportBatch>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={isLoading}
              empty="Belum ada batch impor."
              columns={[
                {
                  key: 'file',
                  header: 'Nama berkas',
                  strong: true,
                  render: (row) => (
                    <span className="flex flex-col gap-0.5">
                      <span>{row.fileName}</span>
                      <span className="font-body text-[11px] font-medium text-fg-3">{row.id}</span>
                    </span>
                  ),
                },
                { key: 'status', header: 'Status', render: (row) => <ImportStatusBadge status={row.importStatus} /> },
                { key: 'total', header: 'Total', align: 'center', render: (row) => row.totalRows },
                { key: 'ok', header: 'Sukses', align: 'center', render: (row) => row.successCount },
                { key: 'fail', header: 'Gagal', align: 'center', render: (row) => row.failedCount },
                {
                  key: 'by',
                  header: 'Diajukan oleh',
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
                  <RowButton onClick={() => setDetailId(row.id)}>Lihat detail</RowButton>
                  {canApprove && row.importStatus === 'VALIDATED' && (
                    <RowButton onClick={() => setReviewId(row.id)}>Tinjau & putuskan</RowButton>
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
    </>
  );
}
