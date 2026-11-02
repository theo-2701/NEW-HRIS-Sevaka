import { useEffect, useState } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DateRangeField } from '@/components/form/DateRangeField';
import { formatDate, formatDateRange, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { TextAreaField } from '@/components/form/TextAreaField';
import { SelectField } from '@/components/form/SelectField';
import { KeyValueList, KeyValueRow, Note, RequisitionStatusBadge } from '@/features/manpower/components/ManpowerBits';
import {
  useApproveRequisition,
  useCloseRequisition,
  useCreateRequisition,
  useRejectRequisition,
  useUpdateRequisition,
} from '@/features/manpower/hooks/useManpower';
import { requisitionSchema } from '@/features/manpower/validation';
import {
  NO_SUPERVISOR,
  ORG_POSITIONS,
  UNIT_OPTIONS,
  isOwnRequisition,
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
  activeFrom: '',
  activeUntil: '',
};

type ParentChange = { field: 'unitId' | 'parentPositionId'; value: string };

/**
 * Kaskade T2 (CATATAN 18 Okt; TSD-EMPLOYEE 0.212 §7.3.2): Organization Unit → { Supervisor Position,
 * Requestor } → checklist Positions to Open (posisi KOSONG bawahan langsung supervisor; «No supervisor» =
 * posisi teratas, 0.202). Mengganti induk mengosongkan anaknya dalam satu `setValues`; bila anaknya sudah
 * berisi, minta konfirmasi dulu.
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

  const vacant = values.parentPositionId ? openPositions(values.unitId, values.parentPositionId) : [];
  const toggle = (id: string, next: boolean) =>
    void setFieldValue('positionIds', next ? [...values.positionIds, id] : values.positionIds.filter((item) => item !== id));
  const positionError = submitCount > 0 && typeof errors.positionIds === 'string' ? errors.positionIds : undefined;

  return (
    <>
      <SelectField
        name="unitId"
        label="Organization Unit"
        required
        placeholder="Select an organization unit"
        options={UNIT_OPTIONS}
        onValueChange={change('unitId')}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          name="parentPositionId"
          label="Supervisor Position"
          required
          disabled={!values.unitId}
          placeholder={values.unitId ? 'Select the supervisor position' : 'Select a unit first'}
          options={supervisorOptions(values.unitId)}
          onValueChange={change('parentPositionId')}
        />
        <SelectField
          name="requestorId"
          label="Requestor"
          required
          disabled={!values.unitId}
          placeholder={values.unitId ? 'Select the requestor' : 'Select a unit first'}
          options={requestorOptions(values.unitId)}
        />
      </div>

      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0" aria-describedby={positionError ? 'positionIds-desc' : undefined}>
        <legend className="mb-1.5 font-body text-base font-bold text-fg-1">
          Positions to Open<em className="ml-0.5 not-italic text-error-500">*</em>
        </legend>
        {!values.parentPositionId ? (
          <span className="font-body text-xs font-medium text-fg-3">Select a supervisor position first.</span>
        ) : vacant.length === 0 ? (
          <span className="font-body text-xs font-medium text-fg-3">No vacant position reports directly here.</span>
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
 * REQ-CREATE / Ubah — requisition lahir langsung IN_APPROVAL (FSD 0.24 §3.1,
 * tanpa draf & tanpa Ajukan). `editing` terisi = Ubah (`PUT`, hanya IN_APPROVAL).
 */
export function CreateRequisitionModal({
  open,
  plans,
  editing,
  onClose,
}: {
  open: boolean;
  plans: ManpowerPlan[];
  editing: Requisition | null;
  onClose: () => void;
}) {
  const create = useCreateRequisition();
  const update = useUpdateRequisition();
  const pending = create.isPending || update.isPending;
  const today = new Date().toISOString().slice(0, 10);

  const planOptions = plans
    .filter((plan) => plan.status === 'ACTIVE' || plan.status === 'DRAFT')
    .map((plan) => ({ value: plan.id, label: plan.title }));

  const initial: RequisitionDraft = editing
    ? {
        planId: editing.planId ?? '',
        unitId: editing.unitId,
        parentPositionId: editing.parentPositionId || NO_SUPERVISOR,
        requestorId: ORG_POSITIONS.find((row) => row.holderName === editing.requestor)?.holderId ?? '',
        positionIds: editing.positionIds ?? [],
        reason: editing.reason,
        activeFrom: editing.activeFrom,
        activeUntil: editing.activeUntil,
      }
    : EMPTY;

  return (
    <Formik<RequisitionDraft>
      initialValues={initial}
      enableReinitialize
      validationSchema={requisitionSchema}
      onSubmit={(values, helpers) => {
        // L5: form dikosongkan setelah create berhasil.
        const done = { onSuccess: () => (helpers.resetForm(), onClose()) };
        if (editing) update.mutate({ id: editing.id, draft: values }, done);
        else create.mutate(values, done);
      }}
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
            title={editing ? `Edit ${editing.id}` : 'New requisition'}
            description="You are the maker. A different HR Manager must approve it (segregation of duties)."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={() => void submitForm()} disabled={pending}>
                  {pending ? 'Saving…' : editing ? 'Save changes' : 'Submit for approval'}
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

              <DateRangeField
                fromName="activeFrom"
                toName="activeUntil"
                label="Active period (start – end)"
                required
                min={editing ? undefined : today}
                hint="The end date cannot be earlier than the start date or in the past."
              />

              <TextAreaField
                name="reason"
                label="Justification"
                required
                rows={4}
                maxLength={150}
                placeholder="Why are these positions needed?"
                hint="Maximum 150 characters."
              />

              <Note icon={<ShieldCheck />}>
                The requisition goes straight to <strong>In approval</strong>. A different HR Manager makes the
                decision.
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
  canCheck,
  onClose,
}: {
  requisition: Requisition | null;
  /** L4: tombol checker hanya untuk HR Manager · Super Admin; SoD tetap ditegakkan server (409). */
  canCheck: boolean;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const approve = useApproveRequisition();
  const reject = useRejectRequisition();

  useEffect(() => {
    if (requisition) {
      setNote('');
      setConfirming(false);
    }
  }, [requisition]);

  const own = requisition ? isOwnRequisition(requisition) : false;
  // Tombol keputusan disembunyikan bagi pembuatnya (Notulen 12 Okt 2026 #4, dicocokkan lewat ID).
  const canDecide = canCheck && !own && requisition?.status === 'IN_APPROVAL';
  const pending = approve.isPending || reject.isPending;

  return (
    <>
      <Modal
        open={Boolean(requisition)}
        onOpenChange={(open) => !open && onClose()}
        size="wide"
        title={canDecide ? 'Review requisition' : 'Requisition detail'}
        description={
          canDecide
            ? 'Checker decision. Approval opens the requested seats and cannot be undone.'
            : own && requisition?.status === 'IN_APPROVAL'
              ? 'You created this requisition, so a different checker has to decide it.'
              : 'Read-only.'
        }
        footer={
          canDecide ? (
            <>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  requisition && reject.mutate({ id: requisition.id, note: note.trim() }, { onSuccess: onClose })
                }
              >
                Reject
              </Button>
              <Button disabled={pending} onClick={() => setConfirming(true)}>
                Approve
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
              <KeyValueRow label="Positions to open">
                {requisition.positionIds?.length
                  ? requisition.positionIds.map((id) => `${positionTitle(id)} (${id})`).join(', ')
                  : requisition.title}
              </KeyValueRow>
              <KeyValueRow label="Organization unit">{labelOf(UNIT_OPTIONS, requisition.unitId)}</KeyValueRow>
              <KeyValueRow label="Supervisor position">{positionTitle(requisition.parentPositionId)}</KeyValueRow>
              <KeyValueRow label="Number of positions">{requisition.headcount}</KeyValueRow>
              <KeyValueRow label="Status">
                <RequisitionStatusBadge status={requisition.status} />
              </KeyValueRow>
              <KeyValueRow label="Active period">
                {formatDateRange(requisition.activeFrom, requisition.activeUntil)}
              </KeyValueRow>
              <KeyValueRow label="Filled">{`${requisition.filledCount} / ${requisition.headcount}`}</KeyValueRow>
              <KeyValueRow label="Requestor">{requisition.requestor ?? requisition.maker}</KeyValueRow>
              <KeyValueRow label="Created by">
                {requisition.maker} · {formatDateTime(requisition.submittedAt)}
              </KeyValueRow>
              <KeyValueRow label="Justification">{requisition.reason}</KeyValueRow>
              {requisition.status === 'CLOSED' && (
                <>
                  <KeyValueRow label="Close reason">{requisition.closedReason}</KeyValueRow>
                  <KeyValueRow label="Closed by">
                    {requisition.closedByName} · {formatDate(requisition.closedAt)}
                  </KeyValueRow>
                </>
              )}
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
                  placeholder="Saved together with the decision"
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

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Approve ${requisition?.id ?? ''}?`}
        description={`${requisition?.headcount ?? 0} seat(s) for ${requisition?.title ?? ''} will be opened for New Joiner. This cannot be undone.`}
        confirmLabel="Yes, approve"
        cancelLabel="Back"
        loading={approve.isPending}
        onConfirm={() =>
          requisition &&
          approve.mutate(
            { id: requisition.id, unitId: requisition.unitId, note: note.trim() },
            { onSuccess: () => (setConfirming(false), onClose()) },
          )
        }
      />
    </>
  );
}

/** Tutup requisition APPROVED — alasan wajib maks 150; galat 422 tampil di dialog (FSD 0.24 §3.1). */
export function CloseRequisitionDialog({
  requisition,
  onClose,
}: {
  requisition: Requisition | null;
  onClose: () => void;
}) {
  // Pemanggil memasang `key={requisition.id}` → alasan & galat lahir bersih tiap requisition.
  const [reason, setReason] = useState('');
  const close = useCloseRequisition();

  return (
    <ConfirmDialog
      open={Boolean(requisition)}
      onOpenChange={(open) => !open && onClose()}
      title={`Tutup ${requisition?.id ?? ''}`}
      confirmLabel="Tutup requisition"
      loading={close.isPending}
      onConfirm={() =>
        requisition && reason.trim() && close.mutate({ id: requisition.id, reason }, { onSuccess: onClose })
      }
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="close-reason">Alasan penutupan</Label>
        <Textarea
          id="close-reason"
          rows={3}
          maxLength={150}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="mis. Posisi dibekukan"
        />
        {close.error ? (
          <span className="font-body text-xs font-medium text-error-800">{close.error.message}</span>
        ) : (
          <span className="font-body text-xs font-medium text-fg-3">Wajib, maksimal 150 karakter.</span>
        )}
      </div>
    </ConfirmDialog>
  );
}
