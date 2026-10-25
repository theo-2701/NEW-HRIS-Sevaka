import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Info, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/Card';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { KeyValueList, KeyValueRow, Note } from '@/features/mass-resignation/components/BatchBits';
import {
  ApproveImportDialog,
  CancelImportDialog,
  ImportStatusBadge,
  RowsTable,
} from '@/features/bulk-import/components/ImportModals';
import { useImportBatch } from '@/features/bulk-import/hooks/useBulkImport';
import { CURRENT_USER, IMPORT_STATUS_LABEL, IMPORT_STATUS_MEANING } from '@/features/bulk-import/types';
import { formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';

/**
 * BI-DETAIL + BI-REVIEW sebagai satu halaman (Theo, 26 Okt 2026). Batch VALIDATED: checker (bukan pengunggah)
 * menekan Approve atau Cancel Batch di halaman ini, lalu dialog meminta catatan/alasan. Status lain read-only.
 */
export function BulkImportDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id');
  const { data: batch, isLoading, isError } = useImportBatch(id);
  const role = useAuthStore((s) => s.user?.role);
  const checker = role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
  const [approving, setApproving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const decidable = batch?.importStatus === 'VALIDATED';
  const uploader = batch?.submittedBy === CURRENT_USER;
  const terminal = batch && ['PROCESSED', 'PARTIAL', 'REJECTED_FILE', 'CANCELLED'].includes(batch.importStatus);
  const valid = batch ? batch.totalRows - batch.failedCount : 0;

  return (
    <>
      <PageShell
        crumbs={[
          { label: 'Employee Management' },
          { label: 'Employee Directory' },
          { label: 'Employee Bulk Import', to: '/employees/bulk-import' },
          { label: batch?.id ?? 'Detail' },
        ]}
        title={batch ? batch.fileName : 'Import Batch'}
        description="How each row of the file turned out. A batch waiting for approval is decided here."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/employees/bulk-import')}>
              Back
            </Button>
            {batch && decidable && checker && (
              <Button variant="danger" onClick={() => setCancelling(true)}>
                Cancel Batch
              </Button>
            )}
            {batch && decidable && checker && !uploader && <Button onClick={() => setApproving(true)}>Approve & Send Invitations</Button>}
          </>
        }
      >
        {isError ? (
          <Note tone="warn" icon={<Info />}>
            The batch could not be loaded.
          </Note>
        ) : isLoading || !batch ? (
          <p className="py-10 text-center font-body text-[13px] text-fg-3">Loading…</p>
        ) : (
          <Card className="gap-4">
            {decidable ? (
              <Note tone="warn" icon={<ShieldAlert />}>
                {valid} candidate{valid === 1 ? '' : 's'} will be invited, {batch.failedCount} row{batch.failedCount === 1 ? '' : 's'} left out.{' '}
                {uploader ? 'You uploaded this batch, so someone else must approve it. You can still cancel it.' : 'Someone other than the uploader must approve.'}
              </Note>
            ) : (
              <Note icon={<Info />}>
                This batch is {IMPORT_STATUS_LABEL[batch.importStatus].toLowerCase()}. {IMPORT_STATUS_MEANING[batch.importStatus]}
              </Note>
            )}
            <KeyValueList>
              <KeyValueRow label="Status">
                <ImportStatusBadge status={batch.importStatus} />
              </KeyValueRow>
              <KeyValueRow label="Batch ID">{batch.id}</KeyValueRow>
              <KeyValueRow label="Submitted">
                {batch.submittedBy} · {formatDateTime(batch.submittedAt)}
              </KeyValueRow>
              <KeyValueRow label="Approved">{batch.approvedBy ? `${batch.approvedBy} · ${formatDateTime(batch.approvedAt!)}` : '—'}</KeyValueRow>
              <KeyValueRow label="Total / invited / failed">
                {batch.totalRows} / {batch.successCount} / {batch.failedCount}
                {!terminal && ' (not final yet)'}
              </KeyValueRow>
            </KeyValueList>
            <RowsTable batch={batch} states={decidable ? ['VALID', 'INVALID'] : ['VALID', 'INVALID', 'IMPORTED', 'FAILED']} />
            <Note icon={<Info />}>Invited candidates appear in Manpower Planning › ATS Bridge.</Note>
          </Card>
        )}
      </PageShell>
      {batch && <ApproveImportDialog batch={batch} open={approving} onClose={() => setApproving(false)} />}
      {batch && <CancelImportDialog batch={batch} open={cancelling} onClose={() => setCancelling(false)} />}
    </>
  );
}
