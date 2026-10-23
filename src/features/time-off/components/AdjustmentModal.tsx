import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Lock } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { EmployeeSelectField } from '@/components/form/EmployeeSelectField';
import { DateField } from '@/components/form/DateField';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { useCreateAdjustment } from '@/features/time-off/hooks/useBalance';
import { LEAVE_TYPES, timeEmployeeSource } from '@/features/time-off/mock-data';
import type { AdjustmentDraft, Session } from '@/features/time-off/types';

const EMPTY: AdjustmentDraft = {
  employeeId: '',
  leaveTypeId: '',
  periodYear: 2026,
  mutationDate: '',
  deltaDays: 0,
  reason: '',
};

const schema = Yup.object({
  employeeId: Yup.string().required('Choose an employee.'),
  leaveTypeId: Yup.string().required('Choose a leave type.'),
  periodYear: Yup.number()
    .typeError('Entitlement year must be a number.')
    .required('Entitlement year is required.')
    .min(2000, 'Entitlement year must be between 2000 and 2999.')
    .max(2999, 'Entitlement year must be between 2000 and 2999.'),
  mutationDate: Yup.string().required('Mutation date is required.'),
  deltaDays: Yup.number()
    .typeError('Delta must be a number.')
    .required('Delta is required.')
    .notOneOf([0], 'Delta cannot be zero.')
    .min(-999.99, 'Outside the accepted range.')
    .max(999.99, 'Outside the accepted range.'),
  reason: Yup.string().trim().required('Reason is required.').max(500, 'Maximum 500 characters.'),
});

/**
 * HR adjustment — satu-satunya mutasi saldo yang ditulis manusia, dan sifatnya
 * **create-only**: menulis satu baris baru, tidak pernah mengubah baris lama.
 */
export function AdjustmentModal({
  open,
  session,
  onClose,
}: {
  open: boolean;
  session: Session;
  onClose: () => void;
}) {
  const create = useCreateAdjustment(session);

  return (
    <Formik<AdjustmentDraft>
      initialValues={EMPTY}
      validationSchema={schema}
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
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title="Manual balance adjustment"
            description="The only mutation in this ledger with a human actor. It writes one new entry and never changes an existing one."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={create.isPending}>
                  {create.isPending ? 'Menulis…' : 'Write adjustment'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <EmployeeSelectField
                  lang="en"
                  name="employeeId"
                  label="Employee"
                  required
                  source={timeEmployeeSource(session.employeeId)}
                  hint="You can't adjust your own leave balance."
                />
                <SelectField
                  name="leaveTypeId"
                  label="Leave type"
                  required
                  placeholder="Select leave type"
                  options={LEAVE_TYPES.map((row) => ({ value: row.id, label: row.name }))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextField name="periodYear" type="number" min={2000} max={2999} label="Entitlement year" required />
                <DateField
                  name="mutationDate"
                  label="Mutation date"
                  required
                  hint="The calendar date being mutated — not the date this row is written."
                />
              </div>

              <TextField
                name="deltaDays"
                type="number"
                step="0.01"
                label="Delta (days)"
                required
                placeholder="e.g. 2.00 or -1.50"
                hint="Signed. Positive adds entitlement, negative reduces it. Zero is rejected at the source."
              />

              <TextAreaField
                name="reason"
                label="Reason"
                required
                rows={3}
                maxLength={500}
                placeholder="Write the reason here"
                hint="Required here — this is the only balance mutation written by a person, so it cannot be empty."
              />

              <section className="flex flex-col gap-2 rounded-md border border-border-1 bg-mist p-4">
                <h4 className="m-0 inline-flex items-center gap-2 font-body text-xs font-bold uppercase tracking-[0.05em] text-fg-3 [&_svg]:size-3.5">
                  <Lock />
                  Locked by the server on this path
                </h4>
                <KeyValueList>
                  <KeyValueRow label="Mutation source">HR adjustment</KeyValueRow>
                  <KeyValueRow label="Event reference">Always empty</KeyValueRow>
                </KeyValueList>
                <p className="m-0 font-body text-xs font-medium leading-[1.45] text-fg-3">
                  Other sources (accrual, leave taken, carry-over…) are not offered here — they all come from automatic processes, never from a form.
                </p>
              </section>
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
