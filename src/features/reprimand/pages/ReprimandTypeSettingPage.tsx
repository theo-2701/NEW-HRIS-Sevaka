import { useEffect, useState } from 'react';
import { Form, Formik } from 'formik';
import { Info, TriangleAlert } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioBranch } from '@/components/RadioBranch';
import { RowActions, PanelActionButton } from '@/components/RowActions';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { TextField } from '@/components/form/TextField';
import { ToggleField } from '@/components/form/ToggleField';
import { Note, SnapshotPanel, SnapshotRow } from '@/features/reprimand/components/ReprimandBits';
import {
  useDeactivateCategory,
  useReprimandCategories,
  useReprimandPolicy,
  useSaveCategory,
  useSavePolicy,
} from '@/features/reprimand/hooks/useReprimand';
import { categorySchema } from '@/features/reprimand/validation';
import type { PolicyMode, ReprimandCategory } from '@/features/reprimand/types';

const EMPTY_CATEGORY: ReprimandCategory = {
  code: '',
  label: '',
  point: 0,
  validityMonths: 6,
  levelOrder: 1,
  terminal: false,
  active: true,
};

/** Editor kategori — dipakai untuk create dan update (tanpa hard-delete). */
function CategoryEditor({
  category,
  onClose,
}: {
  category: { value: ReprimandCategory; originalCode?: string } | null;
  onClose: () => void;
}) {
  const save = useSaveCategory();

  return (
    <Formik<ReprimandCategory>
      initialValues={category?.value ?? EMPTY_CATEGORY}
      enableReinitialize
      validationSchema={categorySchema}
      onSubmit={(values, helpers) =>
        save.mutate(
          { category: { ...values, active: true }, originalCode: category?.originalCode },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(category)}
          onOpenChange={(open) => !open && onClose()}
          size="wide"
          title={category?.originalCode ? 'Edit category' : 'Add category'}
          description="Field di sini memetakan cnf_reprimand_category. Kode inilah yang dipakai saat menerbitkan reprimand."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={save.isPending}>
                {save.isPending ? 'Menyimpan…' : 'Save category'}
              </Button>
            </>
          }
        >
          <Form className="flex flex-col gap-4">
            <TextField
              name="code"
              label="Kode"
              required
              maxLength={16}
              placeholder="mis. SP4"
              className="uppercase"
              hint="Huruf kapital, angka, dan garis bawah saja. Harus unik."
            />
            <TextField name="label" label="Nama kategori" required maxLength={60} placeholder="mis. SP4 — skorsing" />

            <div className="grid gap-4 md:grid-cols-2">
              <TextField name="point" type="number" min={0} max={99} label="Poin demerit" required />
              <TextField name="validityMonths" type="number" min={0} max={120} label="Masa berlaku (bulan)" required />
              <TextField name="levelOrder" type="number" min={0} max={99} label="Urutan level" required />
              <ToggleField
                name="terminal"
                label="Terminal"
                hint="Kategori terminal langsung mengunci standing ke Final warning."
              />
            </div>
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/**
 * Reprimand Type Setting — port `_prototype/reprimand-type-setting.html`.
 *
 * **GAP:** endpoint CRU `cnf_reprimand_category` / `cnf_reprimand_policy`
 * belum dispesifikasi di TSD §7.7. Layar ini mengikuti model terdokumentasi;
 * penegakannya ditunda sampai kontraknya ada.
 */
export function ReprimandTypeSettingPage() {
  const { data: categories = [], isLoading } = useReprimandCategories();
  const { data: savedMode = 'DIRECT' } = useReprimandPolicy();
  const savePolicy = useSavePolicy();
  const deactivate = useDeactivateCategory();

  const [mode, setMode] = useState<PolicyMode>(savedMode);
  const [editing, setEditing] = useState<{ value: ReprimandCategory; originalCode?: string } | null>(null);
  const [deactivating, setDeactivating] = useState<ReprimandCategory | null>(null);

  useEffect(() => setMode(savedMode), [savedMode]);

  const activeCategories = categories.filter((row) => row.active).sort((a, b) => a.levelOrder - b.levelOrder);

  return (
    <>
      <PageShell
        crumbs={[
          { label: 'Employee Management' },
          { label: 'Reprimand', to: '/employees/reprimand' },
          { label: 'Type Setting' },
        ]}
        title="Reprimand Type Setting"
        description="Atur kategori SP dan kebijakan standing untuk perusahaan ini (create / read / update — tanpa hard-delete). Standing selalu diturunkan dari snapshot beku saat penerbitan, bukan dari konfigurasi yang berlaku."
      >
        <div className="flex flex-col gap-5">
          <Note tone="warn" icon={<TriangleAlert />}>
            <strong>GAP</strong> — endpoint CRU untuk <code className="font-mono">cnf_reprimand_category</code> /{' '}
            <code className="font-mono">cnf_reprimand_policy</code> (dual-mode) <strong>belum dispesifikasi</strong>{' '}
            di kontrak API. Layar ini mengikuti model terdokumentasi; penegakannya ditunda.
          </Note>

          <Card>
            <CardHead
              title="SP categories"
              sub="Create / read / update · nonaktifkan, tanpa hard-delete"
              action={
                <PanelActionButton onClick={() => setEditing({ value: EMPTY_CATEGORY })}>
                  Add category
                </PanelActionButton>
              }
            />

            <DataTable<ReprimandCategory>
              rows={activeCategories}
              rowKey={(row) => row.code}
              loading={isLoading}
              empty="Belum ada kategori aktif."
              columns={[
                { key: 'code', header: 'Code', strong: true, nowrap: true, render: (row) => row.code },
                { key: 'label', header: 'Nama', muted: true, render: (row) => row.label },
                { key: 'point', header: 'Demerit', align: 'center', render: (row) => row.point },
                { key: 'validity', header: 'Validity (mo)', align: 'center', render: (row) => row.validityMonths },
                { key: 'level', header: 'Level', align: 'center', render: (row) => row.levelOrder },
                {
                  key: 'terminal',
                  header: 'Terminal',
                  align: 'center',
                  render: (row) =>
                    row.terminal ? <StatusBadge tone="err">Terminal</StatusBadge> : <span className="text-fg-3">—</span>,
                },
              ]}
              actions={(row) => (
                <RowActions
                  actions={[
                    { label: 'Edit', onSelect: () => setEditing({ value: row, originalCode: row.code }) },
                    { label: 'Deactivate', danger: true, onSelect: () => setDeactivating(row) },
                  ]}
                />
              )}
            />
          </Card>

          <Card>
            <CardHead title="Standing policy" sub="Satu mode per perusahaan" />

            <Note icon={<Info />}>
              Kebijakan standing menentukan <strong>bagaimana perusahaan mengubah reprimand aktif menjadi level
              standing</strong> karyawan.
            </Note>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-mode">
                Mode kebijakan<em>*</em>
              </Label>
              <RadioBranch<PolicyMode>
                name="policy-mode"
                value={mode}
                onChange={setMode}
                options={[
                  {
                    value: 'DIRECT',
                    title: 'Direct',
                    description:
                      'Standing mengikuti urutan level SP aktif tertinggi; tiap kategori langsung memetakan ke satu level. Tidak perlu konfigurasi tambahan.',
                  },
                  {
                    value: 'ACCUMULATIVE',
                    title: 'Accumulative',
                    description:
                      'Standing diturunkan dengan menjumlahkan poin demerit aktif terhadap ambang di bawah ini.',
                  },
                ]}
              />
            </div>

            {mode === 'ACCUMULATIVE' && (
              <SnapshotPanel title="Ambang (khusus accumulative)">
                <SnapshotRow label="≥ 1 poin">Level SP1</SnapshotRow>
                <SnapshotRow label="≥ 2 poin">Level SP2</SnapshotRow>
                <SnapshotRow label="≥ 3 poin">Final warning (terminal)</SnapshotRow>
              </SnapshotPanel>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-border-1 pt-4">
              <Button variant="secondary" onClick={() => setMode(savedMode)} disabled={mode === savedMode}>
                Reset
              </Button>
              <Button
                onClick={() => savePolicy.mutate({ mode })}
                disabled={savePolicy.isPending || mode === savedMode}
              >
                {savePolicy.isPending ? 'Menyimpan…' : 'Save policy'}
              </Button>
            </div>
          </Card>
        </div>
      </PageShell>

      <CategoryEditor category={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={Boolean(deactivating)}
        title="Nonaktifkan kategori?"
        description={`${deactivating?.code ?? ''} tidak lagi bisa dipilih saat menerbitkan reprimand. Reprimand lama tetap memakai snapshot-nya sendiri.`}
        confirmLabel="Deactivate"
        loading={deactivate.isPending}
        onOpenChange={(open) => !open && setDeactivating(null)}
        onConfirm={() =>
          deactivating &&
          deactivate.mutate({ code: deactivating.code }, { onSuccess: () => setDeactivating(null) })
        }
      />
    </>
  );
}
