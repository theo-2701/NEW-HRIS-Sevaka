import { Form, Formik, useFormikContext } from 'formik';
import { TriangleAlert, Workflow } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/form/DateField';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { Note } from '@/features/transitions/components/TransitionBits';
import { useCreateTransition } from '@/features/transitions/hooks/useTransitions';
import { transitionSchema } from '@/features/transitions/validation';
import {
  DESTINATION_OPTIONS,
  EMPLOYEE_OPTIONS,
  REASON_OPTIONS,
  REQUEST_KIND_LABEL,
  TARGET_GRADE_OPTIONS,
} from '@/features/transitions/types';
import type { RequestKind, TransitionDraft } from '@/features/transitions/types';

/** Mutation = transfer lateral/relokasi; Promotion/Demotion membawa target grade. */
const SUBTYPE_OF: Record<Exclude<RequestKind, 'OFFBOARDING'>, string> = {
  MUTATION: 'LATERAL',
  PROMOTION: 'PROMOTION',
  DEMOTION: 'DEMOTION',
};

const DESCRIPTION: Record<RequestKind, string> = {
  OFFBOARDING: 'Exit with a notice period, except termination with cause and deceased, which take effect at once.',
  MUTATION: 'Move to another seat at the same grade. The origin unit hands over first, then the new unit prepares.',
  PROMOTION: 'Move to a higher-grade seat. The seat and grade change only after every task is done.',
  DEMOTION: 'Move to a lower-grade seat. The seat and grade change only after every task is done.',
};

function OffboardingBlock() {
  const { values } = useFormikContext<TransitionDraft>();
  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-dashed border-fog bg-mist p-4">
      <SelectField name="reason" label="Reason" required placeholder="Select reason" options={REASON_OPTIONS} />
      {values.reason === 'TERMINATION' && (
        <Note tone="warn" icon={<TriangleAlert />}>
          Termination with cause revokes access at once; no pay during a notice period.
        </Note>
      )}
      {values.reason === 'DECEASED' && (
        <Note tone="warn" icon={<TriangleAlert />}>
          Access is revoked at once, no exit interview is created, and HR confirms two-party tasks on the family&rsquo;s behalf.
        </Note>
      )}
    </div>
  );
}

/**
 * Ajukan transisi (TSD-EMPLOYEE 0.212 §7.25 TL2) — empat jenis. Catatan fasilitas
 * kosong ⇒ tugas fasilitas tidak lahir; isinya tidak pernah masuk email.
 */
export function CreateTransitionModal({ kind, onClose }: { kind: RequestKind | null; onClose: () => void }) {
  const create = useCreateTransition();
  const transfer = kind && kind !== 'OFFBOARDING';

  return (
    <Formik<TransitionDraft>
      initialValues={{
        type: kind === 'OFFBOARDING' ? 'OFFBOARDING' : 'TRANSFER',
        employeeId: '',
        subtype: transfer ? SUBTYPE_OF[kind] : '',
        destinationPositionId: '',
        targetJobGradeId: '',
        reason: '',
        effectiveDate: '',
        facilityProvidedNote: '',
        facilityWithdrawnNote: '',
      }}
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
            title={kind ? `New ${REQUEST_KIND_LABEL[kind].toLowerCase()}` : 'New transition'}
            description={kind ? DESCRIPTION[kind] : ''}
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
            {kind && (
              <Form className="flex flex-col gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField name="employeeId" label="Employee" required placeholder="Select employee" options={EMPLOYEE_OPTIONS} />
                  <DateField name="effectiveDate" label="Effective date" required placeholder="Select date" />
                </div>

                {kind === 'OFFBOARDING' ? (
                  <OffboardingBlock />
                ) : (
                  <div className="grid gap-4 rounded-[10px] border border-dashed border-fog bg-mist p-4 md:grid-cols-2">
                    <SelectField
                      name="destinationPositionId"
                      label="Destination seat"
                      required
                      placeholder="Select seat"
                      options={DESTINATION_OPTIONS}
                      hint="The destination branch follows this seat."
                    />
                    {kind !== 'MUTATION' && (
                      <SelectField
                        name="targetJobGradeId"
                        label="Target grade"
                        required
                        placeholder="Select grade"
                        options={TARGET_GRADE_OPTIONS}
                      />
                    )}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {kind !== 'OFFBOARDING' && (
                    <TextAreaField
                      name="facilityProvidedNote"
                      label="Facility to provide"
                      rows={3}
                      maxLength={500}
                      placeholder="Optional — e.g. laptop, access card"
                      hint="Leave empty if nothing is handed over; no facility task is created."
                    />
                  )}
                  <TextAreaField
                    name="facilityWithdrawnNote"
                    label="Facility to withdraw"
                    rows={3}
                    maxLength={500}
                    placeholder="Optional — e.g. laptop, parking card"
                    hint="Visible only to HR and the people handling the task, never in email."
                  />
                </div>

                <Note icon={<Workflow />}>
                  Tasks come from the Materialization setup and are frozen at this version. Handlers are picked from the
                  live list — never the employee or the requester.
                </Note>
              </Form>
            )}
          </Modal>
        );
      }}
    </Formik>
  );
}
