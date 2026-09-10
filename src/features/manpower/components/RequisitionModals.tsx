import { useEffect, useRef, useState } from 'react';
import { Form, Formik } from 'formik';
import { ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/Modal';
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
  useCreateRequisition,
  useRejectRequisition,
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
  justification: '',
};

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
            description="Anda berperan sebagai maker. HR Manager yang berbeda harus menyetujuinya (segregation of duties)."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button variant="secondary" onClick={() => save('draft')} disabled={create.isPending}>
                  Save draft
                </Button>
                <Button onClick={() => save('submit')} disabled={create.isPending}>
                  {create.isPending ? 'Menyimpan…' : 'Submit for approval'}
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

              <TextAreaField
                name="justification"
                label="Justifikasi"
                required
                rows={3}
                maxLength={150}
                placeholder="Kenapa posisi ini dibutuhkan?"
                hint="Maksimal 150 karakter."
              />

              <Note icon={<ShieldCheck />}>
                Submit membuat requisition berstatus <strong>IN APPROVAL</strong>. Keputusannya diambil HR Manager
                yang berbeda.
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

  const canDecide = requisition?.status === 'IN_APPROVAL';
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
            <KeyValueRow label="Maker">{requisition.maker}</KeyValueRow>
            <KeyValueRow label="Justifikasi">{requisition.justification}</KeyValueRow>
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
