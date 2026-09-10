import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Lock } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { DateField } from '@/components/form/DateField';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { useCreateAdjustment } from '@/features/time-off/hooks/useBalance';
import { EMPLOYEES, LEAVE_TYPES } from '@/features/time-off/mock-data';
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
  employeeId: Yup.string().required('Karyawan wajib dipilih.'),
  leaveTypeId: Yup.string().required('Jenis cuti wajib dipilih.'),
  periodYear: Yup.number()
    .typeError('Tahun hak harus berupa angka.')
    .required('Tahun hak wajib diisi.')
    .min(2000, 'Tahun hak harus di antara 2000 dan 2999.')
    .max(2999, 'Tahun hak harus di antara 2000 dan 2999.'),
  mutationDate: Yup.string().required('Tanggal mutasi wajib diisi.'),
  deltaDays: Yup.number()
    .typeError('Delta harus berupa angka.')
    .required('Delta wajib diisi.')
    .notOneOf([0], 'Delta tidak boleh nol.')
    .min(-999.99, 'Di luar rentang yang diterima.')
    .max(999.99, 'Di luar rentang yang diterima.'),
  reason: Yup.string().trim().required('Alasan wajib diisi.').max(500, 'Maksimal 500 karakter.'),
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
            description="Satu-satunya mutasi di ledger ini yang punya aktor manusia. Ia menulis satu entri baru — tidak pernah mengubah yang sudah ada."
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
                <SelectField
                  name="employeeId"
                  label="Karyawan"
                  required
                  placeholder="Pilih karyawan"
                  options={EMPLOYEES.map((row) => ({ value: row.id, label: row.name }))}
                />
                <SelectField
                  name="leaveTypeId"
                  label="Jenis cuti"
                  required
                  placeholder="Pilih jenis cuti"
                  options={LEAVE_TYPES.map((row) => ({ value: row.id, label: row.name }))}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextField name="periodYear" type="number" min={2000} max={2999} label="Tahun hak" required />
                <DateField
                  name="mutationDate"
                  label="Tanggal mutasi"
                  required
                  hint="Tanggal kalender yang dimutasi — bukan tanggal baris ini ditulis."
                />
              </div>

              <TextField
                name="deltaDays"
                type="number"
                step="0.01"
                label="Delta (hari)"
                required
                placeholder="mis. 2.00 atau -1.50"
                hint="Bertanda. Positif menambah hak, negatif menguranginya. Nol ditolak di sumbernya."
              />

              <TextAreaField
                name="reason"
                label="Alasan"
                required
                rows={3}
                maxLength={500}
                placeholder="Tulis alasannya di sini"
                hint="Wajib di sini — ini satu-satunya mutasi saldo yang dikarang manusia, jadi tidak boleh kosong."
              />

              <section className="flex flex-col gap-2 rounded-md border border-border-1 bg-mist p-4">
                <h4 className="m-0 inline-flex items-center gap-2 font-body text-xs font-bold uppercase tracking-[0.05em] text-fg-3 [&_svg]:size-3.5">
                  <Lock />
                  Dikunci server di jalur ini
                </h4>
                <KeyValueList>
                  <KeyValueRow label="Mutation source">HR adjustment</KeyValueRow>
                  <KeyValueRow label="Event reference">Selalu kosong</KeyValueRow>
                </KeyValueList>
                <p className="m-0 font-body text-xs font-medium leading-[1.45] text-fg-3">
                  Sumber lain (accrual, leave taken, carry-over…) tidak ditawarkan di sini — semuanya lahir dari
                  proses otomatis, tidak pernah dari form.
                </p>
              </section>
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
