import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton, RowActions } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { BranchFormModal, BranchGroupFormModal } from '@/features/company/components/CompanyModals';
import {
  useBranchGroups,
  useBranches,
  useCompanySetup,
  useDeleteBranch,
  useDeleteBranchGroup,
} from '@/features/company/hooks/useCompany';
import { branchCity, branchProvince } from '@/features/company/rules';
import type { Branch, BranchGroup } from '@/features/company/types';
import { formatCurrency } from '@/lib/format';

type Tab = 'branches' | 'groups';

/**
 * Settings › Company › Branch — port `_prototype/company-branch.html`
 * (FSD-001-COMPANY-0.32 §1 · UIC-001-COMPANY-0.22 §2.1–§2.2).
 *
 * Kode cabang unik antar cabang aktif dan terkunci setelah dibuat; provinsi, kota, dan zona
 * waktu ikut kode pos. Tab kategori hanya muncul bila hierarki cabang menyala di Company Setup.
 */
export function BranchPage() {
  const setup = useCompanySetup();
  const hierarchy = setup.data?.branchHierarchyMode === 'ENABLED';

  const [tab, setTab] = useState<Tab>('branches');
  const [search, setSearch] = useState('');
  const [branchForm, setBranchForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [groupForm, setGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<BranchGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<BranchGroup | null>(null);

  const branches = useBranches(search);
  const groups = useBranchGroups(hierarchy);
  const deleteBranch = useDeleteBranch();
  const deleteGroup = useDeleteBranchGroup();

  const branchRows = useMemo(() => branches.data ?? [], [branches.data]);
  const groupRows = useMemo(() => groups.data ?? [], [groups.data]);
  const pagedBranches = usePagedRows(branchRows);
  const pagedGroups = usePagedRows(groupRows);
  const groupName = (id: string) => groupRows.find((row) => row.id === id)?.name ?? '—';

  const closeBranchForm = () => {
    setBranchForm(false);
    setEditingBranch(null);
  };
  const closeGroupForm = () => {
    setGroupForm(false);
    setEditingGroup(null);
  };

  return (
    <PageShell
      crumbs={[{ label: 'Settings' }, { label: 'Company' }, { label: 'Branch' }]}
      title="Branch"
      description="Daftar cabang perusahaan beserta jam kerja, upah minimum wilayah, dan titik acuan absensinya."
    >
      <div className="flex flex-col gap-5">
        {hierarchy && (
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'branches', label: 'Cabang', count: branchRows.length },
              { value: 'groups', label: 'Kategori cabang', count: groupRows.length },
            ]}
          />
        )}

        {(!hierarchy || tab === 'branches') && (
          <Card>
            <CardHead
              title="Cabang"
              sub="Kode cabang terkunci setelah dibuat; provinsi, kota, dan zona waktu mengikuti kode pos"
            />
            <div>
              <TableToolbar
                search={{ value: search, onChange: setSearch, placeholder: 'Cari nama cabang' }}
                actions={<AddButton onClick={() => setBranchForm(true)}>Add Branch</AddButton>}
              />
              <DataTable<Branch>
                rows={pagedBranches.rows}
                rowKey={(row) => row.id}
                loading={branches.isLoading}
                empty={branches.error ? String(branches.error.message) : 'Belum ada cabang terdaftar.'}
                columns={[
                  { key: 'name', header: 'Cabang', strong: true, render: (row) => row.branchName },
                  {
                    key: 'code',
                    header: 'Kode',
                    nowrap: true,
                    render: (row) => <span className="font-mono text-xs">{row.branchCode}</span>,
                  },
                  { key: 'group', header: 'Kategori', render: (row) => groupName(row.branchGroupId) },
                  {
                    key: 'parent',
                    header: 'Induk',
                    muted: true,
                    render: (row) => row.parentInfo?.branchName ?? 'Tanpa induk',
                  },
                  {
                    key: 'area',
                    header: 'Wilayah',
                    render: (row) => `${branchCity(row)}, ${branchProvince(row)}`,
                  },
                  { key: 'tz', header: 'Zona waktu', muted: true, nowrap: true, render: (row) => row.zip.timezone },
                  {
                    key: 'wage',
                    header: 'Upah minimum',
                    align: 'right',
                    render: (row) => <span className="tabular-nums">{formatCurrency(row.regionalWage)}</span>,
                  },
                  {
                    key: 'work',
                    header: 'Jam kerja',
                    nowrap: true,
                    render: (row) => `${row.workDaysPerWeek} hari · ${row.workHoursPerDay} jam`,
                  },
                  {
                    key: 'people',
                    header: 'Karyawan',
                    align: 'center',
                    render: (row) => <span className="tabular-nums">{row.employeeCount}</span>,
                  },
                ]}
                actions={(row) => (
                  <RowActions
                    actions={[
                      {
                        label: 'Ubah',
                        onSelect: () => {
                          setEditingBranch(row);
                          setBranchForm(true);
                        },
                      },
                      { label: 'Hapus', danger: true, onSelect: () => setDeletingBranch(row) },
                    ]}
                  />
                )}
              />
              <Pagination
                page={pagedBranches.page}
                pageSize={pagedBranches.pageSize}
                total={pagedBranches.total}
                noun="branches"
                onPageChange={pagedBranches.setPage}
                onPageSizeChange={pagedBranches.setPageSize}
              />
            </div>
          </Card>
        )}

        {hierarchy && tab === 'groups' && (
          <Card>
            <CardHead
              title="Kategori cabang"
              sub="Urutan level menentukan kedalaman cabang; kategori juga menentukan siapa yang boleh melihat data cabang di bawahnya"
            />
            <div>
              <TableToolbar actions={<AddButton onClick={() => setGroupForm(true)}>Add Category</AddButton>} />
              <DataTable<BranchGroup>
                rows={pagedGroups.rows}
                rowKey={(row) => row.id}
                loading={groups.isLoading}
                empty={groups.error ? String(groups.error.message) : 'Belum ada kategori cabang.'}
                columns={[
                  { key: 'name', header: 'Kategori', strong: true, render: (row) => row.name },
                  {
                    key: 'order',
                    header: 'Urutan level',
                    align: 'center',
                    render: (row) => <span className="tabular-nums">{row.levelOrder}</span>,
                  },
                  {
                    key: 'view',
                    header: 'Lihat data turunan',
                    render: (row) =>
                      row.canViewChildData ? (
                        <StatusBadge tone="ok">Boleh</StatusBadge>
                      ) : (
                        <StatusBadge tone="mute">Tidak</StatusBadge>
                      ),
                  },
                  {
                    key: 'used',
                    header: 'Dipakai cabang',
                    align: 'center',
                    muted: true,
                    render: (row) => (
                      <span className="tabular-nums">
                        {branchRows.filter((branch) => branch.branchGroupId === row.id).length}
                      </span>
                    ),
                  },
                ]}
                actions={(row) => (
                  <RowActions
                    actions={[
                      {
                        label: 'Ubah',
                        onSelect: () => {
                          setEditingGroup(row);
                          setGroupForm(true);
                        },
                      },
                      { label: 'Hapus', danger: true, onSelect: () => setDeletingGroup(row) },
                    ]}
                  />
                )}
              />
              <Pagination
                page={pagedGroups.page}
                pageSize={pagedGroups.pageSize}
                total={pagedGroups.total}
                noun="categories"
                onPageChange={pagedGroups.setPage}
                onPageSizeChange={pagedGroups.setPageSize}
              />
            </div>
          </Card>
        )}
      </div>

      <BranchFormModal
        open={branchForm}
        editing={editingBranch}
        groups={groupRows}
        branches={branchRows}
        hierarchy={hierarchy}
        onClose={closeBranchForm}
      />
      <BranchGroupFormModal open={groupForm} editing={editingGroup} onClose={closeGroupForm} />

      <ConfirmDialog
        open={Boolean(deletingBranch)}
        title="Hapus cabang ini?"
        description={
          deletingBranch
            ? `${deletingBranch.branchName} tidak lagi bisa dipilih. Cabang yang masih menjadi induk cabang lain tidak bisa dihapus.`
            : undefined
        }
        loading={deleteBranch.isPending}
        onOpenChange={(open) => !open && setDeletingBranch(null)}
        onConfirm={() =>
          deletingBranch &&
          deleteBranch.mutate(deletingBranch.id, { onSuccess: () => setDeletingBranch(null) })
        }
      />
      <ConfirmDialog
        open={Boolean(deletingGroup)}
        title="Hapus kategori cabang ini?"
        description={
          deletingGroup
            ? `${deletingGroup.name} hanya bisa dihapus bila tidak ada cabang aktif yang memakainya.`
            : undefined
        }
        loading={deleteGroup.isPending}
        onOpenChange={(open) => !open && setDeletingGroup(null)}
        onConfirm={() => deletingGroup && deleteGroup.mutate(deletingGroup.id, { onSuccess: () => setDeletingGroup(null) })}
      />
    </PageShell>
  );
}
