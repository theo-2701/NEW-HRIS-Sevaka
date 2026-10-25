import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { MultiSelect } from '@/components/MultiSelect';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { emailDomainService } from '@/features/email-domain/services/email-domain.service';
import { useApproveImport, useCancelImport, useImportRows } from '@/features/bulk-import/hooks/useBulkImport';
import {
  IMPORT_STATUS_LABEL,
  IMPORT_STATUS_MEANING,
  ROW_STATE_LABEL,
  type ImportBatch,
  type ImportRow,
  type ImportStatus,
  type RowState,
} from '@/features/bulk-import/types';

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

/** Tabel nasib per baris + saring `row_state` — dipakai halaman detail (BI-DETAIL / BI-REVIEW). */
export function RowsTable({ batch, states }: { batch: ImportBatch; states: RowState[] }) {
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

const NO_DOMAIN = 'none';

/**
 * Approve dari halaman detail (FSD 0.83 §8.5): Company Email Domain opsional + catatan, lalu undangan terkirim.
 * Sesudah terkirim batch tidak dapat dibatalkan, jadi kalimatnya menyebut itu sebelum tombol ditekan.
 */
export function ApproveImportDialog({ batch, open, onClose }: { batch: ImportBatch; open: boolean; onClose: () => void }) {
  const approve = useApproveImport();
  const [note, setNote] = useState('');
  const [domainId, setDomainId] = useState(NO_DOMAIN);
  const valid = batch.totalRows - batch.failedCount;
  const { data: domains = [] } = useQuery({
    queryKey: ['email-domain', { isActive: true }],
    queryFn: () => emailDomainService.search({ isActive: true }),
    enabled: open,
  });
  const close = () => {
    setNote('');
    setDomainId(NO_DOMAIN);
    onClose();
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="Approve and send the invitations?"
      description={`${valid} candidate${valid === 1 ? '' : 's'} will receive an invitation email now; ${batch.failedCount} row${batch.failedCount === 1 ? '' : 's'} left out. Once sent, the batch cannot be cancelled.`}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={approve.isPending}>
            Back
          </Button>
          <Button
            disabled={approve.isPending}
            onClick={() =>
              approve.mutate(
                { id: batch.id, note: note.trim(), emailDomainId: domainId === NO_DOMAIN ? '' : domainId },
                { onSuccess: close },
              )
            }
          >
            {approve.isPending ? 'Sending…' : 'Approve & Send'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="bi-domain">Company Email Domain</Label>
          <Select value={domainId} onValueChange={setDomainId}>
            <SelectTrigger id="bi-domain">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DOMAIN}>No domain selected</SelectItem>
              {domains.map((domain) => (
                <SelectItem key={domain.id} value={domain.id}>
                  {domain.domainName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="font-body text-xs font-medium text-fg-3">
            Optional. The company email of each candidate becomes username@domain when you create the employee; you can
            still change it then. Manage the domains in Employee Directory &gt; Email Domain.
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="bi-note">Approval note</Label>
          <Textarea id="bi-note" rows={3} maxLength={500} value={note} placeholder="Optional" onChange={(event) => setNote(event.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

/** Cancel Batch — alasan wajib; tidak ada undangan yang terkirim. */
export function CancelImportDialog({ batch, open, onClose }: { batch: ImportBatch; open: boolean; onClose: () => void }) {
  const cancel = useCancelImport();
  const [reason, setReason] = useState('');
  const close = () => {
    setReason('');
    onClose();
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="Cancel this batch?"
      description={`${batch.fileName} is closed without sending any invitation. The rows stay on record.`}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={cancel.isPending}>
            Back
          </Button>
          <Button variant="danger" disabled={!reason.trim() || cancel.isPending} onClick={() => cancel.mutate({ id: batch.id, reason: reason.trim() }, { onSuccess: close })}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel Batch'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="bi-reason">
          Cancellation reason<em>*</em>
        </Label>
        <Textarea id="bi-reason" rows={3} maxLength={500} value={reason} placeholder="Why is this batch cancelled?" onChange={(event) => setReason(event.target.value)} />
      </div>
    </Modal>
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
