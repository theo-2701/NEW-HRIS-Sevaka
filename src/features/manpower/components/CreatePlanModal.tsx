import { FieldArray, Form, Formik, useFormikContext } from 'formik';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { AddButton, RemoveRowButton } from '@/components/RowActions';
import { TextField } from '@/components/form/TextField';
import { DateRangeField } from '@/components/form/DateRangeField';
import { SelectField } from '@/components/form/SelectField';
import { Label } from '@/components/ui/label';
import { useCreatePlan } from '@/features/manpower/hooks/useManpower';
import { planSchema } from '@/features/manpower/validation';
import { UNIT_OPTIONS } from '@/features/manpower/types';
import type { PlanDraft } from '@/features/manpower/types';

const EMPTY: PlanDraft = {
  title: '',
  periodStart: '',
  periodEnd: '',
  lines: [
    { unitId: '', target: 0 },
    { unitId: '', target: 0 },
  ],
};

/** Baris target per unit — minimal satu baris harus ada. */
function TargetLines() {
  const { values, errors } = useFormikContext<PlanDraft>();
  const listError = typeof errors.lines === 'string' ? errors.lines : undefined;

  return (
    <FieldArray name="lines">
      {({ push, remove }) => (
        <section className="flex flex-col gap-3">
          <h3 className="m-0 font-body text-sm font-bold text-fg-1">Baris target</h3>

          {values.lines.map((_line, index) => (
            /* `items-start`: galat di bawah Unit tidak mendorong Target dan tombol hapus keluar
               dari garis kotak input — galatnya tetap menempel di bawah field-nya sendiri. */
            <div key={index} className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-start">
              <SelectField
                name={`lines.${index}.unitId`}
                label={index === 0 ? 'Unit' : undefined}
                required={index === 0}
                placeholder="Pilih unit"
                options={UNIT_OPTIONS}
              />
              <TextField
                name={`lines.${index}.target`}
                type="number"
                min={0}
                label={index === 0 ? 'Target' : undefined}
                required={index === 0}
              />
              <div className="flex flex-col gap-1">
                {/* Label bayangan di baris pertama supaya tombol hapus sejajar kotak input, bukan label. */}
                {index === 0 && (
                  <Label aria-hidden className="invisible hidden md:block">
                    &nbsp;
                  </Label>
                )}
                <div className="flex h-9 items-center">
                  <RemoveRowButton
                    aria-label="Hapus baris target"
                    disabled={values.lines.length === 1}
                    onClick={() => remove(index)}
                  />
                </div>
              </div>
            </div>
          ))}

          {listError && <span className="font-body text-xs font-medium text-error-600">{listError}</span>}

          {/* Tombol "Add …" di dalam form — satu-satunya tombol yang boleh berikon. Selebar isinya. */}
          <AddButton className="self-start" onClick={() => push({ unitId: '', target: 0 })}>
            Add unit
          </AddButton>
        </section>
      )}
    </FieldArray>
  );
}

/**
 * MP-CREATE — rencana headcount baru. Rencana selalu tersimpan sebagai DRAFT
 * dulu; mengaktifkannya adalah langkah terpisah.
 */
export function CreatePlanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreatePlan();

  return (
    <Formik<PlanDraft>
      initialValues={EMPTY}
      validationSchema={planSchema}
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
            title="New manpower plan"
            description="Beri nama rencananya, tetapkan periodenya, dan isi minimal satu baris target headcount per unit."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={create.isPending}>
                  {create.isPending ? 'Menyimpan…' : 'Save as draft'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <TextField
                name="title"
                label="Judul rencana"
                required
                maxLength={150}
                placeholder="mis. Rencana Headcount 2027"
              />

              <DateRangeField fromName="periodStart" toName="periodEnd" label="Periode" required />

              <TargetLines />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
