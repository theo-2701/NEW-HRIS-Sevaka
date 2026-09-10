import { useMemo } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import { Info, Lock } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { CheckboxField } from '@/components/form/CheckboxField';
import { GatePreview, Note } from '@/features/time-off/components/TimeOffBits';
import { useLeaveRequests, useLeaveTypes, useSubmitRequest } from '@/features/time-off/hooks/useTimeOff';
import { evaluateGates } from '@/features/time-off/gates';
import { employeeName, leaveTypeOf } from '@/features/time-off/mock-data';
import { DEMO_NOW, SESSION_LABEL } from '@/features/time-off/types';
import type { LeaveRequest, RequestDraft, Session } from '@/features/time-off/types';

const EMPTY: RequestDraft = {
  leaveTypeId: '',
  daySession: 'FULL',
  startDate: '',
  endDate: '',
  reason: '',
  hasDoctorNote: false,
};

const SESSION_OPTIONS = (Object.keys(SESSION_LABEL) as (keyof typeof SESSION_LABEL)[]).map((value) => ({
  value,
  label: SESSION_LABEL[value],
}));

/**
 * Bagian dinamis form: pratinjau gerbang submit, dan checkbox surat dokter yang
 * hanya muncul untuk jenis cuti yang mensyaratkannya.
 */
function DynamicSection({
  session,
  existing,
  editingId,
}: {
  session: Session;
  existing: LeaveRequest[];
  editingId?: string;
}) {
  const { values } = useFormikContext<RequestDraft>();
  const type = leaveTypeOf(values.leaveTypeId);

  const gate = useMemo(
    () =>
      evaluateGates({
        employeeId: session.employeeId,
        leaveTypeId: values.leaveTypeId,
        startDate: values.startDate,
        endDate: values.endDate,
        daySession: values.daySession,
        existing,
        selfId: editingId,
        now: DEMO_NOW,
      }),
    [session.employeeId, values, existing, editingId],
  );

  return (
    <>
      {type?.requiresDocument && (
        <>
          <CheckboxField name="hasDoctorNote">
            Surat dokter tersedia untuk pengajuan ini (disyaratkan jenis cuti ini).
          </CheckboxField>
          <Note icon={<Info />}>
            Mekanisme unggah berkas masih tertunda di seluruh HRIS — form ini baru merekam
            <strong> ketersediaan</strong> suratnya, belum berkasnya.
          </Note>
        </>
      )}

      {values.leaveTypeId && values.startDate && values.endDate && (
        <GatePreview totalDays={gate.totalDays} errors={gate.errors} extra={gate.extra} />
      )}
    </>
  );
}

/**
 * Form pengajuan cuti. Pemohon selalu diri sendiri: field "Requester" hanya
 * baca dan nilainya datang dari sesi, bukan dari isian.
 */
export function RequestFormModal({
  open,
  session,
  editing,
  onClose,
}: {
  open: boolean;
  session: Session;
  editing: LeaveRequest | null;
  onClose: () => void;
}) {
  const { data: leaveTypes = [] } = useLeaveTypes();
  const { data: existing = [] } = useLeaveRequests(session);
  const submit = useSubmitRequest(session);

  const typeOptions = leaveTypes
    .filter((row) => row.isActive)
    .map((row) => ({ value: row.id, label: row.name }));

  const initial: RequestDraft = editing
    ? {
        leaveTypeId: editing.leaveTypeId,
        daySession: editing.daySession,
        startDate: editing.startDate,
        endDate: editing.endDate,
        reason: editing.reason,
        hasDoctorNote: editing.hasDoctorNote,
      }
    : EMPTY;

  return (
    <Formik<RequestDraft>
      initialValues={initial}
      enableReinitialize
      onSubmit={(values, helpers) =>
        submit.mutate(
          { draft: values, editingId: editing?.id },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ values, submitForm, resetForm }) => {
        const type = leaveTypeOf(values.leaveTypeId);
        const close = () => {
          resetForm();
          onClose();
        };

        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title={editing ? `Ubah pengajuan — ${editing.id}` : 'New time off request'}
            description="Diajukan untuk diri sendiri saja — karyawannya diambil dari sesi, tidak pernah dari form."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={submit.isPending}>
                  {submit.isPending ? 'Mengirim…' : editing ? 'Simpan perubahan' : 'Submit request'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="leaveTypeId"
                  label="Jenis cuti"
                  required
                  placeholder="Pilih jenis cuti"
                  options={typeOptions}
                  hint="Hanya jenis yang aktif yang muncul di sini."
                />
                <SelectField
                  name="daySession"
                  label="Sesi hari"
                  required
                  options={SESSION_OPTIONS}
                  hint="Setengah hari hanya sah bila tanggal mulai dan selesai sama."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextField name="startDate" type="date" label="Tanggal mulai" required />
                <TextField name="endDate" type="date" label="Tanggal selesai" required />
              </div>

              <div className="flex max-w-[50%] flex-col gap-1">
                <Label htmlFor="requester">
                  Pemohon
                  <span className="ml-1.5 inline-flex items-center gap-1 align-middle font-body text-[10px] font-bold uppercase tracking-[0.05em] text-fg-4 [&_svg]:size-3">
                    <Lock />
                    terkunci
                  </span>
                </Label>
                <Input id="requester" readOnly tabIndex={-1} value={employeeName(session.employeeId)} />
                <span className="font-body text-xs font-normal leading-[1.4] text-fg-3">
                  Diambil dari token sesi — cuti tidak pernah bisa diajukan atas nama orang lain.
                </span>
              </div>

              <TextAreaField
                name="reason"
                label="Alasan"
                required={!type || type.requiresApproval}
                rows={3}
                maxLength={500}
                placeholder="Tulis alasannya di sini"
                hint="Wajib untuk semua jenis kecuali cuti sakit. Setelah disetujui, teks ini mengalir ke ledger saldo sebagai alasan mutasi."
              />

              <DynamicSection session={session} existing={existing} editingId={editing?.id} />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
