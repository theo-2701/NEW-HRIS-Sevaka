import { useEffect, useState } from 'react';
import { Info, MailCheck, ShieldAlert } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { MultiSelect } from '@/components/MultiSelect';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
// Komponen kunci-nilai & catatan dipakai ulang dari modul tetangga yang berpola maker-checker sama.
import { KeyValueList, KeyValueRow, Note } from '@/features/mass-resignation/components/BatchBits';
import {
  useApproveImport,
  useCancelImport,
  useImportBatch,
  useImportRows,
  useUploadImport,
} from '@/features/bulk-import/hooks/useBulkImport';
import {
  IMPORT_STATUS_LABEL,
  IMPORT_STATUS_MEANING,
  MAX_ROWS,
  ROW_STATE_LABEL,
  type ImportBatch,
  type ImportRow,
  type ImportStatus,
  type RowState,
} from '@/features/bulk-import/types';
import { formatDateTime } from '@/lib/format';

const STATUS_TONE: Record<ImportStatus, BadgeTone> = {
  VALIDATING: 'info',
  VALIDATED: 'warn',
  REJECTED_FILE: 'err',
  APPROVED: 'info',
  PROCESSING: 'info',
  PROCESSED: 'ok',
  PARTIAL: 'warn',
  CANCELLED: 'mute',
};

/** INVALID dan FAILED sama merah, label tetap terpisah (FSD §8.4.3). */
const ROW_TONE: Record<RowState, BadgeTone> = { VALID: 'info', INVALID: 'err', IMPORTED: 'ok', FAILED: 'err' };

export const ImportStatusBadge = ({ status }: { status: ImportStatus }) => (
  <StatusBadge tone={STATUS_TONE[status]}>{IMPORT_STATUS_LABEL[status]}</StatusBadge>
);

/** Tabel nasib per baris + saring `row_state` — dipakai BI-DETAIL dan BI-REVIEW. */
function RowsTable({ batch, states }: { batch: ImportBatch; states: RowState[] }) {
  const [filter, setFilter] = useState<RowState[]>([]);
  const { data: rows = [], isLoading } = useImportRows(batch.id, filter, batch.importStatus);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-body text-sm font-semibold text-fg-1">Result per row</span>
        <MultiSelect<RowState>
          className="w-[220px]"
          value={filter}
          onChange={setFilter}
          placeholder="All row results"
          options={states.map((value) => ({ value, label: ROW_STATE_LABEL[value] }))}
        />
      </div>
      <DataTable<ImportRow>
        rows={rows}
        rowKey={(row) => String(row.row)}
        loading={isLoading}
        empty={batch.importStatus === 'REJECTED_FILE' ? 'The file was rejected, so no rows were saved.' : 'No rows.'}
        columns={[
          { key: 'row', header: 'Row', align: 'center', render: (row) => row.row },
          { key: 'email', header: 'Email', strong: true, render: (row) => row.email || '—' },
          {
            key: 'state',
            header: 'Result',
            render: (row) => <StatusBadge tone={ROW_TONE[row.rowState]}>{ROW_STATE_LABEL[row.rowState]}</StatusBadge>,
          },
          { key: 'msg', header: 'Message', render: (row) => row.message ?? '—' },
        ]}
      />
    </div>
  );
}

/** BI-UPLOAD — maker memilih CSV; tiket VALIDATING tampil sesudah 202. */
export function UploadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [key, setKey] = useState('');
  const [ticket, setTicket] = useState<ImportBatch | null>(null);
  const upload = useUploadImport();

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setTicket(null);
  }, [open]);

  const pick = (next: File | null) => {
    setFile(next);
    // Kunci baru per berkas; klik ulang untuk berkas yang sama memakai kunci yang sama.
    setKey(crypto.randomUUID());
  };

  const submit = () =>
    file &&
    upload.mutate(
      { file, key },
      {
        onSuccess: setTicket,
        // 422 → berkas dikosongkan, HR memilih berkas yang sudah dibetulkan (L5).
        onError: (error) => error.message.startsWith('422') && pick(null),
      },
    );

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={ticket ? 'File received' : 'Upload Employee File'}
      description={
        ticket
          ? undefined
          : 'Upload a CSV file with one column: the email address of each candidate. The file is checked first; no invitation is sent yet.'
      }
      footer={
        ticket ? (
          <Button onClick={onClose}>Back to Import History</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={!file || upload.isPending} onClick={submit}>
              {upload.isPending ? 'Uploading…' : 'Upload & Check'}
            </Button>
          </>
        )
      }
    >
      {ticket ? (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Batch ID">{ticket.id}</KeyValueRow>
            <KeyValueRow label="File name">{ticket.fileName}</KeyValueRow>
            <KeyValueRow label="Status">
              <ImportStatusBadge status={ticket.importStatus} />
            </KeyValueRow>
            <KeyValueRow label="Rows">{ticket.totalRows}</KeyValueRow>
          </KeyValueList>
          <Note icon={<MailCheck />}>
            <strong>No invitation has been sent yet.</strong> The rows are being checked now. Someone other than you must
            review and approve the batch; only then does each candidate receive an email to fill in their own data.
          </Note>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="bi-file">
              CSV file<em>*</em>
            </Label>
            <input
              key={file ? 'filled' : 'empty'}
              id="bi-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => pick(event.target.files?.[0] ?? null)}
              className="rounded-md border border-silver bg-cloud px-3 py-2.5 font-body text-[13px] font-medium text-fg-2 file:mr-3 file:rounded-md file:border-0 file:bg-vapor file:px-3 file:py-1.5 file:font-semibold file:text-fg-1"
            />
          </div>
          <Note icon={<Info />}>
            Plain-text CSV only, at most {MAX_ROWS.toLocaleString('en-US')} data rows and 5 MB. The single heading must be{' '}
            <code className="font-mono text-xs">email</code>, one candidate per row. Candidates fill in the rest of their
            details themselves. Your file is not stored after it is checked.
          </Note>
        </div>
      )}
    </Modal>
  );
}

/** BI-DETAIL — ringkasan + nasib per baris, read-only untuk semua status. */
export function DetailModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: batch } = useImportBatch(id);
  const terminal = batch && ['PROCESSED', 'PARTIAL', 'REJECTED_FILE', 'CANCELLED'].includes(batch.importStatus);

  return (
    <Modal
      open={Boolean(id)}
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title="Import batch detail"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {batch && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Status">
              <ImportStatusBadge status={batch.importStatus} />
            </KeyValueRow>
            <KeyValueRow label="Batch ID">{batch.id}</KeyValueRow>
            <KeyValueRow label="File name">{batch.fileName}</KeyValueRow>
            <KeyValueRow label="Submitted">
              {batch.submittedBy} · {formatDateTime(batch.submittedAt)}
            </KeyValueRow>
            <KeyValueRow label="Approved">
              {batch.approvedBy ? `${batch.approvedBy} · ${formatDateTime(batch.approvedAt!)}` : '—'}
            </KeyValueRow>
            <KeyValueRow label="Total / invited / failed">
              {batch.totalRows} / {batch.successCount} / {batch.failedCount}
              {!terminal && ' (not final yet)'}
            </KeyValueRow>
            <KeyValueRow label="Selection hash">
              <code className="break-all font-mono text-xs">{batch.selectionHash ?? '—'}</code>
            </KeyValueRow>
          </KeyValueList>
          <RowsTable batch={batch} states={['VALID', 'INVALID', 'IMPORTED', 'FAILED']} />
          <Note icon={<Info />}>Invited candidates appear in Manpower Planning › ATS Bridge.</Note>
        </div>
      )}
    </Modal>
  );
}

/** BI-REVIEW — checker meninjau pratinjau Passed/Failed Check lalu Approve atau Cancel. */
export function ReviewModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: batch } = useImportBatch(id);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const approve = useApproveImport();
  const cancel = useCancelImport();

  useEffect(() => {
    if (!id) return;
    setNote('');
    setReason('');
  }, [id]);

  const pending = approve.isPending || cancel.isPending;
  const decidable = batch?.importStatus === 'VALIDATED';
  const valid = batch ? batch.totalRows - batch.failedCount : 0;

  return (
    <>
      <Modal
        open={Boolean(id)}
        onOpenChange={(next) => !next && onClose()}
        size="wide"
        title="Review & Decide"
        description="Check how many candidates will be invited and how many rows are left out before you decide."
        footer={
          decidable ? (
            <>
              <Button
                variant="danger"
                disabled={!reason.trim() || pending}
                onClick={() => cancel.mutate({ id: batch.id, reason: reason.trim() }, { onSuccess: onClose })}
              >
                Cancel Batch
              </Button>
              <Button disabled={pending} onClick={() => setConfirming(true)}>
                Approve & Send Invitations
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )
        }
      >
        {batch && (
          <div className="flex flex-col gap-4">
            <Note tone={decidable ? 'warn' : 'info'} icon={<ShieldAlert />}>
              {decidable
                ? `${valid} candidate${valid === 1 ? '' : 's'} will be invited, ${batch.failedCount} row${batch.failedCount === 1 ? '' : 's'} left out. Someone other than the uploader must approve.`
                : `This batch is ${IMPORT_STATUS_LABEL[batch.importStatus].toLowerCase()} and can no longer be decided. ${IMPORT_STATUS_MEANING[batch.importStatus]}`}
            </Note>
            <KeyValueList>
              <KeyValueRow label="Batch ID">{batch.id}</KeyValueRow>
              <KeyValueRow label="File name">{batch.fileName}</KeyValueRow>
              <KeyValueRow label="Submitted">
                {batch.submittedBy} · {formatDateTime(batch.submittedAt)}
              </KeyValueRow>
              <KeyValueRow label="Rows">{batch.totalRows}</KeyValueRow>
            </KeyValueList>
            <RowsTable batch={batch} states={['VALID', 'INVALID']} />
            {decidable && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="bi-note">Approval note</Label>
                  <Textarea id="bi-note" rows={2} value={note} placeholder="Optional" onChange={(event) => setNote(event.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="bi-reason">
                    Cancellation reason<em>*</em>
                  </Label>
                  <Textarea
                    id="bi-reason"
                    rows={2}
                    value={reason}
                    placeholder="Required to cancel"
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="Approve and send the invitations?"
        description="An invitation email will be sent now to every candidate whose row passed the check. Once sent, the batch cannot be cancelled."
        confirmLabel="Approve & Send"
        tone="primary"
        loading={approve.isPending}
        onConfirm={() =>
          batch &&
          approve.mutate(
            { id: batch.id, note: note.trim() },
            {
              onSuccess: () => {
                setConfirming(false);
                onClose();
              },
              onError: () => setConfirming(false),
            },
          )
        }
        onOpenChange={setConfirming}
      />
    </>
  );
}

/** Arti tiap status impor — dibuka dari ikon ⓘ di header kolom Status. */
export function ImportStatusReference({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Import statuses"
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <DataTable<{ status: ImportStatus }>
        rows={(Object.keys(IMPORT_STATUS_LABEL) as ImportStatus[]).map((status) => ({ status }))}
        rowKey={(row) => row.status}
        columns={[
          { key: 'status', header: 'Status', nowrap: true, render: (row) => <ImportStatusBadge status={row.status} /> },
          { key: 'meaning', header: 'Meaning', render: (row) => IMPORT_STATUS_MEANING[row.status] },
        ]}
      />
    </Modal>
  );
}
