import { Form, Formik, useFormikContext } from 'formik';
import { TriangleAlert, Workflow } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/form/DateField';
import { SelectField } from '@/components/form/SelectField';
import { Note } from '@/features/transitions/components/TransitionBits';
import { useCreateTransition } from '@/features/transitions/hooks/useTransitions';
import { transitionSchema } from '@/features/transitions/validation';
import {
  DESTINATION_OPTIONS,
  EMPLOYEE_OPTIONS,
  FLOW_NOTE,
  GRADE_REQUIRED_SUBTYPES,
  REASON_OPTIONS,
  SUBTYPE_OPTIONS,
  TARGET_GRADE_OPTIONS,
  TYPE_LABEL,
} from '@/features/transitions/types';
import type { TransitionDraft, TransitionType } from '@/features/transitions/types';

const DESCRIPTION: Record<TransitionType, string> = {
  ONBOARDING: 'Menyiapkan akses dan aset untuk karyawan baru.',
  TRANSFER: 'Perpindahan dua sisi — unit asal melepas, unit tujuan menyiapkan.',
  OFFBOARDING: 'Berbasis notice period, kecuali diberhentikan dengan sebab.',
};

/** Blok khusus TRANSFER — target job grade hanya muncul untuk promosi/demosi. */
function TransferBlock() {
  const { values } = useFormikContext<TransitionDraft>();
  const gradeNeeded = GRADE_REQUIRED_SUBTYPES.includes(values.subtype);

  return (
    <div className="grid gap-4 rounded-[10px] border border-dashed border-fog bg-mist p-4 md:grid-cols-2">
      <SelectField name="subtype" label="Sub-tipe" required placeholder="Pilih sub-tipe" options={SUBTYPE_OPTIONS} />
      <SelectField
        name="destinationPositionId"
        label="Posisi tujuan"
        required
        placeholder="Pilih posisi"
        options={DESTINATION_OPTIONS}
      />
      {gradeNeeded && (
        <SelectField
          name="targetJobGradeId"
          label="Target job grade"
          required
          placeholder="Pilih target job grade"
          options={TARGET_GRADE_OPTIONS}
          hint="Wajib untuk Promotion dan Demotion — posisi tujuan bersifat struktural, ini grade-nya."
          containerClassName="md:col-span-2"
        />
      )}
    </div>
  );
}

/** Blok khusus OFFBOARDING — peringatan muncul bila diberhentikan dengan sebab. */
function OffboardingBlock() {
  const { values } = useFormikContext<TransitionDraft>();

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-dashed border-fog bg-mist p-4">
      <SelectField name="reason" label="Alasan" required placeholder="Pilih alasan" options={REASON_OPTIONS} />
      {values.reason === 'TERMINATION' && (
        <Note tone="warn" icon={<TriangleAlert />}>
          Termination with cause mencabut akses seketika; karyawan tidak dibayar sepanjang notice period.
        </Note>
      )}
    </div>
  );
}

/**
 * TR-CREATE — satu modal untuk tiga tipe transisi; field yang tampil mengikuti
 * tipe yang dipilih dari menu "New transition".
 */
export function CreateTransitionModal({
  type,
  onClose,
}: {
  type: TransitionType | null;
  onClose: () => void;
}) {
  const create = useCreateTransition();

  return (
    <Formik<TransitionDraft>
      initialValues={{
        type: type ?? 'ONBOARDING',
        employeeId: '',
        subtype: '',
        destinationPositionId: '',
        targetJobGradeId: '',
        reason: '',
        effectiveDate: '',
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
            open={Boolean(type)}
            onOpenChange={(open) => !open && close()}
            size="wide"
            title={type ? `New ${TYPE_LABEL[type].toLowerCase()}` : 'New transition'}
            description={type ? DESCRIPTION[type] : ''}
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={create.isPending}>
                  {create.isPending ? 'Membuat…' : 'Create transition'}
                </Button>
              </>
            }
          >
            {type && (
              <Form className="flex flex-col gap-4">
                <SelectField
                  name="employeeId"
                  label="Karyawan"
                  required
                  placeholder="Pilih karyawan"
                  options={EMPLOYEE_OPTIONS}
                />

                {type === 'TRANSFER' && <TransferBlock />}
                {type === 'OFFBOARDING' && <OffboardingBlock />}

                <DateField
                  name="effectiveDate"
                  label="Tanggal efektif"
                  required
                  containerClassName="max-w-[240px]"
                />

                <Note icon={<Workflow />}>{FLOW_NOTE[type]}</Note>
              </Form>
            )}
          </Modal>
        );
      }}
    </Formik>
  );
}
