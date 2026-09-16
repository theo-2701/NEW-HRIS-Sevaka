import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton, RowActions, RowButton } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import { SbuFormModal, SbuGroupFormModal } from '@/features/company/components/CompanyModals';
import { useCompanySetup, useDeleteSbu, useSbuGroups, useSbus } from '@/features/company/hooks/useCompany';
import { personName } from '@/features/company/mock-data';
import type { Sbu, SbuGroup } from '@/features/company/types';

type Tab = 'sbu' | 'groups';

/**
 * Settings › Company › SBU — port `_prototype/company-sbu.html`
 * (UIC-001-COMPANY-0.9 §2.6).
 *
 * Unit bisnis strategis dipakai untuk membaca kinerja per lini usaha. Menu ini hanya terbuka
 * bila penetapan SBU dinyalakan di Company Setup.
 */
export function SbuPage() {
  const setup = useCompanySetup();
  const enabled = setup.data?.sbuAssignmentMode === 'ENABLED';

  const [tab, setTab] = useState<Tab>('sbu');
  const [search, setSearch] = useState('');
  const [sbuForm, setSbuForm] = useState(false);
  const [editingSbu, setEditingSbu] = useState<Sbu | null>(null);
  const [deletingSbu, setDeletingSbu] = useState<Sbu | null>(null);
  const [groupForm, setGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SbuGroup | null>(null);

  const sbus = useSbus(enabled);
  const groups = useSbuGroups(enabled);
  const remove = useDeleteSbu();

  const sbuRows = useMemo(() => sbus.data ?? [], [sbus.data]);
  const groupRows = useMemo(() => groups.data ?? [], [groups.data]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sbuRows;
    return sbuRows.filter((row) => row.name.toLowerCase().includes(query) || row.code.toLowerCase().includes(query));
  }, [sbuRows, search]);
  const paged = usePagedRows(filtered);
  const pagedGroups = usePagedRows(groupRows);

  const groupName = (id: string) => groupRows.find((row) => row.id === id)?.name ?? '—';
  const parentName = (row: Sbu) =>
    row.parentId ? (sbuRows.find((item) => item.id === row.parentId)?.name ?? '—') : 'Tanpa induk';

  const closeSbuForm = () => {
    setSbuForm(false);
    setEditingSbu(null);
  };
  const closeGroupForm = () => {
    setGroupForm(false);
    setEditingGroup(null);
  };

  return (
    <PageShell
      crumbs={[{ label: 'Settings' }, { label: 'Company' }, { label: 'SBU' }]}
      title="SBU"
      description="Unit bisnis strategis beserta grup dan penanggung jawabnya."
    >
      {!enabled && !setup.isLoading ? (
        <Card>
          <CardHead title="SBU" />
          <EmptyState
            title="Penetapan SBU dimatikan untuk perusahaan ini"
            description="Nyalakan dulu penetapan SBU pada Company Setup agar daftar ini bisa dipakai."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'sbu', label: 'SBU', count: sbuRows.length },
              { value: 'groups', label: 'Grup SBU', count: groupRows.length },
            ]}
          />

          {tab === 'sbu' && (
            <Card>
              <CardHead title="Unit bisnis" sub="Kode SBU tidak boleh sama antar baris aktif" />
              <div>
                <TableToolbar
                  search={{ value: search, onChange: setSearch, placeholder: 'Cari nama atau kode' }}
                  actions={<AddButton onClick={() => setSbuForm(true)}>Add SBU</AddButton>}
                />
                <DataTable<Sbu>
                  rows={paged.rows}
                  rowKey={(row) => row.id}
                  loading={sbus.isLoading}
                  empty={sbus.error ? String(sbus.error.message) : 'Belum ada SBU.'}
                  columns={[
                    {
                      key: 'code',
                      header: 'Kode',
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.code}</span>,
                    },
                    { key: 'name', header: 'Nama', strong: true, render: (row) => row.name },
                    { key: 'group', header: 'Grup', render: (row) => groupName(row.sbuGroupId) },
                    { key: 'parent', header: 'Induk', muted: true, render: parentName },
                    {
                      key: 'pic',
                      header: 'Penanggung jawab',
                      render: (row) => personName(row.responsibleEmployeeId),
                    },
                  ]}
                  actions={(row) => (
                    <RowActions
                      actions={[
                        {
                          label: 'Ubah',
                          onSelect: () => {
                            setEditingSbu(row);
                            setSbuForm(true);
                          },
                        },
                        { label: 'Hapus', danger: true, onSelect: () => setDeletingSbu(row) },
                      ]}
                    />
                  )}
                />
                <Pagination
                  page={paged.page}
                  pageSize={paged.pageSize}
                  total={paged.total}
                  noun="units"
                  onPageChange={paged.setPage}
                  onPageSizeChange={paged.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'groups' && (
            <Card>
              <CardHead title="Grup SBU" sub="Pengelompokan lini usaha" />
              <div>
                <TableToolbar actions={<AddButton onClick={() => setGroupForm(true)}>Add Group</AddButton>} />
                <DataTable<SbuGroup>
                  rows={pagedGroups.rows}
                  rowKey={(row) => row.id}
                  loading={groups.isLoading}
                  empty={groups.error ? String(groups.error.message) : 'Belum ada grup SBU.'}
                  columns={[
                    { key: 'name', header: 'Grup', strong: true, render: (row) => row.name },
                    {
                      key: 'used',
                      header: 'Jumlah SBU',
                      align: 'center',
                      muted: true,
                      render: (row) => (
                        <span className="tabular-nums">{sbuRows.filter((sbu) => sbu.sbuGroupId === row.id).length}</span>
                      ),
                    },
                  ]}
                  actions={(row) => (
                    <RowButton
                      onClick={() => {
                        setEditingGroup(row);
                        setGroupForm(true);
                      }}
                    >
                      Ubah
                    </RowButton>
                  )}
                />
                <Pagination
                  page={pagedGroups.page}
                  pageSize={pagedGroups.pageSize}
                  total={pagedGroups.total}
                  noun="groups"
                  onPageChange={pagedGroups.setPage}
                  onPageSizeChange={pagedGroups.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      )}

      <SbuFormModal open={sbuForm} editing={editingSbu} groups={groupRows} sbus={sbuRows} onClose={closeSbuForm} />
      <SbuGroupFormModal open={groupForm} editing={editingGroup} onClose={closeGroupForm} />

      <ConfirmDialog
        open={Boolean(deletingSbu)}
        title="Hapus SBU ini?"
        description={
          deletingSbu
            ? `${deletingSbu.name} tidak lagi bisa dipilih. Baris yang masih menjadi induk tidak bisa dihapus.`
            : undefined
        }
        loading={remove.isPending}
        onOpenChange={(open) => !open && setDeletingSbu(null)}
        onConfirm={() => deletingSbu && remove.mutate(deletingSbu.id, { onSuccess: () => setDeletingSbu(null) })}
      />
    </PageShell>
  );
}
