import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton, RowActions } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { PositionFormModal, PositionHistoryModal } from '@/features/company/components/CompanyModals';
import {
  useDeletePosition,
  useGroupLevels,
  useGroupStructs,
  usePositions,
} from '@/features/company/hooks/useCompany';
import type { GroupLevel, GroupPosition } from '@/features/company/types';

/**
 * Settings › Company › Group Structure — port `_prototype/company-group-structure.html`
 * (UIC-001-COMPANY-0.22 §2.3).
 *
 * Rantai persetujuan disusun antar **posisi**, bukan antar orang: karyawan hanya pengisi, dan
 * posisi yang ditinggalkan pengisinya tetap berdiri dalam keadaan lowong. Setiap perubahan
 * posisi menulis satu baris riwayat.
 */
export function GroupStructurePage() {
  const structs = useGroupStructs();
  const [structId, setStructId] = useState('');

  useEffect(() => {
    if (!structId && structs.data?.length) {
      setStructId(structs.data.find((row) => row.isDefault)?.id ?? structs.data[0].id);
    }
  }, [structId, structs.data]);

  const levels = useGroupLevels(structId);
  const positions = usePositions(structId);
  const deletePosition = useDeletePosition();

  const [search, setSearch] = useState('');
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<GroupPosition | null>(null);
  const [history, setHistory] = useState<GroupPosition | null>(null);
  const [deleting, setDeleting] = useState<GroupPosition | null>(null);

  const levelRows = useMemo(() => levels.data ?? [], [levels.data]);
  const positionRows = useMemo(() => positions.data ?? [], [positions.data]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? positionRows.filter((row) => row.positionName.toLowerCase().includes(query)) : positionRows;
  }, [positionRows, search]);
  const paged = usePagedRows(filtered);

  const levelName = (id: string) => levelRows.find((row) => row.id === id)?.levelName ?? '—';
  const positionName = (id: string | null) =>
    id ? (positionRows.find((row) => row.id === id)?.positionName ?? '—') : 'Puncak struktur';
  const struct = structs.data?.find((row) => row.id === structId);

  const closeForm = () => {
    setForm(false);
    setEditing(null);
  };

  return (
    <PageShell
      crumbs={[{ label: 'Settings' }, { label: 'Company' }, { label: 'Group Structure' }]}
      title="Group Structure"
      description="Susunan posisi dan rantai persetujuannya. Satu struktur dipakai sebagai bawaan perusahaan."
      actions={
        <Select value={structId} onValueChange={setStructId}>
          <SelectTrigger className="h-10 w-[240px]" aria-label="Struktur">
            <SelectValue placeholder="Pilih struktur" />
          </SelectTrigger>
          <SelectContent>
            {(structs.data ?? []).map((row) => (
              <SelectItem key={row.id} value={row.id}>
                {row.isDefault ? `${row.name} (bawaan)` : row.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="flex flex-col gap-5">
        <Card>
          <CardHead
            title="Level"
            sub={
              struct?.finalApproverInfo
                ? `Persetujuan terakhir pada struktur ini berhenti di ${struct.finalApproverInfo.nama}`
                : 'Struktur ini belum menunjuk pemberi persetujuan terakhir'
            }
          />
          <DataTable<GroupLevel>
            rows={levelRows}
            rowKey={(row) => row.id}
            loading={levels.isLoading}
            empty="Struktur ini belum punya level."
            columns={[
              {
                key: 'order',
                header: 'Urutan',
                align: 'center',
                render: (row) => <span className="tabular-nums">{row.levelOrder}</span>,
              },
              { key: 'name', header: 'Level', strong: true, render: (row) => row.levelName },
              {
                key: 'count',
                header: 'Jumlah posisi',
                align: 'center',
                muted: true,
                render: (row) => (
                  <span className="tabular-nums">
                    {positionRows.filter((pos) => pos.groupStructLevelId === row.id).length}
                  </span>
                ),
              },
            ]}
          />
        </Card>

        <Card>
          <CardHead
            title="Posisi"
            sub="Atasan ditunjuk lewat posisi induk; posisi tanpa pengisi tetap menjadi bagian rantai persetujuan"
          />
          <div>
            <TableToolbar
              search={{ value: search, onChange: setSearch, placeholder: 'Cari nama posisi' }}
              actions={<AddButton onClick={() => setForm(true)}>Add Position</AddButton>}
            />
            <DataTable<GroupPosition>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={positions.isLoading}
              empty="Belum ada posisi pada struktur ini."
              columns={[
                { key: 'name', header: 'Posisi', strong: true, render: (row) => row.positionName },
                { key: 'level', header: 'Level', render: (row) => levelName(row.groupStructLevelId) },
                {
                  key: 'holder',
                  header: 'Pengisi',
                  render: (row) =>
                    row.employeeInfo ? (
                      row.employeeInfo.nama
                    ) : (
                      <StatusBadge tone="warn">Lowong</StatusBadge>
                    ),
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
              ]}
              actions={(row) => (
                <RowActions
                  actions={[
                    {
                      label: 'Ubah',
                      onSelect: () => {
                        setEditing(row);
                        setForm(true);
                      },
                    },
                    { label: 'Riwayat', onSelect: () => setHistory(row) },
                    { label: 'Hapus', danger: true, onSelect: () => setDeleting(row) },
                  ]}
                />
              )}
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="positions"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      </div>

      <PositionFormModal
        open={form}
        editing={editing}
        levels={levelRows}
        positions={positionRows}
        onClose={closeForm}
      />
      <PositionHistoryModal open={Boolean(history)} position={history} onClose={() => setHistory(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus posisi ini?"
        description={
          deleting
            ? `${deleting.positionName} akan dicatat sebagai dihapus di riwayat. Posisi yang masih menjadi atasan posisi lain tidak bisa dihapus.`
            : undefined
        }
        loading={deletePosition.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && deletePosition.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </PageShell>
  );
}
