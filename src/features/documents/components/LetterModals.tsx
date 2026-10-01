import { useState } from 'react';
import { StatCard } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/input';
import { EmployeeRow, Field, SelectRow } from '@/features/company/components/CompanyBits';
import { GovError, GovNote } from '@/features/documents/components/GovBits';
import { BRANCHES, LETTER_SUBJECTS, LETTER_SUBJECT_SOURCE } from '@/features/documents/governance-data';
import {
  useApproveLetter,
  useBatchReport,
  useCancelLetter,
  useDecideBatch,
  useIssueLetter,
  useOfficerTemplates,
  useSubmitBatch,
} from '@/features/documents/hooks/useGovernance';
import { personName } from '@/features/documents/services/document.service';
import { BATCH_ITEM_LABEL, BATCH_STATE_LABEL, TARGET_LABEL } from '@/features/documents/types';
import type {
  BatchItemState,
  DocActor,
  Letter,
  LetterBatch,
  LetterBatchItem,
  LetterDraft,
} from '@/features/documents/types';
import { formatDateTime } from '@/lib/format';

const EMPTY: LetterDraft = { templateId: '', subjectEmployeeId: '', branchId: '', reissueOfLetterId: '' };
const ITEM_TONE: Record<BatchItemState, 'mute' | 'ok' | 'err'> = { MENUNGGU: 'mute', BERHASIL: 'ok', GAGAL: 'err' };

/**
 * `S2`/`S1b` — Terbitkan surat (`A10` jalur petugas). Empat medan saja; target, penanda tangan, kategori, dan nomor
 * diturunkan server. `201` pada kedua cabang: TERBIT (nomor + kode periksa) atau MENUNGGU_PERSETUJUAN.
 */
export function IssueLetterModal({ actor, open, onClose }: { actor: DocActor; open: boolean; onClose: () => void }) {
  const templates = useOfficerTemplates(actor);
  const issue = useIssueLetter();
  const [draft, setDraft] = useState<LetterDraft>(EMPTY);
  const [result, setResult] = useState<Letter | null>(null);
  const template = templates.data?.find((row) => row.id === draft.templateId);
  const set = <K extends keyof LetterDraft>(key: K, value: LetterDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const close = () => {
    setDraft(EMPTY);
    setResult(null);
    issue.reset();
    onClose();
  };

  if (result) {
    const issued = result.letterIssuanceState === 'TERBIT';
    return (
      <Modal
        open={open}
        onOpenChange={(next) => !next && close()}
        title={issued ? 'Letter issued' : 'Letter waiting for approval'}
        description="201 Created in both cases — what differs is whether the approval gate was on."
        footer={<Button onClick={close}>Done</Button>}
      >
        <div className="flex flex-col gap-3">
          {issued ? (
            <GovNote>
              <strong>{result.letterNo}</strong> is issued and filed in the catalog. Verification code{' '}
              <strong className="font-mono">{result.verificationCode}</strong> is printed on the letter for public
              checks.
            </GovNote>
          ) : (
            <GovNote tone="warn">
              The template requires approval (permanent category or approval flag), so the letter has no number, no
              code, and no file yet. An HR Manager — or the Super Admin as backup approver — other than you decides it.
            </GovNote>
          )}
          <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 font-body text-[13px]">
            <dt className="font-semibold text-fg-3">Template</dt>
            <dd className="m-0 font-semibold text-fg-1">{result.templateName}</dd>
            <dt className="font-semibold text-fg-3">Target</dt>
            <dd className="m-0 font-semibold text-fg-1">
              {TARGET_LABEL[result.letterTarget]}
              {result.subjectEmployeeId ? ` · ${personName(result.subjectEmployeeId)}` : ''}
            </dd>
          </dl>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="Issue letter"
      description="Issue one letter from a template whose text is already approved."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!draft.templateId || issue.isPending}
            onClick={() => issue.mutate({ actor, draft }, { onSuccess: (letter) => setResult(letter) })}
          >
            {issue.isPending ? 'Issuing…' : 'Issue letter'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GovError error={issue.error ?? templates.error} />
        <SelectRow
          label="Template"
          required
          placeholder="Choose template…"
          value={draft.templateId}
          onChange={(value) => setDraft({ ...EMPTY, templateId: value })}
          options={(templates.data ?? []).map((row) => ({
            value: row.id,
            label: `${row.templateName} · ${TARGET_LABEL[row.letterTarget]}${row.effectiveRequiresApproval ? ' · needs approval' : ''}`,
          }))}
        />
        {template?.letterTarget === 'PERORANGAN' && (
          <EmployeeRow
            label="Employee"
            required
            lang="en"
            value={draft.subjectEmployeeId}
            onChange={(value) => set('subjectEmployeeId', value)}
            source={LETTER_SUBJECT_SOURCE}
          />
        )}
        {template?.letterTarget === 'EDARAN' && (
          <SelectRow
            label="Recipient branch"
            allowEmpty
            emptyLabel="All branches"
            value={draft.branchId}
            onChange={(value) => set('branchId', value)}
            options={BRANCHES.map((row) => ({ value: row.id, label: row.name }))}
          />
        )}
        <GovNote>
          Target, signer, category, and letter number are not chosen here — they come from the template and are set by
          the server.
        </GovNote>
      </div>
    </Modal>
  );
}

/** Keputusan atas surat bergerbang (`A11`) — penyetuju wajib berbeda dari pengaju; tolak wajib beralasan (1–100). */
export function LetterDecisionModal({
  actor,
  letter,
  onClose,
}: {
  actor: DocActor;
  letter: Letter | null;
  onClose: () => void;
}) {
  const decide = useApproveLetter();
  const [reason, setReason] = useState('');
  if (!letter) return null;
  const close = () => {
    setReason('');
    decide.reset();
    onClose();
  };
  return (
    <Modal
      open
      onOpenChange={(next) => !next && close()}
      title={`Decide · ${letter.templateName}`}
      description={`For ${personName(letter.subjectEmployeeId)} · requested by ${letter.createdBy.nama} on ${formatDateTime(letter.createdAt)}`}
      footer={
        <>
          <Button
            variant="danger"
            disabled={!reason.trim() || decide.isPending}
            onClick={() =>
              decide.mutate({ actor, letterId: letter.letterId, approved: false, reason }, { onSuccess: close })
            }
          >
            Reject
          </Button>
          <Button
            disabled={Boolean(reason.trim()) || decide.isPending}
            onClick={() => decide.mutate({ actor, letterId: letter.letterId, approved: true }, { onSuccess: close })}
          >
            Approve and issue
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GovError error={decide.error} />
        <Field label="Reason for rejection" hint="Only when rejecting — 1 to 100 characters.">
          <Textarea rows={2} maxLength={100} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** `A12` — batalkan surat terbit (dari detail dokumen). Berkas tidak disentuh; alasan tidak pernah tampil di halaman publik. */
export function CancelLetterModal({
  actor,
  letterId,
  letterNo,
  onClose,
}: {
  actor: DocActor;
  letterId: string | null;
  letterNo: string | null;
  onClose: () => void;
}) {
  const cancel = useCancelLetter();
  const [reason, setReason] = useState('');
  if (!letterId) return null;
  const close = () => {
    setReason('');
    cancel.reset();
    onClose();
  };
  return (
    <Modal
      open
      onOpenChange={(next) => !next && close()}
      title={`Cancel letter ${letterNo ?? ''}`}
      description="The file stays in the catalog. Public verification will show the letter as cancelled, without the reason."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Keep letter
          </Button>
          <Button
            variant="danger"
            disabled={!reason.trim() || cancel.isPending}
            onClick={() => cancel.mutate({ actor, letterId, reason }, { onSuccess: close })}
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel letter'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GovError error={cancel.error} />
        <Field label="Reason for cancellation" required hint="1 to 500 characters.">
          <Textarea rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** `S5` — ajukan penerbitan massal (`A13a`): templat perorangan + ≥2 penerima unik; versi naskah dibekukan server. */
export function BatchSubmitModal({ actor, open, onClose }: { actor: DocActor; open: boolean; onClose: () => void }) {
  const templates = useOfficerTemplates(actor);
  const submit = useSubmitBatch();
  const [templateId, setTemplateId] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const close = () => {
    setTemplateId('');
    setRecipients([]);
    submit.reset();
    onClose();
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="Submit bulk issuance"
      description="The batch waits for approval by someone other than you. Each recipient is checked when the batch runs."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!templateId || recipients.length < 2 || submit.isPending}
            onClick={() => submit.mutate({ actor, templateId, recipientIds: recipients }, { onSuccess: close })}
          >
            {submit.isPending ? 'Submitting…' : `Submit (${recipients.length})`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GovError error={submit.error ?? templates.error} />
        <SelectRow
          label="Template"
          required
          placeholder="Choose template…"
          value={templateId}
          onChange={setTemplateId}
          options={(templates.data ?? [])
            .filter((row) => row.letterTarget === 'PERORANGAN')
            .map((row) => ({ value: row.id, label: row.templateName }))}
          hint="Individual letters only — circulars cannot be issued in bulk."
        />
        <Field label="Recipients" required hint="At least two.">
          <div className="grid grid-cols-2 gap-2">
            {LETTER_SUBJECTS.map((row) => (
              <label
                key={row.employeeId}
                className="flex items-center gap-2 font-body text-[13px] font-semibold text-fg-1"
              >
                <Checkbox
                  checked={recipients.includes(row.employeeId)}
                  onCheckedChange={(checked) =>
                    setRecipients((prev) =>
                      checked === true ? [...prev, row.employeeId] : prev.filter((id) => id !== row.employeeId),
                    )
                  }
                />
                {row.nama} · {row.nik}
              </label>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

/** `S6` — putusan atas kumpulan (`A14`): dua kartu keputusan; penyetuju ≠ pengaju. */
export function BatchDecisionModal({
  actor,
  batch,
  onClose,
}: {
  actor: DocActor;
  batch: LetterBatch | null;
  onClose: () => void;
}) {
  const decide = useDecideBatch();
  if (!batch) return null;
  const close = () => {
    decide.reset();
    onClose();
  };
  return (
    <Modal
      open
      onOpenChange={(next) => !next && close()}
      title={`Decide ${batch.code}`}
      description={`${batch.templateName} for ${batch.recipientCount} recipients · submitted by ${batch.createdBy.nama}`}
      footer={
        <>
          <Button
            variant="danger"
            disabled={decide.isPending}
            onClick={() => decide.mutate({ actor, id: batch.id, decision: 'DITOLAK' }, { onSuccess: close })}
          >
            Reject batch
          </Button>
          <Button
            disabled={decide.isPending}
            onClick={() => decide.mutate({ actor, id: batch.id, decision: 'DISETUJUI' }, { onSuccess: close })}
          >
            Approve and run
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GovError error={decide.error} />
        <GovNote>
          Approving freezes the recipient list and starts issuing one letter per person. A failure for one person does
          not stop the others. Rejecting issues nothing — no letters, no tasks.
        </GovNote>
      </div>
    </Modal>
  );
}

/** `S7` — laporan kumpulan (`A13b`): tiga angka dihitung + tugas per penerima; tetap dapat dibuka sesudah tuntas. */
export function BatchReportModal({
  actor,
  batchId,
  onClose,
}: {
  actor: DocActor;
  batchId: string | null;
  onClose: () => void;
}) {
  const report = useBatchReport(actor, batchId);
  if (!batchId) return null;
  const data = report.data;
  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={data ? `${data.code} report` : 'Batch report'}
      description={data ? `${data.templateName} · ${BATCH_STATE_LABEL[data.batchState]}` : undefined}
      size="wide"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {!data ? (
        <GovError error={report.error} />
      ) : (
        <div className="flex flex-col gap-4">
          {data.batchState === 'DITOLAK' && (
            <GovNote tone="warn">This batch was rejected — no task ran and no letter was issued.</GovNote>
          )}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Waiting" value={data.summary.waiting} />
            <StatCard label="Succeeded" value={data.summary.succeeded} />
            <StatCard label="Failed" value={data.summary.failed} />
          </div>
          <DataTable<LetterBatchItem>
            rows={data.items}
            rowKey={(row) => row.subjectEmployeeId}
            columns={[
              { key: 'who', header: 'Recipient', strong: true, render: (row) => personName(row.subjectEmployeeId) },
              {
                key: 'state',
                header: 'Status',
                render: (row) => (
                  <StatusBadge tone={ITEM_TONE[row.batchItemState]}>{BATCH_ITEM_LABEL[row.batchItemState]}</StatusBadge>
                ),
              },
              ...(data.summary.failed
                ? [
                    {
                      key: 'why',
                      header: 'Failure reason',
                      render: (row: LetterBatchItem) => (
                        <span className="whitespace-normal">{row.failureReason ?? '—'}</span>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
