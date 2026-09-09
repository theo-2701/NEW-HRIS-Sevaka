import { FieldArray, Form, Formik, useFormikContext } from 'formik';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { AddButton, RemoveRowButton } from '@/components/RowActions';
import { TextField } from '@/components/form/TextField';
import { SelectField } from '@/components/form/SelectField';
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
            <div key={index} className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
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
              <RemoveRowButton
                aria-label="Hapus baris target"
                disabled={values.lines.length === 1}
                onClick={() => remove(index)}
              />
            </div>
          ))}

          {listError && <span className="font-body text-xs font-medium text-error-600">{listError}</span>}

          {/* Tombol "Add …" di dalam form — satu-satunya tombol yang boleh berikon. */}
          <AddButton onClick={() => push({ unitId: '', target: 0 })}>Add unit</AddButton>
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

              <div className="grid gap-4 md:grid-cols-2">
                <TextField name="periodStart" type="date" label="Awal periode" required />
                <TextField
                  name="periodEnd"
                  type="date"
                  label="Akhir periode"
                  required
                  hint="Harus sama atau setelah awal periode."
                />
              </div>

              <TargetLines />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
