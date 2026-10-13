import { useEffect, useState } from 'react';
import { Form, Formik } from 'formik';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DateRangeField } from '@/components/form/DateRangeField';
import { formatDate, formatDateRange, formatDateTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { TextField } from '@/components/form/TextField';
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
  EXISTING_POSITIONS,
  PARENT_POSITION_OPTIONS,
  POSITION_MODE_LABEL,
  UNIT_OPTIONS,
  isOwnRequisition,
  labelOf,
} from '@/features/manpower/types';
import type { ManpowerPlan, PositionMode, Requisition, RequisitionDraft } from '@/features/manpower/types';
import { Segmented } from '@/components/Segmented';

const EMPTY: RequisitionDraft = {
  planId: '',
  positionMode: 'NEW',
  positionId: '',
  unitId: '',
  parentPositionId: '',
  title: '',
  headcount: 1,
  reason: '',
  activeFrom: '',
  activeUntil: '',
};

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
  editing?: Requisition | null;
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
        positionMode: editing.positionMode,
        positionId: editing.positionId ?? '',
        unitId: editing.unitId,
        parentPositionId: editing.parentPositionId,
        title: editing.title,
        headcount: editing.headcount,
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
      {({ submitForm, resetForm, values, setFieldValue }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        const existing = values.positionMode === 'EXISTING';
        const seat = EXISTING_POSITIONS.find((row) => row.id === values.positionId);
        /** Kursi yang sudah ada mewarisi unit, atasan, dan nama posisinya — maker hanya menambah jumlah. */
        const pickSeat = (positionId: string) => {
          const picked = EXISTING_POSITIONS.find((row) => row.id === positionId);
          void setFieldValue('positionId', positionId);
          if (!picked) return;
          void setFieldValue('unitId', picked.unitId);
          void setFieldValue('parentPositionId', picked.parentPositionId);
          void setFieldValue('title', picked.title);
        };
        const switchMode = (mode: PositionMode) => {
          void setFieldValue('positionMode', mode);
          // Field yang tidak berlaku dikosongkan supaya tidak terkirim diam-diam.
          void setFieldValue('positionId', '');
          if (mode === 'EXISTING') {
            void setFieldValue('unitId', '');
            void setFieldValue('parentPositionId', '');
            void setFieldValue('title', '');
          }
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
              <div className="flex flex-col gap-2">
                <Label>Position</Label>
                <Segmented<PositionMode>
                  value={values.positionMode}
                  onChange={switchMode}
                  options={[
                    { value: 'NEW', label: POSITION_MODE_LABEL.NEW },
                    { value: 'EXISTING', label: POSITION_MODE_LABEL.EXISTING },
                  ]}
                />
                <span className="font-body text-xs font-medium text-fg-3">
                  {existing
                    ? 'Request more seats on a position that already exists in the structure.'
                    : 'Request a position that does not exist yet in the structure.'}
                </span>
              </div>

              <SelectField
                name="planId"
                label="Plan"
                placeholder="Ad-hoc (no plan)"
                options={planOptions}
                hint="Optional — leave empty for an ad-hoc requisition."
              />

              {existing && (
                <div className="flex flex-col gap-1">
                  <SelectField
                    name="positionId"
                    label="Existing position"
                    required
                    placeholder="Select a position"
                    options={EXISTING_POSITIONS.map((row) => ({
                      value: row.id,
                      label: `${row.title} — ${labelOf(UNIT_OPTIONS, row.unitId)}`,
                    }))}
                    onValueChange={pickSeat}
                  />
                  {seat && (
                    <span className="font-body text-xs font-medium text-fg-3">
                      Currently {seat.filled} of {seat.seats} seats filled · reports to{' '}
                      {labelOf(PARENT_POSITION_OPTIONS, seat.parentPositionId)}.
                    </span>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="unitId"
                  label="Unit"
                  required
                  disabled={existing}
                  placeholder="Select a unit"
                  options={UNIT_OPTIONS}
                />
                <SelectField
                  name="parentPositionId"
                  label="Reports to"
                  required
                  disabled={existing}
                  placeholder="Select the supervising position"
                  options={PARENT_POSITION_OPTIONS}
                />
              </div>

              <TextField
                name="title"
                label="Position title"
                required
                disabled={existing}
                maxLength={150}
                placeholder="e.g. Finance Staff"
                hint={existing ? 'Taken from the existing position.' : 'Maximum 150 characters.'}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  name="headcount"
                  type="number"
                  min={1}
                  label={existing ? 'Additional seats' : 'Headcount'}
                  required
                />
              </div>

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
                placeholder="Why is this position needed?"
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
  const seat = EXISTING_POSITIONS.find((row) => row.id === requisition?.positionId);

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
              <KeyValueRow label="Position">{POSITION_MODE_LABEL[requisition.positionMode]}</KeyValueRow>
              <KeyValueRow label="Position title">{requisition.title}</KeyValueRow>
              {seat && <KeyValueRow label="Current seats">{`${seat.filled} of ${seat.seats} filled`}</KeyValueRow>}
              <KeyValueRow label="Unit">{labelOf(UNIT_OPTIONS, requisition.unitId)}</KeyValueRow>
              <KeyValueRow label="Reports to">
                {labelOf(PARENT_POSITION_OPTIONS, requisition.parentPositionId)}
              </KeyValueRow>
              <KeyValueRow label={requisition.positionMode === 'EXISTING' ? 'Additional seats' : 'Headcount'}>
                {requisition.headcount}
              </KeyValueRow>
              <KeyValueRow label="Status">
                <RequisitionStatusBadge status={requisition.status} />
              </KeyValueRow>
              <KeyValueRow label="Active period">
                {formatDateRange(requisition.activeFrom, requisition.activeUntil)}
              </KeyValueRow>
              <KeyValueRow label="Filled">{`${requisition.filledCount} / ${requisition.headcount}`}</KeyValueRow>
              <KeyValueRow label="Requestor">
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
