import { useEffect, useRef, useState } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import {
  KeyValueList,
  KeyValueRow,
  Note,
  RequisitionStatusBadge,
} from '@/features/manpower/components/ManpowerBits';
import {
  useApproveRequisition,
  useCreateRequisition,
  useRejectRequisition,
} from '@/features/manpower/hooks/useManpower';
import { requisitionSchema } from '@/features/manpower/validation';
import {
  CURRENT_USER,
  UNIT_OPTIONS,
  labelOf,
  openPositions,
  positionTitle,
  requestorOptions,
  supervisorOptions,
} from '@/features/manpower/types';
import type { ManpowerPlan, Requisition, RequisitionDraft } from '@/features/manpower/types';

const EMPTY: RequisitionDraft = {
  planId: '',
  unitId: '',
  parentPositionId: '',
  requestorId: '',
  positionIds: [],
  reason: '',
};

type ParentChange = { field: 'unitId' | 'parentPositionId'; value: string };

/**
 * Kaskade T2 (CATATAN 18 Okt 2026): Organization Unit → { Supervisor Position, Requestor }
 * → checklist Positions to Open (posisi KOSONG bawahan langsung supervisor). Mengganti
 * induk mengosongkan anaknya dalam satu `setValues`; bila anaknya sudah berisi, minta
 * konfirmasi dulu (nilai lama tetap utuh bila dibatalkan).
 */
function CascadeFields() {
  const { values, setValues, setFieldValue, errors, submitCount } = useFormikContext<RequisitionDraft>();
  const [pending, setPending] = useState<ParentChange | null>(null);

  const apply = ({ field, value }: ParentChange) =>
    void setValues(
      field === 'unitId'
        ? { ...values, unitId: value, parentPositionId: '', requestorId: '', positionIds: [] }
        : { ...values, parentPositionId: value, positionIds: [] },
    );

  const change = (field: ParentChange['field']) => (value: string) => {
    if (value === values[field]) return false;
    const filled =
      field === 'unitId'
        ? Boolean(values.parentPositionId || values.requestorId || values.positionIds.length)
        : values.positionIds.length > 0;
    if (filled) setPending({ field, value });
    else apply({ field, value });
    return false;
  };

  const vacant = values.parentPositionId ? openPositions(values.parentPositionId) : [];
  const toggle = (id: string, next: boolean) =>
    void setFieldValue(
      'positionIds',
      next ? [...values.positionIds, id] : values.positionIds.filter((item) => item !== id),
    );
  const positionError = submitCount > 0 && typeof errors.positionIds === 'string' ? errors.positionIds : undefined;

  return (
    <>
      <SelectField
        name="unitId"
        label="Organization Unit"
        required
        placeholder="Select organization unit"
        options={UNIT_OPTIONS}
        onValueChange={change('unitId')}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          name="parentPositionId"
          label="Supervisor Position"
          required
          disabled={!values.unitId}
          placeholder={values.unitId ? 'Select supervisor position' : 'Select a unit first'}
          options={supervisorOptions(values.unitId)}
          onValueChange={change('parentPositionId')}
        />
        <SelectField
          name="requestorId"
          label="Requestor"
          required
          disabled={!values.unitId}
          placeholder={values.unitId ? 'Select requestor' : 'Select a unit first'}
          options={requestorOptions(values.unitId)}
        />
      </div>

      <fieldset className="flex flex-col gap-1.5" aria-describedby={positionError ? 'positionIds-desc' : undefined}>
        <legend className="mb-1.5 font-body text-base font-bold text-fg-1">
          Positions to Open<em className="text-error-500">*</em>
        </legend>
        {!values.parentPositionId ? (
          <span className="font-body text-xs font-medium text-fg-3">Select a supervisor position first.</span>
        ) : vacant.length === 0 ? (
          <span className="font-body text-xs font-medium text-fg-3">
            No vacant position reports directly to this supervisor.
          </span>
        ) : (
          <div className="flex max-h-[180px] flex-col gap-2 overflow-y-auto rounded-md border border-border-1 bg-cloud p-3">
            {vacant.map((row) => (
              <label key={row.id} className="flex cursor-pointer items-center gap-3">
                <Checkbox
                  checked={values.positionIds.includes(row.id)}
                  onCheckedChange={(next) => toggle(row.id, next === true)}
                />
                <span className="font-body text-xs font-medium text-fg-2">
                  {row.title}
                  <span className="ml-1.5 text-fg-4">{row.id}</span>
                </span>
              </label>
            ))}
          </div>
        )}
        <span className="font-body text-xs font-medium text-fg-3">
          Number of positions = {values.positionIds.length} ticked.
        </span>
        {positionError && (
          <span id="positionIds-desc" role="alert" className="font-body text-xs font-medium text-error-600">
            {positionError}
          </span>
        )}
      </fieldset>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.field === 'unitId' ? 'Change organization unit?' : 'Change supervisor position?'}
        description={
          pending?.field === 'unitId'
            ? 'Supervisor position, requestor, and ticked positions will be cleared.'
            : 'Ticked positions will be cleared.'
        }
        confirmLabel="Change"
        cancelLabel="Keep current"
        tone="primary"
        onOpenChange={(next) => !next && setPending(null)}
        onConfirm={() => {
          if (pending) apply(pending);
          setPending(null);
        }}
      />
    </>
  );
}

/**
 * REQ-CREATE — draft-first. "Save draft" dan "Submit for approval" adalah dua
 * aksi berbeda; yang disubmit langsung masuk IN_APPROVAL dan diputuskan HR
 * Manager lain (SoD).
 */
export function CreateRequisitionModal({
  open,
  plans,
  onClose,
}: {
  open: boolean;
  plans: ManpowerPlan[];
  onClose: () => void;
}) {
  const create = useCreateRequisition();
  /** Aksi mana yang menekan submit — dibaca saat handler jalan. */
  const modeRef = useRef<'draft' | 'submit'>('submit');

  const planOptions = plans
    .filter((plan) => plan.status === 'ACTIVE' || plan.status === 'DRAFT')
    .map((plan) => ({ value: plan.id, label: plan.title }));

  return (
    <Formik<RequisitionDraft>
      initialValues={EMPTY}
      validationSchema={requisitionSchema}
      onSubmit={(values, helpers) =>
        create.mutate(
          { draft: values, submitNow: modeRef.current === 'submit' },
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
        const save = (mode: 'draft' | 'submit') => {
          modeRef.current = mode;
          void submitForm();
        };

        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title="New requisition"
            description="You are the maker. A different HR Manager decides it (segregation of duties)."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button variant="secondary" onClick={() => save('draft')} disabled={create.isPending}>
                  Save draft
                </Button>
                <Button onClick={() => save('submit')} disabled={create.isPending}>
                  {create.isPending ? 'Saving…' : 'Submit for approval'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <SelectField
                name="planId"
                label="Plan"
                placeholder="Ad-hoc (no plan)"
                options={planOptions}
                hint="Optional — leave empty for an ad-hoc requisition."
              />

              <CascadeFields />

              <TextAreaField
                name="reason"
                label="Justification"
                required
                rows={3}
                maxLength={150}
                placeholder="Why are these positions needed?"
                hint="At most 150 characters."
              />

              <Note icon={<ShieldCheck />}>
                Submit sets the requisition to <strong>IN APPROVAL</strong>. A different HR Manager decides it.
              </Note>
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

/** REQ-APPROVE — keputusan checker; maker tidak bisa memutuskan miliknya sendiri. */
export function ReviewRequisitionModal({
  requisition,
  onClose,
}: {
  requisition: Requisition | null;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const approve = useApproveRequisition();
  const reject = useRejectRequisition();

  useEffect(() => {
    if (requisition) setNote('');
  }, [requisition]);

  const awaiting = requisition?.status === 'IN_APPROVAL';
  /** T55: pembuat tidak melihat Approve/Reject miliknya sendiri; server tetap penegak (409). */
  const ownRequest = requisition?.maker === CURRENT_USER;
  const canDecide = awaiting && !ownRequest;
  const pending = approve.isPending || reject.isPending;

  return (
    <Modal
      open={Boolean(requisition)}
      onOpenChange={(open) => !open && onClose()}
      size="wide"
      title={canDecide ? 'Review requisition' : 'Requisition detail'}
      description={
        canDecide
          ? 'Checker decision. Your note is stored with the decision.'
          : awaiting && ownRequest
            ? 'You raised this requisition, so another HR Manager decides it.'
            : 'Read-only — this requisition no longer awaits a decision.'
      }
      footer={
        canDecide ? (
          <>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                requisition &&
                reject.mutate({ id: requisition.id, note: note.trim() }, { onSuccess: onClose })
              }
            >
              Reject
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                requisition &&
                approve.mutate(
                  { id: requisition.id, unitId: requisition.unitId, note: note.trim() },
                  { onSuccess: onClose },
                )
              }
            >
              {approve.isPending ? 'Processing…' : 'Approve requisition'}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      {requisition && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Requisition">{requisition.id}</KeyValueRow>
            <KeyValueRow label="Positions">
              {requisition.positionIds.length
                ? requisition.positionIds.map((id) => `${positionTitle(id)} (${id})`).join(', ')
                : requisition.title}
            </KeyValueRow>
            <KeyValueRow label="Unit">{labelOf(UNIT_OPTIONS, requisition.unitId)}</KeyValueRow>
            <KeyValueRow label="Supervisor position">{positionTitle(requisition.parentPositionId)}</KeyValueRow>
            <KeyValueRow label="Number of positions">{requisition.headcount}</KeyValueRow>
            <KeyValueRow label="Requestor">{requisition.requestor ?? requisition.maker}</KeyValueRow>
            <KeyValueRow label="Status">
              <RequisitionStatusBadge status={requisition.status} />
            </KeyValueRow>
            <KeyValueRow label="Maker">{requisition.maker}</KeyValueRow>
            <KeyValueRow label="Justification">{requisition.reason}</KeyValueRow>
          </KeyValueList>

          {canDecide && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="checker-note">Checker note</Label>
              <Textarea
                id="checker-note"
                rows={2}
                maxLength={150}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Stored with the decision"
              />
            </div>
          )}

          {!canDecide && requisition.checkerNote && (
            <KeyValueList>
              <KeyValueRow label="Checker note">{requisition.checkerNote}</KeyValueRow>
            </KeyValueList>
          )}
        </div>
      )}
    </Modal>
  );
}
