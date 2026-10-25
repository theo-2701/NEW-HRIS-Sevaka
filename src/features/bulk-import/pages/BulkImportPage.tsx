import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHead } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { DateRangePicker } from '@/components/DatePicker';
import { MultiSelect } from '@/components/MultiSelect';
import { PageShell } from '@/components/PageShell';
import { Pagination } from '@/components/Pagination';
import { RowActions } from '@/components/RowActions';
import type { RowAction } from '@/components/RowActions';
import { Segmented } from '@/components/Segmented';
import { TabMenu } from '@/components/TabMenu';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { usePagedRows } from '@/hooks/usePagedRows';
import { ImportStatusBadge, ImportStatusReference } from '@/features/bulk-import/components/ImportModals';
import { useImportBatches } from '@/features/bulk-import/hooks/useBulkImport';
import { CURRENT_USER, IMPORT_STATUS_LABEL, type ImportBatch, type ImportStatus } from '@/features/bulk-import/types';
import { formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';

const STATUS_OPTIONS = (Object.keys(IMPORT_STATUS_LABEL) as ImportStatus[]).map((value) => ({
  value,
  label: IMPORT_STATUS_LABEL[value],
}));

type View = 'activity' | 'information';
type Bucket = 'approve' | 'mine';
/** Batch milik sendiri yang masih bergerak (belum final). */
const OPEN: ImportStatus[] = ['VALIDATING', 'VALIDATED', 'APPROVED', 'PROCESSING'];

/**
 * Employee Bulk Import — BI-HISTORY (FSD-001-EMPLOYEE 0.83 §8, email-saja). Pola maker/checker New Joiner:
 * Activity = "Needs approval" (diunggah orang lain, terlama dulu) dan "My uploads"; Information = riwayat lengkap.
 * Unggah, detail, dan keputusan berupa halaman sendiri (Theo, 26 Okt 2026); templat CSV diunduh di halaman unggah.
 */
export function BulkImportPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const checker = role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
  const canSubmit = checker || role === 'ROLE_HR_STAFF';

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<ImportStatus[]>([]);
  const [range, setRange] = useState({ from: '', to: '' });
  const filter = useMemo(
    () => ({ keyword, importStatus: status, startDate: range.from || undefined, endDate: range.to || undefined }),
    [keyword, status, range],
  );
  const { data, isLoading } = useImportBatches(filter);
  const { data: everything = [] } = useImportBatches({});
  const rows = useMemo(() => data ?? [], [data]);
  const paged = usePagedRows(rows);

  const toApprove = useMemo(
    () =>
      checker
        ? everything
            .filter((row) => row.importStatus === 'VALIDATED' && row.submittedBy !== CURRENT_USER)
            .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
        : [],
    [everything, checker],
  );
  const mine = useMemo(() => everything.filter((row) => row.submittedBy === CURRENT_USER && OPEN.includes(row.importStatus)), [everything]);

  const [view, setView] = useState<View>('activity');
  const [bucket, setBucket] = useState<Bucket>('approve');
  const activeBucket: Bucket = checker ? bucket : 'mine';
  const [legendOpen, setLegendOpen] = useState(false);

  const open = (row: ImportBatch) => navigate(`/employees/bulk-import/detail?id=${row.id}`);
  const actions = (row: ImportBatch) => {
    const list: RowAction[] = [{ label: 'View Detail', onSelect: () => open(row) }];
    if (checker && row.importStatus === 'VALIDATED' && row.submittedBy !== CURRENT_USER) {
      list.unshift({ label: 'Review & Decide', onSelect: () => open(row) });
    }
    return <RowActions actions={list} />;
  };

  const columns: Column<ImportBatch>[] = [
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
  ];

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Employee Bulk Import' }]}
        title="Employee Bulk Import"
        description="Invite many candidates at once from a CSV file of email addresses. The uploader submits the file, someone else approves it, and each candidate then fills in their own data."
        actions={canSubmit && <Button onClick={() => navigate('/employees/bulk-import/upload')}>Import File</Button>}
      >
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
                    { value: 'mine', label: `My uploads (${mine.length})` },
                  ]}
                />
                <span className="font-body text-xs font-medium text-fg-3">
                  {activeBucket === 'approve'
                    ? 'Uploaded by others and checked, oldest first. Your own uploads never appear here.'
                    : 'Your uploads that are being checked, waiting for approval, or sending invitations.'}
                </span>
              </div>
              <DataTable<ImportBatch>
                rows={activeBucket === 'approve' ? toApprove : mine}
                rowKey={(row) => row.id}
                loading={isLoading}
                empty={activeBucket === 'approve' ? 'Nothing is waiting for your approval.' : 'You have no upload in progress.'}
                columns={columns}
                actions={actions}
              />
            </Card>
          )}

          {view === 'information' && (
            <Card>
              <CardHead title="Import history" sub={`${rows.length} batches · newest first`} />
              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <>
                      <MultiSelect<ImportStatus> className="w-[220px]" value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="All statuses" />
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
                  columns={columns}
                  actions={actions}
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
          )}
        </div>
      </PageShell>

      <ImportStatusReference open={legendOpen} onClose={() => setLegendOpen(false)} />
    </>
  );
}
