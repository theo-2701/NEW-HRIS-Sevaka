import { Form, Formik, useFormikContext } from 'formik';
import { Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { DateField } from '@/components/form/DateField';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { DerivedBox } from '@/features/attendance/components/AttendanceBits';
import { DAILY_HOUR_CAP, RETRO_WINDOW_DAYS, employeeName } from '@/features/overtime/mock-data';
import { derive, retroWindowStart } from '@/features/overtime/rules';
import { approveSchema, overtimeSchema } from '@/features/overtime/validation';
import { useDecideOvertime, useSaveOvertime, useWithdrawOvertime } from '@/features/overtime/hooks/useOvertime';
import {
  EXTRA_REASON_LABEL,
  OVERTIME_CATEGORY_LABEL,
  OVERTIME_STATUS_LABEL,
  SUBMISSION_MODE_LABEL,
} from '@/features/overtime/types';
import type { OvertimeDraft, OvertimeRequest, OvertimeSession } from '@/features/overtime/types';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';

const hours = (value: number | null) => (value === null ? '—' : formatNumber(value));

function OvertimeStatusBadge({ row }: { row: OvertimeRequest }) {
  const tone =
    row.overtimeStatus === 'APPROVED' || row.overtimeStatus === 'AUTO_APPROVED'
      ? 'ok'
      : row.overtimeStatus === 'PENDING_APPROVAL'
        ? 'warn'
        : row.overtimeStatus === 'REJECTED'
          ? 'err'
          : 'mute';
  return <StatusBadge tone={tone}>{OVERTIME_STATUS_LABEL[row.overtimeStatus]}</StatusBadge>;
}

/** Banner pemicu lapis — menaikkan, bukan menolak (O-3). */
function ExtraLayerNote({ row }: { row: OvertimeRequest }) {
  if (!row.requiresExtraApprovalReason) return null;
  return (
    <Note tone="warn" icon={<TriangleAlert />}>
      {EXTRA_REASON_LABEL[row.requiresExtraApprovalReason]} — kelebihannya tetap dicatat apa adanya; pemicu ini
      menaikkan pengajuan ke lapis approval berikutnya dan <strong>tidak pernah</strong> jadi alasan menolaknya.
    </Note>
  );
}

/**
 * Pratinjau tiga field turunan server. Apa pun yang klien kirim untuk ketiganya
 * diabaikan — kotak ini hanya memberi tahu apa yang akan dibaca approver.
 */
function DerivedPreview({
  session,
  rows,
  editingId,
}: {
  session: OvertimeSession;
  rows: OvertimeRequest[];
  editingId?: string;
}) {
  const { values } = useFormikContext<OvertimeDraft>();
  const requested = Number(values.requestedHours);
  const derived = derive(
    rows,
    session.employeeId,
    values.overtimeDate,
    Number.isFinite(requested) ? requested : null,
    editingId ?? null,
  );

  return (
    <div className="flex flex-col gap-2">
      <DerivedBox
        heading="Server-derived preview"
        rows={[
          ['Submission mode', derived.submissionMode ? SUBMISSION_MODE_LABEL[derived.submissionMode] : '—'],
          ['Category', derived.overtimeCategory ? OVERTIME_CATEGORY_LABEL[derived.overtimeCategory] : '—'],
          [
            'Approval layer trigger',
            derived.extraApprovalReason ? EXTRA_REASON_LABEL[derived.extraApprovalReason] : 'Not raised',
          ],
        ]}
      />
      {derived.extraApprovalReason && (
        <Note tone="warn" icon={<TriangleAlert />}>
          {formatNumber(derived.alreadyApproved)} jam sudah disetujui pada tanggal ini ditambah{' '}
          {formatNumber(requested || 0)} jam yang diminta menembus plafon harian {formatNumber(DAILY_HOUR_CAP)} jam.
          Ini <strong>menaikkan</strong> pengajuan ke lapis approval lain; ia tidak pernah jadi penolakan, dan
          kelebihannya tetap dicatat apa adanya.
        </Note>
      )}
      <span className="font-body text-xs font-normal leading-[1.45] text-fg-3">
        Apa pun yang klien kirim untuk ketiga field ini diabaikan seluruhnya. Kategori di sini adalah indikasi untuk
        approver, bukan fakta final — ringkasan harian yang membawa fakta finalnya, dan nilainya bisa berbeda bila
        status hari itu berubah kemudian.
      </span>
    </div>
  );
}

/** Alasan wajib hanya saat tanggalnya susulan — dan itu diputuskan server. */
function ReasonField({
  session,
  rows,
  editingId,
}: {
  session: OvertimeSession;
  rows: OvertimeRequest[];
  editingId?: string;
}) {
  const { values } = useFormikContext<OvertimeDraft>();
  const derived = derive(rows, session.employeeId, values.overtimeDate, null, editingId ?? null);
  const retro = derived.submissionMode === 'RETROACTIVE';

  return (
    <TextAreaField
      name="requestReason"
      label="Reason"
      required={retro}
      rows={3}
      maxLength={500}
      placeholder="Input text here"
      hint={
        retro
          ? `Wajib untuk pengajuan susulan, dan tanggalnya harus di dalam jendela ${RETRO_WINDOW_DAYS} hari (sejak ${formatDate(retroWindowStart())}).`
          : 'Opsional untuk pengajuan di muka; wajib begitu tanggalnya jatuh di masa lalu.'
      }
    />
  );
}

export function OvertimeFormModal({
  open,
  session,
  rows,
  editing,
  onClose,
}: {
  open: boolean;
  session: OvertimeSession;
  rows: OvertimeRequest[];
  editing: OvertimeRequest | null;
  onClose: () => void;
}) {
  const save = useSaveOvertime(session);

  const initial: OvertimeDraft = editing
    ? {
        overtimeDate: editing.overtimeDate,
        requestedHours: String(editing.requestedHours ?? ''),
        requestReason: editing.requestReason ?? '',
      }
    : { overtimeDate: '', requestedHours: '', requestReason: '' };

  return (
    <Formik<OvertimeDraft>
      initialValues={initial}
      enableReinitialize
      validate={async (values) => {
        const derived = derive(rows, session.employeeId, values.overtimeDate, null, editing?.id ?? null);
        try {
          await overtimeSchema(derived.submissionMode === 'RETROACTIVE').validate(values, { abortEarly: false });
          return {};
        } catch (error) {
          const errors: Record<string, string> = {};
          (error as { inner?: { path?: string; message: string }[] }).inner?.forEach((item) => {
            if (item.path && !errors[item.path]) errors[item.path] = item.message;
          });
          return errors;
        }
      }}
      onSubmit={(values, helpers) =>
        // Penolakan gerbang (409/422) membiarkan modal terbuka supaya bisa diperbaiki.
        save.mutate(
          { draft: values, editingId: editing?.id },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            title={editing ? 'Edit overtime request' : 'Request overtime'}
            description="Lembur selalu diajukan untuk diri sendiri. Mode, kategori, dan pemicu lapis approval dihitung server — bukan dikirim layar ini."
            size="wide"
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={save.isPending}>
                  {save.isPending ? 'Mengirim…' : editing ? 'Save changes' : 'Submit request'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="requester">
                  Requester
                  <span className="ml-1.5 inline-flex items-center gap-1 align-middle font-body text-[10px] font-bold uppercase tracking-[0.05em] text-fg-4 [&_svg]:size-3">
                    <Lock />
                    terkunci
                  </span>
                </Label>
                <Input id="requester" readOnly tabIndex={-1} value={employeeName(session.employeeId)} />
                <span className="font-body text-xs font-normal leading-[1.4] text-fg-3">
                  Diambil dari token sesi — lembur tidak pernah bisa diajukan atas nama orang lain.
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DateField name="overtimeDate" label="Overtime date" required />
                <TextField
                  name="requestedHours"
                  type="number"
                  step="0.25"
                  min="0"
                  label="Hours requested"
                  required
                  placeholder="e.g. 2.00"
                />
              </div>

              <ReasonField session={session} rows={rows} editingId={editing?.id} />
              <DerivedPreview session={session} rows={rows} editingId={editing?.id} />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

/** Ringkas satu pengajuan — dipakai kedua drawer keputusan. */
function DecisionHead({ row }: { row: OvertimeRequest }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-body text-[13px] font-semibold text-fg-1">
        {employeeName(row.employeeId)} · {formatDate(row.overtimeDate)}
        {row.submissionMode === 'RETROACTIVE' ? ' (Retroactive)' : ''} · {hours(row.requestedHours)} h requested
      </span>
      <span className="font-body text-[13px] font-medium italic leading-[1.5] text-fg-2">
        {row.requestReason ? `“${row.requestReason}”` : 'No written reason was given.'}
      </span>
      <ExtraLayerNote row={row} />
    </div>
  );
}

export function OvertimeApproveModal({
  row,
  session,
  onClose,
}: {
  row: OvertimeRequest | null;
  session: OvertimeSession;
  onClose: () => void;
}) {
  const decide = useDecideOvertime(session);
  const sod = Boolean(row && row.employeeId === session.employeeId);

  return (
    <Formik
      initialValues={{ approvedHours: String(row?.requestedHours ?? '') }}
      enableReinitialize
      validationSchema={approveSchema(row?.requestedHours ?? 0)}
      onSubmit={(values) => {
        if (!row) return;
        decide.mutate(
          { id: row.id, kind: 'APPROVED', approvedHours: Number(values.approvedHours) },
          { onSuccess: onClose },
        );
      }}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(row)}
          onOpenChange={(next) => !next && onClose()}
          title="Approve overtime"
          description="Jam yang disetujui boleh dipangkas di bawah permintaan — tidak pernah dinaikkan di atasnya."
          size="wide"
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={sod || decide.isPending}>
                Approve
              </Button>
            </>
          }
        >
          {row && (
            <Form className="flex flex-col gap-4">
              <DecisionHead row={row} />
              {sod && (
                <Note tone="danger" icon={<ShieldCheck />}>
                  403 — pemisahan tugas: pemutus tidak pernah boleh jadi pengaju. Penolakannya ada di server, bukan
                  sekadar tombol yang dimatikan di sini.
                </Note>
              )}
              <TextField
                name="approvedHours"
                type="number"
                step="0.25"
                min="0"
                label="Hours approved"
                required
                hint={`Maksimal ${hours(row.requestedHours)} jam — persis yang diminta atau kurang.`}
              />
            </Form>
          )}
        </Modal>
      )}
    </Formik>
  );
}

export function OvertimeRejectModal({
  row,
  session,
  onClose,
}: {
  row: OvertimeRequest | null;
  session: OvertimeSession;
  onClose: () => void;
}) {
  const decide = useDecideOvertime(session);
  const sod = Boolean(row && row.employeeId === session.employeeId);

  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Reject overtime"
      description="Menolak membuat jam itu tidak pernah bisa dibayar; tidak ada apa pun yang perlu dipulihkan."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={sod || decide.isPending}
            onClick={() => row && decide.mutate({ id: row.id, kind: 'REJECTED' }, { onSuccess: onClose })}
          >
            Reject
          </Button>
        </>
      }
    >
      {row && (
        <div className="flex flex-col gap-4">
          <DecisionHead row={row} />
          {sod && (
            <Note tone="danger" icon={<ShieldCheck />}>
              403 — pemisahan tugas: pemutus tidak pernah boleh jadi pengaju.
            </Note>
          )}
        </div>
      )}
    </Modal>
  );
}

export function OvertimeDetailModal({ row, onClose }: { row: OvertimeRequest | null; onClose: () => void }) {
  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Overtime request detail"
      description="Read-only — layar ini tidak mengubah apa pun."
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {row && (
        <KeyValueList>
          <KeyValueRow label="Employee">{employeeName(row.employeeId)}</KeyValueRow>
          <KeyValueRow label="Overtime date">{formatDate(row.overtimeDate)}</KeyValueRow>
          <KeyValueRow label="Mode">{SUBMISSION_MODE_LABEL[row.submissionMode]}</KeyValueRow>
          <KeyValueRow label="Category (at submit)">{OVERTIME_CATEGORY_LABEL[row.overtimeCategory]}</KeyValueRow>
          <KeyValueRow label="Hours requested">
            {row.requestedHours === null ? 'None — born from on-call attendance detection' : hours(row.requestedHours)}
          </KeyValueRow>
          <KeyValueRow label="Hours approved">
            {hours(row.approvedHours)}
            {row.isAuto && (
              <span className="ml-1.5 font-normal text-fg-3">
                — salinan beku <code>max_callout_hours</code> jendela siaga, tidak pernah dibaca ulang saat recompute
              </span>
            )}
          </KeyValueRow>
          <KeyValueRow label="Reason">{row.requestReason || '—'}</KeyValueRow>
          <KeyValueRow label="On-call window">{row.oncallAssignmentId ?? '—'}</KeyValueRow>
          <KeyValueRow label="Workflow instance">
            {row.workflowInstanceId ?? (
              <span className="font-normal text-fg-3">
                — baris call-out tidak menjalankan workflow approval; otorisasinya sudah diberikan di muka pada roster
              </span>
            )}
          </KeyValueRow>
          <KeyValueRow label="Created by">
            {row.isAuto ? 'SYSTEM 00000000-0000-0000-0000-000000000000' : employeeName(row.employeeId)}
          </KeyValueRow>
          <KeyValueRow label="Approval layer trigger">
            {row.requiresExtraApprovalReason ? EXTRA_REASON_LABEL[row.requiresExtraApprovalReason] : 'Not raised'}
          </KeyValueRow>
          <KeyValueRow label="Status">
            <OvertimeStatusBadge row={row} />
          </KeyValueRow>
          <KeyValueRow label="Submitted">{formatDateTime(row.submittedAt)}</KeyValueRow>
          <KeyValueRow label="Decided by">
            {row.approvedBy ? `${employeeName(row.approvedBy)} · ${formatDateTime(row.approvedAt)}` : '—'}
          </KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}

export function OvertimeWithdrawModal({
  row,
  session,
  onClose,
}: {
  row: OvertimeRequest | null;
  session: OvertimeSession;
  onClose: () => void;
}) {
  const withdraw = useWithdrawOvertime(session);

  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Withdraw overtime request"
      description="Menarik bukan menghapus: barisnya tetap terbaca sebagai Cancelled."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={withdraw.isPending}
            onClick={() => row && withdraw.mutate({ id: row.id }, { onSuccess: onClose })}
          >
            Withdraw
          </Button>
        </>
      }
    >
      {row && (
        <div className="flex flex-col gap-4">
          <Note tone="warn" icon={<TriangleAlert />}>
            Jam yang sudah terlanjur dikerjakan terhadap pengajuan ini tidak akan jadi lembur terbayar.
          </Note>
          <KeyValueList>
            <KeyValueRow label="Request">{row.id}</KeyValueRow>
            <KeyValueRow label="Date">{formatDate(row.overtimeDate)}</KeyValueRow>
            <KeyValueRow label="Hours requested">{hours(row.requestedHours)}</KeyValueRow>
          </KeyValueList>
        </div>
      )}
    </Modal>
  );
}
