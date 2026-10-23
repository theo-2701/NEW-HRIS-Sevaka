import { useEffect, useMemo } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import {  Lock } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DateRangeField } from '@/components/form/DateRangeField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { CheckboxField } from '@/components/form/CheckboxField';
import { GatePreview } from '@/features/time-off/components/TimeOffBits';
import { useLeaveRequests, useLeaveTypes, useSubmitRequest } from '@/features/time-off/hooks/useTimeOff';
import { evaluateGates } from '@/features/time-off/gates';
import { employeeName, leaveTypeOf } from '@/features/time-off/mock-data';
import { DEMO_NOW, SESSION_LABEL } from '@/features/time-off/types';
import type { LeaveRequest, RequestDraft, Session } from '@/features/time-off/types';

const EMPTY: RequestDraft = {
  leaveTypeId: '',
  daySession: 'FULL',
  startDate: '',
  endDate: '',
  reason: '',
  hasDoctorNote: false,
};

const SESSION_OPTIONS = (Object.keys(SESSION_LABEL) as (keyof typeof SESSION_LABEL)[]).map((value) => ({
  value,
  label: SESSION_LABEL[value],
}));

/**
 * Bagian dinamis form: pratinjau gerbang submit, dan checkbox surat dokter yang
 * hanya muncul untuk jenis cuti yang mensyaratkannya.
 */
function DynamicSection({
  session,
  existing,
  editingId,
}: {
  session: Session;
  existing: LeaveRequest[];
  editingId?: string;
}) {
  const { values, setFieldValue } = useFormikContext<RequestDraft>();
  const type = leaveTypeOf(values.leaveTypeId);
  const multiDay = Boolean(values.startDate && values.endDate && values.startDate !== values.endDate);

  // FSD-TIME 0.13 #12/#14: field yang disembunyikan karena bendera berganti DIKOSONGKAN.
  useEffect(() => {
    if (multiDay && values.daySession !== 'FULL') void setFieldValue('daySession', 'FULL');
    if (!type?.requiresDocument && values.hasDoctorNote) void setFieldValue('hasDoctorNote', false);
  }, [multiDay, values.daySession, type?.requiresDocument, values.hasDoctorNote, setFieldValue]);

  const gate = useMemo(
    () =>
      evaluateGates({
        employeeId: session.employeeId,
        leaveTypeId: values.leaveTypeId,
        startDate: values.startDate,
        endDate: values.endDate,
        daySession: values.daySession,
        existing,
        selfId: editingId,
        now: DEMO_NOW,
      }),
    [session.employeeId, values, existing, editingId],
  );

  return (
    <>
      {type?.requiresDocument && (
        <>
          <CheckboxField name="hasDoctorNote">
            A doctor's note is attached to this request (required by this leave type).
          </CheckboxField>
        </>
      )}

      {values.leaveTypeId && values.startDate && values.endDate && (
        <GatePreview totalDays={gate.totalDays} errors={gate.errors} extra={gate.extra} />
      )}
    </>
  );
}

/**
 * Form pengajuan cuti. Pemohon selalu diri sendiri: field "Requester" hanya
 * baca dan nilainya datang dari sesi, bukan dari isian.
 */
export function RequestFormModal({
  open,
  session,
  editing,
  onClose,
}: {
  open: boolean;
  session: Session;
  editing: LeaveRequest | null;
  onClose: () => void;
}) {
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: existing = [] } = useLeaveRequests(session);
  const submit = useSubmitRequest(session);

  const typeOptions = leaveTypes
    .filter((row) => row.isActive)
    .map((row) => ({ value: row.id, label: row.name }));

  const initial: RequestDraft = editing
    ? {
        leaveTypeId: editing.leaveTypeId,
        daySession: editing.daySession,
        startDate: editing.startDate,
        endDate: editing.endDate,
        reason: editing.reason,
        hasDoctorNote: editing.hasDoctorNote,
      }
    : EMPTY;

  return (
    <Formik<RequestDraft>
      initialValues={initial}
      enableReinitialize
      onSubmit={(values, helpers) =>
        submit.mutate(
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
      {({ values, submitForm, resetForm }) => {
        const type = leaveTypeOf(values.leaveTypeId);
        const close = () => {
          resetForm();
          onClose();
        };

        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title={editing ? `Edit request — ${editing.id}` : 'New time off request'}
            description="Filed for yourself only — the employee is taken from the session, never from the form."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={submit.isPending}>
                  {submit.isPending ? 'Mengirim…' : editing ? 'Save changes' : 'Submit request'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="leaveTypeId"
                  label="Leave type"
                  required
                  placeholder="Select leave type"
                  options={typeOptions}
                  hint="Only active types appear here."
                />
                <SelectField
                  name="daySession"
                  label="Day session"
                  required
                  // Mulai ≠ Selesai ⇒ opsi Setengah disembunyikan, hanya Penuh (FSD-TIME 0.13 #12).
                  options={
                    values.startDate && values.endDate && values.startDate !== values.endDate
                      ? SESSION_OPTIONS.filter((option) => option.value === 'FULL')
                      : SESSION_OPTIONS
                  }
                  hint="Half day is only available when the start and end dates are the same."
                />
              </div>

              <DateRangeField
                fromName="startDate"
                toName="endDate"
                label="Leave dates"
                required
                hint="Click a single date for a one-day leave."
              />

              <div className="flex flex-col gap-1">
                <Label htmlFor="requester">
                  Applicant
                  <span className="ml-1.5 inline-flex items-center gap-1 align-middle font-body text-[10px] font-bold uppercase tracking-[0.05em] text-fg-4 [&_svg]:size-3">
                    <Lock />
                    terkunci
                  </span>
                </Label>
                <Input id="requester" readOnly tabIndex={-1} value={employeeName(session.employeeId)} />
                <span className="font-body text-xs font-normal leading-[1.4] text-fg-3">
                  Taken from the session token — leave can never be filed on behalf of someone else.
                </span>
              </div>

              <TextAreaField
                name="reason"
                label="Reason"
                required={!type || type.requiresApproval}
                rows={3}
                maxLength={500}
                placeholder="Write the reason here"
                hint="Required for every type except sick leave. Once approved, this text flows into the balance ledger as the mutation reason."
              />

              <DynamicSection session={session} existing={existing} editingId={editing?.id} />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
