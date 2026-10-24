import { useRef, useState } from 'react';
import { Form, Formik, useField } from 'formik';
import { TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DateField } from '@/components/form/DateField';
import { SelectField } from '@/components/form/SelectField';
import { NewEmployeeFields } from '@/features/new-joiner/components/NewEmployeeFields';
import { emptyNewEmployee, suggestUsername } from '@/features/new-joiner/newEmployee';
import { BRANCHES } from '@/features/employees/types';
import { KeyValueList, KeyValueRow, Note } from '@/features/new-joiner/components/CandidateBits';
import { useMaterializeCandidate, useSuggestedNik } from '@/features/new-joiner/hooks/useNewJoiner';
import { materializeSchema } from '@/features/new-joiner/validation';
import { JOB_GRADE_OPTIONS, POSITIONS, POSITION_OPTIONS, labelOf } from '@/features/new-joiner/types';
import type { Candidate } from '@/features/new-joiner/types';
import { formatDate } from '@/lib/format';

/**
 * Pemilih berkas kontrak — port `.file-ctl`: tombol "Choose File" + nama berkas.
 * Yang disimpan di form hanya namanya; berkas asli diunggah lewat Document
 * Service saat backend tersedia.
 */
function ContractFileField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [field, meta, helpers] = useField<string>('contractFileName');
  const error = meta.touched && meta.error ? meta.error : undefined;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="contract-file">
        Signed Contract<em>*</em>
      </Label>
      <div className="flex h-9 items-center gap-3 rounded-md border border-silver bg-white pr-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-full rounded-l-md bg-vapor px-3 font-body text-[13px] font-bold text-secondary-700 transition-colors duration-200 ease-standard hover:bg-mist"
        >
          Choose File
        </button>
        <span className="min-w-0 flex-1 truncate font-body text-[13px] font-medium text-fg-3">
          {field.value || 'No file chosen'}
        </span>
      </div>
      <input
        id="contract-file"
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(event) => {
          void helpers.setTouched(true, false);
          void helpers.setValue(event.target.files?.[0]?.name ?? '');
        }}
      />
      {error && <span className="font-body text-xs font-medium text-error-600">{error}</span>}
    </div>
  );
}

/**
 * NJ-MATERIALIZE (FSD-001-EMPLOYEE 0.83 §4.1) — kontrak sudah ditandatangani. Membuat identitas global
 * dan menulis work data; kandidat menjadi karyawan WAITING. Branch hanya-baca dari kursi (KCG-2); NIK,
 * Username, Company Email wajib; Role, Employment Type, Bank opsional.
 */
export function MaterializeModal({ candidate, onClose }: { candidate: Candidate | null; onClose: () => void }) {
  const materialize = useMaterializeCandidate();
  const { data: suggestedNik = '' } = useSuggestedNik(Boolean(candidate));
  const [done, setDone] = useState<{ name: string; nik: string; nikAlsoUsed: boolean } | null>(null);
  const seat = POSITIONS.find((item) => item.value === candidate?.positionId);
  const branch = BRANCHES.find((item) => item.id === seat?.branchId)?.name ?? '—';

  if (done) {
    const finish = () => {
      setDone(null);
      onClose();
    };
    return (
      <Modal open onOpenChange={(next) => !next && finish()} title="Employee created" footer={<Button onClick={finish}>Done</Button>}>
        <div className="flex flex-col gap-3">
          <p className="m-0 font-body text-[13px] leading-[1.5] text-fg-2">
            {done.name} is now an employee with status Waiting and an Onboarding transition. The username and
            company email are sent to the candidate's personal email.
          </p>
          {done.nikAlsoUsed && (
            <Note tone="warn" icon={<TriangleAlert />}>
              NIK {done.nik} is also used by another employee. Check that this is intended.
            </Note>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Formik
      initialValues={{
        // FSD §4.1: join_date = kenyataan; intended_join_date bukan default.
        joinDate: '',
        jobGradeId: '',
        contractFileName: '',
        ...emptyNewEmployee({ nik: suggestedNik, username: candidate ? suggestUsername(candidate.email) : '' }),
      }}
      validationSchema={materializeSchema}
      enableReinitialize
      onSubmit={(values) => {
        if (!candidate) return;
        materialize.mutate(
          { id: candidate.id, ...values },
          { onSuccess: (result) => setDone({ name: candidate.name, nik: values.nik.trim(), nikAlsoUsed: result.nikAlsoUsed }) },
        );
      }}
    >
      {({ submitForm, values }) => (
        <Modal
          open={Boolean(candidate)}
          onOpenChange={(open) => !open && onClose()}
          size="wide"
          title="Materialize Candidate"
          description="The contract is signed. This creates the employee with status Waiting."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={submitForm}
                // L3: nonaktif sampai Tanggal join, Class, dan Kontrak ketiganya terisi.
                disabled={materialize.isPending || !values.joinDate || !values.jobGradeId || !values.contractFileName}
              >
                {materialize.isPending ? 'Creating…' : 'Materialize'}
              </Button>
            </>
          }
        >
          {candidate && (
            <Form className="flex flex-col gap-5">
              <KeyValueList>
                <KeyValueRow label="Candidate">{candidate.name}</KeyValueRow>
                <KeyValueRow label="Position">{labelOf(POSITION_OPTIONS, candidate.positionId)}</KeyValueRow>
                <KeyValueRow label="Branch">{branch}</KeyValueRow>
                <KeyValueRow label="Seat held until">
                  {candidate.seatExpiry ? formatDate(candidate.seatExpiry) : '—'}
                </KeyValueRow>
              </KeyValueList>

              <div className="grid gap-4 md:grid-cols-2">
                <DateField name="joinDate" label="Start Date" required placeholder="Select a date" />
                <SelectField
                  name="jobGradeId"
                  label="Class"
                  required
                  placeholder="Select a class"
                  options={JOB_GRADE_OPTIONS}
                  hint="The branch follows the seat and cannot be changed here."
                />
                <ContractFileField />
              </div>

              <NewEmployeeFields />
            </Form>
          )}
        </Modal>
      )}
    </Formik>
  );
}
