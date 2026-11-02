import { useEffect } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Segmented } from '@/components/Segmented';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DateField } from '@/components/form/DateField';
import { SelectField } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { ToggleField } from '@/components/form/ToggleField';
import { DocumentField } from '@/components/form/DocumentField';
import { KeyValueList, KeyValueRow, Note } from '@/features/new-joiner/components/CandidateBits';
import { useMaterializeCandidate } from '@/features/new-joiner/hooks/useNewJoiner';
import { materializeSchema } from '@/features/new-joiner/validation';
import { JOB_GRADE_OPTIONS, POSITION_OPTIONS, labelOf } from '@/features/new-joiner/types';
import type { Candidate, MaterializePayload, WorkArrangementChoice } from '@/features/new-joiner/types';
import { formatDate } from '@/lib/format';

type Values = Omit<MaterializePayload, 'id'>;

/** Usulan server (`materialize_suggestion`): username dari email, NIK nomor berikutnya. */
function suggestion(candidate: Candidate) {
  const username = candidate.email.split('@')[0].toLowerCase().replace(/[^a-z0-9.]/g, '');
  return { username, nik: `NIK-${String(130 + candidate.id.length).padStart(4, '0')}`, companyEmail: `${username}@ptdika.co.id` };
}

/** WFH ⇒ radius tidak dicek dan terkunci mati (FRT-2610271835 T1). */
function ArrangementFields() {
  const { values, setFieldValue } = useFormikContext<Values>();
  useEffect(() => {
    if (values.workArrangement === 'WFH') void setFieldValue('radiusValidation', false);
  }, [values.workArrangement, setFieldValue]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label>
          Work arrangement<em>*</em>
        </Label>
        <Segmented<WorkArrangementChoice>
          value={values.workArrangement}
          onChange={(next) => void setFieldValue('workArrangement', next)}
          options={[
            { value: 'WFO', label: 'Work from office' },
            { value: 'WFH', label: 'Work from home' },
          ]}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ToggleField
          name="radiusValidation"
          label="Check location radius on tap"
          hint={values.workArrangement === 'WFH' ? 'Never checked for work from home.' : 'On by default for work from office.'}
          disabled={values.workArrangement === 'WFH'}
        />
        <ToggleField name="isSelfie" label="Require a selfie on tap" hint="Hidden on the Punch screen when off." />
      </div>
    </div>
  );
}

/**
 * NJ-MATERIALIZE (TSD-EMPLOYEE §7.4.4; CATATAN T8/T59, FRT T1) — kontrak sudah
 * ditandatangani. Username dan Company Email wajib; pola kerja + flag absen ikut
 * menjadi profil Punch. Idempotency-Key mencegah karyawan ganda.
 */
export function MaterializeModal({ candidate, onClose }: { candidate: Candidate | null; onClose: () => void }) {
  const materialize = useMaterializeCandidate();
  if (!candidate) return null;
  const s = suggestion(candidate);

  return (
    <Formik<Values>
      initialValues={{
        joinDate: candidate.intendedJoinDate,
        jobGradeId: '',
        contractFileName: '',
        nik: s.nik,
        username: s.username,
        companyEmail: s.companyEmail,
        workArrangement: 'WFO',
        radiusValidation: true,
        isSelfie: true,
      }}
      validationSchema={materializeSchema}
      onSubmit={(values) => materialize.mutate({ payload: { id: candidate.id, ...values }, name: candidate.name }, { onSuccess: onClose })}
    >
      {({ submitForm }) => (
        <Modal
          open
          onOpenChange={(open) => !open && onClose()}
          size="wide"
          title="Materialise — contract signed"
          description="Creates the employee (status WAITING) and their login. Suggested values can be changed."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={materialize.isPending}>
                {materialize.isPending ? 'Processing…' : 'Materialise employee'}
              </Button>
            </>
          }
        >
          <Form className="flex max-h-[64vh] flex-col gap-4 overflow-y-auto pr-1">
            <KeyValueList>
              <KeyValueRow label="Candidate">{candidate.name}</KeyValueRow>
              <KeyValueRow label="Position">{labelOf(POSITION_OPTIONS, candidate.positionId)}</KeyValueRow>
              <KeyValueRow label="Seat held until">{candidate.seatExpiry ? formatDate(candidate.seatExpiry) : '—'}</KeyValueRow>
            </KeyValueList>

            <div className="grid gap-4 md:grid-cols-2">
              <DateField name="joinDate" label="Join date" required placeholder="Select date" />
              <SelectField name="jobGradeId" label="Grade (class)" required placeholder="Select grade" options={JOB_GRADE_OPTIONS} />
              <TextField name="nik" label="NIK" required hint="Next number in sequence; a duplicate only warns." />
              <TextField name="username" label="Username" required hint="Suggested from the candidate email." />
              <TextField
                name="companyEmail"
                label="Company email"
                required
                containerClassName="md:col-span-2"
                hint="Becomes a sign-in identity only after the employee confirms it from the link."
              />
              <DocumentField name="contractFileName" label="Signed contract" required accept=".pdf" />
            </div>

            <ArrangementFields />

            <Note icon={<ShieldCheck />}>
              Sent with an <strong>Idempotency-Key</strong>, so a repeated submit never creates a duplicate employee.
            </Note>
          </Form>
        </Modal>
      )}
    </Formik>
  );
}
