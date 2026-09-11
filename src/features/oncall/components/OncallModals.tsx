import { Form, Formik, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { DateField } from '@/components/form/DateField';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { DerivedBox } from '@/features/attendance/components/AttendanceBits';
import { DAILY_HOUR_CAP } from '@/features/overtime/mock-data';
import { EXTRA_REASON_LABEL } from '@/features/overtime/types';
import { EMPLOYEES, employeeName } from '@/features/oncall/mock-data';
import type { OncallSession } from '@/features/oncall/mock-data';
import { deriveOncall, windowLabel } from '@/features/oncall/rules';
import { useCancelOncall, useDecideOncall, useSaveOncall } from '@/features/oncall/hooks/useOncall';
import { ONCALL_STATUS_LABEL } from '@/features/oncall/types';
import type { OncallAssignment, OncallDraft, OncallStatus } from '@/features/oncall/types';
import { formatNumber } from '@/lib/format';

const STATUS_TONE: Record<OncallStatus, 'ok' | 'warn' | 'err' | 'mute' | 'info'> = {
  PENDING_APPROVAL: 'warn',
  SCHEDULED: 'info',
  ACTIVE: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

export function OncallStatusBadge({ status }: { status: OncallStatus }) {
  return <StatusBadge tone={STATUS_TONE[status]}>{ONCALL_STATUS_LABEL[status]}</StatusBadge>;
}

const schema = Yup.object({
  employeeId: Yup.string().required('Karyawan wajib dipilih.'),
  startDate: Yup.string().required('Tanggal mulai wajib diisi.'),
  startTime: Yup.string().required('Jam mulai wajib diisi.'),
  endDate: Yup.string().required('Tanggal selesai wajib diisi.'),
  endTime: Yup.string().required('Jam selesai wajib diisi.'),
  maxCalloutHours: Yup.number()
    .typeError('Pagu per call-out wajib diisi.')
    .positive('Pagu per call-out harus lebih besar dari nol.')
    .required('Pagu per call-out wajib diisi.'),
});

/**
 * Pratinjau turunan server. Lapis approval tambahan tidak pernah jadi field
 * form — ia dihitung ulang setiap ketikan pagu, dan status hanya bergerak
 * lewat keputusan approver atau pembatalan.
 */
function OncallDerived() {
  const { values } = useFormikContext<OncallDraft>();
  const derived = deriveOncall(values);

  return (
    <div className="flex flex-col gap-2">
      <DerivedBox
        heading="Server-derived"
        rows={[
          ['Window length', derived.hours && derived.hours > 0 ? `${formatNumber(derived.hours)} hours` : '—'],
          [
            'Extra approval layer',
            derived.extraReason ? EXTRA_REASON_LABEL[derived.extraReason] : 'Not raised',
          ],
          ['Initial status', 'Pending approval'],
        ]}
      />
      {derived.extraReason && (
        <Note tone="warn" icon={<TriangleAlert />}>
          Pagu {formatNumber(Number(values.maxCalloutHours))} jam melewati plafon jam harian{' '}
          {formatNumber(DAILY_HOUR_CAP)} jam, jadi jendela ini <strong>naik</strong> ke lapis approval HR — bukan
          ditolak.
        </Note>
      )}
    </div>
  );
}

export function OncallFormModal({
  open,
  session,
  editing,
  onClose,
}: {
  open: boolean;
  session: OncallSession;
  editing: OncallAssignment | null;
  onClose: () => void;
}) {
  const save = useSaveOncall(session);

  const initial: OncallDraft = editing
    ? {
        employeeId: editing.employeeId,
        startDate: editing.standbyStartAt.slice(0, 10),
        startTime: editing.standbyStartAt.slice(11, 16),
        endDate: editing.standbyEndAt.slice(0, 10),
        endTime: editing.standbyEndAt.slice(11, 16),
        maxCalloutHours: String(editing.maxCalloutHours),
        assignmentNote: editing.assignmentNote,
      }
    : {
        employeeId: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        maxCalloutHours: '',
        assignmentNote: '',
      };

  return (
    <Formik<OncallDraft>
      initialValues={initial}
      validationSchema={schema}
      enableReinitialize
      onSubmit={(values, helpers) =>
        save.mutate(
          { draft: values, id: editing?.id },
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
            title={editing ? 'Edit standby window' : 'Schedule standby'}
            description="Jendela siaga memberi otorisasi di muka: begitu terjadwal, kehadiran yang jatuh di dalamnya melahirkan call-out sampai setinggi pagunya."
            size="wide"
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={save.isPending}>
                  {save.isPending ? 'Menyimpan…' : 'Save standby window'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              {editing && (
                <Note icon={<Lock />}>
                  Karyawan beku setelah baris tersimpan, dan jendela hanya bisa diubah selagi masih menunggu
                  keputusan.
                </Note>
              )}

              <SelectField
                name="employeeId"
                label="On-call employee"
                required
                placeholder="Select employee"
                options={EMPLOYEES.map((row) => ({ value: row.id, label: row.name }))}
                disabled={Boolean(editing)}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <DateField name="startDate" label="Standby start date" required />
                <TextField name="startTime" type="time" label="Standby start time" required />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DateField name="endDate" label="Standby end date" required />
                <TextField name="endTime" type="time" label="Standby end time" required />
              </div>

              <TextField
                name="maxCalloutHours"
                type="number"
                step="0.25"
                min="0"
                label="Ceiling per call-out (hours)"
                required
                hint={`Pagu di atas plafon jam harian ${formatNumber(DAILY_HOUR_CAP)} jam menaikkan jendela ke lapis approval HR.`}
              />

              <TextAreaField
                name="assignmentNote"
                label="Assignment note"
                rows={3}
                maxLength={500}
                placeholder="Input text here"
                hint="Dibaca approver saat memutuskan."
              />

              <OncallDerived />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

export function OncallDecisionModal({
  row,
  session,
  onClose,
}: {
  row: OncallAssignment | null;
  session: OncallSession;
  onClose: () => void;
}) {
  const decide = useDecideOncall(session);
  const pending = row?.oncallStatus === 'PENDING_APPROVAL';
  const sod = row?.createdBy === session.employeeId;

  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Review standby window"
      description="Menyetujui memindahkan jendela ke Scheduled — sejak itu ia mengotorisasi call-out sampai setinggi pagunya."
      size="wide"
      footer={
        <>
          <Button
            variant="danger"
            disabled={!pending || sod || decide.isPending}
            onClick={() => row && decide.mutate({ id: row.id, kind: 'REJECTED' }, { onSuccess: onClose })}
          >
            Reject
          </Button>
          <Button
            disabled={!pending || sod || decide.isPending}
            onClick={() => row && decide.mutate({ id: row.id, kind: 'APPROVED' }, { onSuccess: onClose })}
          >
            Approve
          </Button>
        </>
      }
    >
      {row && (
        <div className="flex flex-col gap-4">
          {sod && (
            <Note tone="danger" icon={<ShieldCheck />}>
              403 — pemisahan tugas: pembuat tidak pernah memutuskan jendelanya sendiri.
            </Note>
          )}
          {row.requiresExtraApprovalReason && (
            <Note tone="warn" icon={<TriangleAlert />}>
              {EXTRA_REASON_LABEL[row.requiresExtraApprovalReason]} — pemicu ini menaikkan jendela ke lapis approval
              berikutnya dan <strong>tidak pernah</strong> jadi alasan menolaknya.
            </Note>
          )}
          <KeyValueList>
            <KeyValueRow label="On-call employee">{employeeName(row.employeeId)}</KeyValueRow>
            <KeyValueRow label="Window">{windowLabel(row)}</KeyValueRow>
            <KeyValueRow label="Ceiling per call-out">{formatNumber(row.maxCalloutHours)} hours</KeyValueRow>
            <KeyValueRow label="Note">{row.assignmentNote || '—'}</KeyValueRow>
            <KeyValueRow label="Status">
              <OncallStatusBadge status={row.oncallStatus} />
            </KeyValueRow>
            <KeyValueRow label="Drafted by">{employeeName(row.createdBy)}</KeyValueRow>
            <KeyValueRow label="Decided by">{row.approvedBy ? employeeName(row.approvedBy) : '—'}</KeyValueRow>
          </KeyValueList>
        </div>
      )}
    </Modal>
  );
}

export function OncallCancelModal({ row, onClose }: { row: OncallAssignment | null; onClose: () => void }) {
  const cancel = useCancelOncall();
  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={(next) => !next && onClose()}
      title="Cancel standby window"
      description="Barisnya tetap tinggal di catatan berstatus Cancelled, bukan menghilang."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={cancel.isPending}
            onClick={() => row && cancel.mutate({ id: row.id }, { onSuccess: onClose })}
          >
            Cancel window
          </Button>
        </>
      }
    >
      {row && (
        <KeyValueList>
          <KeyValueRow label="Employee">{employeeName(row.employeeId)}</KeyValueRow>
          <KeyValueRow label="Window">{windowLabel(row)}</KeyValueRow>
          <KeyValueRow label="Status">
            <OncallStatusBadge status={row.oncallStatus} />
          </KeyValueRow>
        </KeyValueList>
      )}
    </Modal>
  );
}
