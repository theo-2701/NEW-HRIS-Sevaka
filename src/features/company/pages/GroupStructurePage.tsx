import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton, RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import {
  GroupLevelFormModal,
  GroupStructFormModal,
  PositionFormModal,
  PositionHistoryModal,
} from '@/features/company/components/CompanyModals';
import { ModuleMappingCard } from '@/features/company/components/ModuleMappingCard';
import { PositionChart } from '@/features/company/components/PositionChart';
import {
  useDeleteGroupLevel,
  useDeletePosition,
  useGroupLevels,
  useGroupStructs,
  usePositions,
} from '@/features/company/hooks/useCompany';
import { COMPANY_VIEWERS } from '@/features/company/mock-data';
import type { GroupLevel, GroupPosition, GroupStruct } from '@/features/company/types';

type Tab = 'group' | 'level' | 'position' | 'mapping';
type PositionView = 'chart' | 'table';

const ALL_GROUPS = '__semua__';

/**
 * Settings › Company › Group Structure — port `_prototype/company-group-structure.html`
 * (UIC-001-COMPANY-0.22 §2.3/§2.3.1/§2.3.2).
 *
 * Empat tab: **Group**, **Level**, **Position**, dan **Pemetaan Modul** (GS-11, kontrak). Group
 * dan Level punya CRUD sendiri di luar dokumen kontrak (UIC §2.3 hanya mengontrakkan `POST`,
 * bukan seluruh CRUD) — ditambahkan atas permintaan pengguna 23 September 2026 supaya struktur
 * bisa disusun dari layar ini, bukan cuma dibaca. Rantai persetujuan Position disusun antar
 * **posisi**, bukan antar orang: karyawan hanya pengisi, dan posisi yang ditinggalkan pengisinya
 * tetap berdiri dalam keadaan lowong. Tab Position punya Chart View (bagan, di luar dokumen)
 * dan Table View. Menyalakan wewenang tanda tangan surat (`can_sign_letter`) hanya lewat form
 * posisi dan hanya oleh Super Admin/System Admin.
 */
export function GroupStructurePage() {
  const [tab, setTab] = useState<Tab>('group');
  const [actorId, setActorId] = useState(COMPANY_VIEWERS[0].employeeId);
  const actor = COMPANY_VIEWERS.find((row) => row.employeeId === actorId) ?? COMPANY_VIEWERS[0];

  const structs = useGroupStructs();
  const structRows = useMemo(() => structs.data ?? [], [structs.data]);
  const defaultStructId = structRows.find((row) => row.isDefault)?.id ?? structRows[0]?.id ?? '';

  // ---- Group tab ----
  const [groupSearch, setGroupSearch] = useState('');
  const [groupForm, setGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupStruct | null>(null);
  const filteredGroups = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();
    return query ? structRows.filter((row) => row.name.toLowerCase().includes(query)) : structRows;
  }, [structRows, groupSearch]);
  const pagedGroups = usePagedRows(filteredGroups);

  // ---- Level tab ----
  const [levelFilter, setLevelFilter] = useState(ALL_GROUPS);
  const levels = useGroupLevels(levelFilter === ALL_GROUPS ? '' : levelFilter);
  const levelRows = useMemo(() => levels.data ?? [], [levels.data]);
  const pagedLevels = usePagedRows(levelRows);
  const [levelForm, setLevelForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState<GroupLevel | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<GroupLevel | null>(null);
  const deleteGroupLevel = useDeleteGroupLevel();
  const structName = (id: string) => structRows.find((row) => row.id === id)?.name ?? '—';

  // ---- Position tab ----
  const [positionStructId, setPositionStructId] = useState('');
  useEffect(() => {
    if (!positionStructId && defaultStructId) setPositionStructId(defaultStructId);
  }, [positionStructId, defaultStructId]);
  const positionLevels = useGroupLevels(positionStructId);
  const positionLevelRows = useMemo(() => positionLevels.data ?? [], [positionLevels.data]);
  const positions = usePositions(positionStructId);
  const positionRows = useMemo(() => positions.data ?? [], [positions.data]);
  const deletePosition = useDeletePosition();

  const [positionView, setPositionView] = useState<PositionView>('chart');
  const [positionSearch, setPositionSearch] = useState('');
  const [positionForm, setPositionForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState<GroupPosition | null>(null);
  const [history, setHistory] = useState<GroupPosition | null>(null);
  const [deletingPosition, setDeletingPosition] = useState<GroupPosition | null>(null);

  const filteredPositions = useMemo(() => {
    const query = positionSearch.trim().toLowerCase();
    return query ? positionRows.filter((row) => row.positionName.toLowerCase().includes(query)) : positionRows;
  }, [positionRows, positionSearch]);
  const pagedPositions = usePagedRows(filteredPositions);

  const positionLevelName = (id: string) => positionLevelRows.find((row) => row.id === id)?.levelName ?? '—';
  const positionName = (id: string | null) =>
    id ? (positionRows.find((row) => row.id === id)?.positionName ?? '—') : 'Puncak struktur';

  const closeGroupForm = () => {
    setGroupForm(false);
    setEditingGroup(null);
  };
  const closeLevelForm = () => {
    setLevelForm(false);
    setEditingLevel(null);
  };
  const closePositionForm = () => {
    setPositionForm(false);
    setEditingPosition(null);
  };

  return (
    <PageShell
      crumbs={[{ label: 'Settings' }, { label: 'Company' }, { label: 'Group Structure' }]}
      title="Group Structure"
      description="Jalur persetujuan antar posisi. Group menampung Level, Level menampung Posisi. Karyawan hanya pengisi sementara — posisi tetap ada meski kosong."
      actions={
        <Select value={actorId} onValueChange={setActorId}>
          <SelectTrigger className="h-10 w-[260px]" aria-label="Viewing as">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPANY_VIEWERS.map((viewer) => (
              <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                {viewer.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="flex flex-col gap-5">
        <TabMenu<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'group', label: 'Group' },
            { value: 'level', label: 'Level' },
            { value: 'position', label: 'Position' },
            { value: 'mapping', label: 'Pemetaan Modul' },
          ]}
        />

        {tab !== 'mapping' && (
          <div className="rounded-md border border-secondary-200 bg-secondary-50 px-4 py-2.5 font-body text-xs font-medium text-secondary-700">
            Atur Group lalu Level terlebih dahulu sebelum menyusun Posisi. Group utama menampung posisi yang belum
            ditempatkan.
          </div>
        )}

        {tab === 'group' && (
          <Card>
            <div>
              <TableToolbar
                search={{ value: groupSearch, onChange: setGroupSearch, placeholder: 'Cari nama group…' }}
                actions={<AddButton onClick={() => setGroupForm(true)}>Add Group</AddButton>}
              />
              <DataTable<GroupStruct>
                rows={pagedGroups.rows}
                rowKey={(row) => row.id}
                loading={structs.isLoading}
                empty="Belum ada group."
                columns={[
                  {
                    key: 'name',
                    header: 'Group',
                    strong: true,
                    render: (row) => (
                      <div className="flex flex-col">
                        <span>{row.name}</span>
                        <span className="font-body text-[11px] font-medium text-fg-4">
                          Persetujuan akhir: {row.finalApproverInfo?.nama ?? '—'}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'default',
                    header: 'Group Utama',
                    align: 'center',
                    render: (row) =>
                      row.isDefault ? <StatusBadge tone="brand">Group Utama</StatusBadge> : <span className="text-fg-4">—</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>{row.isActive ? 'Aktif' : 'Nonaktif'}</StatusBadge>,
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
              <p className="mt-2 font-body text-xs font-medium text-fg-4">
                Klik salah satu baris untuk mengubah group. Hanya boleh ada satu group utama per perusahaan.
              </p>
            </div>
          </Card>
        )}

        {tab === 'level' && (
          <Card>
            <div>
              <TableToolbar
                filters={
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="h-10 w-[220px]" aria-label="Filter group">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_GROUPS}>Semua group</SelectItem>
                      {structRows.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
                actions={<AddButton onClick={() => setLevelForm(true)}>Add Level</AddButton>}
              />
              <DataTable<GroupLevel>
                rows={pagedLevels.rows}
                rowKey={(row) => row.id}
                loading={levels.isLoading}
                empty="Belum ada level."
                columns={[
                  {
                    key: 'order',
                    header: 'Urutan',
                    align: 'center',
                    render: (row) => <span className="tabular-nums">{row.levelOrder}</span>,
                  },
                  { key: 'name', header: 'Nama Level', strong: true, render: (row) => row.levelName },
                  { key: 'group', header: 'Group', render: (row) => structName(row.groupStructId) },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>{row.isActive ? 'Aktif' : 'Nonaktif'}</StatusBadge>,
                  },
                ]}
                actions={(row) => (
                  <RowActions
                    actions={[
                      {
                        label: 'Ubah',
                        onSelect: () => {
                          setEditingLevel(row);
                          setLevelForm(true);
                        },
                      },
                      { label: 'Hapus', danger: true, onSelect: () => setDeletingLevel(row) },
                    ]}
                  />
                )}
              />
              <Pagination
                page={pagedLevels.page}
                pageSize={pagedLevels.pageSize}
                total={pagedLevels.total}
                noun="levels"
                onPageChange={pagedLevels.setPage}
                onPageSizeChange={pagedLevels.setPageSize}
              />
              <p className="mt-2 font-body text-xs font-medium text-fg-4">
                Urutan 1 = jenjang tertinggi. Klik salah satu baris untuk mengubah level.
              </p>
            </div>
          </Card>
        )}

        {tab === 'position' && (
          <Card>
            <CardHead title="Posisi" sub="Atasan ditunjuk lewat posisi induk; posisi tanpa pengisi tetap menjadi bagian rantai persetujuan" />
            <div>
              <TableToolbar
                filters={
                  <Select value={positionStructId} onValueChange={setPositionStructId}>
                    <SelectTrigger className="h-10 w-[220px]" aria-label="Filter group">
                      <SelectValue placeholder="Pilih group" />
                    </SelectTrigger>
                    <SelectContent>
                      {structRows.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {row.isDefault ? `${row.name} (utama)` : row.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
                search={
                  positionView === 'table'
                    ? { value: positionSearch, onChange: setPositionSearch, placeholder: 'Cari nama posisi' }
                    : undefined
                }
                actions={<AddButton onClick={() => setPositionForm(true)}>Add Position</AddButton>}
              />

              <TabMenu<PositionView>
                className="mb-3"
                value={positionView}
                onChange={setPositionView}
                items={[
                  { value: 'chart', label: 'Chart View' },
                  { value: 'table', label: 'Table View' },
                ]}
              />

              {positionView === 'chart' ? (
                <PositionChart
                  positions={positionRows}
                  levelName={positionLevelName}
                  onEdit={(row) => {
                    setEditingPosition(row);
                    setPositionForm(true);
                  }}
                />
              ) : (
                <>
                  <DataTable<GroupPosition>
                    rows={pagedPositions.rows}
                    rowKey={(row) => row.id}
                    loading={positions.isLoading}
                    empty="Belum ada posisi pada group ini."
                    columns={[
                      { key: 'name', header: 'Posisi', strong: true, render: (row) => row.positionName },
                      { key: 'level', header: 'Level', render: (row) => positionLevelName(row.groupStructLevelId) },
                      {
                        key: 'holder',
                        header: 'Pengisi',
                        render: (row) => (row.employeeInfo ? row.employeeInfo.nama : <StatusBadge tone="warn">Lowong</StatusBadge>),
                      },
                      {
                        key: 'nik',
                        header: 'NIK',
                        muted: true,
                        nowrap: true,
                        render: (row) => <span className="font-mono text-xs">{row.employeeInfo?.nik ?? '—'}</span>,
                      },
                      { key: 'parent', header: 'Posisi atasan', muted: true, render: (row) => positionName(row.parentId) },
                      {
                        key: 'supervisor',
                        header: 'Atasan saat ini',
                        muted: true,
                        render: (row) => row.supervisorInfo?.nama ?? '—',
                      },
                      {
                        key: 'sign',
                        header: 'Tanda tangan surat',
                        align: 'center',
                        render: (row) =>
                          row.canSignLetter ? <StatusBadge tone="ok">Berwenang</StatusBadge> : <span className="text-fg-4">—</span>,
                      },
                    ]}
                    actions={(row) => (
                      <RowActions
                        actions={[
                          {
                            label: 'Ubah',
                            onSelect: () => {
                              setEditingPosition(row);
                              setPositionForm(true);
                            },
                          },
                          { label: 'Riwayat', onSelect: () => setHistory(row) },
                          { label: 'Hapus', danger: true, onSelect: () => setDeletingPosition(row) },
                        ]}
                      />
                    )}
                  />
                  <Pagination
                    page={pagedPositions.page}
                    pageSize={pagedPositions.pageSize}
                    total={pagedPositions.total}
                    noun="positions"
                    onPageChange={pagedPositions.setPage}
                    onPageSizeChange={pagedPositions.setPageSize}
                  />
                </>
              )}
              <p className="mt-2 font-body text-xs font-medium text-fg-4">
                Atasan (parent) adalah POSISI, bukan karyawan. Pada Table View, klik salah satu baris untuk mengubah
                posisi atau menempatkan karyawan; Chart View baca-saja kecuali ikon pensil.
              </p>
            </div>
          </Card>
        )}

        {tab === 'mapping' && <ModuleMappingCard structs={structRows} actor={actor} />}
      </div>

      <GroupStructFormModal open={groupForm} editing={editingGroup} onClose={closeGroupForm} />
      <GroupLevelFormModal
        open={levelForm}
        editing={editingLevel}
        structs={structRows}
        defaultStructId={levelFilter === ALL_GROUPS ? defaultStructId : levelFilter}
        onClose={closeLevelForm}
      />
      <ConfirmDialog
        open={Boolean(deletingLevel)}
        title="Hapus level ini?"
        description={deletingLevel ? `${deletingLevel.levelName} tidak bisa dihapus bila masih dipakai posisi aktif.` : undefined}
        loading={deleteGroupLevel.isPending}
        onOpenChange={(open) => !open && setDeletingLevel(null)}
        onConfirm={() => deletingLevel && deleteGroupLevel.mutate(deletingLevel.id, { onSuccess: () => setDeletingLevel(null) })}
      />

      <PositionFormModal
        open={positionForm}
        editing={editingPosition}
        levels={positionLevelRows}
        positions={positionRows}
        actor={actor}
        onClose={closePositionForm}
      />
      <PositionHistoryModal open={Boolean(history)} position={history} onClose={() => setHistory(null)} />
      <ConfirmDialog
        open={Boolean(deletingPosition)}
        title="Hapus posisi ini?"
        description={
          deletingPosition
            ? `${deletingPosition.positionName} akan dicatat sebagai dihapus di riwayat. Posisi yang masih menjadi atasan posisi lain tidak bisa dihapus.`
            : undefined
        }
        loading={deletePosition.isPending}
        onOpenChange={(open) => !open && setDeletingPosition(null)}
        onConfirm={() => deletingPosition && deletePosition.mutate(deletingPosition.id, { onSuccess: () => setDeletingPosition(null) })}
      />
    </PageShell>
  );
}
