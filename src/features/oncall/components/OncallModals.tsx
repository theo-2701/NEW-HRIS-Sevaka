import { Form, Formik, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { DateRangeField } from '@/components/form/DateRangeField';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { EmployeeSelectField } from '@/components/form/EmployeeSelectField';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { timeEmployeeSource } from '@/features/time-off/mock-data';
import { DerivedBox } from '@/features/attendance/components/AttendanceBits';
import { DAILY_HOUR_CAP } from '@/features/overtime/mock-data';
import { EXTRA_REASON_LABEL } from '@/features/overtime/types';
import { employeeName } from '@/features/oncall/mock-data';
import type { OncallSession } from '@/features/oncall/mock-data';
import { deriveOncall, windowLabel } from '@/features/oncall/rules';
import { useCancelOncall, useDecideOncall, useSaveOncall } from '@/features/oncall/hooks/useOncall';
import { ONCALL_STATUS_LABEL } from '@/features/oncall/types';
import type { OncallAssignment, OncallDraft, OncallStatus } from '@/features/oncall/types';
import { formatNumber } from '@/lib/format';

const STATUS_TONE: Record<OncallStatus, 'ok' | 'warn' | 'err' | 'mute' | 'info'> = {
  PENDING_APPROVAL: 'warn',
  SCHEDULED: 'info',
  ACTIVATED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

export function OncallStatusBadge({ status }: { status: OncallStatus }) {
  return <StatusBadge tone={STATUS_TONE[status]}>{ONCALL_STATUS_LABEL[status]}</StatusBadge>;
}

const schema = Yup.object({
  employeeId: Yup.string().required('Choose an employee.'),
  startDate: Yup.string().required('Start date is required.'),
  startTime: Yup.string().required('Start time is required.'),
  endDate: Yup.string().required('End date is required.'),
  endTime: Yup.string().required('End time is required.'),
  maxCalloutHours: Yup.number()
    .typeError('Cap per call-out is required.')
    .positive('Cap per call-out must be greater than zero.')
    .required('Cap per call-out is required.'),
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
          A cap of {formatNumber(Number(values.maxCalloutHours))} hours exceeds the daily hour cap of{' '}
          {formatNumber(DAILY_HOUR_CAP)} hours, so this window is <strong>raised</strong> to the HR approval layer — not rejected.
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
            description="A standby window grants authorization in advance: once scheduled, attendance falling inside it creates call-outs up to its cap."
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
                  The employee is frozen once the row is saved, and the window can only be changed while it still awaits a decision.
                </Note>
              )}

              <EmployeeSelectField
                name="employeeId"
                label="On-call employee"
                required
                lang="en"
                source={timeEmployeeSource(session.employeeId)}
                disabled={Boolean(editing)}
              />

              <DateRangeField
                fromName="startDate"
                toName="endDate"
                label="Standby period"
                required
                hint="Choose a single date if the standby starts and ends on the same day."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <TextField name="startTime" type="time" label="Standby start time" required />
                <TextField name="endTime" type="time" label="Standby end time" required />
              </div>

              <TextField
                name="maxCalloutHours"
                type="number"
                step="0.25"
                min="0"
                label="Ceiling per call-out (hours)"
                required
                hint={`A cap above the daily hour cap of ${formatNumber(DAILY_HOUR_CAP)} hours raises the window to the HR approval layer.`}
              />

              <TextAreaField
                name="assignmentNote"
                label="Assignment note"
                rows={3}
                maxLength={500}
                placeholder="Input text here"
                hint="Read by the approver when deciding."
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
      description="Approving moves the window to Scheduled — from then on it authorizes call-outs up to its cap."
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
              You can't decide a standby window you created yourself.
            </Note>
          )}
          {row.requiresExtraApprovalReason && (
            <Note tone="warn" icon={<TriangleAlert />}>
              {EXTRA_REASON_LABEL[row.requiresExtraApprovalReason]} — this trigger raises the window to the next approval layer and is <strong>never</strong> a reason to reject it.
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
      description="The row stays on record as Cancelled; it does not disappear."
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
