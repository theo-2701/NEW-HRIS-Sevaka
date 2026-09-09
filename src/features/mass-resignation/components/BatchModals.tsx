import { useEffect, useState } from 'react';
import { Fingerprint, GitCommitHorizontal, OctagonX, Shield, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { RadioBranch } from '@/components/RadioBranch';
import {
  BatchStatusBadge,
  KeyValueList,
  KeyValueRow,
  Note,
} from '@/features/mass-resignation/components/BatchBits';
import {
  useApproveBatch,
  useCancelRemaining,
  useHaltBatch,
  useProcessBatch,
  useRejectBatch,
  useResumeBatch,
} from '@/features/mass-resignation/hooks/useMassResignation';
import { REASON_OPTIONS, labelOf } from '@/features/mass-resignation/types';
import type { MassBatch } from '@/features/mass-resignation/types';
import { formatDate } from '@/lib/format';

/** Textarea beralasan wajib — dipakai keempat modal keputusan. */
function ReasonField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {label}
        <em>*</em>
      </Label>
      <Textarea
        id={id}
        rows={2}
        maxLength={150}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

/** MR-APPROVE — approve membekukan seleksi jadi hash (anti-TOCTOU). */
export function ApproveBatchModal({ batch, onClose }: { batch: MassBatch | null; onClose: () => void }) {
  const [note, setNote] = useState('');
  const approve = useApproveBatch();
  const reject = useRejectBatch();

  useEffect(() => {
    if (batch) setNote('');
  }, [batch]);

  const pending = approve.isPending || reject.isPending;
  const noteOk = note.trim().length > 0;

  return (
    <Modal
      open={Boolean(batch)}
      onOpenChange={(open) => !open && onClose()}
      size="wide"
      title="Review batch"
      description="Checker harus berbeda dari maker dan berpangkat di atasnya. Persetujuan membekukan hash seleksi."
      footer={
        <>
          <Button
            variant="danger"
            disabled={!noteOk || pending}
            onClick={() => batch && reject.mutate({ id: batch.id, note: note.trim() }, { onSuccess: onClose })}
          >
            Reject batch
          </Button>
          <Button
            disabled={!noteOk || pending}
            onClick={() => batch && approve.mutate({ id: batch.id, note: note.trim() }, { onSuccess: onClose })}
          >
            {approve.isPending ? 'Memproses…' : 'Approve & freeze hash'}
          </Button>
        </>
      }
    >
      {batch && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Batch">{batch.id}</KeyValueRow>
            <KeyValueRow label="Alasan">{labelOf(REASON_OPTIONS, batch.reason)}</KeyValueRow>
            <KeyValueRow label="Tanggal keluar">{formatDate(batch.leaveDate)}</KeyValueRow>
            <KeyValueRow label="Terpilih">{batch.total} karyawan</KeyValueRow>
            <KeyValueRow label="Maker">{batch.maker}</KeyValueRow>
            <KeyValueRow label="Status">
              <BatchStatusBadge status={batch.status} />
            </KeyValueRow>
          </KeyValueList>

          <Note tone="warn" icon={<Shield />}>
            Rank-guard: checker harus HR Manager ke atas <strong>dan</strong> berbeda dari maker (SoD). Hash yang
            dibekukan mencegah seleksi berubah antara persetujuan dan pemrosesan (anti-TOCTOU).
          </Note>

          <ReasonField
            id="approver-note"
            label="Catatan approver"
            placeholder="Alasan keputusan"
            value={note}
            onChange={setNote}
          />
        </div>
      )}
    </Modal>
  );
}

/** MR-PROCESS — mengirim hash beku; mismatch ditolak 409. */
export function ProcessBatchModal({ batch, onClose }: { batch: MassBatch | null; onClose: () => void }) {
  const process = useProcessBatch();

  return (
    <Modal
      open={Boolean(batch)}
      onOpenChange={(open) => !open && onClose()}
      size="wide"
      title="Process batch"
      description="Kirim hash seleksi yang dibekukan untuk memulai offboarding ter-throttle. Hash yang tidak cocok ditolak."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={process.isPending || !batch?.selectionHash}
            onClick={() =>
              batch?.selectionHash &&
              process.mutate({ id: batch.id, selectionHash: batch.selectionHash }, { onSuccess: onClose })
            }
          >
            {process.isPending ? 'Mengirim…' : 'Send hash & process'}
          </Button>
        </>
      }
    >
      {batch && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Batch">{batch.id}</KeyValueRow>
            <KeyValueRow label="Alasan">{labelOf(REASON_OPTIONS, batch.reason)}</KeyValueRow>
            <KeyValueRow label="Terpilih">{batch.total} karyawan</KeyValueRow>
          </KeyValueList>

          <div className="flex flex-col gap-1">
            <Label htmlFor="selection-hash">
              Selection hash<em>*</em>
            </Label>
            <div
              id="selection-hash"
              className="flex items-center gap-2 rounded-md border border-border-1 bg-mist px-3 py-2.5 font-mono text-xs font-semibold text-fg-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-3"
            >
              <Fingerprint />
              <span className="min-w-0 break-all">{batch.selectionHash}</span>
            </div>
          </div>

          <Note tone="warn" icon={<TriangleAlert />}>
            Hash harus sama persis dengan seleksi yang dibekukan saat persetujuan. Ketidakcocokan ditolak dengan{' '}
            <strong>409 Conflict</strong> — batch tetap APPROVED dan tidak ada yang dilahirkan (anti-TOCTOU).
          </Note>

          <Note icon={<GitCommitHorizontal />}>
            Batch correlation id ditempelkan ke setiap offboarding yang dilahirkan supaya satu run bisa di-halt atau
            ditangguhkan massal sekaligus.
          </Note>
        </div>
      )}
    </Modal>
  );
}

/** MR-HALT — circuit-breaker menangguhkan instance per correlation id. */
export function HaltBatchModal({ batch, onClose }: { batch: MassBatch | null; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const halt = useHaltBatch();

  useEffect(() => {
    if (batch) setReason('');
  }, [batch]);

  return (
    <Modal
      open={Boolean(batch)}
      onOpenChange={(open) => !open && onClose()}
      title="Halt processing"
      description="Circuit-breaker menangguhkan instance offboarding yang sedang berjalan berdasarkan correlation id."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={reason.trim().length === 0 || halt.isPending}
            onClick={() =>
              batch &&
              halt.mutate(
                {
                  id: batch.id,
                  reason: reason.trim(),
                  progress: batch.progress,
                  total: batch.total,
                  correlationId: batch.correlationId,
                },
                { onSuccess: onClose },
              )
            }
          >
            {halt.isPending ? 'Memproses…' : 'Halt batch'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Note tone="danger" icon={<OctagonX />}>
          Halt membekukan sisa karyawan di batch ini. Karyawan yang sudah diproses <strong>tidak</strong> dikembalikan.
        </Note>
        <ReasonField
          id="halt-reason"
          label="Alasan halt"
          placeholder="Kenapa run ini dihentikan?"
          value={reason}
          onChange={setReason}
        />
      </div>
    </Modal>
  );
}

type ResumeAction = 'RESUME' | 'CANCEL';

/** MR-RESUME — lanjutkan sisa batch, atau sudahi sebagian (PARTIAL). */
export function ResumeBatchModal({ batch, onClose }: { batch: MassBatch | null; onClose: () => void }) {
  const [action, setAction] = useState<ResumeAction>('RESUME');
  const [note, setNote] = useState('');
  const resume = useResumeBatch();
  const cancelRemaining = useCancelRemaining();

  useEffect(() => {
    if (batch) {
      setAction('RESUME');
      setNote('');
    }
  }, [batch]);

  const pending = resume.isPending || cancelRemaining.isPending;
  const noteOk = note.trim().length > 0;

  const submit = () => {
    if (!batch) return;
    if (action === 'RESUME') {
      resume.mutate({ id: batch.id, note: note.trim() }, { onSuccess: onClose });
    } else {
      cancelRemaining.mutate(
        { id: batch.id, note: note.trim(), progress: batch.progress, total: batch.total },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <Modal
      open={Boolean(batch)}
      onOpenChange={(open) => !open && onClose()}
      title="Resume or cancel"
      description="Lanjutkan sisa karyawan, atau batalkan sisanya dan sudahi sebagai partial."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={action === 'RESUME' ? 'primary' : 'danger'} disabled={!noteOk || pending} onClick={submit}>
            {pending ? 'Memproses…' : action === 'RESUME' ? 'Resume batch' : 'Cancel remaining'}
          </Button>
        </>
      }
    >
      {batch && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Batch">{batch.id}</KeyValueRow>
            <KeyValueRow label="Sudah diproses">
              {batch.progress} / {batch.total}
            </KeyValueRow>
            <KeyValueRow label="Tersisa">{batch.total - batch.progress} karyawan</KeyValueRow>
          </KeyValueList>

          <fieldset className="flex flex-col gap-1.5 border-none p-0">
            <legend className="mb-1 select-none font-body text-base font-bold leading-[1.2] text-fg-2">
              Aksi <em className="ml-0.5 not-italic text-error-500">*</em>
            </legend>
            <RadioBranch<ResumeAction>
              name="resume-action"
              value={action}
              onChange={setAction}
              options={[
                {
                  value: 'RESUME',
                  title: 'Resume — lanjutkan batch',
                  description:
                    'Instance yang ditangguhkan dijalankan lagi dan spawn ter-throttle dilanjutkan dari titik halt. Status → PROCESSING.',
                },
                {
                  value: 'CANCEL',
                  title: 'Cancel sisanya',
                  description:
                    'Sisa instance dibatalkan; karyawan yang sudah selesai tetap terminal. Status → PARTIAL.',
                },
              ]}
            />
          </fieldset>

          <ReasonField
            id="resume-note"
            label="Catatan approver"
            placeholder="Alasan keputusan ini"
            value={note}
            onChange={setNote}
          />
        </div>
      )}
    </Modal>
  );
}
