import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
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
import { BranchFormModal, BranchGroupFormModal } from '@/features/company/components/BranchModals';
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

/** Kolom penanda (FSD-COMPANY 0.58 §1.2.2): lencana HQ dan ikon kop surat cabang. */
function BranchMarks({ branch }: { branch: Branch }) {
  if (!branch.isHeadOffice && !branch.useBranchLetterhead) return <span className="text-fg-4">—</span>;
  return (
    <span className="flex items-center gap-2">
      {branch.isHeadOffice && <StatusBadge tone="info">HQ</StatusBadge>}
      {branch.useBranchLetterhead && (
        <span title="Uses the branch letterhead" className="inline-flex text-secondary-700 [&_svg]:size-4">
          <FileText aria-label="Uses the branch letterhead" />
        </span>
      )}
    </span>
  );
}

/**
 * Settings › Company › Branch — FSD-COMPANY 0.56–0.60 §1 · UIC-COMPANY 0.42–0.45 §2.1–§2.2.
 *
 * Kode cabang unik antar cabang aktif dan terkunci setelah dibuat; provinsi, kota, dan zona waktu ikut kode pos.
 * Tab kategori hanya muncul bila hierarki cabang menyala di Company Setup. Induk cabang mengikuti level kategori.
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
  const allBranches = useBranches('');
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
      description="Company branches with their working hours, regional wage, and clock-in points."
    >
      <div className="flex flex-col gap-5">
        {hierarchy && (
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'branches', label: 'Branch List', count: branchRows.length },
              { value: 'groups', label: 'Branch Category', count: groupRows.length },
            ]}
          />
        )}

        {(!hierarchy || tab === 'branches') && (
          <Card>
            <CardHead title="Branch List" sub="The branch code is locked once created; province, city, and time zone follow the zip code" />
            <div>
              <TableToolbar
                search={{ value: search, onChange: setSearch, placeholder: 'Search branch name' }}
                actions={<AddButton onClick={() => setBranchForm(true)}>Add Branch</AddButton>}
              />
              <DataTable<Branch>
                rows={pagedBranches.rows}
                rowKey={(row) => row.id}
                loading={branches.isLoading}
                empty={branches.error ? String(branches.error.message) : 'No branch yet.'}
                columns={[
                  { key: 'name', header: 'Branch', strong: true, render: (row) => row.branchName },
                  { key: 'code', header: 'Code', nowrap: true, render: (row) => <span className="font-mono text-xs">{row.branchCode}</span> },
                  { key: 'marks', header: 'Marks', render: (row) => <BranchMarks branch={row} /> },
                  ...(hierarchy
                    ? [
                        { key: 'group', header: 'Category', render: (row: Branch) => groupName(row.branchGroupId) },
                        { key: 'parent', header: 'Parent', muted: true, render: (row: Branch) => row.parentInfo?.branchName ?? '—' },
                      ]
                    : []),
                  { key: 'area', header: 'Area', render: (row) => `${branchCity(row)}, ${branchProvince(row)}` },
                  { key: 'tz', header: 'Time Zone', muted: true, nowrap: true, render: (row) => row.zip.timezone },
                  {
                    key: 'wage',
                    header: 'Regional Wage',
                    align: 'right',
                    render: (row) => <span className="tabular-nums">{formatCurrency(row.regionalWage)}</span>,
                  },
                  {
                    key: 'work',
                    header: 'Working Time',
                    nowrap: true,
                    render: (row) => `${row.workDaysPerWeek} days · ${row.workHoursPerDay} h`,
                  },
                  {
                    key: 'people',
                    header: 'Employees',
                    align: 'center',
                    render: (row) => <span className="tabular-nums">{row.employeeCount}</span>,
                  },
                ]}
                actions={(row) => (
                  <RowActions
                    actions={[
                      {
                        label: 'Edit',
                        onSelect: () => {
                          setEditingBranch(row);
                          setBranchForm(true);
                        },
                      },
                      { label: 'Delete', danger: true, onSelect: () => setDeletingBranch(row) },
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
            <CardHead title="Branch Category" sub="A smaller level order is a higher level; a branch's parent must be at a higher level" />
            <div>
              <TableToolbar actions={<AddButton onClick={() => setGroupForm(true)}>Add Category</AddButton>} />
              <DataTable<BranchGroup>
                rows={pagedGroups.rows}
                rowKey={(row) => row.id}
                loading={groups.isLoading}
                empty={groups.error ? String(groups.error.message) : 'No branch category yet.'}
                columns={[
                  { key: 'name', header: 'Category', strong: true, render: (row) => row.name },
                  {
                    key: 'order',
                    header: 'Level Order',
                    align: 'center',
                    render: (row) => <span className="tabular-nums">{row.levelOrder}</span>,
                  },
                  {
                    key: 'used',
                    header: 'Branches',
                    align: 'center',
                    muted: true,
                    render: (row) => (
                      <span className="tabular-nums">
                        {(allBranches.data ?? []).filter((branch) => branch.branchGroupId === row.id).length}
                      </span>
                    ),
                  },
                ]}
                actions={(row) => (
                  <RowActions
                    actions={[
                      {
                        label: 'Edit',
                        onSelect: () => {
                          setEditingGroup(row);
                          setGroupForm(true);
                        },
                      },
                      { label: 'Delete', danger: true, onSelect: () => setDeletingGroup(row) },
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
        branches={allBranches.data ?? []}
        hierarchy={hierarchy}
        onClose={closeBranchForm}
      />
      <BranchGroupFormModal open={groupForm} editing={editingGroup} onClose={closeGroupForm} />

      <ConfirmDialog
        open={Boolean(deletingBranch)}
        title="Delete this branch?"
        description={
          deletingBranch
            ? `${deletingBranch.branchName} will no longer be selectable. A branch that is still the parent of another branch, or the main branch, cannot be deleted.`
            : undefined
        }
        loading={deleteBranch.isPending}
        onOpenChange={(open) => !open && setDeletingBranch(null)}
        onConfirm={() => deletingBranch && deleteBranch.mutate(deletingBranch.id, { onSuccess: () => setDeletingBranch(null) })}
      />
      <ConfirmDialog
        open={Boolean(deletingGroup)}
        title="Delete this branch category?"
        description={deletingGroup ? `${deletingGroup.name} can be deleted only when no active branch uses it.` : undefined}
        loading={deleteGroup.isPending}
        onOpenChange={(open) => !open && setDeletingGroup(null)}
        onConfirm={() => deletingGroup && deleteGroup.mutate(deletingGroup.id, { onSuccess: () => setDeletingGroup(null) })}
      />
    </PageShell>
  );
}
