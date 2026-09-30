import { useMemo } from 'react';
import { Form, Formik } from 'formik';
import { Info } from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { ToggleField } from '@/components/form/ToggleField';
import { useCreateKpi, useDeactivateKpi, useJobGrades, useKpiItem, useUpdateKpi } from '@/features/performance/hooks/useKpi';
import { formatWeight } from '@/features/performance/format';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import { kpiSchema } from '@/features/performance/validation';
import { TARGET_TYPE_LABEL, type KpiDraft, type KpiItem, type TargetType } from '@/features/performance/types';

export function TargetTypeBadge({ type }: { type: TargetType }) {
  return <StatusBadge tone={type === 'NUMERIC' ? 'info' : 'brand'}>{TARGET_TYPE_LABEL[type]}</StatusBadge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return <StatusBadge tone={active ? 'ok' : 'mute'}>{active ? 'Aktif' : 'Nonaktif'}</StatusBadge>;
}

interface FormValues {
  itemName: string;
  jobGradeId: string;
  targetType: TargetType | '';
  rawWeight: string;
  isActive: boolean;
}

const note = (text: string) => (
  <p className="m-0 flex items-start gap-2.5 rounded-md border border-primary-200 bg-primary-50 px-3.5 py-2.5 font-body text-[12px] font-medium leading-normal text-secondary-900 md:col-span-2">
    <Info className="mt-0.5 size-3.5 shrink-0 text-secondary-700" />
    {text}
  </p>
);

/** KPM-2 (buat) / KPM-3 (ubah, parsial — hanya field yang berubah dikirim). */
export function KpiFormModal({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: KpiItem | null;
  onClose: () => void;
}) {
  const { actor } = usePerfActor();
  const grades = useJobGrades(actor, open);
  const detail = useKpiItem(actor, open && editing ? editing.id : null);
  const create = useCreateKpi(actor);
  const update = useUpdateKpi(actor);
  const pending = create.isPending || update.isPending;
  /* Satu kunci per pembukaan modal: klik ganda tidak membuat baris kedua. */
  const idempotencyKey = useMemo(() => (open ? crypto.randomUUID() : ''), [open]);

  const initialValues: FormValues = editing
    ? {
        itemName: editing.itemName,
        jobGradeId: editing.jobGradeId,
        targetType: editing.targetType,
        rawWeight: String(editing.rawWeight),
        isActive: editing.isActive,
      }
    : { itemName: '', jobGradeId: '', targetType: '', rawWeight: '', isActive: true };

  const submit = (values: FormValues) => {
    const draft: KpiDraft = {
      itemName: values.itemName.trim(),
      jobGradeId: values.jobGradeId,
      targetType: values.targetType as TargetType,
      rawWeight: Number(values.rawWeight),
      isActive: values.isActive,
    };
    if (!editing) {
      create.mutate({ draft, idempotencyKey }, { onSuccess: onClose });
      return;
    }
    const patch: Partial<KpiDraft> = {};
    if (draft.itemName !== editing.itemName) patch.itemName = draft.itemName;
    if (draft.jobGradeId !== editing.jobGradeId) patch.jobGradeId = draft.jobGradeId;
    if (draft.targetType !== editing.targetType) patch.targetType = draft.targetType;
    if (draft.rawWeight !== editing.rawWeight) patch.rawWeight = draft.rawWeight;
    if (draft.isActive !== editing.isActive) patch.isActive = draft.isActive;
    update.mutate({ id: editing.id, patch }, { onSuccess: onClose });
  };

  const gradeOptions = (grades.data ?? []).map((row) => ({ value: row.id, label: row.name }));
  if (editing && !gradeOptions.some((option) => option.value === editing.jobGradeId)) {
    gradeOptions.unshift({ value: editing.jobGradeId, label: editing.jobGradeNameSnapshot });
  }

  return (
    <Formik<FormValues> initialValues={initialValues} validationSchema={kpiSchema} enableReinitialize onSubmit={submit}>
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
          title={editing ? 'Ubah item daftar induk' : 'Buat item daftar induk'}
          description={
            editing
              ? detail.data
                ? `Dipakai di ${detail.data.usedInSheetCount} lembar berjalan.`
                : 'Memuat pemakaian…'
              : 'Bobot mentah tidak wajib berjumlah 100 — porsi persen dihitung di lembar penilaian.'
          }
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={pending || (Boolean(editing) && !dirty)}>
                {pending ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Simpan'}
              </Button>
            </>
          }
        >
          <Form className="grid gap-4 md:grid-cols-2">
            <TextField name="itemName" label="Nama item" required maxLength={255} containerClassName="md:col-span-2" />
            <SelectField
              name="jobGradeId"
              label="Golongan jabatan"
              required
              placeholder="Pilih golongan"
              options={gradeOptions}
            />
            <SelectField
              name="targetType"
              label="Jenis target"
              required
              placeholder="Pilih jenis target"
              options={[
                { value: 'NUMERIC', label: TARGET_TYPE_LABEL.NUMERIC },
                { value: 'NARRATIVE', label: TARGET_TYPE_LABEL.NARRATIVE },
              ]}
            />
            <TextField name="rawWeight" label="Bobot mentah" required type="number" min={0} max={9999.99} step="0.01" />
            <ToggleField name="isActive" label="Aktif" hint="Item nonaktif tidak muncul di permukaan Browsing atasan." />
            {editing &&
              note('Perubahan berlaku segera dan tidak menyentuh lembar yang sudah menyalin item ini — lembar memakai salinannya sendiri.')}
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/** KPM-4 — pemakaian di lembar hanya informasi; tombol tetap aktif. */
export function DeactivateKpiDialog({ item, onClose }: { item: KpiItem | null; onClose: () => void }) {
  const { actor } = usePerfActor();
  const detail = useKpiItem(actor, item?.id ?? null);
  const deactivate = useDeactivateKpi(actor);
  const used = detail.data?.usedInSheetCount;

  return (
    <ConfirmDialog
      open={Boolean(item)}
      title="Nonaktifkan item?"
      description={
        used === undefined
          ? 'Memuat pemakaian…'
          : `Dipakai di ${used} lembar berjalan — tidak memblokir. Baris keluar dari daftar induk (berbeda dari status Nonaktif); lembar yang sudah menyalinnya tidak berubah.`
      }
      confirmLabel="Nonaktifkan"
      tone="danger"
      loading={deactivate.isPending}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={() => item && deactivate.mutate(item.id, { onSuccess: onClose })}
    >
      {item && (
        <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 rounded-md border border-border-1 bg-cloud px-3.5 py-3 font-body text-[13px]">
          <dt className="font-medium text-fg-3">Nama item</dt>
          <dd className="m-0 font-semibold text-fg-1">{item.itemName}</dd>
          <dt className="font-medium text-fg-3">Golongan</dt>
          <dd className="m-0 font-semibold text-fg-1">{item.jobGradeNameSnapshot}</dd>
          <dt className="font-medium text-fg-3">Jenis target</dt>
          <dd className="m-0">
            <TargetTypeBadge type={item.targetType} />
          </dd>
          <dt className="font-medium text-fg-3">Bobot mentah</dt>
          <dd className="m-0 font-semibold text-fg-1 tabular-nums">{formatWeight(item.rawWeight)}</dd>
        </dl>
      )}
    </ConfirmDialog>
  );
}
