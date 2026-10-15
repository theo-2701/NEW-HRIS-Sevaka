import { useEffect, useState } from 'react';
import { Info, ShieldAlert } from 'lucide-react';
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
        <span className="font-body text-sm font-semibold text-fg-1">Nasib per baris</span>
        <MultiSelect<RowState>
          className="w-[220px]"
          value={filter}
          onChange={setFilter}
          placeholder="Semua status baris"
          options={states.map((value) => ({ value, label: ROW_STATE_LABEL[value] }))}
        />
      </div>
      <DataTable<ImportRow>
        rows={rows}
        rowKey={(row) => String(row.row)}
        loading={isLoading}
        empty={batch.importStatus === 'REJECTED_FILE' ? 'Berkas ditolak, tidak ada baris yang disimpan.' : 'Tidak ada baris.'}
        columns={[
          { key: 'row', header: 'Baris', align: 'center', render: (row) => row.row },
          { key: 'nama', header: 'Nama', strong: true, render: (row) => row.nama || '—' },
          { key: 'id', header: 'Nomor identitas', muted: true, render: (row) => row.nomorIdentitas || '—' },
          { key: 'emp', header: 'Employee ID', muted: true, nowrap: true, render: (row) => row.employeeId ?? '—' },
          {
            key: 'state',
            header: 'Status baris',
            render: (row) => <StatusBadge tone={ROW_TONE[row.rowState]}>{ROW_STATE_LABEL[row.rowState]}</StatusBadge>,
          },
          { key: 'msg', header: 'Pesan', render: (row) => row.message ?? '—' },
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
      title="Unggah berkas baru"
      description="Berkas diperiksa di latar. Pantau hasilnya di riwayat impor."
      footer={
        ticket ? (
          <Button onClick={onClose}>Kembali ke riwayat impor</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button disabled={!file || upload.isPending} onClick={submit}>
              {upload.isPending ? 'Mengunggah…' : 'Unggah & periksa'}
            </Button>
          </>
        )
      }
    >
      {ticket ? (
        <KeyValueList>
          <KeyValueRow label="ID batch">{ticket.id}</KeyValueRow>
          <KeyValueRow label="Nama berkas">{ticket.fileName}</KeyValueRow>
          <KeyValueRow label="Status">
            <ImportStatusBadge status={ticket.importStatus} />
          </KeyValueRow>
          <KeyValueRow label="Total baris">{ticket.totalRows}</KeyValueRow>
        </KeyValueList>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="bi-file">
              Berkas CSV<em>*</em>
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
            CSV polos saja, maksimal {MAX_ROWS.toLocaleString('id-ID')} baris dan 5 MB, 17 kolom sesuai templat.
            Kolom ptkp_code yang kosong diisi TK/0 dan ditandai.
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
      title="Detail batch impor"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      {batch && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Status">
              <ImportStatusBadge status={batch.importStatus} />
            </KeyValueRow>
            <KeyValueRow label="ID batch">{batch.id}</KeyValueRow>
            <KeyValueRow label="Nama berkas">{batch.fileName}</KeyValueRow>
            <KeyValueRow label="Diajukan">
              {batch.submittedBy} · {formatDateTime(batch.submittedAt)}
            </KeyValueRow>
            <KeyValueRow label="Disetujui">
              {batch.approvedBy ? `${batch.approvedBy} · ${formatDateTime(batch.approvedAt!)}` : '—'}
            </KeyValueRow>
            <KeyValueRow label="Total / sukses / gagal">
              {batch.totalRows} / {batch.successCount} / {batch.failedCount}
              {!terminal && ' (belum tuntas)'}
            </KeyValueRow>
            <KeyValueRow label="PTKP default diisi">{batch.seededPtkpDefaultCount}</KeyValueRow>
            <KeyValueRow label="Selection hash">
              <code className="break-all font-mono text-xs">{batch.selectionHash ?? '—'}</code>
            </KeyValueRow>
          </KeyValueList>
          <RowsTable batch={batch} states={['VALID', 'INVALID', 'IMPORTED', 'FAILED']} />
        </div>
      )}
    </Modal>
  );
}

/** BI-REVIEW — checker meninjau pratinjau VALID/INVALID lalu Setujui atau Batalkan. */
export function ReviewModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: batch } = useImportBatch(id);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
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
    <Modal
      open={Boolean(id)}
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title="Tinjau & putuskan"
      description="Periksa berapa baris yang akan diproses dan berapa yang dikeluarkan sebelum memutuskan."
      footer={
        decidable ? (
          <>
            <Button
              variant="danger"
              disabled={!reason.trim() || pending}
              onClick={() => cancel.mutate({ id: batch.id, reason: reason.trim() }, { onSuccess: onClose })}
            >
              Batalkan batch
            </Button>
            <Button
              disabled={pending}
              onClick={() => approve.mutate({ id: batch.id, note: note.trim() }, { onSuccess: onClose })}
            >
              {approve.isPending ? 'Memproses…' : 'Setujui & jalankan'}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        )
      }
    >
      {batch && (
        <div className="flex flex-col gap-4">
          <Note tone={decidable ? 'warn' : 'info'} icon={<ShieldAlert />}>
            {decidable
              ? `${valid} baris valid akan diproses, ${batch.failedCount} baris tidak valid dikeluarkan. Persetujuan wajib oleh checker selain pengunggah.`
              : `Batch ini sudah ${IMPORT_STATUS_LABEL[batch.importStatus].toLowerCase()} dan tidak dapat diputuskan lagi.`}
          </Note>
          <KeyValueList>
            <KeyValueRow label="ID batch">{batch.id}</KeyValueRow>
            <KeyValueRow label="Nama berkas">{batch.fileName}</KeyValueRow>
            <KeyValueRow label="Diajukan">
              {batch.submittedBy} · {formatDateTime(batch.submittedAt)}
            </KeyValueRow>
            <KeyValueRow label="Total baris">{batch.totalRows}</KeyValueRow>
          </KeyValueList>
          <RowsTable batch={batch} states={['VALID', 'INVALID']} />
          {decidable && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="bi-note">Catatan persetujuan</Label>
                <Textarea id="bi-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="bi-reason">
                  Alasan pembatalan<em>*</em>
                </Label>
                <Textarea
                  id="bi-reason"
                  rows={2}
                  value={reason}
                  placeholder="Wajib diisi bila membatalkan"
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
