import { Form, Formik, useFormikContext } from 'formik';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/TextField';
import { DateField } from '@/components/form/DateField';
import { RadioBranch } from '@/components/RadioBranch';
import { KeyValueList, KeyValueRow } from '@/features/new-joiner/components/CandidateBits';
import { useUpdateCandidate } from '@/features/new-joiner/hooks/useNewJoiner';
import { candidateSchema } from '@/features/new-joiner/validation';
import { POSITION_OPTIONS, labelOf } from '@/features/new-joiner/types';
import type { Candidate, CandidateDraft, Nationality } from '@/features/new-joiner/types';

type EditValues = CandidateDraft & { hasIdCard: boolean };

const BRANCH = [
  { value: 'CITIZEN' as const, title: 'Citizen (WNI)', description: 'Needs a 16-digit ID card (KTP) number.' },
  { value: 'FOREIGNER' as const, title: 'Foreigner (WNA)', description: 'Needs a passport and a visa number.' },
];

/** MbV (UIC §1.7): mengganti kewarganegaraan mengosongkan identitas cabang lain (L2). */
function IdentityFields() {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<EditValues>();

  const pick = (value: Nationality) => {
    void setFieldValue('nationality', value);
    for (const name of value === 'CITIZEN' ? ['passportNumber', 'visaNumber'] : ['idCardNumber']) {
      void setFieldValue(name, '');
      void setFieldTouched(name, false);
    }
  };

  return (
    <fieldset className="flex flex-col gap-3 border-none p-0">
      <legend className="mb-1 select-none font-body text-base font-bold leading-[1.2] text-fg-2">
        Nationality <em className="ml-0.5 not-italic text-error-500">*</em>
      </legend>
      <RadioBranch<Nationality> name="nationality" value={values.nationality as Nationality} onChange={pick} options={BRANCH} />
      {values.nationality === 'CITIZEN' && (
        <TextField
          name="idCardNumber"
          label="ID Card Number (KTP)"
          required={!values.hasIdCard}
          inputMode="numeric"
          maxLength={16}
          placeholder={values.hasIdCard ? 'Leave empty to keep the saved number' : '16 digits'}
          hint={`${values.idCardNumber.length}/16 digits. The full number is never shown again after saving.`}
        />
      )}
      {values.nationality === 'FOREIGNER' && (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            name="passportNumber"
            label="Passport Number"
            required
            maxLength={15}
            placeholder="e.g. A1234567"
            className="uppercase"
            hint="6–15 capital letters and digits."
          />
          <TextField
            name="visaNumber"
            label="Visa Number"
            required
            maxLength={20}
            placeholder="e.g. VK2026ABC"
            className="uppercase"
            hint="6–20 capital letters and digits."
          />
        </div>
      )}
    </fieldset>
  );
}

/** Nilai awal dari baris apa adanya — KTP transient tidak pernah dipulangkan. */
function toValues(row: Candidate): EditValues {
  return {
    positionId: row.positionId,
    requisitionId: row.requisitionId,
    name: row.name,
    nationality: row.nationality,
    idCardNumber: '',
    hasIdCard: Boolean(row.idCardLast4),
    passportNumber: row.passportNumber,
    visaNumber: row.visaNumber,
    email: row.email,
    phone: row.phone,
    intendedJoinDate: row.intendedJoinDate,
  };
}

/**
 * Edit calon DRAFT (FSD 0.46 §4.3). Posisi dan Requisition tidak bisa diubah — calon salah kursi
 * dibatalkan lalu diundang ulang. Data dari portal kandidat boleh dikoreksi HR di sini.
 */
export function CandidateFormModal({ candidate, onClose }: { candidate: Candidate | null; onClose: () => void }) {
  const update = useUpdateCandidate();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Formik<EditValues>
      initialValues={toValues(candidate ?? EMPTY_ROW)}
      enableReinitialize
      validationSchema={candidateSchema}
      onSubmit={({ hasIdCard: _h, ...draft }) => {
        if (candidate) update.mutate({ id: candidate.id, draft }, { onSuccess: onClose });
      }}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(candidate)}
          onOpenChange={(next) => !next && onClose()}
          size="wide"
          title="Edit Candidate"
          description="Check the data the candidate sent and complete what is missing before you submit."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => void submitForm()} disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </>
          }
        >
          {candidate && (
            <Form className="flex flex-col gap-4">
              <KeyValueList>
                <KeyValueRow label="Requisition">{candidate.requisitionId}</KeyValueRow>
                <KeyValueRow label="Position">{labelOf(POSITION_OPTIONS, candidate.positionId)}</KeyValueRow>
              </KeyValueList>

              <TextField name="name" label="Candidate Name" required maxLength={150} placeholder="Full name as on the ID" />
              <IdentityFields />

              <div className="grid gap-4 md:grid-cols-2">
                <TextField name="email" type="email" label="Candidate Email" required placeholder="name@email.com" />
                <TextField
                  name="phone"
                  label="Candidate Phone"
                  required
                  placeholder="0812… or +62812…"
                  hint="Saved as +62…"
                />
                <DateField
                  name="intendedJoinDate"
                  label="Intended Join Date"
                  required
                  min={today}
                  hint="Today or later. Needed before you submit."
                />
              </div>
            </Form>
          )}
        </Modal>
      )}
    </Formik>
  );
}

const EMPTY_ROW: Candidate = {
  id: '',
  name: '',
  email: '',
  phone: '',
  positionId: '',
  requisitionId: '',
  nationality: '',
  idCardLast4: '',
  passportNumber: '',
  visaNumber: '',
  intendedJoinDate: '',
  status: 'DRAFT',
  maker: '',
  makerId: '',
};
