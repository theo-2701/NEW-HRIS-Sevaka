import { useEffect, useState } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import * as Yup from 'yup';
import { Modal } from '@/components/Modal';
import { DatePicker } from '@/components/DatePicker';
import { StatusBadge } from '@/components/StatusBadge';
import type { BadgeTone } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/form/SelectField';
import { DateField } from '@/components/form/DateField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import {
  useCreateTempAssignment,
  useExtendTempAssignment,
  useVacantSeats,
} from '@/features/temp-assignment/hooks/useTempAssignment';
import { seatName } from '@/features/temp-assignment/services/temp-assignment.service';
import { ORG_UNITS, TA_EMPLOYEES, TA_TODAY, taEmployeeName } from '@/features/temp-assignment/mock-data';
import { RETURN_TRIGGER_LABEL, TA_STATUS_LABEL, TA_TYPE_LABEL } from '@/features/temp-assignment/types';
import type { AssignmentType, TaDraft, TaSession, TaStatus, TempAssignment } from '@/features/temp-assignment/types';
import { formatDate, formatDateTime } from '@/lib/format';

const STATUS_TONE: Record<TaStatus, BadgeTone> = {
  IN_APPROVAL: 'warn',
  APPROVED: 'info',
  ACTIVE: 'ok',
  RETURNED: 'mute',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

export function TaStatusBadge({ status }: { status: TaStatus }) {
  return <StatusBadge tone={STATUS_TONE[status]}>{TA_STATUS_LABEL[status]}</StatusBadge>;
}

const EMPTY: TaDraft = {
  employeeId: '',
  assignmentType: '',
  orgUnitId: '',
  assignedPosId: '',
  startDate: '',
  returnDate: '',
  reason: '',
};

const schema = Yup.object({
  employeeId: Yup.string().required('Employee is required.'),
  assignmentType: Yup.string().required('Assignment type is required.'),
  orgUnitId: Yup.string().required('Organization unit is required.'),
  assignedPosId: Yup.string().required('Assignment seat is required.'),
  startDate: Yup.string().required('Start date is required.'),
  returnDate: Yup.string()
    .required('Return date is required.')
    .test('after-start', 'Return date must be after the start date.', function (value) {
      return !value || !this.parent.startDate || value > this.parent.startDate;
    }),
  reason: Yup.string().max(500, 'At most 500 characters.'),
});

/** Kaskade terkunci: kursi baru bisa dipilih setelah unit; ganti unit mengosongkan kursi. */
function SeatField() {
  const { values, setFieldValue } = useFormikContext<TaDraft>();
  const { data: seats = [], isLoading } = useVacantSeats(values.orgUnitId);
  const [unit, setUnit] = useState(values.orgUnitId);

  useEffect(() => {
    if (values.orgUnitId !== unit) {
      setUnit(values.orgUnitId);
      void setFieldValue('assignedPosId', '');
    }
  }, [values.orgUnitId, unit, setFieldValue]);

  return (
    <SelectField
      name="assignedPosId"
      label="Assignment seat"
      required
      disabled={!values.orgUnitId || isLoading}
      placeholder={values.orgUnitId ? (seats.length ? 'Select a vacant seat' : 'No vacant seat in this unit') : 'Select a unit first'}
      options={seats.map((row) => ({ value: row.id, label: row.name }))}
      hint="Only vacant seats are listed. The employee keeps their home seat."
    />
  );
}

export function TaCreateModal({ open, session, onClose }: { open: boolean; session: TaSession; onClose: () => void }) {
  const create = useCreateTempAssignment(session);

  return (
    <Formik<TaDraft>
      initialValues={EMPTY}
      validationSchema={schema}
      onSubmit={(values, helpers) =>
        create.mutate(
          { draft: values, idempotencyKey: crypto.randomUUID() },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm, resetForm, values }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title="New temporary assignment"
            description="A rotation or secondment to a vacant seat for a fixed period. Pay, attendance, and cost center stay with the home unit."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={create.isPending}>
                  {create.isPending ? 'Submitting…' : 'Submit'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="employeeId"
                  label="Employee"
                  required
                  placeholder="Select employee"
                  options={TA_EMPLOYEES.map((row) => ({ value: row.id, label: `${row.name} · ${row.unit}` }))}
                />
                <SelectField
                  name="assignmentType"
                  label="Assignment type"
                  required
                  placeholder="Select type"
                  options={(Object.keys(TA_TYPE_LABEL) as AssignmentType[]).map((value) => ({
                    value,
                    label: TA_TYPE_LABEL[value],
                  }))}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="orgUnitId"
                  label="Organization unit"
                  required
                  placeholder="Select unit"
                  options={ORG_UNITS.map((row) => ({ value: row.id, label: row.name }))}
                />
                <SeatField />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <DateField name="startDate" label="Start date" required min={TA_TODAY} placeholder="Select date" />
                <DateField name="returnDate" label="Return date" required min={values.startDate || TA_TODAY} placeholder="Select date" />
              </div>
              <TextAreaField name="reason" label="Reason" rows={3} maxLength={500} placeholder="Optional" />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

export function TaExtendModal({
  row,
  session,
  onClose,
}: {
  row: TempAssignment | null;
  session: TaSession;
  onClose: () => void;
}) {
  const extend = useExtendTempAssignment(session);
  const [date, setDate] = useState('');

  useEffect(() => setDate(''), [row]);
  if (!row) return null;
  const minDate = row.returnDate > TA_TODAY ? row.returnDate : TA_TODAY;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title="Extend assignment"
      description={`${taEmployeeName(row.employeeId)} currently returns on ${formatDate(row.returnDate)}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!date || extend.isPending}
            onClick={() => extend.mutate({ id: row.id, returnDate: date }, { onSuccess: onClose })}
          >
            {extend.isPending ? 'Saving…' : 'Extend'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <Label>
          New return date<em>*</em>
        </Label>
        <DatePicker value={date} min={minDate} onChange={setDate} placeholder="Select date" />
        <span className="font-body text-xs font-normal text-fg-3">Must be after the current return date and after today.</span>
      </div>
    </Modal>
  );
}

export function TaDetailModal({ row, onClose }: { row: TempAssignment | null; onClose: () => void }) {
  if (!row) return null;
  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={`Temporary assignment — ${taEmployeeName(row.employeeId)}`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <KeyValueList>
        <KeyValueRow label="Status">
          <TaStatusBadge status={row.status} />
        </KeyValueRow>
        <KeyValueRow label="Type">{TA_TYPE_LABEL[row.assignmentType]}</KeyValueRow>
        <KeyValueRow label="Home seat">{seatName(row.homePosId)}</KeyValueRow>
        <KeyValueRow label="Assignment seat">{seatName(row.assignedPosId)}</KeyValueRow>
        <KeyValueRow label="Period">
          {formatDate(row.startDate)} – {formatDate(row.returnDate)}
        </KeyValueRow>
        <KeyValueRow label="Reason">{row.reason || '—'}</KeyValueRow>
        <KeyValueRow label="Submitted by">
          {taEmployeeName(row.createdByEmployeeId)} · {formatDateTime(row.createdAt)}
        </KeyValueRow>
        <KeyValueRow label="Approved by">
          {row.approvedBy ? `${taEmployeeName(row.approvedBy)} · ${formatDateTime(row.approvedAt!)}` : '—'}
        </KeyValueRow>
        {row.returnTrigger && (
          <KeyValueRow label="Returned">
            {RETURN_TRIGGER_LABEL[row.returnTrigger]}
            {row.returnedAt ? ` · ${formatDateTime(row.returnedAt)}` : ''}
          </KeyValueRow>
        )}
      </KeyValueList>
    </Modal>
  );
}
