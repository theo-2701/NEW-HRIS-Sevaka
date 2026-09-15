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
import { PanelActionButton, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TextField } from '@/components/form/TextField';
import { ToggleField } from '@/components/form/ToggleField';
import { Note, SnapshotPanel, SnapshotRow } from '@/features/reprimand/components/ReprimandBits';
import {
  useReprimandCategories,
  useReprimandPolicy,
  useReprimandPolicyVersions,
  useSaveCategory,
  useSavePolicy,
} from '@/features/reprimand/hooks/useReprimand';
import { categorySchema } from '@/features/reprimand/validation';
import type { PolicyMode, PolicyVersion, ReprimandCategory } from '@/features/reprimand/types';
import { formatDate } from '@/lib/format';

const EMPTY_CATEGORY: ReprimandCategory = {
  code: '',
  label: '',
  point: 0,
  validityMonths: 6,
  levelOrder: 1,
  terminal: false,
  performanceWeight: 0,
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
              maxLength={30}
              placeholder="mis. SP4"
              className="uppercase"
              hint="Huruf kapital, angka, dan garis bawah saja. Harus unik."
            />
            <TextField name="label" label="Nama kategori" required maxLength={150} placeholder="mis. Surat Peringatan 4" />

            <div className="grid gap-4 md:grid-cols-2">
              <TextField name="point" type="number" min={0} max={99} label="Poin demerit" required />
              <TextField name="validityMonths" type="number" min={1} max={120} label="Masa berlaku (bulan)" required />
              <TextField name="levelOrder" type="number" min={0} max={99} label="Urutan level" required />
              <TextField
                name="performanceWeight"
                type="number"
                min={0}
                step="0.01"
                label="Bobot kinerja"
                required
                hint="performance_weight — kontribusi ke skor kinerja."
              />
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
 * Kontrak UIC-EMPLOYEE 0.27 §7.5 (kategori CRU, tanpa delete, non-retroaktif) dan
 * §7.6 (kebijakan append-only berversi; rilis ini hanya DIRECT).
 */
export function ReprimandTypeSettingPage() {
  const { data: categories = [], isLoading } = useReprimandCategories();
  const { data: savedMode = 'DIRECT' } = useReprimandPolicy();
  const savePolicy = useSavePolicy();
  const { data: versions = [] } = useReprimandPolicyVersions();

  const [mode, setMode] = useState<PolicyMode>(savedMode);
  const [editing, setEditing] = useState<{ value: ReprimandCategory; originalCode?: string } | null>(null);

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
            Kontrak terbit (UIC-EMPLOYEE §7.5/§7.6): kategori <strong>CRU tanpa delete</strong> dan non-retroaktif;
            kebijakan <strong>append-only berversi</strong>. Rilis ini hanya mengaktifkan mode DIRECT — menerbitkan
            ACCUMULATIVE ditolak <strong>422</strong>.
          </Note>

          <Card>
            <CardHead
              title="SP categories"
              sub="Create / read / update · tanpa delete (UIC §7.5)"
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
                { key: 'weight', header: 'Perf. Weight', align: 'center', render: (row) => row.performanceWeight },
                {
                  key: 'terminal',
                  header: 'Terminal',
                  align: 'center',
                  render: (row) =>
                    row.terminal ? <StatusBadge tone="err">Terminal</StatusBadge> : <span className="text-fg-3">—</span>,
                },
              ]}
              actions={(row) => (
                <RowButton onClick={() => setEditing({ value: row, originalCode: row.code })}>Edit</RowButton>
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
                      'Standing diturunkan dengan menjumlahkan poin demerit aktif terhadap ambang di bawah ini. Belum aktif pada rilis ini — menerbitkannya ditolak 422.',
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

            <DataTable<PolicyVersion>
              rows={versions}
              rowKey={(row) => row.id}
              empty="Belum ada versi kebijakan."
              columns={[
                { key: 'version', header: 'Version', strong: true, render: (row) => `v${row.version}` },
                { key: 'mode', header: 'Mode', render: (row) => row.mode },
                { key: 'from', header: 'Effective From', muted: true, render: (row) => formatDate(row.effectiveFrom) },
                {
                  key: 'current',
                  header: 'Current',
                  render: (row) => (row.isCurrent ? <StatusBadge tone="ok">Current</StatusBadge> : <span className="text-fg-3">—</span>),
                },
              ]}
            />

            <div className="flex flex-wrap justify-end gap-2 border-t border-border-1 pt-4">
              <Button variant="secondary" onClick={() => setMode(savedMode)} disabled={mode === savedMode}>
                Reset
              </Button>
              <Button
                onClick={() => savePolicy.mutate({ mode })}
                disabled={savePolicy.isPending || mode === savedMode}
              >
                {savePolicy.isPending ? 'Menerbitkan…' : 'Publish new version'}
              </Button>
            </div>
          </Card>
        </div>
      </PageShell>

      <CategoryEditor category={editing} onClose={() => setEditing(null)} />

    </>
  );
}
