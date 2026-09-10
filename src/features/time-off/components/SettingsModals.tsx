import { useEffect, useState } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TextField } from '@/components/form/TextField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { DateField } from '@/components/form/DateField';
import { CheckboxField } from '@/components/form/CheckboxField';
import { Note } from '@/features/time-off/components/TimeOffBits';
import {
  useCreateAccrualPolicy,
  useEndAccrualPolicy,
  useSaveBlackout,
  useSaveLeaveType,
} from '@/features/time-off/hooks/useSettings';
import { EMPLOYMENT_TYPES } from '@/features/time-off/mock-data';
import { BLACKOUT_MODE_LABEL, CARRY_OVER_LABEL } from '@/features/time-off/types';
import type {
  AccrualPolicy,
  AccrualPolicyDraft,
  Blackout,
  BlackoutDraft,
  CarryOverPolicy,
  LeaveType,
  LeaveTypeDraft,
} from '@/features/time-off/types';

const EMPTY_TYPE: LeaveTypeDraft = {
  code: '',
  name: '',
  isPaid: true,
  affectsBalance: true,
  requiresDocument: false,
  requiresApproval: true,
  allowsExtraApproval: false,
  isActive: true,
  minAdvanceDays: 0,
};

/** D1 — katalog jenis cuti. Baris statutory punya field yang terkunci. */
export function LeaveTypeModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: LeaveType | null;
  onClose: () => void;
}) {
  const save = useSaveLeaveType();
  const statutory = Boolean(editing?.isStatutory);

  const initial: LeaveTypeDraft = editing
    ? {
        code: editing.code,
        name: editing.name,
        isPaid: editing.isPaid,
        affectsBalance: editing.affectsBalance,
        requiresDocument: editing.requiresDocument,
        requiresApproval: editing.requiresApproval,
        allowsExtraApproval: Boolean(editing.allowsExtraApproval),
        isActive: editing.isActive,
        minAdvanceDays: editing.minAdvanceDays,
      }
    : EMPTY_TYPE;

  return (
    <Formik<LeaveTypeDraft>
      initialValues={initial}
      enableReinitialize
      onSubmit={(values, helpers) =>
        save.mutate(
          { draft: { ...values, code: values.code.toUpperCase() }, id: editing?.id },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
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
            title={editing ? `Edit leave type — ${editing.code}` : 'New leave type'}
            description="Jenis yang tersimpan langsung bisa dipilih di form pengajuan, selama flag Active-nya menyala."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={save.isPending}>
                  {save.isPending ? 'Menyimpan…' : 'Save leave type'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              {statutory && (
                <Note tone="warn" icon={<ShieldCheck />}>
                  Ini jenis cuti <strong>statutory</strong> yang disemai sistem untuk memenuhi undang-undang
                  ketenagakerjaan. Status statutory dan kodenya tidak bisa diubah di sini, dan barisnya tidak bisa
                  dihapus — pensiunkan dari pemakaian baru lewat flag Active. Flag lain dan tenggang pengajuan tetap
                  bisa diubah.
                </Note>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  name="code"
                  label="Leave code"
                  required
                  disabled={statutory}
                  maxLength={30}
                  placeholder="mis. CUTI-TAHUNAN"
                  className="uppercase"
                  hint="2–30 karakter huruf kapital, angka, dan tanda hubung. Unik di antara baris aktif."
                />
                <TextField name="name" label="Leave name" required maxLength={150} />
              </div>

              <fieldset className="flex flex-col gap-2 border-none p-0">
                <legend className="mb-1 select-none font-body text-base font-bold leading-[1.2] text-fg-2">
                  Flags <em className="ml-0.5 not-italic text-error-500">*</em>
                </legend>
                <div className="grid gap-2.5 md:grid-cols-2">
                  <CheckboxField name="isPaid">Paid</CheckboxField>
                  <CheckboxField name="affectsBalance">Deducts balance</CheckboxField>
                  <CheckboxField name="requiresDocument">Document required</CheckboxField>
                  <CheckboxField name="requiresApproval">Maker–checker (tidak dicentang = auto-approve)</CheckboxField>
                  <CheckboxField name="allowsExtraApproval">Bisa menaikkan lapis persetujuan tambahan</CheckboxField>
                  <CheckboxField name="isActive">Active</CheckboxField>
                </div>
                <span className="font-body text-xs font-normal leading-[1.4] text-fg-3">
                  Enam flag yang berdiri sendiri. Kombinasi tidak dibayar + memotong saldo ditolak.
                </span>
              </fieldset>

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  name="minAdvanceDays"
                  type="number"
                  min={0}
                  step={1}
                  label="Minimum advance days"
                  required
                  hint="Bilangan bulat ≥ 0 — tenggang minimum sebelum tanggal mulai."
                />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="statutory-flag">Statutory</Label>
                  <Input id="statutory-flag" readOnly tabIndex={-1} value={statutory ? 'Yes' : 'No'} />
                  <span className="font-body text-xs font-normal leading-[1.4] text-fg-3">
                    Read-only. Hanya lahir dari penyemaian sistem dan tidak pernah bisa diubah sesudahnya.
                  </span>
                </div>
              </div>
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

const EMPTY_POLICY: AccrualPolicyDraft = {
  leaveTypeId: '',
  employmentType: EMPLOYMENT_TYPES[0],
  isEligible: false,
  ratePerMonth: null,
  maxBalanceDays: null,
  carryOverPolicy: 'FORFEIT',
  carryOverMaxDays: null,
  carryOverExpiry: null,
  effectiveFrom: '',
};

/** Field yang hidup-matinya bergantung entitled dan mode carry-over. */
function PolicyConditionalFields() {
  const { values } = useFormikContext<AccrualPolicyDraft>();
  const capped = values.carryOverPolicy === 'CARRY_CAPPED';

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          name="ratePerMonth"
          type="number"
          step="0.25"
          min={0}
          label="Rate per month"
          required={values.isEligible}
          disabled={!values.isEligible}
          placeholder="mis. 1.00"
          hint="Wajib saat entitled, harus kosong saat tidak."
        />
        <TextField
          name="maxBalanceDays"
          type="number"
          step={1}
          min={1}
          label="Balance cap"
          placeholder="Kosongkan bila tanpa plafon"
        />
      </div>

      <SelectField
        name="carryOverPolicy"
        label="Carry-over policy"
        required
        options={(Object.keys(CARRY_OVER_LABEL) as CarryOverPolicy[]).map((value) => ({
          value,
          label: CARRY_OVER_LABEL[value],
        }))}
      />

      {capped && (
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="carryOverMaxDays" type="number" step={1} min={1} label="Maximum days carried" required />
          <TextField
            name="carryOverExpiry"
            label="Carry-over expiry"
            required
            maxLength={5}
            placeholder="MM-DD, mis. 03-31"
            hint="Bulan dan tanggal saja — tenggat hari gulirannya hangus."
          />
        </div>
      )}
    </>
  );
}

/** D3 — kebijakan akrual. Satu kebijakan hidup per jenis cuti × jenis kepegawaian. */
export function AccrualPolicyModal({
  open,
  leaveTypes,
  onClose,
}: {
  open: boolean;
  leaveTypes: LeaveType[];
  onClose: () => void;
}) {
  const create = useCreateAccrualPolicy();

  return (
    <Formik<AccrualPolicyDraft>
      initialValues={EMPTY_POLICY}
      onSubmit={(values, helpers) =>
        create.mutate(
          {
            ...values,
            // Angka kosong dikirim sebagai null, bukan 0 — kontraknya membedakan.
            ratePerMonth: values.isEligible ? Number(values.ratePerMonth ?? 0) : null,
            maxBalanceDays: values.maxBalanceDays ? Number(values.maxBalanceDays) : null,
            carryOverMaxDays:
              values.carryOverPolicy === 'CARRY_CAPPED' && values.carryOverMaxDays
                ? Number(values.carryOverMaxDays)
                : null,
            carryOverExpiry: values.carryOverPolicy === 'CARRY_CAPPED' ? values.carryOverExpiry : null,
          },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
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
            title="New accrual policy"
            description="Satu kebijakan hidup per jenis cuti × jenis kepegawaian — rentang tanggal yang bertindih pada pasangan yang sama ditolak."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={create.isPending}>
                  {create.isPending ? 'Menyimpan…' : 'Save policy'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="leaveTypeId"
                  label="Leave type"
                  required
                  placeholder="Pilih jenis cuti"
                  options={leaveTypes
                    .filter((row) => row.affectsBalance)
                    .map((row) => ({ value: row.id, label: row.name }))}
                  hint="Hanya jenis yang memotong saldo yang muncul — jenis tanpa hak tidak butuh kebijakan."
                />
                <SelectField
                  name="employmentType"
                  label="Employment type"
                  required
                  options={EMPLOYMENT_TYPES.map((value) => ({ value, label: value }))}
                  hint="Katalognya milik personnel service; tenant ini baru mengekspos satu nilai."
                />
              </div>

              <CheckboxField name="isEligible">
                Berhak atas akrual — mati secara bawaan; kelompok karyawan baru harus dinyalakan secara sadar.
              </CheckboxField>

              <PolicyConditionalFields />

              <DateField name="effectiveFrom" label="Effective from" required containerClassName="md:max-w-[50%]" />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

/** Menghentikan kebijakan — satu-satunya jalur sah, lewat tanggal akhir. */
export function EndPolicyModal({
  policy,
  onClose,
}: {
  policy: AccrualPolicy | null;
  onClose: () => void;
}) {
  const [until, setUntil] = useState('');
  const end = useEndAccrualPolicy();

  useEffect(() => {
    if (policy) setUntil('');
  }, [policy]);

  if (!policy) return null;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title="End this accrual policy"
      description="Mengisi tanggal akhir adalah satu-satunya cara sah menghentikan kebijakan — mengubah rate atau cap pada baris yang sedang berjalan bukan."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!until || end.isPending}
            onClick={() => end.mutate({ id: policy.id, effectiveUntil: until }, { onSuccess: onClose })}
          >
            {end.isPending ? 'Memproses…' : 'End policy'}
          </Button>
        </>
      }
    >
      <Formik initialValues={{ effectiveUntil: '' }} onSubmit={() => undefined}>
        <Form className="flex flex-col gap-4">
          <DateField
            name="effectiveUntil"
            label="Effective until"
            required
            min={policy.effectiveFrom}
            hint="Tidak boleh mendahului tanggal mulai kebijakan."
          />
          {/* Formik di sini hanya untuk memakai DateField; nilainya disalin ke state modal. */}
          <PolicyEndSync onChange={setUntil} />
        </Form>
      </Formik>
    </Modal>
  );
}

function PolicyEndSync({ onChange }: { onChange: (value: string) => void }) {
  const { values } = useFormikContext<{ effectiveUntil: string }>();

  useEffect(() => {
    onChange(values.effectiveUntil);
  }, [values.effectiveUntil, onChange]);

  return null;
}

const EMPTY_BLACKOUT: BlackoutDraft = {
  name: '',
  reason: '',
  startDate: '',
  endDate: '',
  mode: 'HARD',
  scopeRef: null,
};

/** D5 — periode blackout. Namanya yang dibaca karyawan sebagai alasan. */
export function BlackoutModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Blackout | null;
  onClose: () => void;
}) {
  const save = useSaveBlackout();

  const initial: BlackoutDraft = editing
    ? {
        name: editing.name,
        reason: editing.reason,
        startDate: editing.startDate,
        endDate: editing.endDate,
        mode: editing.mode,
        scopeRef: null,
      }
    : EMPTY_BLACKOUT;

  return (
    <Formik<BlackoutDraft>
      initialValues={initial}
      enableReinitialize
      onSubmit={(values, helpers) =>
        save.mutate(
          { draft: values, id: editing?.id },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
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
            title={editing ? `Edit blackout — ${editing.name}` : 'New blackout period'}
            description="Nama periode inilah yang dibaca karyawan sebagai alasan pengajuannya ditahan atau ditolak — tulis kalimat, bukan label."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={save.isPending}>
                  {save.isPending ? 'Menyimpan…' : 'Save blackout period'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <TextField name="name" label="Period name" required maxLength={150} />

              <TextAreaField
                name="reason"
                label="Reason"
                rows={2}
                maxLength={300}
                hint="Opsional; 5–300 karakter bila diisi."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <DateField name="startDate" label="Start date" required />
                <DateField
                  name="endDate"
                  label="End date"
                  required
                  hint="Wajib — periode tanpa ujung sama saja dengan larangan permanen."
                />
              </div>

              <SelectField
                name="mode"
                label="Mode"
                required
                options={(['HARD', 'SOFT'] as const).map((value) => ({
                  value,
                  label: BLACKOUT_MODE_LABEL[value],
                }))}
              />

              <Note icon={<ShieldCheck />}>
                Jenis cuti <strong>statutory</strong> kebal terhadap kedua mode blackout — keduanya tidak pernah
                menahan cuti yang dijamin undang-undang.
              </Note>
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
