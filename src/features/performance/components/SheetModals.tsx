import { useEffect, useMemo, useRef } from 'react';
import { Form, Formik, useFormikContext } from 'formik';
import { Lock } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { TextField } from '@/components/form/TextField';
import { TargetTypeBadge } from '@/features/performance/components/KpiModals';
import { Banner, OriginBadge } from '@/features/performance/components/PerfBits';
import { formatWeight } from '@/features/performance/format';
import { useJobGrades, useKpiItems } from '@/features/performance/hooks/useKpi';
import {
  useAddItem,
  useDeleteItem,
  useMarkRead,
  useSaveObjectionNote,
  useSaveSelfAssessment,
  useSetValue,
  useSubmitSheet,
  useUpdateItem,
} from '@/features/performance/hooks/useSheets';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import {
  additionalLineSchema,
  editLineSchema,
  masterLineSchema,
  objectionNoteSchema,
  selfAssessmentSchema,
  valueSchema,
} from '@/features/performance/validation';
import { TARGET_TYPE_LABEL, type ItemPatch, type SheetItem, type TargetType } from '@/features/performance/types';
import { toast } from '@/store/ui.store';

/** Satu Idempotency-Key per pembukaan modal — klik ganda tidak menulis dua kali. */
const useOpenKey = (open: boolean) => useMemo(() => (open ? crypto.randomUUID() : ''), [open]);

function Footer({
  onCancel,
  onSubmit,
  pending,
  label,
  disabled,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  pending: boolean;
  label: string;
  disabled?: boolean;
}) {
  return (
    <>
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={onSubmit} disabled={pending || disabled}>
        {pending ? 'Menyimpan…' : label}
      </Button>
    </>
  );
}

/** Ringkasan baris yang sedang disentuh — konteks di atas form. */
function LineContext({ item }: { item: SheetItem }) {
  return (
    <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 rounded-md border border-border-1 bg-cloud px-3.5 py-3 font-body text-[13px] md:col-span-2">
      <dt className="font-medium text-fg-3">Item</dt>
      <dd className="m-0 flex flex-wrap items-center gap-2 font-semibold text-fg-1">
        {item.itemNameSnapshot}
        <OriginBadge origin={item.origin} />
      </dd>
      <dt className="font-medium text-fg-3">Target</dt>
      <dd className="m-0 font-semibold text-fg-1">{item.target}</dd>
      {item.initialValue && (
        <>
          <dt className="font-medium text-fg-3">Nilai awal</dt>
          <dd className="m-0 font-semibold text-fg-1">{item.initialValue}</dd>
        </>
      )}
    </dl>
  );
}

// ---------- Sisi karyawan (D1) ----------

/** `P3.10`/`P3.11` — atas nama sendiri, nol jalur anonim; terkunci begitu nilai awal pertama tercatat. */
export function SelfAssessmentModal({
  open,
  sheetId,
  current,
  onClose,
}: {
  open: boolean;
  sheetId: string;
  current: string | null;
  onClose: () => void;
}) {
  const { actor } = usePerfActor();
  const save = useSaveSelfAssessment(actor, sheetId);
  const key = useOpenKey(open);
  return (
    <Formik
      initialValues={{ content: current ?? '' }}
      validationSchema={selfAssessmentSchema}
      enableReinitialize
      onSubmit={(values) => save.mutate({ content: values.content.trim(), idempotencyKey: key }, { onSuccess: onClose })}
    >
      {({ submitForm, resetForm, dirty }) => (
        <Modal
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          size="wide"
          title={current ? 'Ubah isian penilaian diri' : 'Tulis isian penilaian diri'}
          description="Ditulis atas nama Anda sendiri. Dapat diubah sampai atasan mencatat nilai awal pertama."
          footer={
            <Footer onCancel={onClose} onSubmit={submitForm} pending={save.isPending} label="Simpan" disabled={!dirty} />
          }
        >
          <Form className="grid gap-4">
            <TextAreaField name="content" label="Isian" required rows={6} maxLength={5000} />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/** `P3.09` — catatan pada satu baris; tidak menahan apa pun (beda dari Sanggahan). */
export function ObjectionNoteModal({ sheetId, item, onClose }: { sheetId: string; item: SheetItem | null; onClose: () => void }) {
  const { actor } = usePerfActor();
  const save = useSaveObjectionNote(actor, sheetId);
  const key = useOpenKey(Boolean(item));
  return (
    <Formik
      initialValues={{ note: item?.employeeObjectionNote ?? '' }}
      validationSchema={objectionNoteSchema}
      enableReinitialize
      onSubmit={(values) => {
        if (item) save.mutate({ itemId: item.id, note: values.note.trim(), idempotencyKey: key }, { onSuccess: onClose });
      }}
    >
      {({ submitForm, resetForm, dirty }) => (
        <Modal
          open={Boolean(item)}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          title={item?.employeeObjectionNote ? 'Ubah catatan keberatan' : 'Catat keberatan'}
          description="Catatan pada satu baris, terlihat oleh atasan Anda."
          footer={
            <Footer onCancel={onClose} onSubmit={submitForm} pending={save.isPending} label="Simpan catatan" disabled={!dirty} />
          }
        >
          <Form className="grid gap-4">
            {item && <LineContext item={item} />}
            <TextAreaField
              name="note"
              label="Catatan"
              required
              rows={4}
              maxLength={1000}
              hint="Tidak menahan apa pun — target dan periode tetap berlaku. Keberatan yang perlu dijawab diajukan lewat menu Objections."
            />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/** `P3.08` — menyatakan sudah dibaca, bukan disetujui (`PF-21 k6`). */
export function ReadMarkDialog({ sheetId, item, onClose }: { sheetId: string; item: SheetItem | null; onClose: () => void }) {
  const { actor } = usePerfActor();
  const mark = useMarkRead(actor, sheetId);
  const key = useOpenKey(Boolean(item));
  return (
    <ConfirmDialog
      open={Boolean(item)}
      title="Tandai sudah dibaca?"
      description="Tanda ini menyatakan Anda sudah membaca target baris ini — bukan menyetujuinya."
      confirmLabel="Tandai dibaca"
      tone="primary"
      loading={mark.isPending}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={() => item && mark.mutate({ itemId: item.id, idempotencyKey: key }, { onSuccess: onClose })}
    >
      {item && <LineContext item={item} />}
    </ConfirmDialog>
  );
}

// ---------- Sisi atasan (E2–E6) ----------

/** `P3.13` nilai awal BUTA (tak dapat ditimpa) / `P3.14` penyesuaian (berulang tanpa batas). */
export function ValueModal({
  sheetId,
  target,
  onClose,
}: {
  sheetId: string;
  target: { item: SheetItem; kind: 'initial' | 'submitted' } | null;
  onClose: () => void;
}) {
  const { actor } = usePerfActor();
  const save = useSetValue(actor, sheetId);
  const key = useOpenKey(Boolean(target));
  const initial = target?.kind === 'initial';
  return (
    <Formik
      initialValues={{ value: initial ? '' : (target?.item.submittedValue ?? target?.item.initialValue ?? '') }}
      validationSchema={valueSchema}
      enableReinitialize
      onSubmit={(values) => {
        if (!target) return;
        save.mutate(
          { kind: target.kind, itemId: target.item.id, value: values.value.trim(), idempotencyKey: key },
          { onSuccess: onClose },
        );
      }}
    >
      {({ submitForm, resetForm }) => (
        <Modal
          open={Boolean(target)}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          title={initial ? 'Isi nilai awal' : 'Sesuaikan nilai'}
          description={
            initial
              ? 'Nilai awal diisi tanpa melihat isian diri karyawan dan tidak dapat ditimpa setelah disimpan.'
              : 'Penyesuaian boleh diubah berulang sampai lembar diajukan. Nilai awal tetap tersimpan terpisah.'
          }
          footer={<Footer onCancel={onClose} onSubmit={submitForm} pending={save.isPending} label="Simpan" />}
        >
          <Form className="grid gap-4">
            {target && <LineContext item={target.item} />}
            <TextField
              name="value"
              label={initial ? 'Nilai awal' : 'Nilai penyesuaian'}
              required
              maxLength={500}
              placeholder={target?.item.targetTypeSnapshot === 'NUMERIC' ? 'Contoh: 38 tiket' : 'Contoh: Baik, konsisten'}
              hint={
                initial
                  ? 'Isian diri karyawan terbuka otomatis setelah seluruh baris punya nilai awal. Anda tetap boleh bertanya langsung kepada karyawan di luar sistem.'
                  : undefined
              }
            />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/** Pilihan item mengikuti golongan yang dipilih; ganti golongan mengosongkan item. */
function MasterFields() {
  const { actor } = usePerfActor();
  const { values, setFieldValue } = useFormikContext<{ jobGradeId: string; masterItemId: string }>();
  const grades = useJobGrades(actor, true);
  const items = useKpiItems(actor, { jobGradeId: values.jobGradeId, isActive: true, page: 1, size: 100 }, Boolean(values.jobGradeId));
  const previousGrade = useRef(values.jobGradeId);
  useEffect(() => {
    if (previousGrade.current !== values.jobGradeId) {
      previousGrade.current = values.jobGradeId;
      void setFieldValue('masterItemId', '');
    }
  }, [values.jobGradeId, setFieldValue]);
  const picked = items.data?.rows.find((row) => row.id === values.masterItemId);

  return (
    <>
      <SelectField
        name="jobGradeId"
        label="Golongan jabatan"
        required
        placeholder="Pilih golongan"
        options={(grades.data ?? []).map((row) => ({ value: row.id, label: row.name }))}
        hint="Golongan karyawan belum terisi otomatis dari profil — pilih manual."
      />
      <SelectField
        name="masterItemId"
        label="Item daftar induk"
        required
        disabled={!values.jobGradeId}
        placeholder={values.jobGradeId ? 'Pilih item aktif' : 'Pilih golongan dulu'}
        options={(items.data?.rows ?? []).map((row) => ({ value: row.id, label: row.itemName }))}
      />
      {picked && (
        <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 rounded-md border border-border-1 bg-cloud px-3.5 py-3 font-body text-[13px] md:col-span-2">
          <dt className="font-medium text-fg-3">Jenis target</dt>
          <dd className="m-0">
            <TargetTypeBadge type={picked.targetType} />
          </dd>
          <dt className="font-medium text-fg-3">Bobot mentah</dt>
          <dd className="m-0 flex items-center gap-1.5 font-semibold text-fg-1 tabular-nums">
            <Lock className="size-3.5 text-fg-3" />
            {formatWeight(picked.rawWeight)}
          </dd>
        </dl>
      )}
    </>
  );
}

/** E4a — MASTER: nama, jenis, bobot disalin sistem; satu-satunya isian adalah target. */
export function AddMasterLineModal({ open, sheetId, onClose }: { open: boolean; sheetId: string; onClose: () => void }) {
  const { actor } = usePerfActor();
  const add = useAddItem(actor, sheetId);
  const key = useOpenKey(open);
  return (
    <Formik
      initialValues={{ jobGradeId: '', masterItemId: '', target: '' }}
      validationSchema={masterLineSchema}
      onSubmit={(values, helpers) =>
        add.mutate(
          { draft: { origin: 'MASTER', masterItemId: values.masterItemId, target: values.target.trim() }, idempotencyKey: key },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm, resetForm }) => (
        <Modal
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          size="wide"
          title="Tambah dari daftar induk"
          description="Nama, jenis target, dan bobot disalin sistem dari daftar induk; bobotnya langsung terkunci."
          footer={<Footer onCancel={onClose} onSubmit={submitForm} pending={add.isPending} label="Tambah baris" />}
        >
          <Form className="grid gap-4 md:grid-cols-2">
            <MasterFields />
            <TextField name="target" label="Target" required maxLength={500} containerClassName="md:col-span-2" />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/** E4b — ADDITIONAL: baris bebas milik atasan; form sengaja berbeda dari E4a. */
export function AddAdditionalLineModal({
  open,
  sheetId,
  currentShare,
  onClose,
}: {
  open: boolean;
  sheetId: string;
  currentShare: string;
  onClose: () => void;
}) {
  const { actor } = usePerfActor();
  const add = useAddItem(actor, sheetId);
  const key = useOpenKey(open);
  return (
    <Formik
      initialValues={{ itemNameSnapshot: '', targetTypeSnapshot: '', rawWeight: '', target: '' }}
      validationSchema={additionalLineSchema}
      onSubmit={(values, helpers) =>
        add.mutate(
          {
            draft: {
              origin: 'ADDITIONAL',
              itemNameSnapshot: values.itemNameSnapshot.trim(),
              targetTypeSnapshot: values.targetTypeSnapshot as TargetType,
              rawWeight: Number(values.rawWeight),
              target: values.target.trim(),
            },
            idempotencyKey: key,
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
      {({ submitForm, resetForm }) => (
        <Modal
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          size="wide"
          title="Tambah baris tambahan"
          description="Baris bebas yang Anda susun sendiri, di luar daftar induk."
          footer={<Footer onCancel={onClose} onSubmit={submitForm} pending={add.isPending} label="Tambah baris" />}
        >
          <Form className="grid gap-4 md:grid-cols-2">
            <TextField name="itemNameSnapshot" label="Nama item" required maxLength={255} containerClassName="md:col-span-2" />
            <SelectField
              name="targetTypeSnapshot"
              label="Jenis target"
              required
              placeholder="Pilih jenis target"
              options={[
                { value: 'NUMERIC', label: TARGET_TYPE_LABEL.NUMERIC },
                { value: 'NARRATIVE', label: TARGET_TYPE_LABEL.NARRATIVE },
              ]}
            />
            <TextField
              name="rawWeight"
              label="Bobot mentah"
              required
              type="number"
              min={0}
              max={9999.99}
              step="0.01"
              hint={`Porsi baris tambahan saat ini ${currentShare}. Dihitung ulang termasuk baris ini; ditolak bila melewati batas perusahaan.`}
            />
            <TextField name="target" label="Target" required maxLength={500} containerClassName="md:col-span-2" />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/** `P3.06` — MASTER hanya target; ADDITIONAL target + bobot. Hanya field yang berubah dikirim. */
export function EditLineModal({ sheetId, item, onClose }: { sheetId: string; item: SheetItem | null; onClose: () => void }) {
  const { actor } = usePerfActor();
  const update = useUpdateItem(actor, sheetId);
  const key = useOpenKey(Boolean(item));
  const additional = item?.origin === 'ADDITIONAL';
  return (
    <Formik
      initialValues={{ target: item?.target ?? '', rawWeight: item ? String(item.rawWeight) : '' }}
      validationSchema={editLineSchema(additional)}
      enableReinitialize
      onSubmit={(values) => {
        if (!item) return;
        const patch: ItemPatch = {};
        if (values.target.trim() !== item.target) patch.target = values.target.trim();
        if (additional && Number(values.rawWeight) !== item.rawWeight) patch.rawWeight = Number(values.rawWeight);
        update.mutate({ itemId: item.id, patch, idempotencyKey: key }, { onSuccess: onClose });
      }}
    >
      {({ submitForm, resetForm, dirty }) => (
        <Modal
          open={Boolean(item)}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          title="Ubah baris"
          description="Mengubah baris mereset tanda baca karyawan pada seluruh baris lembar ini."
          footer={
            <Footer onCancel={onClose} onSubmit={submitForm} pending={update.isPending} label="Simpan perubahan" disabled={!dirty} />
          }
        >
          <Form className="grid gap-4">
            <TextField name="target" label="Target" required maxLength={500} />
            {additional ? (
              <TextField name="rawWeight" label="Bobot mentah" required type="number" min={0} max={9999.99} step="0.01" />
            ) : (
              item && (
                <Banner tone="info">
                  Bobot baris master ({formatWeight(item.rawWeight)}) dikunci HR di daftar induk — hanya target yang dapat
                  diubah.
                </Banner>
              )
            )}
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/** `P3.07` — hanya baris tambahan; tombol hapus baris master memang tidak dirender. */
export function DeleteLineDialog({ sheetId, item, onClose }: { sheetId: string; item: SheetItem | null; onClose: () => void }) {
  const { actor } = usePerfActor();
  const remove = useDeleteItem(actor, sheetId);
  const key = useOpenKey(Boolean(item));
  return (
    <ConfirmDialog
      open={Boolean(item)}
      title="Hapus baris tambahan?"
      description="Baris ini keluar dari lembar dan porsi bobot dihitung ulang dari baris yang tersisa."
      confirmLabel="Hapus baris"
      loading={remove.isPending}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={() => item && remove.mutate({ itemId: item.id, idempotencyKey: key }, { onSuccess: onClose })}
    >
      {item && <LineContext item={item} />}
    </ConfirmDialog>
  );
}

/** E6 / `P4.01` — porsi bobot beku permanen, instans alur kerja dimulai saat itu juga. */
export function SubmitSheetDialog({
  open,
  sheetId,
  resubmit,
  onClose,
}: {
  open: boolean;
  sheetId: string;
  resubmit: boolean;
  onClose: () => void;
}) {
  const { actor } = usePerfActor();
  const submit = useSubmitSheet(actor, sheetId);
  return (
    <ConfirmDialog
      open={open}
      title={resubmit ? 'Ajukan ulang lembar?' : 'Ajukan lembar?'}
      description={
        resubmit
          ? 'Lembar diajukan sebagai putaran berikutnya kepada penyetuju.'
          : 'Porsi bobot dibekukan permanen dan lembar diteruskan ke penyetuju. Baris tidak dapat ditambah atau diubah lagi.'
      }
      confirmLabel={resubmit ? 'Ajukan ulang' : 'Ajukan lembar'}
      tone="primary"
      loading={submit.isPending}
      onOpenChange={(next) => !next && onClose()}
      onConfirm={() =>
        submit.mutate(undefined, {
          onSuccess: (result) => {
            toast(
              `Lembar diajukan, menunggu persetujuan ${result.approver.name} (siklus ${result.cycleNo}, putaran ${result.roundNo}).`,
              'ok',
            );
            onClose();
          },
        })
      }
    />
  );
}
