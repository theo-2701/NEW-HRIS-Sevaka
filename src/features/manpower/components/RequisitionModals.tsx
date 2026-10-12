import { useEffect, useState } from 'react';
import { Form, Formik } from 'formik';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DateRangeField } from '@/components/form/DateRangeField';
import { formatDate, formatDateRange } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { TextField } from '@/components/form/TextField';
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
  useCloseRequisition,
  useCreateRequisition,
  useRejectRequisition,
  useUpdateRequisition,
} from '@/features/manpower/hooks/useManpower';
import { requisitionSchema } from '@/features/manpower/validation';
import { PARENT_POSITION_OPTIONS, UNIT_OPTIONS, labelOf } from '@/features/manpower/types';
import type { ManpowerPlan, Requisition, RequisitionDraft } from '@/features/manpower/types';

const EMPTY: RequisitionDraft = {
  planId: '',
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
            title={editing ? `Ubah ${editing.id}` : 'New requisition'}
            description="Anda berperan sebagai maker. HR Manager yang berbeda harus menyetujuinya (segregation of duties)."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={() => void submitForm()} disabled={pending}>
                  {pending ? 'Menyimpan…' : editing ? 'Save changes' : 'Submit for approval'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <SelectField
                name="planId"
                label="Rencana"
                placeholder="Ad-hoc (tanpa rencana)"
                options={planOptions}
                hint="Opsional — kosongkan untuk requisition ad-hoc."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField name="unitId" label="Unit" required placeholder="Pilih unit" options={UNIT_OPTIONS} />
                <SelectField
                  name="parentPositionId"
                  label="Reports to"
                  required
                  placeholder="Pilih posisi atasan"
                  options={PARENT_POSITION_OPTIONS}
                />
              </div>

              <TextField
                name="title"
                label="Nama posisi"
                required
                maxLength={150}
                placeholder="mis. Staff Finance"
                hint="Maksimal 150 karakter."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <TextField name="headcount" type="number" min={1} label="Headcount" required />
              </div>

              <DateRangeField
                fromName="activeFrom"
                toName="activeUntil"
                label="Masa aktif (Tanggal Mulai – Tanggal Batas)"
                required
                min={editing ? undefined : today}
                hint="Tanggal batas tidak sebelum tanggal mulai dan tidak di masa lampau."
              />

              <TextAreaField
                name="reason"
                label="Justifikasi"
                required
                rows={3}
                maxLength={150}
                placeholder="Kenapa posisi ini dibutuhkan?"
                hint="Maksimal 150 karakter."
              />

              <Note icon={<ShieldCheck />}>
                Requisition langsung berstatus <strong>IN APPROVAL</strong>. Keputusannya diambil HR Manager yang
                berbeda.
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
  const approve = useApproveRequisition();
  const reject = useRejectRequisition();

  useEffect(() => {
    if (requisition) setNote('');
  }, [requisition]);

  const canDecide = canCheck && requisition?.status === 'IN_APPROVAL';
  const pending = approve.isPending || reject.isPending;

  return (
    <Modal
      open={Boolean(requisition)}
      onOpenChange={(open) => !open && onClose()}
      size="wide"
      title={canDecide ? 'Review requisition' : 'Requisition detail'}
      description={
        canDecide
          ? 'Keputusan checker. Anda tidak bisa menyetujui requisition yang Anda buat sendiri.'
          : 'Read-only — requisition ini sudah tidak menunggu keputusan.'
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
              {approve.isPending ? 'Memproses…' : 'Approve requisition'}
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
            <KeyValueRow label="Nama posisi">{requisition.title}</KeyValueRow>
            <KeyValueRow label="Unit">{labelOf(UNIT_OPTIONS, requisition.unitId)}</KeyValueRow>
            <KeyValueRow label="Reports to">
              {labelOf(PARENT_POSITION_OPTIONS, requisition.parentPositionId)}
            </KeyValueRow>
            <KeyValueRow label="Headcount">{requisition.headcount} posisi</KeyValueRow>
            <KeyValueRow label="Status">
              <RequisitionStatusBadge status={requisition.status} />
            </KeyValueRow>
            <KeyValueRow label="Masa aktif">{formatDateRange(requisition.activeFrom, requisition.activeUntil)}</KeyValueRow>
            <KeyValueRow label="Terisi">{`${requisition.filledCount} / ${requisition.headcount}`}</KeyValueRow>
            <KeyValueRow label="Pengaju">{requisition.maker}</KeyValueRow>
            <KeyValueRow label="Justifikasi">{requisition.reason}</KeyValueRow>
            {requisition.status === 'CLOSED' && (
              <>
                <KeyValueRow label="Alasan penutupan">{requisition.closedReason}</KeyValueRow>
                <KeyValueRow label="Ditutup oleh">
                  {requisition.closedByName} · {formatDate(requisition.closedAt)}
                </KeyValueRow>
              </>
            )}
          </KeyValueList>

          {canDecide && (
            <div className="flex flex-col gap-1">
              <Label htmlFor="checker-note">Catatan checker</Label>
              <Textarea
                id="checker-note"
                rows={2}
                maxLength={150}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Catatan yang tersimpan bersama keputusan"
              />
            </div>
          )}

          {!canDecide && requisition.checkerNote && (
            <KeyValueList>
              <KeyValueRow label="Catatan checker">{requisition.checkerNote}</KeyValueRow>
            </KeyValueList>
          )}
        </div>
      )}
    </Modal>
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
