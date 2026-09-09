import { useRef } from 'react';
import { Form, Formik, useField, useFormikContext } from 'formik';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/TextField';
import { SelectField } from '@/components/form/SelectField';
import { useCreateCandidate } from '@/features/new-joiner/hooks/useNewJoiner';
import { candidateSchema } from '@/features/new-joiner/validation';
import { POSITION_OPTIONS, REQUISITION_OPTIONS } from '@/features/new-joiner/types';
import type { CandidateDraft, Nationality } from '@/features/new-joiner/types';
import { cn } from '@/lib/utils';

const EMPTY: CandidateDraft = {
  positionId: '',
  requisitionId: '',
  name: '',
  nationality: 'CITIZEN',
  idCardNumber: '',
  passportNumber: '',
  email: '',
  intendedJoinDate: '',
};

const BRANCH: { value: Nationality; title: string; description: string }[] = [
  { value: 'CITIZEN', title: 'Citizen (WNI)', description: 'Membutuhkan KTP 16 digit' },
  { value: 'FOREIGNER', title: 'Foreigner (WNA)', description: 'Membutuhkan nomor paspor' },
];

/**
 * Pemilih kewarganegaraan (MbV, UIC §1.7). Mengganti pilihan akan
 * mengosongkan field identitas cabang lain supaya tidak ada dua identitas
 * terkirim sekaligus.
 */
function NationalityBranch() {
  const [field, , helpers] = useField<Nationality>('nationality');
  const { setFieldValue, setFieldTouched } = useFormikContext<CandidateDraft>();

  const pick = (value: Nationality) => {
    helpers.setValue(value);
    if (value === 'CITIZEN') {
      void setFieldValue('passportNumber', '');
      void setFieldTouched('passportNumber', false);
    } else {
      void setFieldValue('idCardNumber', '');
      void setFieldTouched('idCardNumber', false);
    }
  };

  return (
    <fieldset className="flex flex-col gap-2 border-none p-0">
      <legend className="mb-1 select-none font-body text-base font-bold leading-[1.2] text-fg-2">
        Kewarganegaraan <em className="ml-0.5 not-italic text-error-500">*</em>
      </legend>
      <div className="grid gap-2.5 md:grid-cols-2">
        {BRANCH.map((option) => {
          const active = field.value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => pick(option.value)}
              aria-pressed={active}
              className={cn(
                'flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-left transition-colors duration-200 ease-standard',
                active ? 'border-secondary-500 bg-primary-50' : 'border-silver bg-white hover:border-fog',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2',
                  active ? 'border-secondary-500' : 'border-fog',
                )}
              >
                {active && <span className="size-2 rounded-full bg-secondary-500" />}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-body text-[13px] font-bold text-fg-1">{option.title}</span>
                <span className="font-body text-xs font-medium text-fg-3">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Cabang identitas: hanya satu yang tampil, mengikuti kewarganegaraan. */
function IdentityBranch() {
  const { values } = useFormikContext<CandidateDraft>();

  if (values.nationality === 'CITIZEN') {
    return (
      <div className="rounded-[10px] border border-dashed border-fog bg-mist p-4">
        <TextField
          name="idCardNumber"
          label="Nomor KTP"
          required
          inputMode="numeric"
          maxLength={16}
          placeholder="16 digit"
          hint={`${values.idCardNumber.length}/16 digit · dikirim transient, tidak pernah disimpan mentah`}
        />
      </div>
    );
  }

  return (
    <div className="rounded-[10px] border border-dashed border-fog bg-mist p-4">
      <TextField
        name="passportNumber"
        label="Nomor paspor"
        required
        maxLength={15}
        placeholder="mis. A1234567"
        className="uppercase"
        hint="6–15 karakter, hanya huruf dan angka."
      />
    </div>
  );
}

/**
 * NJ-CREATE — maker mendaftarkan kandidat. Draft-first: "Save as draft" dan
 * "Save & submit" adalah dua aksi berbeda (FSD §4.1).
 */
export function CandidateFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateCandidate();
  const today = new Date().toISOString().slice(0, 10);
  /** Aksi mana yang menekan submit — dibaca saat handler jalan, jadi pakai ref. */
  const modeRef = useRef<'draft' | 'submit'>('submit');

  return (
    <Formik
      initialValues={EMPTY}
      validationSchema={candidateSchema}
      onSubmit={(values, helpers) => {
        create.mutate(
          { draft: values, submitNow: modeRef.current === 'submit' },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        );
      }}
    >
      {({ submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        const save = (mode: 'draft' | 'submit') => {
          modeRef.current = mode;
          void submitForm();
        };

        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title="Add candidate"
            description="Anda berperan sebagai maker. Field identitas mengikuti kewarganegaraan; menyimpan tanpa mengajukan menghasilkan DRAFT."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button variant="secondary" onClick={() => save('draft')} disabled={create.isPending}>
                  Save as draft
                </Button>
                <Button onClick={() => save('submit')} disabled={create.isPending}>
                  {create.isPending ? 'Menyimpan…' : 'Save & submit'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="positionId"
                  label="Posisi"
                  required
                  placeholder="Pilih posisi yang dibuka"
                  options={POSITION_OPTIONS}
                />
                <SelectField
                  name="requisitionId"
                  label="Requisition"
                  placeholder="Vacant (no requisition)"
                  hint="Opsional — kosongkan bila kursi tidak berasal dari requisition."
                  options={REQUISITION_OPTIONS}
                />
              </div>

              <TextField name="name" label="Nama kandidat" required maxLength={150} placeholder="Nama lengkap sesuai identitas" />

              <NationalityBranch />
              <IdentityBranch />

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  name="email"
                  type="email"
                  label="Email kandidat"
                  required
                  placeholder="nama@email.com"
                  hint="Dipakai untuk undangan akun."
                />
                <TextField
                  name="intendedJoinDate"
                  type="date"
                  label="Rencana tanggal masuk"
                  required
                  min={today}
                  hint="Hari ini atau setelahnya."
                />
              </div>
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
