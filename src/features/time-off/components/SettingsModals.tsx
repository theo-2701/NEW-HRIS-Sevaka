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
import { DateRangeField } from '@/components/form/DateRangeField';
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
            description="A saved type can be picked in the request form right away, as long as its Active flag is on."
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
                  This is a <strong>statutory</strong> leave type seeded by the system to meet labour law. Its statutory status and code cannot be changed here, and the row cannot be deleted — retire it from new use with the Active flag. Other flags and the notice period can still be changed.
                </Note>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  name="code"
                  label="Leave code"
                  required
                  disabled={statutory}
                  maxLength={30}
                  placeholder="e.g. CUTI-TAHUNAN"
                  className="uppercase"
                  hint="2–30 characters: capital letters, digits and hyphens. Unique among active rows."
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
                  <CheckboxField name="requiresApproval">Maker–checker (unchecked = auto-approve)</CheckboxField>
                  <CheckboxField name="allowsExtraApproval">Can raise an extra approval layer</CheckboxField>
                  <CheckboxField name="isActive">Active</CheckboxField>
                </div>
                <span className="font-body text-xs font-normal leading-[1.4] text-fg-3">
                  Six independent flags. Unpaid + deducts balance together is rejected.
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
                  hint="Whole number ≥ 0 — minimum notice before the start date."
                />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="statutory-flag">Statutory</Label>
                  <Input id="statutory-flag" readOnly tabIndex={-1} value={statutory ? 'Yes' : 'No'} />
                  <span className="font-body text-xs font-normal leading-[1.4] text-fg-3">
                    Read-only. Only set by system seeding and can never be changed afterwards.
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
  const { values, setFieldValue } = useFormikContext<AccrualPolicyDraft>();
  const capped = values.carryOverPolicy === 'CARRY_CAPPED';

  // FSD-TIME 0.13 #30/#31: field tersembunyi DIKOSONGKAN seketika bendera berganti.
  useEffect(() => {
    if (!values.isEligible && values.ratePerMonth !== null) void setFieldValue('ratePerMonth', null);
  }, [values.isEligible, values.ratePerMonth, setFieldValue]);
  useEffect(() => {
    if (capped) return;
    if (values.carryOverMaxDays !== null) void setFieldValue('carryOverMaxDays', null);
    if (values.carryOverExpiry !== null) void setFieldValue('carryOverExpiry', null);
  }, [capped, values.carryOverMaxDays, values.carryOverExpiry, setFieldValue]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {values.isEligible && (
          <TextField
            name="ratePerMonth"
            type="number"
            step="0.25"
            min={0}
            label="Rate per month"
            required
            placeholder="mis. 1.00"
            hint="Required when entitled."
          />
        )}
        <TextField
          name="maxBalanceDays"
          type="number"
          step={1}
          min={1}
          label="Balance cap"
          placeholder="Leave empty for no cap"
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
            hint="Month and day only — on this date the carried-over days expire."
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
            description="One live policy per leave type × employment type — overlapping date ranges for the same pair are rejected."
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
                  placeholder="Select leave type"
                  options={leaveTypes
                    .filter((row) => row.affectsBalance)
                    .map((row) => ({ value: row.id, label: row.name }))}
                  hint="Only types that deduct balance appear — types without entitlement need no policy."
                />
                <SelectField
                  name="employmentType"
                  label="Employment type"
                  required
                  options={EMPLOYMENT_TYPES.map((value) => ({ value, label: value }))}
                  hint="The catalogue belongs to the personnel service; this tenant exposes one value so far."
                />
              </div>

              <CheckboxField name="isEligible">
                Entitled to accrual — off by default; a new employee group must be switched on deliberately.
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
      description="Setting an end date is the only valid way to stop a policy — changing the rate or cap on a running row is not."
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
            hint="Can't be earlier than the policy start date."
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
            description="Employees read this period name as the reason their request is held or rejected — write a sentence, not a label."
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
                hint="Optional; 5–300 characters if filled."
              />

              <DateRangeField
                fromName="startDate"
                toName="endDate"
                label="Period"
                required
                hint="End date is required — a period without an end is a permanent ban."
              />

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
                <strong>Statutory</strong> leave types are immune to both blackout modes — neither ever holds leave guaranteed by law.
              </Note>
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
