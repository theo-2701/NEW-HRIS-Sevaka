import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { Segmented } from '@/components/Segmented';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import type { BadgeTone } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { employeeName } from '@/features/time-off/mock-data';
import { useEmailDomains } from '@/features/employee-masters/hooks/useMasters';
import { useApproveImport, useCancelImport, useImportRows, useUploadImport } from '@/features/bulk-import/hooks/useBulkImport';
import { IMPORT_STATUS_LABEL, MAX_BYTES, MAX_ROWS, ROW_STATE_LABEL } from '@/features/bulk-import/types';
import type { ImportBatch, ImportRow, ImportSession, ImportStatus, RowState } from '@/features/bulk-import/types';
import { formatDateTime } from '@/lib/format';

const STATUS_TONE: Record<ImportStatus, BadgeTone> = {
  VALIDATING: 'info',
  VALIDATED: 'warn',
  REJECTED_FILE: 'err',
  APPROVED: 'info',
  CANCELLED: 'mute',
  PROCESSING: 'info',
  PROCESSED: 'ok',
  PARTIAL: 'warn',
};
const ROW_TONE: Record<RowState, BadgeTone> = { VALID: 'ok', INVALID: 'err', IMPORTED: 'ok', FAILED: 'err' };

export function ImportStatusBadge({ status }: { status: ImportStatus }) {
  return <StatusBadge tone={STATUS_TONE[status]}>{IMPORT_STATUS_LABEL[status]}</StatusBadge>;
}

/** Unggah CSV — berkas diurai jadi baris lalu dibuang, tidak pernah disimpan. */
export function UploadModal({ open, session, onClose }: { open: boolean; session: ImportSession; onClose: () => void }) {
  const upload = useUploadImport(session);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setKey(crypto.randomUUID());
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Upload candidate emails"
      description={`A CSV with one column, email — up to ${MAX_ROWS} rows and ${MAX_BYTES / 1024 / 1024} MB. Candidates fill in their own data later.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!file || upload.isPending} onClick={() => file && upload.mutate({ file, key }, { onSuccess: onClose })}>
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="import-file">
          CSV file<em>*</em>
        </Label>
        <div className="flex h-9 items-center gap-3 rounded-md border border-silver bg-white pr-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-full rounded-l-md bg-vapor px-3 font-body text-[13px] font-bold text-secondary-700 transition-colors duration-200 ease-standard hover:bg-mist"
          >
            Choose File
          </button>
          <span className="min-w-0 flex-1 truncate font-body text-[13px] font-medium text-fg-3">{file?.name ?? 'No file chosen'}</span>
        </div>
        <input
          id="import-file"
          ref={inputRef}
          type="file"
          hidden
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <span className="font-body text-xs font-normal text-fg-3">
          Uploading sends nothing yet. Another HR Manager reviews the checked rows and approves before any invitation goes out.
        </span>
      </div>
    </Modal>
  );
}

/** Tinjau batch: ringkasan, nasib per baris, lalu Approve (checker ≠ maker) atau Cancel. */
export function ReviewModal({
  batch,
  session,
  onClose,
}: {
  batch: ImportBatch | null;
  session: ImportSession;
  onClose: () => void;
}) {
  const [failedOnly, setFailedOnly] = useState<'all' | 'failed'>('all');
  const [domain, setDomain] = useState('');
  const [note, setNote] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const rows = useImportRows(batch?.id ?? null, failedOnly === 'failed', batch?.importStatus);
  const domains = useEmailDomains({ active: 'ACTIVE' });
  const approve = useApproveImport(session);
  const cancel = useCancelImport();

  useEffect(() => {
    setFailedOnly('all');
    setDomain('');
    setNote('');
    setReason('');
  }, [batch?.id]);

  if (!batch) return null;
  const awaiting = batch.importStatus === 'VALIDATED';
  const maker = batch.submittedBy === session.employeeId;
  const canApprove = awaiting && session.role === 'HR_MANAGER' && !maker;
  const valid = batch.totalRows - batch.failedCount;

  return (
    <>
      <Modal
        open
        onOpenChange={(next) => !next && onClose()}
        size="wide"
        title={batch.fileName}
        description="Row numbers match the uploaded file (the header is row 1), so you can fix the original file directly."
        footer={
          awaiting ? (
            <>
              <Button variant="danger" onClick={() => setCancelling(true)}>
                Cancel import
              </Button>
              {canApprove && (
                <Button
                  disabled={!domain || approve.isPending}
                  onClick={() => approve.mutate({ id: batch.id, domain, note }, { onSuccess: onClose })}
                >
                  {approve.isPending ? 'Approving…' : `Approve and send ${valid} invitation(s)`}
                </Button>
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
          <KeyValueList>
            <KeyValueRow label="Status">
              <ImportStatusBadge status={batch.importStatus} />
            </KeyValueRow>
            <KeyValueRow label="Rows">
              {batch.totalRows} total · {batch.successCount} invited · {batch.failedCount} failed
            </KeyValueRow>
            <KeyValueRow label="Uploaded by">
              {employeeName(batch.submittedBy)} · {formatDateTime(batch.submittedAt)}
            </KeyValueRow>
            <KeyValueRow label="Approved by">
              {batch.approvedBy ? `${employeeName(batch.approvedBy)} · ${formatDateTime(batch.approvedAt!)}` : '—'}
            </KeyValueRow>
            {batch.emailDomain && <KeyValueRow label="Email domain">{batch.emailDomain}</KeyValueRow>}
            {batch.cancelReason && <KeyValueRow label="Cancel reason">{batch.cancelReason}</KeyValueRow>}
          </KeyValueList>

          {awaiting && maker && session.role === 'HR_MANAGER' && (
            <p role="status" className="m-0 font-body text-[13px] font-medium text-fg-2">
              You uploaded this file, so another HR Manager has to approve it.
            </p>
          )}

          {canApprove && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="import-domain">
                  Company email domain<em>*</em>
                </Label>
                <Select value={domain} onValueChange={setDomain}>
                  <SelectTrigger id="import-domain">
                    <SelectValue placeholder="Select an active domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {(domains.data ?? []).map((row) => (
                      <SelectItem key={row.id} value={row.domainName}>
                        {row.domainName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="font-body text-xs font-normal text-fg-3">Frozen on each invitation; later edits to the domain list do not change it.</span>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="import-note">Approval note</Label>
                <Textarea id="import-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          )}

          <Segmented<'all' | 'failed'>
            value={failedOnly}
            onChange={setFailedOnly}
            options={[
              { value: 'all', label: 'All rows' },
              { value: 'failed', label: 'Failed only' },
            ]}
          />
          <DataTable<ImportRow>
            rows={rows.data ?? []}
            rowKey={(row) => String(row.row)}
            loading={rows.isLoading || batch.importStatus === 'VALIDATING'}
            empty={failedOnly === 'failed' ? 'No failed row.' : 'No row yet.'}
            columns={[
              { key: 'row', header: 'Row', align: 'right', render: (row) => <span className="tabular-nums">{row.row}</span> },
              { key: 'email', header: 'Email', strong: true, render: (row) => row.email || '—' },
              { key: 'state', header: 'Result', render: (row) => <StatusBadge tone={ROW_TONE[row.rowState]}>{ROW_STATE_LABEL[row.rowState]}</StatusBadge> },
              { key: 'message', header: 'Message', muted: true, render: (row) => row.message ?? '—' },
            ]}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelling}
        title="Cancel this import?"
        description="No invitation is sent. The checked rows stay on record."
        confirmLabel="Cancel import"
        cancelLabel="Back"
        loading={cancel.isPending}
        onOpenChange={setCancelling}
        onConfirm={() =>
          cancel.mutate(
            { id: batch.id, reason },
            {
              onSettled: () => setCancelling(false),
              onSuccess: onClose,
            },
          )
        }
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="cancel-import-reason">Reason</Label>
          <Textarea id="cancel-import-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
        </div>
      </ConfirmDialog>
    </>
  );
}
