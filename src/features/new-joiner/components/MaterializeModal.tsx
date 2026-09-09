import { useRef } from 'react';
import { Form, Formik, useField } from 'formik';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TextField } from '@/components/form/TextField';
import { SelectField } from '@/components/form/SelectField';
import { KeyValueList, KeyValueRow, Note } from '@/features/new-joiner/components/CandidateBits';
import { useMaterializeCandidate } from '@/features/new-joiner/hooks/useNewJoiner';
import { materializeSchema } from '@/features/new-joiner/validation';
import { JOB_GRADE_OPTIONS, POSITION_OPTIONS, labelOf } from '@/features/new-joiner/types';
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
        Kontrak yang ditandatangani<em>*</em>
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
          {field.value || 'Belum ada berkas dipilih'}
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
 * NJ-MATERIALIZE (FSD §4.3) — kontrak sudah ditandatangani. Membuat identitas
 * global dan menulis work data; kandidat menjadi karyawan berstatus WAITING.
 * Request membawa Idempotency-Key supaya submit yang diulang tidak menggandakan.
 */
export function MaterializeModal({ candidate, onClose }: { candidate: Candidate | null; onClose: () => void }) {
  const materialize = useMaterializeCandidate();

  return (
    <Formik
      initialValues={{
        joinDate: candidate?.intendedJoinDate ?? '',
        jobGradeId: '',
        contractFileName: '',
      }}
      validationSchema={materializeSchema}
      enableReinitialize
      onSubmit={(values) => {
        if (!candidate) return;
        materialize.mutate(
          { payload: { id: candidate.id, ...values }, name: candidate.name },
          { onSuccess: onClose },
        );
      }}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(candidate)}
          onOpenChange={(open) => !open && onClose()}
          size="wide"
          title="Materialise — contract signed"
          description="Membuat identitas global dan menulis work data. Kandidat menjadi karyawan berstatus WAITING."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={materialize.isPending}>
                {materialize.isPending ? 'Memproses…' : 'Materialise employee'}
              </Button>
            </>
          }
        >
          {candidate && (
            <Form className="flex flex-col gap-4">
              <KeyValueList>
                <KeyValueRow label="Kandidat">{candidate.name}</KeyValueRow>
                <KeyValueRow label="Posisi">{labelOf(POSITION_OPTIONS, candidate.positionId)}</KeyValueRow>
                <KeyValueRow label="Kursi ditahan sampai">
                  {candidate.seatExpiry ? formatDate(candidate.seatExpiry) : '—'}
                </KeyValueRow>
              </KeyValueList>

              <div className="grid gap-4 md:grid-cols-2">
                <TextField name="joinDate" type="date" label="Tanggal masuk" required />
                <SelectField
                  name="jobGradeId"
                  label="Job grade"
                  required
                  placeholder="Pilih job grade"
                  options={JOB_GRADE_OPTIONS}
                  hint="Baris tingkat kelas saja — ditulis ke emp_work_detail.job_grade_id."
                />
                <ContractFileField />
              </div>

              <Note icon={<ShieldCheck />}>
                Request membawa <strong>Idempotency-Key</strong>, jadi submit yang terulang tidak akan membuat
                karyawan ganda.
              </Note>
            </Form>
          )}
        </Modal>
      )}
    </Formik>
  );
}
