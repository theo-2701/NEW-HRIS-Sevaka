import { useState } from 'react';
import { Form, Formik, useField, useFormikContext } from 'formik';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/TextField';
import { DateField } from '@/components/form/DateField';
import { SelectField } from '@/components/form/SelectField';
import { useCreateCandidate, useSubmitCandidate, useUpdateCandidate } from '@/features/new-joiner/hooks/useNewJoiner';
import { useRequisitions } from '@/features/manpower/hooks/useManpower';
import { isPickableRequisition } from '@/features/new-joiner/services/new-joiner.service';
import { candidateSchema } from '@/features/new-joiner/validation';
import { POSITION_OPTIONS } from '@/features/new-joiner/types';
import type { Candidate, CandidateDraft, Nationality } from '@/features/new-joiner/types';
import { KeyValueList, KeyValueRow } from '@/features/new-joiner/components/CandidateBits';
import { cn } from '@/lib/utils';

const EMPTY: CandidateDraft = {
  positionId: '',
  requisitionId: '',
  name: '',
  nationality: '',
  idCardNumber: '',
  passportNumber: '',
  visaNumber: '',
  email: '',
  phone: '',
  intendedJoinDate: '',
};

const BRANCH: { value: Nationality; title: string; description: string }[] = [
  { value: 'CITIZEN', title: 'WNI (Warga Negara Indonesia)', description: 'Membutuhkan KTP 16 digit' },
  { value: 'FOREIGNER', title: 'WNA (Warga Negara Asing)', description: 'Membutuhkan nomor paspor dan visa' },
];

/**
 * Pemilih kewarganegaraan (MbV, UIC §1.7). Keadaan awal belum terpilih; mengganti
 * pilihan mengosongkan identitas cabang lain (L2) — tidak ada dua identitas terkirim.
 */
function NationalityBranch() {
  const [field, meta, helpers] = useField<CandidateDraft['nationality']>('nationality');
  const { setFieldValue, setFieldTouched } = useFormikContext<CandidateDraft>();

  const pick = (value: Nationality) => {
    helpers.setValue(value);
    const cleared = value === 'CITIZEN' ? ['passportNumber', 'visaNumber'] : ['idCardNumber'];
    for (const name of cleared) {
      void setFieldValue(name, '');
      void setFieldTouched(name, false);
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
      {meta.touched && meta.error && (
        <span className="font-body text-xs font-medium text-error-800">{meta.error}</span>
      )}
    </fieldset>
  );
}

/** Cabang identitas: tidak tampil sampai radio dipilih, lalu hanya cabang yang terpilih. */
function IdentityBranch() {
  const { values } = useFormikContext<CandidateDraft>();
  if (!values.nationality) return null;

  return (
    <div className="grid gap-4 rounded-[10px] border border-dashed border-fog bg-mist p-4 md:grid-cols-2">
      {values.nationality === 'CITIZEN' ? (
        <TextField
          name="idCardNumber"
          label="Nomor KTP"
          required
          inputMode="numeric"
          maxLength={16}
          placeholder="16 digit"
          hint={`${values.idCardNumber.length}/16 digit`}
        />
      ) : (
        <>
          <TextField
            name="passportNumber"
            label="Nomor paspor"
            required
            maxLength={15}
            placeholder="mis. A1234567"
            className="uppercase"
            hint="6–15 karakter, hanya huruf dan angka."
          />
          <TextField
            name="visaNumber"
            label="Nomor visa"
            required
            maxLength={20}
            placeholder="mis. VK2026ABC"
            className="uppercase"
            hint="6–20 karakter, huruf kapital dan angka."
          />
        </>
      )}
    </div>
  );
}

/** Requisition APPROVED yang hari ini di dalam masa aktifnya; nama pengaju tampil sesudah dipilih. */
function RequisitionPicker() {
  const { data: requisitions = [] } = useRequisitions();
  const { values } = useFormikContext<CandidateDraft>();
  const pickable = requisitions.filter((row) => isPickableRequisition(row));
  const chosen = requisitions.find((row) => row.id === values.requisitionId);

  return (
    <SelectField
      name="requisitionId"
      label="Requisition"
      required
      placeholder="Pilih requisition APPROVED"
      options={pickable.map((row) => ({ value: row.id, label: `${row.id} — ${row.title}` }))}
      hint={chosen ? `Pengaju: ${chosen.maker}` : 'Hanya requisition APPROVED yang masih di masa aktifnya.'}
    />
  );
}

/** Ubah: nilai awal dari detail apa adanya (KTP transient tidak pernah dipulangkan). */
function toDraft(row: Candidate): CandidateDraft {
  return {
    positionId: row.positionId,
    requisitionId: row.requisitionId,
    name: row.name,
    nationality: row.nationality,
    idCardNumber: '',
    passportNumber: row.passportNumber,
    visaNumber: row.visaNumber,
    email: row.email,
    phone: row.phone,
    intendedJoinDate: row.intendedJoinDate,
  };
}

/**
 * NJ-CREATE / Ubah. Simpan selalu melahirkan DRAFT; sesudahnya form dikosongkan (L5)
 * dan panel calon-tersimpan menawarkan Ajukan · Ubah · Hapus draf · Tutup panel.
 * Modal Ubah (`editing`) memakai isian yang sama kecuali Posisi dan Requisition.
 */
export function CandidateFormModal({
  open,
  editing,
  onClose,
  onEdit,
  onDelete,
}: {
  open: boolean;
  editing?: Candidate | null;
  onClose: () => void;
  onEdit: (row: Candidate) => void;
  onDelete: (row: Candidate) => void;
}) {
  const create = useCreateCandidate();
  const update = useUpdateCandidate();
  const submit = useSubmitCandidate();
  const [saved, setSaved] = useState<Candidate | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const pending = create.isPending || update.isPending;

  return (
    <Formik<CandidateDraft>
      initialValues={editing ? toDraft(editing) : EMPTY}
      enableReinitialize
      validationSchema={candidateSchema}
      onSubmit={(values, helpers) => {
        if (editing) {
          update.mutate({ id: editing.id, draft: values }, { onSuccess: onClose });
          return;
        }
        create.mutate(values, {
          onSuccess: (row) => {
            helpers.resetForm();
            setSaved(row);
          },
        });
      }}
    >
      {({ submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          setSaved(null);
          onClose();
        };

        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title={editing ? `Ubah ${editing.name}` : 'Add candidate'}
            description="Anda berperan sebagai maker. Field identitas mengikuti kewarganegaraan; calon tersimpan sebagai DRAFT."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={() => void submitForm()} disabled={pending}>
                  {pending ? 'Menyimpan…' : editing ? 'Save changes' : 'Simpan'}
                </Button>
              </>
            }
          >
            {saved && (
              <div className="mb-4 flex flex-col gap-3 rounded-[10px] border border-silver bg-mist p-4">
                <p className="m-0 font-body text-[13px] font-bold text-fg-1">Calon tersimpan sebagai DRAFT</p>
                <KeyValueList>
                  <KeyValueRow label="Kandidat">{saved.name}</KeyValueRow>
                  <KeyValueRow label="Requisition">{saved.requisitionId}</KeyValueRow>
                </KeyValueList>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" onClick={() => setSaved(null)}>
                    Tutup panel
                  </Button>
                  <Button variant="secondary" onClick={() => (onDelete(saved), setSaved(null))}>
                    Hapus draf
                  </Button>
                  <Button variant="secondary" onClick={() => (onEdit(saved), setSaved(null))}>
                    Ubah
                  </Button>
                  <Button
                    disabled={submit.isPending}
                    onClick={() =>
                      submit.mutate({ id: saved.id, name: saved.name }, { onSuccess: () => setSaved(null) })
                    }
                  >
                    Ajukan
                  </Button>
                </div>
              </div>
            )}

            <Form className="flex flex-col gap-4">
              {!editing && (
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    name="positionId"
                    label="Posisi"
                    required
                    placeholder="Pilih posisi yang dibuka"
                    options={POSITION_OPTIONS}
                  />
                  <RequisitionPicker />
                </div>
              )}

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
                  name="phone"
                  label="No. HP kandidat"
                  required
                  placeholder="0812… atau +62812…"
                  hint="Diseragamkan ke +62… saat disimpan."
                />
                <DateField
                  name="intendedJoinDate"
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
