import { useEffect } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import { TriangleAlert, Workflow } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/form/DateField';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { EmployeeSelectField } from '@/components/form/EmployeeSelectField';
import { Note } from '@/features/transitions/components/TransitionBits';
import { useCreateTransition } from '@/features/transitions/hooks/useTransitions';
import { transitionSchema } from '@/features/transitions/validation';
import {
  CREATE_KIND_LABEL,
  DESTINATION_OPTIONS,
  EMPLOYEE_OPTIONS,
  FLOW_NOTE,
  GRADE_REQUIRED_SUBTYPES,
  MUTATION_SUBTYPES,
  REASON_OPTIONS,
  SUBTYPE_LABEL,
  TARGET_GRADE_OPTIONS,
} from '@/features/transitions/types';
import type { CreateKind, TransitionDraft } from '@/features/transitions/types';
import { createLocalEmployeeSource, fromLabelOptions } from '@/lib/employeeSource';

const EMPLOYEE_SOURCE = createLocalEmployeeSource('transitions', fromLabelOptions(EMPLOYEE_OPTIONS));

const DESCRIPTION: Record<CreateKind, string> = {
  OFFBOARDING: 'The employee leaves the company. Notice-period reasons keep pay until the leave date.',
  MUTATION: 'The employee moves to another position without a grade change. The old unit hands over, the new unit prepares.',
  PROMOTION: 'The employee moves up a grade, with or without a new position.',
  DEMOTION: 'The employee moves down a grade, with or without a new position.',
};

const FACILITY_PROVIDED_HINT =
  'Optional. Facilities given in the new position, for example an official car. Visible only to the task handlers, approvers and HR.';
const FACILITY_WITHDRAWN_HINT = 'Optional. Facilities taken back from the old position, for example an official house.';

/** Blok TRANSFER — sub-tipe hanya dipilih pada Mutation; golongan tujuan hanya Promotion/Demotion. */
function TransferBlock({ kind }: { kind: CreateKind }) {
  const { values, setFieldValue } = useFormikContext<TransitionDraft>();
  const gradeNeeded = GRADE_REQUIRED_SUBTYPES.includes(values.subtype);

  // L2: sub-tipe berganti ke non-promosi/demosi ⇒ golongan tujuan dikosongkan dan tidak dikirim.
  useEffect(() => {
    if (!gradeNeeded && values.targetJobGradeId) void setFieldValue('targetJobGradeId', '');
  }, [gradeNeeded, values.targetJobGradeId, setFieldValue]);

  return (
    <div className="grid gap-4 rounded-[10px] border border-dashed border-fog bg-mist p-4 md:grid-cols-2">
      {kind === 'MUTATION' && (
        <SelectField
          name="subtype"
          label="Sub-type"
          required
          placeholder="Select a sub-type"
          options={MUTATION_SUBTYPES.map((value) => ({ value, label: SUBTYPE_LABEL[value] }))}
          hint="Determines the approval level required."
        />
      )}
      <SelectField
        name="destinationPositionId"
        label="Target Position"
        placeholder="Select a position"
        options={DESTINATION_OPTIONS}
        hint={kind === 'MUTATION' ? 'The branch follows the target position.' : 'Optional when only the grade changes.'}
      />
      {gradeNeeded && (
        <SelectField
          name="targetJobGradeId"
          label="Target Grade"
          required
          placeholder="Select the target grade"
          options={TARGET_GRADE_OPTIONS}
          hint="Applied on the effective date. It must differ from the current grade."
        />
      )}
    </div>
  );
}

/** Blok OFFBOARDING — Deceased dan Termination punya akibat yang perlu terbaca sebelum kirim. */
function OffboardingBlock() {
  const { values } = useFormikContext<TransitionDraft>();
  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-dashed border-fog bg-mist p-4">
      <SelectField name="reason" label="Reason" required placeholder="Select a reason" options={REASON_OPTIONS} />
      {values.reason === 'TERMINATION' && (
        <Note tone="warn" icon={<TriangleAlert />}>
          Termination with cause revokes access right away; the employee is not paid through a notice period.
        </Note>
      )}
      {values.reason === 'DECEASED' && (
        <Note tone="warn" icon={<TriangleAlert />}>
          Account access is revoked immediately. HR confirms the handover tasks.
        </Note>
      )}
    </div>
  );
}

const draftFor = (kind: CreateKind | null): TransitionDraft => ({
  type: kind === 'OFFBOARDING' ? 'OFFBOARDING' : 'TRANSFER',
  employeeId: '',
  subtype: kind === 'PROMOTION' || kind === 'DEMOTION' ? kind : '',
  destinationPositionId: '',
  targetJobGradeId: '',
  reason: '',
  effectiveDate: '',
  facilityProvided: '',
  facilityWithdrawn: '',
});

/**
 * TR-CREATE — satu form yang berubah bentuk menurut jenis (FSD 0.83 §5, §19). Onboarding lahir dari
 * materialisasi New Joiner, jadi tidak diajukan dari sini.
 */
export function CreateTransitionModal({ kind, onClose }: { kind: CreateKind | null; onClose: () => void }) {
  const create = useCreateTransition();

  return (
    <Formik<TransitionDraft>
      initialValues={draftFor(kind)}
      enableReinitialize
      validationSchema={transitionSchema}
      onSubmit={(values, helpers) =>
        create.mutate(values, {
          onSuccess: () => {
            helpers.resetForm();
            onClose();
          },
        })
      }
    >
      {({ submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={Boolean(kind)}
            onOpenChange={(open) => !open && close()}
            size="wide"
            title={kind ? CREATE_KIND_LABEL[kind] : 'New transition'}
            description={kind ? DESCRIPTION[kind] : ''}
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={create.isPending}>
                  {create.isPending ? 'Submitting…' : 'Submit Transition'}
                </Button>
              </>
            }
          >
            {kind && (
              <Form className="flex flex-col gap-4">
                <EmployeeSelectField name="employeeId" lang="en" label="Employee" required source={EMPLOYEE_SOURCE} />
                {kind === 'OFFBOARDING' ? <OffboardingBlock /> : <TransferBlock kind={kind} />}
                <DateField name="effectiveDate" label="Effective Date" required />
                <div className="grid gap-4 md:grid-cols-2">
                  {kind !== 'OFFBOARDING' && (
                    <TextAreaField name="facilityProvided" label="Facility provided" rows={3} maxLength={500} hint={FACILITY_PROVIDED_HINT} />
                  )}
                  <TextAreaField name="facilityWithdrawn" label="Facility withdrawn" rows={3} maxLength={500} hint={FACILITY_WITHDRAWN_HINT} />
                </div>
                <Note icon={<Workflow />}>{FLOW_NOTE[kind === 'OFFBOARDING' ? 'OFFBOARDING' : 'TRANSFER']}</Note>
              </Form>
            )}
          </Modal>
        );
      }}
    </Formik>
  );
}
